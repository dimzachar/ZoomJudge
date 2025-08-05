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
      course: v.string(), // Course type (data-engineering, machine-learning, etc.)
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
        weight: v.number(), // Percentage weight in total score
      })),
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
  });