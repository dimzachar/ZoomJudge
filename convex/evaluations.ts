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

// Helper function to get user tier from Convex database (source of truth)
async function getUserTierFromDatabase(ctx: any, userId: string): Promise<string> {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format

  const usage = await ctx.db
    .query("userUsage")
    .withIndex("byUserAndMonth", (q) => q.eq("userId", userId).eq("month", currentMonth))
    .first();

  // Return the tier from database, defaulting to 'free' if no usage record exists
  return usage?.subscriptionTier || 'free';
}

// Helper function to filter evaluation results based on user tier
function filterEvaluationResults(evaluation: any, userTier: string): any {
  if (!evaluation || !evaluation.results) {
    return evaluation;
  }

  // Free users only get basic scores, no detailed feedback
  if (userTier === 'free') {
    return {
      ...evaluation,
      results: {
        totalScore: evaluation.results.totalScore,
        maxScore: evaluation.results.maxScore,
        breakdown: Object.fromEntries(
          Object.entries(evaluation.results.breakdown || {}).map(([key, value]: [string, any]) => [
            key,
            {
              score: value.score,
              maxScore: value.maxScore,
              // Remove feedback and sourceFiles for free users
              feedback: '',
              sourceFiles: []
            }
          ])
        ),
        overallFeedback: '' // Remove overall feedback for free users
      }
    };
  }

  // Paid users get full results
  return evaluation;
}

// Create a new evaluation
export const createEvaluation = mutation({
  args: {
    repoUrl: v.string(),
    repoOwner: v.string(),
    repoName: v.string(),
    commitHash: v.string(),
    course: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const evaluationId = await ctx.db.insert("evaluations", {
      userId,
      repoUrl: args.repoUrl,
      repoOwner: args.repoOwner,
      repoName: args.repoName,
      commitHash: args.commitHash,
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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;
    const userTier = await getUserTierFromDatabase(ctx, userId);

    const limit = args.limit || 20;

    const evaluations = await ctx.db
      .query("evaluations")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(limit);

    // Filter results based on user tier
    return evaluations.map(evaluation => filterEvaluationResults(evaluation, userTier));
  },
});

// Get evaluation by ID
export const getEvaluation = query({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userId = identity.subject;
    const userTier = await getUserTierFromDatabase(ctx, userId);

    const evaluation = await ctx.db.get(args.evaluationId);
    if (!evaluation) {
      throw new Error("Evaluation not found");
    }

    if (evaluation.userId !== userId) {
      throw new Error("Unauthorized");
    }

    // Filter results based on user tier
    return filterEvaluationResults(evaluation, userTier);
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

// Check for existing completed evaluation by commit hash and course
export const getExistingEvaluation = query({
  args: {
    commitHash: v.string(),
    course: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvaluation = await ctx.db
      .query("evaluations")
      .withIndex("byCommitAndCourse", (q) =>
        q.eq("commitHash", args.commitHash).eq("course", args.course)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    return existingEvaluation;
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

// TEMPORARY: Clear all evaluations to fix schema migration
export const clearAllEvaluations = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    console.log(`Clearing all evaluations for schema migration - requested by user: ${userId}`);

    // Get all evaluations
    const allEvaluations = await ctx.db.query("evaluations").collect();

    // Delete them all
    for (const evaluation of allEvaluations) {
      await ctx.db.delete(evaluation._id);
    }

    console.log(`Deleted ${allEvaluations.length} evaluations`);
    return { deletedCount: allEvaluations.length };
  },
});

// Internal functions for workflow
export const createEvaluationInternal = internalMutation({
  args: {
    userId: v.string(),
    repoUrl: v.string(),
    repoOwner: v.string(),
    repoName: v.string(),
    commitHash: v.string(),
    course: v.string(),
  },
  handler: async (ctx, args) => {
    const evaluationId = await ctx.db.insert("evaluations", {
      userId: args.userId,
      repoUrl: args.repoUrl,
      repoOwner: args.repoOwner,
      repoName: args.repoName,
      commitHash: args.commitHash,
      course: args.course,
      status: "pending",
      createdAt: Date.now(),
    });

    return evaluationId;
  },
});

// Get evaluation by ID (public query)
export const getEvaluationById = query({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Authentication required");
    }

    const userTier = await getUserTierFromDatabase(ctx, identity.subject);
    const evaluation = await ctx.db.get(args.evaluationId);

    // Only return evaluation if it belongs to the current user
    if (!evaluation || evaluation.userId !== identity.subject) {
      return null;
    }

    // Filter results based on user tier
    return filterEvaluationResults(evaluation, userTier);
  },
});

// Note: deleteEvaluation is already defined above, removing duplicate

export const getEvaluationByIdInternal = internalQuery({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.evaluationId);
  },
});

// Internal mutation for updating evaluation status
export const updateEvaluationStatusInternal = internalMutation({
  args: {
    evaluationId: v.id("evaluations"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    errorMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

// Internal query for checking existing evaluations (for caching)
export const getExistingEvaluationInternal = internalQuery({
  args: {
    commitHash: v.string(),
    course: v.string(),
  },
  handler: async (ctx, args) => {
    const existingEvaluation = await ctx.db
      .query("evaluations")
      .withIndex("byCommitAndCourse", (q) =>
        q.eq("commitHash", args.commitHash).eq("course", args.course)
      )
      .filter((q) => q.eq(q.field("status"), "completed"))
      .first();

    return existingEvaluation;
  },
});

// Internal mutation for updating evaluation results
export const updateEvaluationResultsInternal = internalMutation({
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
    await ctx.db.patch(args.evaluationId, {
      results: args.results,
      totalScore: args.results.totalScore,
      maxScore: args.results.maxScore,
      status: "completed",
      completedAt: Date.now(),
    });
  },
});

// Internal query for getting pending evaluations
export const getPendingEvaluationsInternal = internalQuery({
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

// Internal mutation for deleting evaluation
export const deleteEvaluationInternal = internalMutation({
  args: {
    evaluationId: v.id("evaluations"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.evaluationId);
  },
});
