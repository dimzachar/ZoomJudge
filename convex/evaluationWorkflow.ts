import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { evaluationService } from "../lib/evaluation-service";
import { evaluationLogger } from "../lib/simple-logger";
// COMMENTED OUT: Web search functionality
// import { evaluateWithWebSearch } from "../lib/anthropic";

// Submit a new evaluation request - UPDATED VERSION
export const submitEvaluation = action({
  args: {
    repoUrl: v.string(),
    courseType: v.string(),
  },
  handler: async (ctx, args): Promise<{
    evaluationId: string;
    status: string;
    results?: {
      totalScore: number;
      maxScore: number;
      breakdown: Record<string, { score: number; feedback: string; maxScore: number }>;
      overallFeedback: string;
    };
    error?: string;
  }> => {
    console.log('=== SUBMIT EVALUATION DEBUG START ===');
    console.log('Submit evaluation args:', JSON.stringify(args, null, 2));

    const userId = await ctx.auth.getUserIdentity();
    console.log('User identity:', userId ? { subject: userId.subject, name: userId.name } : 'No user identity');

    if (!userId) {
      console.error('Authentication required - no user identity found');
      throw new Error("Authentication required");
    }

    try {
      // Parse repository URL to extract owner, repo name, and commit hash
      console.log('=== PARSING REPOSITORY COMMIT URL [UPDATED VERSION 2024] ===');
      console.log(`Original URL: ${args.repoUrl}`);

      // Validate that this is a commit URL
      if (!args.repoUrl.includes('/commit/')) {
        throw new Error('Invalid GitHub commit URL format. Please provide a URL like: https://github.com/username/repository/commit/commit-hash');
      }

      const urlParts = args.repoUrl.replace(/\/$/, '').split('/');

      if (urlParts.length < 7 || urlParts[5] !== 'commit') {
        throw new Error('Invalid GitHub commit URL format. Please provide a URL like: https://github.com/username/repository/commit/commit-hash');
      }

      const repoOwner = urlParts[3];
      const repoName = urlParts[4];
      const commitHash = urlParts[6];
      console.log(`[NEW PARSER] Parsed - Owner: ${repoOwner}, Repo: ${repoName}, Commit: ${commitHash}`);

      // Check for existing completed evaluation (caching)
      console.log('=== CHECKING FOR EXISTING EVALUATION (CACHE) ===');
      const existingEvaluation = await ctx.runQuery(internal.evaluations.getExistingEvaluationInternal, {
        commitHash,
        course: args.courseType,
      });

      if (existingEvaluation) {
        console.log('=== FOUND CACHED EVALUATION ===');
        console.log(`Returning cached evaluation ID: ${existingEvaluation._id}`);
        console.log('Cached results:', JSON.stringify(existingEvaluation.results, null, 2));

        return {
          evaluationId: existingEvaluation._id,
          status: "completed" as const,
          results: existingEvaluation.results
        };
      }

      console.log('=== NO CACHED EVALUATION FOUND - CREATING NEW EVALUATION ===');

      // Create evaluation record
      console.log('=== CREATING EVALUATION RECORD ===');
      const evaluationData = {
        userId: userId.subject,
        repoUrl: args.repoUrl,
        repoOwner,
        repoName,
        commitHash: commitHash, // Include commit hash for future caching
        course: args.courseType,
      };
      console.log('Evaluation data to create:', JSON.stringify(evaluationData, null, 2));

      const evaluationId = await ctx.runMutation(internal.evaluations.createEvaluationInternal, evaluationData);
      console.log(`Evaluation record created with ID: ${evaluationId}`);

      // Set the evaluation ID for logging
      evaluationLogger.setCurrentEvaluation(evaluationId);
      evaluationService.setEvaluationId(evaluationId);

      // Increment user's evaluation count
      console.log('=== INCREMENTING USER EVALUATION COUNT ===');
      await ctx.runMutation(internal.userUsage.incrementEvaluationCountInternal, {
        userId: userId.subject,
      });
      console.log('User evaluation count incremented');

      // Process evaluation immediately (synchronously)
      console.log('=== PROCESSING EVALUATION IMMEDIATELY ===');

      // Update status to processing
      await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
        evaluationId,
        status: "processing",
      });

      // Process the evaluation
      const evaluationRequest = {
        repoUrl: args.repoUrl,
        courseType: args.courseType,
        userId: userId.subject,
      };
      console.log('Evaluation request:', JSON.stringify(evaluationRequest, null, 2));

      const result = await evaluationService.processEvaluation(evaluationRequest, ctx);
      console.log('Evaluation service result:', JSON.stringify(result, null, 2));

      if (result.success && result.results) {
        console.log('=== UPDATING WITH SUCCESSFUL RESULTS ===');
        // Update with results
        await ctx.runMutation(internal.evaluations.updateEvaluationResultsInternal, {
          evaluationId,
          results: result.results,
        });
        console.log('Results saved successfully');

        // Create evaluation summary
        await evaluationLogger.createEvaluationSummary(
          evaluationId,
          args.repoUrl,
          args.courseType,
          "completed",
          result.results
        );

        console.log('=== SUBMIT EVALUATION DEBUG END ===');
        return {
          evaluationId,
          status: "completed" as const,
          results: result.results
        };
      } else {
        console.log('=== UPDATING WITH ERROR STATUS ===');
        console.log('Error from evaluation service:', result.error);
        // Update with error
        await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
          evaluationId,
          status: "failed",
          errorMessage: result.error || "Unknown error occurred",
        });
        console.log('Error status updated');

        // Create evaluation summary for failed evaluation
        await evaluationLogger.createEvaluationSummary(
          evaluationId,
          args.repoUrl,
          args.courseType,
          "failed",
          undefined,
          result.error
        );

        console.log('=== SUBMIT EVALUATION DEBUG END ===');
        return {
          evaluationId,
          status: "failed" as const,
          error: result.error || "Unknown error occurred"
        };
      }
    } catch (error) {
      console.error('=== SUBMIT EVALUATION ERROR ===');
      console.error("Failed to submit evaluation:", error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });
      console.error('=== SUBMIT EVALUATION ERROR END ===');
      throw new Error(`Failed to submit evaluation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },
});

// COMMENTED OUT: Web search evaluation functionality
/*
// Submit a new evaluation request that uses web search only (no GitHub fetching)
export const submitWebSearchEvaluation = action({
  args: {
    query: v.string(), // free-form query (can be repo name, topic, or URL)
    courseType: v.string(),
  },
  handler: async (ctx, args): Promise<{
    evaluationId: string;
    status: string;
    results?: {
      totalScore: number;
      maxScore: number;
      breakdown: Record<string, { score: number; feedback: string; maxScore: number; sourceFiles?: string[] }>;
      overallFeedback: string;
    };
    error?: string;
  }> => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) throw new Error("Authentication required");

    try {
      const evaluationId = await ctx.runMutation(internal.evaluations.createEvaluationInternal, {
        userId: user.subject,
        repoUrl: args.query,
        repoOwner: "web-search",
        repoName: "web-search",
        commitHash: "web-search",
        course: args.courseType,
      });

      evaluationLogger.setCurrentEvaluation(evaluationId);

      await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
        evaluationId,
        status: "processing",
      });

      // Fetch course definition via public query
      const course = await ctx.runQuery(api.courses.getCourse, { courseId: args.courseType });

      if (!course) {
        await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
          evaluationId,
          status: "failed",
          errorMessage: "Course not found",
        });
        return { evaluationId, status: "failed", error: "Course not found" };
      }

      // Derive allowed domains restricted to the submitted GitHub repo
      const repoMatch = args.query.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/?#]+)(?:[\/?#]|$)/i);
      const allowedDomains = repoMatch
        ? [
            `github.com/${repoMatch[1]}/${repoMatch[2]}`,
            `raw.githubusercontent.com/${repoMatch[1]}/${repoMatch[2]}`,
            `github.com/${repoMatch[1]}/${repoMatch[2]}.wiki`,
          ]
        : ["github.com", "raw.githubusercontent.com"]; // fallback (should not happen due to client validation)

      const results = await evaluateWithWebSearch(args.query, {
        courseId: course.courseId,
        courseName: course.courseName,
        description: course.description,
        maxScore: course.maxScore,
        rubricVersion: course.rubricVersion,
        promptTemplate: course.promptTemplate,
        criteria: course.criteria,
      }, {
        maxSearches: 12,
        allowedDomains,
      });

      await ctx.runMutation(internal.evaluations.updateEvaluationResultsInternal, {
        evaluationId,
        results: {
          totalScore: results.totalScore,
          maxScore: results.maxScore,
          breakdown: results.breakdown,
          overallFeedback: results.overallFeedback,
        },
      });

      return { evaluationId, status: "completed", results };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return { evaluationId: "", status: "failed", error: message };
    }
  },
});
*/

// Process an evaluation (internal action)
export const processEvaluation = internalAction({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    console.log('=== PROCESS EVALUATION DEBUG START ===');
    console.log(`Processing evaluation ID: ${args.evaluationId}`);

    try {
      // Get evaluation details
      console.log('=== FETCHING EVALUATION DETAILS ===');
      const evaluation = await ctx.runQuery(internal.evaluations.getEvaluationByIdInternal, {
        evaluationId: args.evaluationId,
      });
      console.log('Evaluation details:', JSON.stringify(evaluation, null, 2));

      if (!evaluation) {
        console.error('Evaluation not found in database');
        throw new Error("Evaluation not found");
      }

      if (evaluation.status !== "pending") {
        console.log(`Evaluation ${args.evaluationId} status is '${evaluation.status}', not 'pending'. Skipping processing.`);
        return;
      }

      // Update status to processing
      console.log('=== UPDATING STATUS TO PROCESSING ===');
      await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
        evaluationId: args.evaluationId,
        status: "processing",
      });
      console.log('Status updated to processing');

      // Process the evaluation
      console.log('=== CALLING EVALUATION SERVICE ===');
      const evaluationRequest = {
        repoUrl: evaluation.repoUrl,
        courseType: evaluation.course,
        userId: evaluation.userId,
      };
      console.log('Evaluation request:', JSON.stringify(evaluationRequest, null, 2));

      const result = await evaluationService.processEvaluation(evaluationRequest, ctx);
      console.log('Evaluation service result:', JSON.stringify(result, null, 2));

      if (result.success && result.results) {
        console.log('=== UPDATING WITH SUCCESSFUL RESULTS ===');
        // Update with results
        await ctx.runMutation(internal.evaluations.updateEvaluationResultsInternal, {
          evaluationId: args.evaluationId,
          results: result.results,
        });
        console.log('Results saved successfully');
      } else {
        console.log('=== UPDATING WITH ERROR STATUS ===');
        console.log('Error from evaluation service:', result.error);
        // Update with error
        await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
          evaluationId: args.evaluationId,
          status: "failed",
          errorMessage: result.error || "Unknown error occurred",
        });
        console.log('Error status updated');
      }

      console.log('=== PROCESS EVALUATION DEBUG END ===');
    } catch (error) {
      console.error('=== PROCESS EVALUATION ERROR ===');
      console.error(`Failed to process evaluation ${args.evaluationId}:`, error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : 'No stack trace'
      });

      // Update status to failed
      console.log('=== UPDATING STATUS TO FAILED ===');
      await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
        evaluationId: args.evaluationId,
        status: "failed",
        errorMessage: error instanceof Error ? error.message : "Processing failed",
      });
      console.log('Failed status updated');
      console.error('=== PROCESS EVALUATION ERROR END ===');
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
      const evaluation = await ctx.runQuery(internal.evaluations.getEvaluationByIdInternal, {
        evaluationId: args.evaluationId,
      });

      if (!evaluation) {
        throw new Error("Evaluation not found");
      }

      if (evaluation.status !== "failed") {
        throw new Error("Can only retry failed evaluations");
      }

      // Reset status to pending
      await ctx.runMutation(internal.evaluations.updateEvaluationStatusInternal, {
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
      const pendingEvaluations: any[] = await ctx.runQuery(internal.evaluations.getPendingEvaluationsInternal, {
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
      const pendingCount: number = (await ctx.runQuery(internal.evaluations.getPendingEvaluationsInternal, { limit: 100 })).length;
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
        await ctx.runMutation(internal.evaluations.deleteEvaluationInternal, {
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
