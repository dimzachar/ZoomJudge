import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { getAuthenticatedUserId, getCurrentMonth } from "./userUsage";

/**
 * Production-ready subscription management system
 * Handles all Clerk subscription events and maintains data consistency
 */

// Subscription status enum
const SUBSCRIPTION_STATUS = {
  ACTIVE: "active",
  CANCELLED: "cancelled",
  PAUSED: "paused",
  EXPIRED: "expired",
  PENDING: "pending"
} as const;

// Tier mapping from Clerk plan names to internal tiers
const PLAN_TIER_MAPPING = {
  "starter": "starter",
  "pro": "pro", 
  "enterprise": "enterprise",
  "free": "free"
} as const;

/**
 * Handle subscription webhook events from Clerk
 */
export const handleSubscriptionWebhook = internalMutation({
  args: {
    eventType: v.string(),
    eventData: v.any(),
    timestamp: v.number()
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Processing subscription webhook: ${args.eventType}`, args.eventData);

      // Log webhook event for debugging
      await ctx.db.insert("webhookLogs", {
        eventType: args.eventType,
        eventData: args.eventData,
        timestamp: args.timestamp,
        processed: false,
        source: "clerk_subscription"
      });

      // Extract user ID from various possible locations
      const userId = extractUserId(args.eventData);
      if (!userId) {
        console.error("No user ID found in subscription webhook data");
        return { success: false, error: "No user ID found" };
      }

      // Extract subscription details
      const subscriptionDetails = extractSubscriptionDetails(args.eventData);
      
      // Process based on event type
      switch (args.eventType) {
        case "subscription.created":
        case "subscriptionItem.created":
        case "subscriptionItem.active":
        case "subscription.updated":
        case "subscriptionItem.updated":
          await handleSubscriptionActivation(ctx, userId, subscriptionDetails, args.eventType);
          break;

        case "subscription.deleted":
        case "subscriptionItem.deleted":
        case "subscriptionItem.cancelled":
          await handleSubscriptionCancellation(ctx, userId, args.eventType);
          break;

        case "subscriptionItem.paused":
          await handleSubscriptionPause(ctx, userId, args.eventType);
          break;

        case "subscriptionItem.resumed":
          await handleSubscriptionResumption(ctx, userId, subscriptionDetails, args.eventType);
          break;

        default:
          console.log(`Unhandled subscription event type: ${args.eventType}`);
      }

      // Mark webhook as processed
      const webhookLog = await ctx.db
        .query("webhookLogs")
        .filter(q => q.eq(q.field("timestamp"), args.timestamp))
        .first();
      
      if (webhookLog) {
        await ctx.db.patch(webhookLog._id, { processed: true });
      }

      return { success: true };

    } catch (error) {
      console.error(`Failed to process subscription webhook:`, error);
      
      // Log error for monitoring
      await ctx.db.insert("webhookErrors", {
        eventType: args.eventType,
        eventData: args.eventData,
        timestamp: args.timestamp,
        error: error instanceof Error ? error.message : "Unknown error",
        source: "clerk_subscription"
      });

      throw error;
    }
  }
});

/**
 * Handle payment webhook events from Clerk
 */
export const handlePaymentWebhook = internalMutation({
  args: {
    eventType: v.string(),
    eventData: v.any(),
    timestamp: v.number()
  },
  handler: async (ctx, args) => {
    try {
      console.log(`Processing payment webhook: ${args.eventType}`, args.eventData);

      const userId = extractUserId(args.eventData);
      if (!userId) {
        console.error("No user ID found in payment webhook data");
        return { success: false, error: "No user ID found" };
      }

      // Log payment event
      await ctx.db.insert("paymentLogs", {
        eventType: args.eventType,
        eventData: args.eventData,
        timestamp: args.timestamp,
        userId: userId,
        amount: args.eventData.amount || 0,
        currency: args.eventData.currency || "USD",
        status: args.eventData.status || "unknown"
      });

      if (args.eventType === "paymentAttempt.succeeded") {
        // Payment succeeded - activate subscription if not already active
        await ensureSubscriptionActive(ctx, userId, args.eventData);
      }

      return { success: true };

    } catch (error) {
      console.error(`Failed to process payment webhook:`, error);
      throw error;
    }
  }
});

/**
 * Get current subscription status for a user
 */
export const getCurrentSubscription = query({
  handler: async (ctx) => {
    const userId = await getAuthenticatedUserId(ctx);
    return await getUserSubscription(ctx, userId);
  }
});

/**
 * Manually sync subscription from Clerk (for admin/debugging)
 */
export const syncSubscriptionFromClerk = mutation({
  args: {
    forceRefresh: v.optional(v.boolean())
  },
  handler: async (ctx, args) => {
    const userId = await getAuthenticatedUserId(ctx);

    try {
      // First, try to get subscription from Clerk API
      if (process.env.CLERK_SECRET_KEY) {
        const { createClerkClient } = await import('@clerk/backend');
        const clerkClient = createClerkClient({
          secretKey: process.env.CLERK_SECRET_KEY
        });

        const user = await clerkClient.users.getUser(userId);
        const subscription = user.publicMetadata?.subscription as any;

        if (subscription?.tier && subscription.tier !== "free") {
          // Update user subscription from Clerk metadata
          await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
            userId,
            subscriptionTier: subscription.tier,
            eventType: "clerk_api_sync",
            eventData: { source: "clerk_metadata", subscription }
          });

          return { success: true, tier: subscription.tier, source: "clerk_api" };
        }
      }

      // Fallback: check payment logs
      const recentPayments = await ctx.db
        .query("paymentLogs")
        .filter(q => q.eq(q.field("userId"), userId))
        .order("desc")
        .take(5);

      if (recentPayments.length > 0) {
        const latestPayment = recentPayments[0];

        // Determine tier from payment amount
        let tier = "free";
        if (latestPayment.amount === 1200) { // $12.00 in cents
          tier = "starter";
        } else if (latestPayment.amount === 2000) { // $20.00 in cents
          tier = "pro";
        }

        // Update user subscription
        await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
          userId,
          subscriptionTier: tier,
          eventType: "payment_log_sync",
          eventData: { source: "payment_log_recovery", amount: latestPayment.amount }
        });

        return { success: true, tier, source: "payment_logs" };
      }

      return { success: false, error: "No subscription data found in Clerk or payment logs" };

    } catch (error) {
      console.error("Failed to sync subscription from Clerk:", error);
      return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
    }
  }
});

/**
 * Admin function to manually set user subscription tier
 */
export const setUserSubscriptionTier = mutation({
  args: {
    targetUserId: v.optional(v.string()),
    subscriptionTier: v.string(),
    reason: v.string()
  },
  handler: async (ctx, args) => {
    const adminUserId = await getAuthenticatedUserId(ctx);
    const targetUserId = args.targetUserId || adminUserId;

    // Log admin action
    console.log(`Admin ${adminUserId} setting subscription tier for user ${targetUserId} to ${args.subscriptionTier}. Reason: ${args.reason}`);

    // Update subscription
    await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
      userId: targetUserId,
      subscriptionTier: args.subscriptionTier,
      eventType: "admin_override",
      eventData: {
        adminUserId,
        reason: args.reason,
        timestamp: Date.now()
      }
    });

    // Schedule Clerk sync
    await ctx.scheduler.runAfter(0, api.userUsage.syncTierToClerk, {
      userId: targetUserId,
      subscriptionTier: args.subscriptionTier
    });

    return {
      success: true,
      message: `User ${targetUserId} subscription set to ${args.subscriptionTier}`,
      adminUserId,
      reason: args.reason
    };
  }
});

// Helper functions
function extractUserId(eventData: any): string | null {
  return eventData.user_id || 
         eventData.userId || 
         eventData.object?.user_id ||
         eventData.object?.userId ||
         eventData.subscription?.user_id ||
         eventData.subscription?.userId ||
         eventData.payer?.user_id ||
         null;
}

function extractSubscriptionDetails(eventData: any) {
  const planName = eventData.plan?.name || 
                   eventData.object?.plan?.name ||
                   eventData.subscription?.plan?.name ||
                   eventData.price?.nickname ||
                   "";

  const status = eventData.status || 
                 eventData.object?.status ||
                 eventData.subscription?.status ||
                 SUBSCRIPTION_STATUS.ACTIVE;

  // Map plan name to tier
  let tier = "free";
  const lowerPlanName = planName.toLowerCase();
  
  if (lowerPlanName.includes("starter")) {
    tier = "starter";
  } else if (lowerPlanName.includes("pro")) {
    tier = "pro";
  } else if (lowerPlanName.includes("enterprise")) {
    tier = "enterprise";
  }

  return {
    planName,
    tier,
    status,
    amount: eventData.amount || eventData.object?.amount || 0,
    currency: eventData.currency || eventData.object?.currency || "USD"
  };
}

async function handleSubscriptionActivation(ctx: any, userId: string, details: any, eventType: string) {
  console.log(`Activating subscription for user ${userId} to tier ${details.tier}`);
  
  await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
    userId,
    subscriptionTier: details.tier,
    eventType,
    eventData: details
  });
}

async function handleSubscriptionCancellation(ctx: any, userId: string, eventType: string) {
  console.log(`Cancelling subscription for user ${userId}`);
  
  await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
    userId,
    subscriptionTier: "free",
    eventType,
    eventData: { cancelled: true }
  });
}

async function handleSubscriptionPause(ctx: any, userId: string, eventType: string) {
  console.log(`Pausing subscription for user ${userId}`);
  // For paused subscriptions, we might want to keep the tier but mark as inactive
  // For now, we'll downgrade to free
  await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
    userId,
    subscriptionTier: "free",
    eventType,
    eventData: { paused: true }
  });
}

async function handleSubscriptionResumption(ctx: any, userId: string, details: any, eventType: string) {
  console.log(`Resuming subscription for user ${userId} to tier ${details.tier}`);
  
  await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
    userId,
    subscriptionTier: details.tier,
    eventType,
    eventData: details
  });
}

async function ensureSubscriptionActive(ctx: any, userId: string, paymentData: any) {
  // Check if user already has active subscription
  const currentUsage = await ctx.db
    .query("userUsage")
    .withIndex("byUserAndMonth", (q: any) => q.eq("userId", userId).eq("month", getCurrentMonth()))
    .first();

  if (!currentUsage || currentUsage.subscriptionTier === "free") {
    // Determine tier from payment amount
    let tier = "starter"; // Default for successful payments
    
    if (paymentData.amount === 2000) { // $20.00 in cents
      tier = "pro";
    } else if (paymentData.amount >= 5000) { // $50+ for enterprise
      tier = "enterprise";
    }

    await ctx.runMutation(internal.userUsage.updateUserSubscriptionFromWebhook, {
      userId,
      subscriptionTier: tier,
      eventType: "payment_succeeded",
      eventData: paymentData
    });
  }
}

async function getUserSubscription(ctx: any, userId: string) {
  const currentMonth = getCurrentMonth();
  
  const usage = await ctx.db
    .query("userUsage")
    .withIndex("byUserAndMonth", (q: any) => q.eq("userId", userId).eq("month", currentMonth))
    .first();

  return {
    tier: usage?.subscriptionTier || "free",
    status: usage ? "active" : "inactive",
    evaluationsUsed: usage?.evaluationsCount || 0,
    lastUpdated: usage?._creationTime || null
  };
}
