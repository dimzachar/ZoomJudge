import { NextRequest, NextResponse } from "next/server"
import { headers } from "next/headers"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Resend webhook events we want to handle
interface ResendWebhookEvent {
  type: string
  created_at: string
  data: {
    email_id?: string
    from?: string
    to?: string[]
    subject?: string
    created_at?: string
    // Unsubscribe specific fields
    email?: string
    list_id?: string
    // Bounce/complaint specific fields
    bounce_type?: string
    complaint_type?: string
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get("resend-signature")

    // Verify webhook signature (optional but recommended for production)
    // You would implement signature verification here using your webhook secret
    
    const event: ResendWebhookEvent = JSON.parse(body)
    
    console.log("Received Resend webhook:", event.type)
    
    // Handle different event types
    switch (event.type) {
      case "email.sent":
        await handleEmailSent(event)
        break
        
      case "email.delivered":
        await handleEmailDelivered(event)
        break
        
      case "email.bounced":
        await handleEmailBounced(event)
        break
        
      case "email.complained":
        await handleEmailComplained(event)
        break
        
      case "contact.unsubscribed":
        await handleContactUnsubscribed(event)
        break
        
      default:
        console.log("Unhandled webhook event type:", event.type)
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error processing Resend webhook:", error)
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    )
  }
}

async function handleEmailSent(event: ResendWebhookEvent) {
  try {
    // Update email log status to sent
    if (event.data.email_id) {
      await convex.mutation(api.emails.updateEmailLogStatus, {
        resendId: event.data.email_id,
        status: "sent",
        sentAt: new Date(event.created_at).getTime()
      })
    }
  } catch (error) {
    console.error("Error handling email.sent:", error)
  }
}

async function handleEmailDelivered(event: ResendWebhookEvent) {
  try {
    // Update email log status to delivered
    if (event.data.email_id) {
      await convex.mutation(api.emails.updateEmailLogStatus, {
        resendId: event.data.email_id,
        status: "delivered",
        deliveredAt: new Date(event.created_at).getTime()
      })
    }
  } catch (error) {
    console.error("Error handling email.delivered:", error)
  }
}

async function handleEmailBounced(event: ResendWebhookEvent) {
  try {
    // Update email log status to bounced
    if (event.data.email_id) {
      await convex.mutation(api.emails.updateEmailLogStatus, {
        resendId: event.data.email_id,
        status: "bounced",
        errorMessage: `Bounced: ${event.data.bounce_type || "Unknown bounce type"}`
      })
    }
    
    // If it's a hard bounce, automatically unsubscribe the email
    if (event.data.bounce_type === "permanent" && event.data.to?.[0]) {
      await convex.mutation(api.emails.updateEmailPreferences, {
        email: event.data.to[0],
        preferences: {
          welcomeEmails: false,
          productUpdates: false,
          feedbackRequests: false,
          marketingEmails: false,
          securityAlerts: true, // Keep security alerts
          weeklyReports: false,
        },
        unsubscribeReason: `Automatic unsubscribe due to hard bounce (${event.data.bounce_type})`
      })
    }
  } catch (error) {
    console.error("Error handling email.bounced:", error)
  }
}

async function handleEmailComplained(event: ResendWebhookEvent) {
  try {
    // Update email log status to complained
    if (event.data.email_id) {
      await convex.mutation(api.emails.updateEmailLogStatus, {
        resendId: event.data.email_id,
        status: "complained",
        errorMessage: `Spam complaint: ${event.data.complaint_type || "Unknown complaint type"}`
      })
    }
    
    // Automatically unsubscribe users who mark emails as spam
    if (event.data.to?.[0]) {
      await convex.mutation(api.emails.updateEmailPreferences, {
        email: event.data.to[0],
        preferences: {
          welcomeEmails: false,
          productUpdates: false,
          feedbackRequests: false,
          marketingEmails: false,
          securityAlerts: true, // Keep security alerts
          weeklyReports: false,
        },
        unsubscribeReason: `Automatic unsubscribe due to spam complaint (${event.data.complaint_type})`
      })
    }
  } catch (error) {
    console.error("Error handling email.complained:", error)
  }
}

async function handleContactUnsubscribed(event: ResendWebhookEvent) {
  try {
    // Handle unsubscribe from Resend Audiences
    if (event.data.email) {
      await convex.mutation(api.emails.updateEmailPreferences, {
        email: event.data.email,
        preferences: {
          welcomeEmails: false,
          productUpdates: false,
          feedbackRequests: false,
          marketingEmails: false,
          securityAlerts: true, // Keep security alerts
          weeklyReports: false,
        },
        unsubscribeReason: "Unsubscribed via Resend audience unsubscribe"
      })
    }
  } catch (error) {
    console.error("Error handling contact.unsubscribed:", error)
  }
}

// Handle GET requests (for webhook verification)
export async function GET() {
  return NextResponse.json({ message: "Resend webhook endpoint is active" })
}
