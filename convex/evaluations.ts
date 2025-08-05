import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";

// Helper function to get authenticated user ID
async function getAuthenticatedUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

// Create a new evaluation
export const createEvaluation = mutation({
  args: {
    repoUrl: v.string(),
    repoOwner: v.string(),
    repoName: v.string(),
    course: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const evaluationId = await ctx.db.insert("evaluations", {
      userId,
      repoUrl: args.repoUrl,
      repoOwner: args.repoOwner,
      repoName: args.repoName,
      course: args.course,
      status: "pending",
      createdAt: Date.now(),
    });

    return evaluationId;
  },
});

// Update evaluation status
export const updateEvaluationStatus = mutation({
  args: {
    evaluationId: v.id("evaluations"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    if (evaluation.userId !== userId) {
      throw new Error("Unauthorized");
    }

    const updateData: any = {
      status: args.status,
    };

    if (args.status === "processing") {
      updateData.processingStartedAt = Date.now();
    } else if (args.status === "completed" || args.status === "failed") {
      updateData.completedAt = Date.now();
    }

    if (args.errorMessage) {
      updateData.errorMessage = args.errorMessage;
    }

    await ctx.db.patch(args.evaluationId, updateData);
  },
});

// Update evaluation results
export const updateEvaluationResults = mutation({
  args: {
    evaluationId: v.id("evaluations"),
    results: v.object({
      totalScore: v.number(),
      maxScore: v.number(),
      breakdown: v.any(),
      overallFeedback: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    if (evaluation.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.evaluationId, {
      results: args.results,
      totalScore: args.results.totalScore,
      maxScore: args.results.maxScore,
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

// Get user's evaluations
export const getUserEvaluations = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const limit = args.limit || 20;
    
    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    return evaluations;
  },
});

// Get evaluation by ID
export const getEvaluation = query({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    if (evaluation.userId !== userId) {
      throw new Error("Unauthorized");
    }

    return evaluation;
  },
});

// Get pending evaluations (for processing queue)
export const getPendingEvaluations = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("byStatus", (q) => q.eq("status", "pending"))
      .order("asc") // Process oldest first
      .take(limit);

    return evaluations;
  },
});

// Get evaluation statistics for a user
export const getUserEvaluationStats = query({
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const allEvaluations = await ctx.db
      .query("evaluations")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const stats = {
      total: allEvaluations.length,
      completed: allEvaluations.filter(e => e.status === "completed").length,
      pending: allEvaluations.filter(e => e.status === "pending").length,
      processing: allEvaluations.filter(e => e.status === "processing").length,
      failed: allEvaluations.filter(e => e.status === "failed").length,
      averageScore: 0,
    };

    const completedEvaluations = allEvaluations.filter(e => e.status === "completed" && e.totalScore !== undefined);
    if (completedEvaluations.length > 0) {
      const totalScore = completedEvaluations.reduce((sum, e) => sum + (e.totalScore || 0), 0);
      stats.averageScore = totalScore / completedEvaluations.length;
    }

    return stats;
  },
});

// Delete evaluation
export const deleteEvaluation = mutation({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    if (evaluation.userId !== userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.evaluationId);
  },
});

// Internal functions for workflow
export const createEvaluationInternal = internalMutation({
  args: {
    userId: v.string(),
    repoUrl: v.string(),
    repoOwner: v.string(),
    repoName: v.string(),
    course: v.string(),
  },
  handler: async (ctx, args) => {
    const evaluationId = await ctx.db.insert("evaluations", {
      userId: args.userId,
      repoUrl: args.repoUrl,
      repoOwner: args.repoOwner,
      repoName: args.repoName,
      course: args.course,
      status: "pending",
      createdAt: Date.now(),
    });

    return evaluationId;
  },
});

export const getEvaluationByIdInternal = internalQuery({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.evaluationId);
  },
});
