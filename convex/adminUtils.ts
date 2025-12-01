import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { api } from "./_generated/api";

// Check if user has admin permissions
const checkAdminPermissions = async (ctx: any, userId: string) => {
  const user = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q: any) => q.eq("externalId", userId))
    .first();

  if (!user?.isAdmin) {
    throw new Error("Unauthorized: Admin privileges required");
  }
};

// Admin utility to upgrade user to enterprise tier
export const upgradeUserToEnterprise = internalMutation({
  args: {
    userId: v.string(),
    adminUserId: v.string(), // Add admin user ID
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "upgrade_user_to_enterprise",
      targetUserId: args.userId,
    });
    // Find current usage record
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q: any) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (usage) {
      // Update existing record to enterprise tier
      await ctx.db.patch(usage._id, {
        subscriptionTier: "enterprise",
        evaluationsCount: 0, // Reset count
      });

      // Schedule Clerk metadata sync
      await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
        userId: args.userId,
        subscriptionTier: "enterprise",
      });

      return { success: true, message: `User ${args.userId} upgraded to enterprise tier` };
    } else {
      // Create new enterprise usage record
      const now = Date.now();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      await ctx.db.insert("userUsage", {
        userId: args.userId,
        month: currentMonth,
        evaluationsCount: 0,
        subscriptionTier: "enterprise",
        resetAt: nextMonth.getTime(),
      });

      // Schedule Clerk metadata sync
      await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
        userId: args.userId,
        subscriptionTier: "enterprise",
      });

      return { success: true, message: `Enterprise usage record created for user ${args.userId}` };
    }
  },
});

// Admin utility to change user subscription tier
export const changeUserTier = internalMutation({
  args: {
    userId: v.string(),
    tier: v.string(),
    adminUserId: v.string(),
  },
  handler: async (ctx, args) => {
    // Validate tier
    const validTiers = ["free", "starter", "pro", "enterprise"];
    if (!validTiers.includes(args.tier)) {
      throw new Error(`Invalid tier: ${args.tier}. Valid tiers are: ${validTiers.join(", ")}`);
    }

    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "change_user_tier",
      targetUserId: args.userId,
      details: { tier: args.tier },
    });

    // Find current usage record
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q: any) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (usage) {
      // Update existing record to new tier
      await ctx.db.patch(usage._id, {
        subscriptionTier: args.tier,
      });

      // Schedule Clerk metadata sync
      await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
        userId: args.userId,
        subscriptionTier: args.tier,
      });

      return { success: true, message: `User ${args.userId} changed to ${args.tier} tier` };
    } else {
      // Create new usage record with specified tier
      const now = Date.now();
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
      nextMonth.setHours(0, 0, 0, 0);

      await ctx.db.insert("userUsage", {
        userId: args.userId,
        month: currentMonth,
        evaluationsCount: 0,
        subscriptionTier: args.tier,
        resetAt: nextMonth.getTime(),
      });

      // Schedule Clerk metadata sync
      await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
        userId: args.userId,
        subscriptionTier: args.tier,
      });

      return { success: true, message: `${args.tier} usage record created for user ${args.userId}` };
    }
  },
});

// Admin utility to reset user evaluation count
export const resetUserEvaluationCount = internalMutation({
  args: {
    userId: v.string(),
    adminUserId: v.string(), // Add admin user ID
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "reset_user_evaluation_count",
      targetUserId: args.userId,
    });
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q: any) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (usage) {
      await ctx.db.patch(usage._id, {
        evaluationsCount: 0,
      });
      
      return { success: true, message: `Evaluation count reset for user ${args.userId}` };
    } else {
      return { success: false, message: `No usage record found for user ${args.userId}` };
    }
  },
});

// Admin utility to get all user usage statistics
export const getAllUserUsage = internalMutation({
  args: {
    adminUserId: v.string(), // Add admin user ID
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "get_all_user_usage",
    });
    const allUsage = await ctx.db
      .query("userUsage")
      .order("desc")
      .take(100);

    return allUsage;
  },
});

// Create test user with specific tier for security testing
export const createTestUser = internalMutation({
  args: {
    userId: v.string(),
    tier: v.string(),
    evaluationCount: v.optional(v.number()),
    adminUserId: v.string(), // Add admin user ID
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "create_test_user",
      targetUserId: args.userId,
      details: { tier: args.tier, evaluationCount: args.evaluationCount },
    });
    const currentMonth = new Date().toISOString().slice(0, 7);
    const now = Date.now();
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    nextMonth.setHours(0, 0, 0, 0);

    // Check if user already exists
    const existingUsage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q: any) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (existingUsage) {
      // Update existing user
      await ctx.db.patch(existingUsage._id, {
        subscriptionTier: args.tier,
        evaluationsCount: args.evaluationCount || 0,
      });
      return { success: true, message: `Test user ${args.userId} updated`, existing: true };
    } else {
      // Create new test user
      await ctx.db.insert("userUsage", {
        userId: args.userId,
        month: currentMonth,
        evaluationsCount: args.evaluationCount || 0,
        subscriptionTier: args.tier,
        resetAt: nextMonth.getTime(),
      });
      return { success: true, message: `Test user ${args.userId} created`, existing: false };
    }
  },
});

// Security testing: Force increment evaluation count (simulates bypass attempt)
export const forceIncrementEvaluation = internalMutation({
  args: {
    userId: v.string(),
    adminUserId: v.string(), // Add admin user ID
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "force_increment_evaluation",
      targetUserId: args.userId,
    });
    const currentMonth = new Date().toISOString().slice(0, 7);

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q: any) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    if (usage) {
      await ctx.db.patch(usage._id, {
        evaluationsCount: usage.evaluationsCount + 1,
        lastEvaluationAt: Date.now(),
      });

      return {
        success: true,
        newCount: usage.evaluationsCount + 1,
        tier: usage.subscriptionTier,
        message: `Evaluation count incremented for ${args.userId}`
      };
    } else {
      return { success: false, message: `No usage record found for user ${args.userId}` };
    }
  },
});

// Get detailed user info for testing
export const getTestUserInfo = internalMutation({
  args: {
    userId: v.string(),
    adminUserId: v.string(), // Add admin user ID
  },
  handler: async (ctx, args) => {
    // Check admin permissions
    await checkAdminPermissions(ctx, args.adminUserId);

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId: args.adminUserId,
      action: "get_test_user_info",
      targetUserId: args.userId,
    });
    const currentMonth = new Date().toISOString().slice(0, 7);

    const usage = await ctx.db
      .query("userUsage")
      .withIndex("byUserAndMonth", (q: any) => q.eq("userId", args.userId).eq("month", currentMonth))
      .first();

    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q: any) => q.eq("externalId", args.userId))
      .first();

    return {
      user,
      usage,
      currentMonth,
    };
  },
});
