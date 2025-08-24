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

    const feedbackId = await ctx.db.insert("feedback", {
      userId: identity.subject,
      type: args.type,
      title: args.title,
      description: args.description,
      context: args.context,
      createdAt: Date.now(),
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
