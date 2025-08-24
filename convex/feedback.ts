import { mutation, query } from "./_generated/server"
import { v, ConvexError } from "convex/values"


export const submitFeedback = mutation({
  args: {
    type: v.union(v.literal("bug"), v.literal("feature"), v.literal("general")),
    title: v.string(),
    description: v.string(),
    context: v.optional(v.object({
      page: v.string(),
      userAgent: v.string(),
      evaluationId: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      return { success: false, error: "Not authenticated" }
    }

    // Rate limiting: Check submissions in the last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    const recentFeedback = await ctx.db
      .query("feedback")
      .withIndex("byUserId", (q) => q.eq("userId", identity.subject))
      .filter((q) => q.gte(q.field("createdAt"), oneDayAgo))
      .collect()

    if (recentFeedback.length >= 5) {
      return { success: false, error: "Rate limit exceeded. You can submit a maximum of 5 feedback items per day." }
    }

    // Fetch user context information for better analytics
    let userName = "Unknown User"
    let userPlanType = "free"

    try {
      // Get user's display name from users table
      const user = await ctx.db
        .query("users")
        .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
        .first()

      if (user) {
        userName = user.name
      }

      // Get user's current subscription tier from userUsage table
      const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
      const usage = await ctx.db
        .query("userUsage")
        .withIndex("byUserAndMonth", (q) => q.eq("userId", identity.subject).eq("month", currentMonth))
        .first()

      if (usage) {
        userPlanType = usage.subscriptionTier
      }
    } catch (error) {
      // Log error but don't fail feedback submission
      console.warn("Failed to fetch user context for feedback:", error)
    }

    const feedbackId = await ctx.db.insert("feedback", {
      userId: identity.subject,
      type: args.type,
      title: args.title,
      description: args.description,
      context: args.context,
      createdAt: Date.now(),
      userName,
      userPlanType,
    })

    return { success: true, feedbackId }
  },
})

export const getFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError("Not authenticated")
    }

    // Check if user is admin (you'll need to implement this check)
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first()

    if (!user?.isAdmin) {
      throw new ConvexError("Not authorized")
    }

    return await ctx.db
      .query("feedback")
      .order("desc")
      .take(args.limit ?? 50)
  },
})

export const getUserFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError("Not authenticated")
    }

    return await ctx.db
      .query("feedback")
      .withIndex("byUserId", (q) => q.eq("userId", identity.subject))
      .order("desc")
      .take(args.limit ?? 20)
  },
})

// Migration function to backfill existing feedback records with user context
export const backfillFeedbackUserContext = mutation({
  args: {
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new ConvexError("Not authenticated")
    }

    // Check if user is admin
    const user = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first()

    if (!user?.isAdmin) {
      throw new ConvexError("Not authorized - admin access required")
    }

    const batchSize = args.batchSize ?? 50
    let processedCount = 0
    let updatedCount = 0
    let errorCount = 0

    // Get feedback records that don't have user context information
    const feedbackRecords = await ctx.db
      .query("feedback")
      .filter((q) => q.or(
        q.eq(q.field("userName"), undefined),
        q.eq(q.field("userPlanType"), undefined)
      ))
      .take(batchSize)

    console.log(`Processing ${feedbackRecords.length} feedback records for backfill`)

    for (const feedback of feedbackRecords) {
      try {
        processedCount++

        // Skip if already has both fields
        if (feedback.userName && feedback.userPlanType) {
          continue
        }

        let userName = feedback.userName || "Unknown User"
        let userPlanType = feedback.userPlanType || "free"

        // Get user's display name if not already set
        if (!feedback.userName) {
          const userRecord = await ctx.db
            .query("users")
            .withIndex("byExternalId", (q) => q.eq("externalId", feedback.userId))
            .first()

          if (userRecord) {
            userName = userRecord.name
          }
        }

        // Get user's current subscription tier if not already set
        if (!feedback.userPlanType) {
          const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM format
          const usage = await ctx.db
            .query("userUsage")
            .withIndex("byUserAndMonth", (q) => q.eq("userId", feedback.userId).eq("month", currentMonth))
            .first()

          if (usage) {
            userPlanType = usage.subscriptionTier
          }
        }

        // Update the feedback record
        await ctx.db.patch(feedback._id, {
          userName,
          userPlanType,
        })

        updatedCount++
      } catch (error) {
        errorCount++
        console.error(`Failed to update feedback ${feedback._id}:`, error)
      }
    }

    return {
      success: true,
      processedCount,
      updatedCount,
      errorCount,
      hasMore: feedbackRecords.length === batchSize,
    }
  },
})


