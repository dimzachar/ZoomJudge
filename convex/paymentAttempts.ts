import { internalMutation, query, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { paymentAttemptDataValidator } from "./paymentAttemptTypes";
import { getAuthenticatedUserId } from "./users";

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}

// Get payment attempts for the current user
export const getUserPaymentAttempts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getAuthenticatedUserId(ctx);

      // Get the user record to find the internal user ID
      const user = await userByExternalId(ctx, userId);
      if (!user) {
        return [];
      }

      const paymentAttempts = await ctx.db
        .query("paymentAttempts")
        .withIndex("byUserId", (q) => q.eq("userId", user._id))
        .order("desc")
        .take(args.limit || 50);

      return paymentAttempts;
    } catch (error) {
      // Return empty array if user is not authenticated
      return [];
    }
  },
});

export const savePaymentAttempt = internalMutation({
  args: { 
    paymentAttemptData: paymentAttemptDataValidator
  },
  returns: v.null(),
  handler: async (ctx, { paymentAttemptData }) => {
    // Find the user by the payer.user_id (which maps to externalId in our users table)
    const user = await userByExternalId(ctx, paymentAttemptData.payer.user_id);
    
    // Check if payment attempt already exists to avoid duplicates
    const existingPaymentAttempt = await ctx.db
      .query("paymentAttempts")
      .withIndex("byPaymentId", (q) => q.eq("payment_id", paymentAttemptData.payment_id))
      .unique();
    
    const paymentAttemptRecord = {
      ...paymentAttemptData,
      userId: user?._id, // Link to our users table if user exists
    };
    
    if (existingPaymentAttempt) {
      // Update existing payment attempt
      await ctx.db.patch(existingPaymentAttempt._id, paymentAttemptRecord);
    } else {
      // Create new payment attempt
      await ctx.db.insert("paymentAttempts", paymentAttemptRecord);
    }
    
    return null;
  },
}); 