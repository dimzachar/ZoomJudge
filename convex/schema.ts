import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

export default defineSchema({
    users: defineTable({
      name: v.string(),
      // this the Clerk ID, stored in the subject JWT field
      externalId: v.string(),
      isAdmin: v.optional(v.boolean()), // Admin role for security
    }).index("byExternalId", ["externalId"]),

    paymentAttempts: defineTable(paymentAttemptSchemaValidator)
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"])
      .index("byPayerUserId", ["payer.user_id"]),

    // Webhook logging for debugging and monitoring
    webhookLogs: defineTable({
      eventType: v.string(),
      eventData: v.any(),
      timestamp: v.number(),
      processed: v.boolean(),
      source: v.string(), // "clerk_subscription", "clerk_payment", etc.
    })
      .index("byEventType", ["eventType"])
      .index("byTimestamp", ["timestamp"])
      .index("byProcessed", ["processed"]),

    // Webhook error logging
    webhookErrors: defineTable({
      eventType: v.string(),
      eventData: v.any(),
      timestamp: v.number(),
      error: v.string(),
      source: v.string(),
    })
      .index("byEventType", ["eventType"])
      .index("byTimestamp", ["timestamp"]),

    // Payment logging for subscription management
    paymentLogs: defineTable({
      eventType: v.string(),
      eventData: v.any(),
      timestamp: v.number(),
      userId: v.string(),
      amount: v.number(),
      currency: v.string(),
      status: v.string(),
    })
      .index("byUserId", ["userId"])
      .index("byTimestamp", ["timestamp"])
      .index("byStatus", ["status"]),

    // Evaluations table for storing repository evaluation results
    evaluations: defineTable({
      userId: v.string(), // Clerk user ID
      repoUrl: v.string(),
      repoOwner: v.string(),
      repoName: v.string(),
      commitHash: v.string(), // Git commit hash for caching and versioning
      course: v.string(), // Course type (data-engineering, machine-learning, etc.)
      courseId: v.optional(v.string()), // Reference to the course document
      rubricVersion: v.optional(v.number()), // Version of rubric used for evaluation
      promptHash: v.optional(v.string()), // Hash of the prompt used for audit trail
      status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
      results: v.optional(v.object({
        totalScore: v.number(),
        maxScore: v.number(),
        breakdown: v.any(), // Flexible object for different course criteria
        overallFeedback: v.string(),
      })),
      totalScore: v.optional(v.number()),
      maxScore: v.optional(v.number()),
      errorMessage: v.optional(v.string()),
      createdAt: v.number(),
      completedAt: v.optional(v.number()),
      processingStartedAt: v.optional(v.number()),
    })
      .index("byUserId", ["userId"])
      .index("byStatus", ["status"])
      .index("byUserAndStatus", ["userId", "status"])
      .index("byCommitAndCourse", ["commitHash", "course"]) // For caching lookups
      .index("byCommitHash", ["commitHash"]) // For commit-based queries
      .index("byCreatedAt", ["createdAt"]),

    // Course definitions and criteria
    courses: defineTable({
      courseId: v.string(), // Unique identifier (data-engineering, machine-learning, etc.)
      courseName: v.string(), // Display name
      description: v.string(),
      maxScore: v.number(),
      criteria: v.array(v.object({
        name: v.string(),
        description: v.string(),
        maxScore: v.number(),
      })),
      rubricVersion: v.optional(v.number()), // Default 1, increment when criteria change
      promptTemplate: v.optional(v.string()), // Course-specific prompt preface
      isActive: v.boolean(),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("byCourseId", ["courseId"]),

    // User usage tracking for subscription management
    userUsage: defineTable({
      userId: v.string(), // Clerk user ID
      month: v.string(), // Format: YYYY-MM
      evaluationsCount: v.number(),
      subscriptionTier: v.string(), // free, starter, pro
      lastEvaluationAt: v.optional(v.number()),
      resetAt: v.number(), // When the monthly counter resets
      version: v.optional(v.number()), // For optimistic locking
    })
      .index("byUserId", ["userId"])
      .index("byUserAndMonth", ["userId", "month"])
      .index("byMonth", ["month"]),

    // User preferences and settings
    userPreferences: defineTable({
      userId: v.string(), // Clerk user ID
      emailNotifications: v.boolean(),
      pushNotifications: v.boolean(),
      marketingEmails: v.optional(v.boolean()),
      securityAlerts: v.optional(v.boolean()),
      weeklyReports: v.optional(v.boolean()),
      twoFactorEnabled: v.optional(v.boolean()),
      lastPasswordChange: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("byUserId", ["userId"]),

    // Ultimate Hybrid Architecture - Repository Signatures
    repositorySignatures: defineTable({
      repoUrl: v.string(),
      courseId: v.string(),
      signature: v.object({
        directoryStructure: v.array(v.string()),
        technologies: v.array(v.string()),
        fileTypes: v.any(), // Record<string, number>
        sizeCategory: v.union(v.literal("small"), v.literal("medium"), v.literal("large")),
        patternHash: v.string()
      }),
      createdAt: v.number(),
      lastUsed: v.number()
    }).index("byPatternHash", ["signature.patternHash"])
      .index("byCourse", ["courseId"])
      .index("byRepoUrl", ["repoUrl"]),

    // Ultimate Hybrid Architecture - Cached Strategies
    cachedStrategies: defineTable({
      signatureId: v.id("repositorySignatures"),
      courseId: v.string(),
      strategy: v.object({
        selectedFiles: v.array(v.string()),
        method: v.string(),
        confidence: v.number(),
        processingTime: v.number()
      }),
      performance: v.object({
        accuracy: v.number(),
        processingTime: v.number(),
        evaluationQuality: v.number(),
        usageCount: v.number(),
        successRate: v.number()
      }),
      metadata: v.object({
        createdAt: v.number(),
        lastUsed: v.number(),
        lastUpdated: v.number(),
        version: v.string()
      })
    }).index("bySignature", ["signatureId"])
      .index("byCourse", ["courseId"])
      .index("byLastUsed", ["metadata.lastUsed"]),

    // Ultimate Hybrid Architecture - Benchmark Results
    benchmarkResults: defineTable({
      testSuiteId: v.string(),
      systemType: v.union(v.literal("current"), v.literal("hybrid")),
      metrics: v.object({
        fileSelectionAccuracy: v.number(),
        processingSpeed: v.number(),
        tokenEfficiency: v.number(),
        cacheHitRate: v.optional(v.number()),
        evaluationQuality: v.number(),
        errorRate: v.number()
      }),
      timestamp: v.number()
    }).index("byTestSuite", ["testSuiteId"])
      .index("byTimestamp", ["timestamp"])
      .index("bySystemType", ["systemType"]),

    // Security Events for audit logging and monitoring
    securityEvents: defineTable({
      type: v.string(), // "billing_violation", "unauthorized_access", "admin_action", etc.
      userId: v.string(),
      timestamp: v.number(),
      details: v.any(),
      severity: v.string(), // "low", "medium", "high", "critical"
      ipAddress: v.optional(v.string()),
      userAgent: v.optional(v.string()),
    }).index("byType", ["type"])
      .index("byUserId", ["userId"])
      .index("byTimestamp", ["timestamp"])
      .index("bySeverity", ["severity"]),
  });