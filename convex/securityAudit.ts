import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
// Setup console override to disable logging in production
import "../lib/console-override";

/**
 * Security Audit Module for ZoomJudge
 * 
 * This module provides comprehensive security event logging and monitoring
 * for billing violations, unauthorized access attempts, and admin actions.
 */

// Log billing limit violations
export const logBillingViolation = internalMutation({
  args: {
    userId: v.string(),
    attemptedAction: v.string(),
    currentUsage: v.number(),
    limit: v.number(),
    tier: v.string(),
    reason: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "billing_violation",
      userId: args.userId,
      timestamp: Date.now(),
      details: {
        attemptedAction: args.attemptedAction,
        currentUsage: args.currentUsage,
        limit: args.limit,
        tier: args.tier,
        reason: args.reason,
      },
      severity: "high",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    console.log(`🚨 BILLING VIOLATION: User ${args.userId} attempted ${args.attemptedAction} while at ${args.currentUsage}/${args.limit} limit`);
  },
});

// Log admin actions for audit trail
export const logAdminAction = internalMutation({
  args: {
    adminUserId: v.string(),
    action: v.string(),
    targetUserId: v.optional(v.string()),
    details: v.optional(v.any()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "admin_action",
      userId: args.adminUserId,
      timestamp: Date.now(),
      details: {
        action: args.action,
        targetUserId: args.targetUserId,
        ...args.details,
      },
      severity: "medium",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    console.log(`👤 ADMIN ACTION: ${args.adminUserId} performed ${args.action} on ${args.targetUserId || 'system'}`);
  },
});

// Log evaluation attempts (both successful and failed)
export const logEvaluationAttempt = internalMutation({
  args: {
    userId: v.string(),
    success: v.boolean(),
    reason: v.optional(v.string()),
    currentUsage: v.number(),
    limit: v.number(),
    tier: v.string(),
    evaluationId: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "evaluation_attempt",
      userId: args.userId,
      timestamp: Date.now(),
      details: {
        success: args.success,
        reason: args.reason,
        currentUsage: args.currentUsage,
        limit: args.limit,
        tier: args.tier,
        evaluationId: args.evaluationId,
      },
      severity: args.success ? "low" : "medium",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    if (!args.success) {
      console.log(`⚠️ EVALUATION BLOCKED: User ${args.userId} blocked - ${args.reason}`);
    }
  },
});

// Log unauthorized access attempts
export const logUnauthorizedAccess = internalMutation({
  args: {
    userId: v.optional(v.string()),
    attemptedResource: v.string(),
    reason: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "unauthorized_access",
      userId: args.userId || "anonymous",
      timestamp: Date.now(),
      details: {
        attemptedResource: args.attemptedResource,
        reason: args.reason,
      },
      severity: "high",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    console.log(`🔒 UNAUTHORIZED ACCESS: ${args.userId || 'Anonymous'} attempted to access ${args.attemptedResource}`);
  },
});

// Get security events for monitoring dashboard
export const getSecurityEvents = internalQuery({
  args: {
    limit: v.optional(v.number()),
    severity: v.optional(v.string()),
    type: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let events;

    // Use the most specific index available
    if (args.type) {
      events = await ctx.db
        .query("securityEvents")
        .withIndex("byType", (q: any) => q.eq("type", args.type))
        .order("desc")
        .take(args.limit || 100);
    } else if (args.userId) {
      events = await ctx.db
        .query("securityEvents")
        .withIndex("byUserId", (q: any) => q.eq("userId", args.userId))
        .order("desc")
        .take(args.limit || 100);
    } else {
      events = await ctx.db
        .query("securityEvents")
        .order("desc")
        .take(args.limit || 100);
    }

    // Filter by additional criteria if specified
    let filteredEvents = events;

    if (args.userId && !args.type) {
      // If we didn't use userId index, filter by userId
      filteredEvents = filteredEvents.filter(event => event.userId === args.userId);
    }

    if (args.severity) {
      filteredEvents = filteredEvents.filter(event => event.severity === args.severity);
    }

    return filteredEvents;
  },
});

// Get security statistics for dashboard
export const getSecurityStats = internalQuery({
  args: {
    timeRange: v.optional(v.number()), // Hours to look back
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || 24; // Default 24 hours
    const cutoffTime = Date.now() - (timeRange * 60 * 60 * 1000);

    const recentEvents = await ctx.db
      .query("securityEvents")
      .withIndex("byTimestamp", (q: any) => q.gte("timestamp", cutoffTime))
      .collect();

    const stats = {
      totalEvents: recentEvents.length,
      billingViolations: recentEvents.filter(e => e.type === "billing_violation").length,
      unauthorizedAccess: recentEvents.filter(e => e.type === "unauthorized_access").length,
      adminActions: recentEvents.filter(e => e.type === "admin_action").length,
      evaluationAttempts: recentEvents.filter(e => e.type === "evaluation_attempt").length,
      criticalEvents: recentEvents.filter(e => e.severity === "critical").length,
      highSeverityEvents: recentEvents.filter(e => e.severity === "high").length,
      timeRange: `${timeRange} hours`,
    };

    return stats;
  },
});

// Clean up old security events (for maintenance)
export const cleanupOldSecurityEvents = internalMutation({
  args: {
    daysOld: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const daysOld = args.daysOld || 90; // Default 90 days
    const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);

    const oldEvents = await ctx.db
      .query("securityEvents")
      .withIndex("byTimestamp", (q: any) => q.lt("timestamp", cutoffTime))
      .collect();

    let deletedCount = 0;
    for (const event of oldEvents) {
      await ctx.db.delete(event._id);
      deletedCount++;
    }

    console.log(`🧹 Cleaned up ${deletedCount} security events older than ${daysOld} days`);
    return { deletedCount, cutoffTime };
  },
});

// Check if user has admin permissions
export const checkAdminPermissions = internalQuery({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q: any) => q.eq("externalId", args.userId))
      .first();

    return {
      isAdmin: user?.isAdmin || false,
      userId: args.userId,
    };
  },
});

// Alert on critical security events (for external monitoring)
export const triggerSecurityAlert = internalMutation({
  args: {
    eventType: v.string(),
    severity: v.string(),
    details: v.any(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Log the alert
    await ctx.db.insert("securityEvents", {
      type: "security_alert",
      userId: args.userId || "system",
      timestamp: Date.now(),
      details: {
        alertType: args.eventType,
        ...args.details,
      },
      severity: args.severity,
    });

    // In a real implementation, you would also:
    // - Send email alerts
    // - Post to Slack/Discord
    // - Trigger monitoring system alerts
    // - etc.

    console.log(`🚨 SECURITY ALERT: ${args.eventType} (${args.severity}) - ${JSON.stringify(args.details)}`);
  },
});

// Log API access attempts (for monitoring API usage patterns)
export const logAPIAccess = internalMutation({
  args: {
    userId: v.optional(v.string()),
    endpoint: v.string(),
    method: v.string(),
    success: v.boolean(),
    responseTime: v.optional(v.number()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "api_access",
      userId: args.userId || "anonymous",
      timestamp: Date.now(),
      details: {
        endpoint: args.endpoint,
        method: args.method,
        success: args.success,
        responseTime: args.responseTime,
      },
      severity: args.success ? "low" : "medium",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });
  },
});

// Log suspicious activity patterns
export const logSuspiciousActivity = internalMutation({
  args: {
    userId: v.optional(v.string()),
    activityType: v.string(),
    description: v.string(),
    riskLevel: v.string(), // "low", "medium", "high", "critical"
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    details: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "suspicious_activity",
      userId: args.userId || "anonymous",
      timestamp: Date.now(),
      details: {
        activityType: args.activityType,
        description: args.description,
        riskLevel: args.riskLevel,
        ...args.details,
      },
      severity: args.riskLevel === "critical" ? "critical" : args.riskLevel === "high" ? "high" : "medium",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    console.log(`🔍 SUSPICIOUS ACTIVITY: ${args.activityType} - ${args.description} (Risk: ${args.riskLevel})`);
  },
});

// Log authentication events (login, logout, failed attempts)
export const logAuthenticationEvent = internalMutation({
  args: {
    userId: v.optional(v.string()),
    eventType: v.string(), // "login", "logout", "failed_login", "password_reset", etc.
    success: v.boolean(),
    reason: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("securityEvents", {
      type: "authentication",
      userId: args.userId || "anonymous",
      timestamp: Date.now(),
      details: {
        eventType: args.eventType,
        success: args.success,
        reason: args.reason,
      },
      severity: args.success ? "low" : "medium",
      ipAddress: args.ipAddress,
      userAgent: args.userAgent,
    });

    if (!args.success) {
      console.log(`🔐 AUTH FAILURE: ${args.eventType} failed for ${args.userId || 'anonymous'} - ${args.reason}`);
    }
  },
});
