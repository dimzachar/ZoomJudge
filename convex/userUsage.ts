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

// Get current month string in YYYY-MM format
function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get user usage record for current month
export const getCurrentUsage = query({
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    const currentMonth = getCurrentMonth();

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q) => q.eq("userId", userId).eq("month", currentMonth))
      .first();

    return usage;
  },
});

// Increment evaluation count for user
export const incrementEvaluationCount = mutation({
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);

    const currentMonth = getCurrentMonth();
    
    let usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q) => q.eq("userId", userId).eq("month", currentMonth))
      .first();

    if (!usage) {
      // Create usage record for current month
      const now = Date.now();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      const usageId = await ctx.db.insert("userUsage", {
        userId,
        month: currentMonth,
        evaluationsCount: 1,
        subscriptionTier: "free", // Default tier
        lastEvaluationAt: now,
        resetAt: nextMonth.getTime(),
      });

      return await ctx.db.get(usageId);
    } else {
      // Increment existing count
      await ctx.db.patch(usage._id, {
        evaluationsCount: usage.evaluationsCount + 1,
        lastEvaluationAt: Date.now(),
      });

      return await ctx.db.get(usage._id);
    }
  },
});

// Update user subscription tier
export const updateSubscriptionTier = mutation({
  args: {
    subscriptionTier: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const currentMonth = getCurrentMonth();
    
    let usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q) => q.eq("userId", userId).eq("month", currentMonth))
      .first();

    if (!usage) {
      // Create usage record for current month with new tier
      const now = Date.now();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      const usageId = await ctx.db.insert("userUsage", {
        userId,
        month: currentMonth,
        evaluationsCount: 0,
        subscriptionTier: args.subscriptionTier,
        resetAt: nextMonth.getTime(),
      });

      return await ctx.db.get(usageId);
    } else {
      // Update existing record
      await ctx.db.patch(usage._id, {
        subscriptionTier: args.subscriptionTier,
      });

      return await ctx.db.get(usage._id);
    }
  },
});

// Check if user can perform evaluation based on their tier limits
export const canPerformEvaluation = query({
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    const currentMonth = getCurrentMonth();

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q) => q.eq("userId", userId).eq("month", currentMonth))
      .first();

    if (!usage) {
      return { canEvaluate: true, reason: "No usage record found" };
    }

    // Define tier limits
    const tierLimits: Record<string, number> = {
      free: 5,
      starter: 50,
      pro: 500,
    };

    const limit = tierLimits[usage.subscriptionTier] || tierLimits.free;
    const canEvaluate = usage.evaluationsCount < limit;

    return {
      canEvaluate,
      currentCount: usage.evaluationsCount,
      limit,
      tier: usage.subscriptionTier,
      reason: canEvaluate ? null : `Monthly limit of ${limit} evaluations reached for ${usage.subscriptionTier} tier`,
    };
  },
});

// Get user usage history
export const getUserUsageHistory = query({
  args: {
    months: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    const monthsToFetch = args.months || 12;
    
    const usageHistory = await ctx.db
      .query("userUsage")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(monthsToFetch);

    return usageHistory;
  },
});

// Get usage statistics for all users (admin function)
export const getUsageStatistics = query({
  args: {
    month: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // In a real app, you'd want to check for admin permissions here
    
    const targetMonth = args.month || getCurrentMonth();
    
    const monthlyUsage = await ctx.db
      .query("userUsage")
      .withIndex("byMonth", (q) => q.eq("month", targetMonth))
      .collect();

    const stats = {
      totalUsers: monthlyUsage.length,
      totalEvaluations: monthlyUsage.reduce((sum, usage) => sum + usage.evaluationsCount, 0),
      tierBreakdown: {
        free: monthlyUsage.filter(u => u.subscriptionTier === "free").length,
        starter: monthlyUsage.filter(u => u.subscriptionTier === "starter").length,
        pro: monthlyUsage.filter(u => u.subscriptionTier === "pro").length,
      },
      averageEvaluationsPerUser: 0,
      month: targetMonth,
    };

    if (stats.totalUsers > 0) {
      stats.averageEvaluationsPerUser = stats.totalEvaluations / stats.totalUsers;
    }

    return stats;
  },
});

// Reset monthly usage (typically called by a cron job)
export const resetMonthlyUsage = mutation({
  handler: async (ctx) => {
    const currentMonth = getCurrentMonth();
    const now = Date.now();

    // Get all usage records that need to be reset
    const usageRecords = await ctx.db
      .query("userUsage")
      .filter((q) => q.lt(q.field("resetAt"), now))
      .collect();

    const resetCount = usageRecords.length;

    // Reset each record
    for (const usage of usageRecords) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      await ctx.db.patch(usage._id, {
        month: currentMonth,
        evaluationsCount: 0,
        resetAt: nextMonth.getTime(),
      });
    }

    return { resetCount, message: `Reset ${resetCount} usage records` };
  },
});

// Internal functions for workflow
export const canPerformEvaluationInternal = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentMonth = getCurrentMonth();

    let usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (!usage) {
      return { canEvaluate: true, reason: "No usage record found" };
    }

    // Define tier limits
    const tierLimits: Record<string, number> = {
      free: 5,
      starter: 50,
      pro: 500,
    };

    const limit = tierLimits[usage.subscriptionTier] || tierLimits.free;
    const canEvaluate = usage.evaluationsCount < limit;

    return {
      canEvaluate,
      currentCount: usage.evaluationsCount,
      limit,
      tier: usage.subscriptionTier,
      reason: canEvaluate ? null : `Monthly limit of ${limit} evaluations reached for ${usage.subscriptionTier} tier`,
    };
  },
});

export const incrementEvaluationCountInternal = internalMutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentMonth = getCurrentMonth();

    let usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (!usage) {
      // Create usage record for current month
      const now = Date.now();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      const usageId = await ctx.db.insert("userUsage", {
        userId: args.userId,
        month: currentMonth,
        evaluationsCount: 1,
        subscriptionTier: "free", // Default tier
        lastEvaluationAt: now,
        resetAt: nextMonth.getTime(),
      });

      return await ctx.db.get(usageId);
    } else {
      // Increment existing count
      await ctx.db.patch(usage._id, {
        evaluationsCount: usage.evaluationsCount + 1,
        lastEvaluationAt: Date.now(),
      });

      return await ctx.db.get(usage._id);
    }
  },
});
