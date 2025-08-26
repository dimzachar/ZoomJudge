import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { transformWebhookData } from "./paymentAttemptTypes";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occured", { status: 400 });
    }
    switch ((event as any).type) {
      case "user.created": {
        const userData = event.data as any;

        // Create/update user in database
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: userData,
        });

        // User preferences will be initialized when first accessed

        // Send welcome email for new users
        if (userData.email_addresses && userData.email_addresses.length > 0) {
          const primaryEmail = userData.email_addresses.find((email: any) => email.id === userData.primary_email_address_id);
          const userEmail = primaryEmail?.email_address || userData.email_addresses[0]?.email_address;
          const userName = `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'there';

          if (userEmail) {
            // Schedule welcome email to be sent
            await ctx.runAction(api.emails.sendWelcomeEmail, {
              userId: userData.id,
              userEmail: userEmail,
              userName: userName,
            });
          }
        }
        break;
      }

      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data as any,
        });
        break;

      case "user.deleted": {
        const clerkUserId = (event.data as any).id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }

      case "paymentAttempt.updated": {
        const paymentAttemptData = transformWebhookData((event as any).data);
        await ctx.runMutation(internal.paymentAttempts.savePaymentAttempt, {
          paymentAttemptData,
        });
        break;
      }

      // Comprehensive Clerk subscription event handling
      case "subscription.created":
      case "subscription.updated":
      case "subscription.deleted":
      case "subscriptionItem.created":
      case "subscriptionItem.updated":
      case "subscriptionItem.deleted":
      case "subscriptionItem.active":
      case "subscriptionItem.cancelled":
      case "subscriptionItem.paused":
      case "subscriptionItem.resumed": {
        await ctx.runMutation(internal.subscriptions.handleSubscriptionWebhook, {
          eventType: (event as any).type,
          eventData: (event as any).data,
          timestamp: Date.now()
        });
        break;
      }

      // Legacy subscription handling (keeping for backward compatibility)
      case "paymentAttempt.succeeded":
      case "paymentAttempt.failed": {
        const paymentData = (event as any).data;
        await ctx.runMutation(internal.subscriptions.handlePaymentWebhook, {
          eventType: (event as any).type,
          eventData: paymentData,
          timestamp: Date.now()
        });
        break;
      }

      default:
        console.log("Ignored webhook event", (event as any).type);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

export default http;