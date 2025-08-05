import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { evaluationService } from "../lib/evaluation-service";

// Submit a new evaluation request
export const submitEvaluation = action({
  args: {
    repoUrl: v.string(),
    courseType: v.string(),
  },
  handler: async (ctx, args): Promise<{ evaluationId: string; status: string }> => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      // Parse repository URL to extract owner and repo name
      const urlParts = args.repoUrl.replace(/\/$/, '').split('/');
      const repoOwner = urlParts[urlParts.length - 2];
      const repoName = urlParts[urlParts.length - 1];

      // Create evaluation record
      const evaluationId: string = await ctx.runMutation(internal.evaluations.createEvaluationInternal, {
        userId: userId.subject,
        repoUrl: args.repoUrl,
        repoOwner,
        repoName,
        course: args.courseType,
      });

      // Increment user's evaluation count
      await ctx.runMutation(internal.userUsage.incrementEvaluationCountInternal, {
        userId: userId.subject,
      });

      // Schedule evaluation processing
      await ctx.scheduler.runAfter(0, internal.evaluationWorkflow.processEvaluation, {
        evaluationId,
      });

      return { evaluationId, status: "submitted" };
    } catch (error) {
      console.error("Failed to submit evaluation:", error);
      throw new Error(`Failed to submit evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Process an evaluation (internal action)
export const processEvaluation = action({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    try {
      // Get evaluation details
      const evaluation = await ctx.runQuery(internal.evaluations.getEvaluationByIdInternal, {
        evaluationId: args.evaluationId,
      });

      if (!evaluation) {
        throw new Error("Evaluation not found");
      }

      if (evaluation.status !== "pending") {
        console.log(`Evaluation ${args.evaluationId} is not pending, skipping`);
        return;
      }

      // Update status to processing
      await ctx.runMutation(internal.evaluations.updateEvaluationStatus, {
        evaluationId: args.evaluationId,
        status: "processing",
      });

      // Process the evaluation
      const result = await evaluationService.processEvaluation({
        repoUrl: evaluation.repoUrl,
        courseType: evaluation.course,
        userId: evaluation.userId,
      });

      if (result.success && result.results) {
        // Update with results
        await ctx.runMutation(internal.evaluations.updateEvaluationResults, {
          evaluationId: args.evaluationId,
          results: result.results,
        });
      } else {
        // Update with error
        await ctx.runMutation(internal.evaluations.updateEvaluationStatus, {
          evaluationId: args.evaluationId,
          status: "failed",
          errorMessage: result.error || "Unknown error occurred",
        });
      }
    } catch (error) {
      console.error(`Failed to process evaluation ${args.evaluationId}:`, error);
      
      // Update status to failed
      await ctx.runMutation(internal.evaluations.updateEvaluationStatus, {
        evaluationId: args.evaluationId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      });
    }
  },
});

// Get evaluation by ID (internal query)
export const getEvaluationById = internalQuery({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.evaluationId);
  },
});

// Retry failed evaluation
export const retryEvaluation = action({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity();
    if (!userId) {
      throw new Error("Authentication required");
    }

    try {
      const evaluation = await ctx.runQuery(internal.evaluations.getEvaluation, {
        evaluationId: args.evaluationId,
      });

      if (!evaluation) {
        throw new Error("Evaluation not found");
      }

      if (evaluation.status !== "failed") {
        throw new Error("Can only retry failed evaluations");
      }

      // Reset status to pending
      await ctx.runMutation(internal.evaluations.updateEvaluationStatus, {
        evaluationId: args.evaluationId,
        status: "pending",
      });

      // Schedule processing
      await ctx.scheduler.runAfter(0, internal.evaluationWorkflow.processEvaluation, {
        evaluationId: args.evaluationId,
      });

      return { status: "retry_scheduled" };
    } catch (error) {
      console.error("Failed to retry evaluation:", error);
      throw new Error(`Failed to retry evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Process pending evaluations (batch processing)
export const processPendingEvaluations = action({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ processedCount: number; message: string }> => {
    const batchSize: number = args.batchSize || 5;

    try {
      const pendingEvaluations: any[] = await ctx.runQuery(internal.evaluations.getPendingEvaluations, {
        limit: batchSize,
      });

      const processedCount: number = pendingEvaluations.length;

      // Schedule processing for each pending evaluation
      for (const evaluation of pendingEvaluations) {
        await ctx.scheduler.runAfter(0, internal.evaluationWorkflow.processEvaluation, {
          evaluationId: evaluation._id,
        });
      }

      return { processedCount, message: `Scheduled ${processedCount} evaluations for processing` };
    } catch (error) {
      console.error("Failed to process pending evaluations:", error);
      throw new Error(`Failed to process pending evaluations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get evaluation queue status
export const getQueueStatus = action({
  handler: async (ctx): Promise<{ pending: number; processing: number; totalInQueue: number; error?: string }> => {
    try {
      const pendingCount: number = (await ctx.runQuery(internal.evaluations.getPendingEvaluations, { limit: 100 })).length;
      const processingEvaluations: any[] = await ctx.runQuery(internal.evaluationWorkflow.getProcessingEvaluations);

      return {
        pending: pendingCount,
        processing: processingEvaluations.length,
        totalInQueue: pendingCount + processingEvaluations.length,
      };
    } catch (error) {
      console.error("Failed to get queue status:", error);
      return {
        pending: 0,
        processing: 0,
        totalInQueue: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});

// Get processing evaluations (internal query)
export const getProcessingEvaluations = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("evaluations")
      .withIndex("byStatus", (q) => q.eq("status", "processing"))
      .collect();
  },
});

// Clean up old evaluations (maintenance task)
export const cleanupOldEvaluations = action({
  args: {
    daysOld: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysOld = args.daysOld || 30;
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
    
    try {
      const oldEvaluations = await ctx.runQuery(internal.evaluationWorkflow.getOldEvaluations, {
        cutoffTime,
      });

      let deletedCount = 0;
      for (const evaluation of oldEvaluations) {
        await ctx.runMutation(internal.evaluations.deleteEvaluation, {
          evaluationId: evaluation._id,
        });
        deletedCount++;
      }

      return { deletedCount, message: `Cleaned up ${deletedCount} old evaluations` };
    } catch (error) {
      console.error("Failed to cleanup old evaluations:", error);
      throw new Error(`Failed to cleanup old evaluations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// Get old evaluations (internal query)
export const getOldEvaluations = internalQuery({
  args: {
    cutoffTime: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("evaluations")
      .filter((q) => q.lt(q.field("createdAt"), args.cutoffTime))
      .collect();
  },
});

// Test evaluation workflow
export const testWorkflow = action({
  handler: async (ctx) => {
    try {
      // Test the evaluation service
      const serviceTest = await evaluationService.testService();
      
      return {
        serviceConnected: serviceTest,
        timestamp: Date.now(),
        status: serviceTest ? "healthy" : "unhealthy",
      };
    } catch (error) {
      console.error("Workflow test failed:", error);
      return {
        serviceConnected: false,
        timestamp: Date.now(),
        status: "error",
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
});
