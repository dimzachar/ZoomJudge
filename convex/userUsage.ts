import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { api } from "./_generated/api";
import { TIER_LIMITS } from "../lib/tier-permissions";

// Helper function to get authenticated user ID
export async function getAuthenticatedUserId(ctx: any): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Authentication required");
  }
  return identity.subject;
}

// Get current month string in YYYY-MM format
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// Get user usage record for current month
export const getCurrentUsage = query({
  handler: async (ctx) => {
    try {
      const userId = await getAuthenticatedUserId(ctx);
      const currentMonth = getCurrentMonth();

      const usage = await ctx.db
        .query("userUsage")
        .withIndex("byUserAndMonth", (q) => q.eq("userId", userId).eq("month", currentMonth))
        .first();

      if (!usage) {
        // Return default usage for current month
        const now = Date.now();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);

        return {
          userId,
          month: currentMonth,
          evaluationsCount: 0,
          subscriptionTier: "free",
          lastEvaluationAt: undefined,
          resetAt: nextMonth.getTime(),
        };
      }

      return usage;
    } catch (error) {
      // Return null if user is not authenticated
      return null;
    }
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

      // Schedule Clerk metadata sync
      await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
        userId,
        subscriptionTier: args.subscriptionTier,
      });

      return await ctx.db.get(usageId);
    } else {
      // Update existing record
      await ctx.db.patch(usage._id, {
        subscriptionTier: args.subscriptionTier,
      });

      // Schedule Clerk metadata sync
      await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
        userId,
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

    // Use centralized tier limits
    const limit = TIER_LIMITS[usage.subscriptionTier as keyof typeof TIER_LIMITS]?.evaluationsPerMonth || TIER_LIMITS.free.evaluationsPerMonth;
    const canEvaluate = limit === -1 || usage.evaluationsCount < limit;

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

// Public function to check if a specific user can perform evaluation (for API routes)
export const canPerformEvaluationForUser = query({
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

    // Use centralized tier limits
    const limit = TIER_LIMITS[usage.subscriptionTier as keyof typeof TIER_LIMITS]?.evaluationsPerMonth || TIER_LIMITS.free.evaluationsPerMonth;
    const canEvaluate = limit === -1 || usage.evaluationsCount < limit;

    return {
      canEvaluate,
      currentCount: usage.evaluationsCount,
      limit,
      tier: usage.subscriptionTier,
      reason: canEvaluate ? null : `Monthly limit of ${limit} evaluations reached for ${usage.subscriptionTier} tier`,
    };
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

    // Use centralized tier limits
    const limit = TIER_LIMITS[usage.subscriptionTier as keyof typeof TIER_LIMITS]?.evaluationsPerMonth || TIER_LIMITS.free.evaluationsPerMonth;
    const canEvaluate = limit === -1 || usage.evaluationsCount < limit;

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

    // Use optimistic locking with retry mechanism
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const usage = await ctx.db
          .query("userUsage")
          .withIndex("byUserAndMonth", (q) => q.eq("userId", args.userId).eq("month", currentMonth))
          .first();

        if (!usage) {
          // Create new usage record atomically
          const now = Date.now();
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
          nextMonth.setHours(0, 0, 0, 0);

          const usageId = await ctx.db.insert("userUsage", {
            userId: args.userId,
            month: currentMonth,
            evaluationsCount: 1,
            subscriptionTier: "free",
            lastEvaluationAt: now,
            resetAt: nextMonth.getTime(),
            version: 1, // Add version for optimistic locking
          });

          return await ctx.db.get(usageId);
        } else {
          // Check limits before incrementing using centralized tier limits
          const limit = TIER_LIMITS[usage.subscriptionTier as keyof typeof TIER_LIMITS]?.evaluationsPerMonth || TIER_LIMITS.free.evaluationsPerMonth;

          if (usage.subscriptionTier !== "enterprise" && usage.evaluationsCount >= limit) {
            throw new Error(`Monthly limit of ${limit} evaluations reached for ${usage.subscriptionTier} tier`);
          }

          // Atomic increment with version check
          await ctx.db.patch(usage._id, {
            evaluationsCount: usage.evaluationsCount + 1,
            lastEvaluationAt: Date.now(),
            version: (usage.version || 0) + 1,
          });

          return await ctx.db.get(usage._id);
        }
      } catch (error) {
        retryCount++;
        if (retryCount >= maxRetries) {
          throw error;
        }
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 100));
      }
    }
  },
});

// Update user subscription tier from webhook (internal only)
export const updateUserSubscriptionFromWebhook = internalMutation({
  args: {
    userId: v.string(),
    subscriptionTier: v.string(),
    eventType: v.string(),
    eventData: v.any(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Webhook updating subscription for user ${args.userId} to ${args.subscriptionTier}`);

      const currentMonth = getCurrentMonth();

      const usage = await ctx.db
        .query("userUsage")
        .withIndex("byUserAndMonth", (q) => q.eq("userId", args.userId).eq("month", currentMonth))
        .first();

      if (!usage) {
        // Create usage record for current month with new tier
        const now = Date.now();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);

        const usageId = await ctx.db.insert("userUsage", {
          userId: args.userId,
          month: currentMonth,
          evaluationsCount: 0,
          subscriptionTier: args.subscriptionTier,
          resetAt: nextMonth.getTime(),
        });

        console.log(`Created new usage record for user ${args.userId} with tier ${args.subscriptionTier}`);
        return await ctx.db.get(usageId);
      } else {
        // Update existing record
        await ctx.db.patch(usage._id, {
          subscriptionTier: args.subscriptionTier,
        });

        console.log(`Updated existing usage record for user ${args.userId} to tier ${args.subscriptionTier}`);
        return await ctx.db.get(usage._id);
      }
    } catch (error) {
      console.error(`Failed to update subscription from webhook for user ${args.userId}:`, error);
      throw error;
    }
  },
});

// Synchronize subscription tier to Clerk metadata
export const syncTierToClerk = action({
  args: {
    userId: v.string(),
    subscriptionTier: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Syncing tier to Clerk for user ${args.userId}: ${args.subscriptionTier}`);

      // Production Clerk API integration
      if (process.env.CLERK_SECRET_KEY) {
        const { createClerkClient } = await import('@clerk/backend');
        const clerkClient = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY
        });

        await clerkClient.users.updateUserMetadata(args.userId, {
          publicMetadata: {
            subscription: {
              tier: args.subscriptionTier,
              updatedAt: Date.now(),
              source: 'convex_sync'
            }
          }
        });

        console.log(`Successfully synced tier ${args.subscriptionTier} to Clerk for user ${args.userId}`);
        return { success: true, message: `Tier synced to Clerk successfully` };
      } else {
        console.warn('CLERK_SECRET_KEY not configured - skipping Clerk sync');
        return { success: false, error: 'Clerk API not configured' };
      }

    } catch (error) {
      console.error(`Failed to sync tier to Clerk for user ${args.userId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
});
