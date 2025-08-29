/**
 * Convex functions for Ultimate Hybrid Architecture caching system
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Repository signature type
const repositorySignatureValidator = v.object({
  directoryStructure: v.array(v.string()),
  technologies: v.array(v.string()),
  fileTypes: v.any(), // Record<string, number>
  sizeCategory: v.string(),
  patternHash: v.string()
});

// Cached strategy type
const cachedStrategyValidator = v.object({
  selectedFiles: v.array(v.string()),
  method: v.string(),
  confidence: v.number(),
  processingTime: v.number()
});

const performanceValidator = v.object({
  accuracy: v.number(),
  evaluationQuality: v.number(),
  usageCount: v.number(),
  successRate: v.number(),
  processingTime: v.optional(v.number())
});

const metadataValidator = v.object({
  createdAt: v.number(),
  lastUsed: v.number(),
  lastUpdated: v.number(),
  version: v.string()
});

/**
 * Store a repository signature
 */
export const storeRepositorySignature = mutation({
  args: {
    repoUrl: v.string(),
    courseId: v.string(),
    signature: repositorySignatureValidator
  },
  handler: async (ctx, args) => {
    // Check if signature already exists
    const existing = await ctx.db
      .query("repositorySignatures")
      .withIndex("byRepoUrl", (q) => q.eq("repoUrl", args.repoUrl))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .first();

    if (existing) {
      // Update last used timestamp
      await ctx.db.patch(existing._id, {
        lastUsed: Date.now()
      });
      return existing._id;
    }

    // Create new signature
    return await ctx.db.insert("repositorySignatures", {
      repoUrl: args.repoUrl,
      courseId: args.courseId,
      signature: {
        ...args.signature,
        sizeCategory: args.signature.sizeCategory as "small" | "medium" | "large"
      },
      createdAt: Date.now(),
      lastUsed: Date.now()
    });
  }
});

/**
 * Find similar repository signatures
 */
export const findSimilarSignatures = query({
  args: {
    courseId: v.string(),
    patternHash: v.string(),
    technologies: v.array(v.string()),
    sizeCategory: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 10;
    
    // First try exact pattern hash match
    const exactMatches = await ctx.db
      .query("repositorySignatures")
      .withIndex("byPatternHash", (q) => q.eq("signature.patternHash", args.patternHash))
      .filter((q) => q.eq(q.field("courseId"), args.courseId))
      .take(limit);

    if (exactMatches.length > 0) {
      return exactMatches;
    }

    // Fallback to course-based search for similarity calculation
    const courseSignatures = await ctx.db
      .query("repositorySignatures")
      .withIndex("byCourse", (q) => q.eq("courseId", args.courseId))
      .take(50); // Get more for similarity calculation

    return courseSignatures;
  }
});

/**
 * Store a cached strategy
 */
export const storeCachedStrategy = mutation({
  args: {
    signatureId: v.id("repositorySignatures"),
    courseId: v.string(),
    strategy: cachedStrategyValidator,
    performance: performanceValidator
  },
  handler: async (ctx, args) => {
    const metadata = {
      createdAt: Date.now(),
      lastUsed: Date.now(),
      lastUpdated: Date.now(),
      version: "1.0"
    };

    return await ctx.db.insert("cachedStrategies", {
      signatureId: args.signatureId,
      courseId: args.courseId,
      strategy: args.strategy,
      performance: {
        accuracy: args.performance.accuracy,
        processingTime: 0, // Default value since it's not provided in args
        evaluationQuality: args.performance.evaluationQuality,
        usageCount: args.performance.usageCount,
        successRate: args.performance.successRate
      },
      metadata
    });
  }
});

/**
 * Get cached strategies for a signature
 */
export const getCachedStrategies = query({
  args: {
    signatureId: v.id("repositorySignatures")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("cachedStrategies")
      .withIndex("bySignature", (q) => q.eq("signatureId", args.signatureId))
      .collect();
  }
});

/**
 * Update strategy usage
 */
export const updateStrategyUsage = mutation({
  args: {
    strategyId: v.id("cachedStrategies"),
    success: v.boolean(),
    evaluationQuality: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const strategy = await ctx.db.get(args.strategyId);
    if (!strategy) return;

    const newUsageCount = strategy.performance.usageCount + 1;
    const newSuccessCount = strategy.performance.successRate * strategy.performance.usageCount + (args.success ? 1 : 0);
    const newSuccessRate = newSuccessCount / newUsageCount;

    const updatedPerformance = {
      ...strategy.performance,
      usageCount: newUsageCount,
      successRate: newSuccessRate
    };

    if (args.evaluationQuality !== undefined) {
      // Update average evaluation quality
      const currentAvg = strategy.performance.evaluationQuality;
      const newAvg = (currentAvg * (newUsageCount - 1) + args.evaluationQuality) / newUsageCount;
      updatedPerformance.evaluationQuality = newAvg;
    }

    await ctx.db.patch(args.strategyId, {
      performance: updatedPerformance,
      metadata: {
        ...strategy.metadata,
        lastUsed: Date.now(),
        lastUpdated: Date.now()
      }
    });
  }
});

/**
 * Get cache statistics
 */
export const getCacheStats = query({
  args: {},
  handler: async (ctx) => {
    const signatures = await ctx.db.query("repositorySignatures").collect();
    const strategies = await ctx.db.query("cachedStrategies").collect();

    const totalUsage = strategies.reduce((sum, s) => sum + s.performance.usageCount, 0);
    const averageSuccessRate = strategies.length > 0 
      ? strategies.reduce((sum, s) => sum + s.performance.successRate, 0) / strategies.length 
      : 0;

    return {
      totalSignatures: signatures.length,
      totalStrategies: strategies.length,
      totalUsage,
      averageSuccessRate,
      cacheSize: strategies.length
    };
  }
});

/**
 * Store benchmark result
 */
export const storeBenchmarkResult = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("benchmarkResults", {
      testSuiteId: args.testSuiteId,
      systemType: args.systemType,
      metrics: args.metrics,
      timestamp: args.timestamp
    });
  }
});

/**
 * Get benchmark results for a test suite
 */
export const getBenchmarkResults = query({
  args: {
    testSuiteId: v.string()
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("benchmarkResults")
      .withIndex("byTestSuite", (q) => q.eq("testSuiteId", args.testSuiteId))
      .collect();
  }
});

/**
 * Clean up old cache entries (for maintenance)
 */
export const cleanupOldCacheEntries = mutation({
  args: {
    maxAge: v.number(), // Age in milliseconds
    maxEntries: v.number()
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.maxAge;

    // Get old strategies
    const oldStrategies = await ctx.db
      .query("cachedStrategies")
      .withIndex("byLastUsed", (q) => q.lt("metadata.lastUsed", cutoffTime))
      .take(args.maxEntries);

    // Delete old strategies
    for (const strategy of oldStrategies) {
      await ctx.db.delete(strategy._id);
    }

    return {
      deletedCount: oldStrategies.length
    };
  }
});
