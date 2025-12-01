import { mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/**
 * Secure Admin API Wrapper
 * 
 * This module provides public admin functions that properly check authentication
 * and authorization before calling internal admin functions.
 */

// Helper function to get authenticated user ID
const getAuthenticatedUserId = async (ctx: any): Promise<string> => {
  const userId = await ctx.auth.getUserIdentity();
  if (!userId) {
    throw new Error("Authentication required");
  }
  return userId.subject;
};

// Public wrapper for upgrading user to enterprise
export const adminUpgradeUser = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.upgradeUserToEnterprise, {
      userId: args.userId,
      adminUserId,
    });
  },
});

// Public wrapper for changing user subscription tier
export const adminChangeUserTier = mutation({
  args: {
    userId: v.string(),
    tier: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.changeUserTier, {
      userId: args.userId,
      tier: args.tier,
      adminUserId,
    });
  },
});

// Public wrapper for resetting user evaluation count
export const adminResetUserCount = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.resetUserEvaluationCount, {
      userId: args.userId,
      adminUserId,
    });
  },
});

// Public wrapper for getting all user usage statistics
export const adminGetAllUsage = mutation({
  args: {},
  handler: async (ctx): Promise<any[]> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.getAllUserUsage, {
      adminUserId,
    });
  },
});

// Public wrapper for creating test user
export const adminCreateTestUser = mutation({
  args: {
    userId: v.string(),
    tier: v.string(),
    evaluationCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; existing: boolean }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.createTestUser, {
      userId: args.userId,
      tier: args.tier,
      evaluationCount: args.evaluationCount,
      adminUserId,
    });
  },
});

// Public wrapper for force incrementing evaluation count (testing)
export const adminForceIncrement = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string; newCount?: number; tier?: string }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.forceIncrementEvaluation, {
      userId: args.userId,
      adminUserId,
    });
  },
});

// Public wrapper for getting test user info
export const adminGetTestUserInfo = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args): Promise<{ user: any; usage: any; currentMonth: string }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Call internal function with admin check
    return await ctx.runMutation(internal.adminUtils.getTestUserInfo, {
      userId: args.userId,
      adminUserId,
    });
  },
});

// Admin function to check if current user has admin privileges
export const checkAdminStatus = mutation({
  args: {},
  handler: async (ctx): Promise<{ isAdmin: boolean; userId: string }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Check admin permissions using security audit function
    return await ctx.runQuery(internal.securityAudit.checkAdminPermissions, {
      userId: adminUserId,
    });
  },
});

// Admin function to get security events
export const adminGetSecurityEvents = mutation({
  args: {
    limit: v.optional(v.number()),
    severity: v.optional(v.string()),
    type: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any[]> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Check admin permissions first
    const adminCheck = await ctx.runQuery(internal.securityAudit.checkAdminPermissions, {
      userId: adminUserId,
    });

    if (!adminCheck.isAdmin) {
      throw new Error("Unauthorized: Admin privileges required");
    }

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId,
      action: "get_security_events",
      details: args,
    });

    // Get security events
    return await ctx.runQuery(internal.securityAudit.getSecurityEvents, args);
  },
});

// Admin function to get security statistics
export const adminGetSecurityStats = mutation({
  args: {
    timeRange: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<any> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Check admin permissions first
    const adminCheck = await ctx.runQuery(internal.securityAudit.checkAdminPermissions, {
      userId: adminUserId,
    });

    if (!adminCheck.isAdmin) {
      throw new Error("Unauthorized: Admin privileges required");
    }

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId,
      action: "get_security_stats",
      details: args,
    });

    // Get security statistics
    return await ctx.runQuery(internal.securityAudit.getSecurityStats, args);
  },
});

// Admin function to cleanup old security events
export const adminCleanupSecurityEvents = mutation({
  args: {
    daysOld: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ deletedCount: number; cutoffTime: number }> => {
    const adminUserId = await getAuthenticatedUserId(ctx);

    // Check admin permissions first
    const adminCheck = await ctx.runQuery(internal.securityAudit.checkAdminPermissions, {
      userId: adminUserId,
    });

    if (!adminCheck.isAdmin) {
      throw new Error("Unauthorized: Admin privileges required");
    }

    // Log admin action
    await ctx.runMutation(internal.securityAudit.logAdminAction, {
      adminUserId,
      action: "cleanup_security_events",
      details: args,
    });

    // Cleanup old security events
    return await ctx.runMutation(internal.securityAudit.cleanupOldSecurityEvents, args);
  },
});
