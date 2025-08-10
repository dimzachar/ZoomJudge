import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { paymentAttemptSchemaValidator } from "./paymentAttemptTypes";

export default defineSchema({
    users: defineTable({
      name: v.string(),
      // this the Clerk ID, stored in the subject JWT field
      externalId: v.string(),
    }).index("byExternalId", ["externalId"]),

    paymentAttempts: defineTable(paymentAttemptSchemaValidator)
      .index("byPaymentId", ["payment_id"])
      .index("byUserId", ["userId"])
      .index("byPayerUserId", ["payer.user_id"]),

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
  });