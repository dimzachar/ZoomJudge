"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useUserTier } from "@/components/clerk-billing-gate"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { getTierInfo } from "@/lib/tier-permissions"
import CustomClerkPricing from "@/components/custom-clerk-pricing"
import { UsageMetrics } from "@/components/usage-metrics"
import { BillingHistory } from "@/components/billing-history"
import {
  IconCreditCard,
  IconDownload,
  IconCheck,
  IconSparkles,
  IconArrowRight,
  IconCalendar,
  IconReceipt,
  IconExternalLink,
  IconSettings,
  IconAlertTriangle,
  IconRefresh
} from "@tabler/icons-react"

export default function BillingPage() {
  const { user } = useUser()
  const userTier = useUserTier()
  const tierInfo = getTierInfo(userTier)
  const updateSubscriptionTier = useMutation(api.userUsage.updateSubscriptionTier)
  const syncSubscriptionFromClerk = useMutation(api.subscriptions.syncSubscriptionFromClerk)

  // Get subscription info from user metadata
  const subscription = user?.publicMetadata?.subscription as any
  const isActive = subscription?.status === 'active' || userTier === 'free' || userTier === 'pro' || userTier === 'starter' || userTier === 'enterprise'
  const nextBillingDate = subscription?.nextBillingDate

  // Check if there's a mismatch between Clerk and Convex subscription data
  const hasSubscriptionMismatch = () => {
    console.log('Debug - userTier:', userTier)
    console.log('Debug - subscription:', subscription)
    console.log('Debug - user.publicMetadata:', user?.publicMetadata)

    // If user is showing as free in Convex but has subscription metadata in Clerk
    if (userTier === 'free' && subscription?.tier && subscription.tier !== 'free') {
      console.log('Mismatch detected: tier mismatch')
      return true
    }
    // If user has an active subscription but showing as free
    if (userTier === 'free' && subscription?.status === 'active') {
      console.log('Mismatch detected: active subscription but free tier')
      return true
    }

    // For now, always show sync button if user is on free tier (temporary)
    if (userTier === 'free') {
      console.log('Showing sync button for free tier user')
      return true
    }

    return false
  }

  const handleManageBilling = () => {
    // For now, show a message that billing management is handled through Clerk
    toast.info("Billing management is handled through your account settings. Contact support for billing changes.")

    // In production, this would redirect to the proper Clerk billing portal
    // For development, we'll disable these links to avoid 404s
    if (process.env.NODE_ENV === 'production') {
      window.open('https://billing.clerk.com', '_blank')
    }
  }

  const handleDownloadInvoices = () => {
    toast.info("Invoice downloads are available through your account dashboard. Contact support if you need assistance.")

    // In production, this would work with proper Clerk billing setup
    if (process.env.NODE_ENV === 'production') {
      const clerkFrontendUrl = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL
      if (clerkFrontendUrl) {
        window.open(`${clerkFrontendUrl}/user/billing/invoices`, '_blank')
      }
    }
  }

  const handleUpdatePaymentMethod = () => {
    toast.info("Payment method updates are handled through your account settings. Contact support for assistance.")

    // In production, this would work with proper Clerk billing setup
    if (process.env.NODE_ENV === 'production') {
      const clerkFrontendUrl = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL
      if (clerkFrontendUrl) {
        window.open(`${clerkFrontendUrl}/user/billing/payment-methods`, '_blank')
      }
    }
  }

  const handleSyncSubscription = async () => {
    try {
      console.log('Starting comprehensive subscription sync...')

      // Use the new production-ready sync function
      const result = await syncSubscriptionFromClerk({ forceRefresh: true })

      if (result.success) {
        toast.success(`Subscription synced successfully! Current tier: ${result.tier}`)
        console.log('Sync successful:', result)

        // Refresh the page to show updated tier
        setTimeout(() => window.location.reload(), 1000)
      } else {
        console.error('Sync failed:', result.error)
        toast.error(`Sync failed: ${result.error}`)
      }
    } catch (error) {
      console.error("Failed to sync subscription:", error)
      toast.error("Failed to sync subscription. Please try again.")
    }
  }

  // Make function available globally for debugging
  if (typeof window !== 'undefined') {
    (window as any).syncToProTier = async () => {
      try {
        await updateSubscriptionTier({ subscriptionTier: "pro" })
        console.log('Successfully updated to Pro tier')
        window.location.reload()
      } catch (error) {
        console.error('Failed to update tier:', error)
      }
    }

    (window as any).syncToStarterTier = async () => {
      try {
        await updateSubscriptionTier({ subscriptionTier: "starter" })
        console.log('Successfully updated to Starter tier')
        window.location.reload()
      } catch (error) {
        console.error('Failed to update tier:', error)
      }
    }
  }

  const handleChangeBillingCycle = () => {
    toast.info("Billing cycle changes are handled through your account settings. Contact support for assistance.")

    // In production, this would work with proper Clerk billing setup
    if (process.env.NODE_ENV === 'production') {
      const clerkFrontendUrl = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL
      if (clerkFrontendUrl) {
        window.open(`${clerkFrontendUrl}/user/billing/subscription`, '_blank')
      }
    }
  }

  const handleCancelSubscription = () => {
    if (confirm("Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.")) {
      toast.info("Subscription cancellation is handled through your account settings. Contact support for assistance.")

      // In production, this would work with proper Clerk billing setup
      if (process.env.NODE_ENV === 'production') {
        const clerkFrontendUrl = process.env.NEXT_PUBLIC_CLERK_FRONTEND_API_URL
        if (clerkFrontendUrl) {
          window.open(`${clerkFrontendUrl}/user/billing/subscription/cancel`, '_blank')
        }
      }
    }
  }

  const handleUpgrade = () => {
    // Scroll to pricing section
    const pricingSection = document.getElementById('pricing-plans')
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      // Fallback: scroll to bottom of page where pricing is
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
    }
  }



  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and billing information.
        </p>
      </div>

      {/* Current Plan */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-primary" />
              <CardTitle>Current Plan</CardTitle>
            </div>
            <Badge variant="secondary" className="capitalize">
              {tierInfo.name}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold capitalize">{tierInfo.name}</h3>
              <p className="text-muted-foreground">{tierInfo.description}</p>
              {nextBillingDate && userTier !== 'free' && (
                <p className="text-sm text-muted-foreground mt-2">
                  Next billing: {new Date(nextBillingDate).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{tierInfo.price}</div>
              <div className="text-sm text-muted-foreground">per month</div>
              <div className={`text-sm font-medium ${isActive ? 'text-green-600' : 'text-red-600'}`}>
                {isActive ? 'Active' : 'Inactive'}
              </div>
              {hasSubscriptionMismatch() && (
                <div className="text-xs text-orange-600 mt-1">
                  Subscription sync needed
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pt-4">
            {userTier !== 'free' ? (
              <>
                <Button variant="outline" size="sm" onClick={handleManageBilling}>
                  <IconCreditCard className="h-4 w-4 mr-2" />
                  Manage Billing
                  <IconExternalLink className="h-3 w-3 ml-1" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadInvoices}>
                  <IconDownload className="h-4 w-4 mr-2" />
                  Download Invoices
                </Button>
              </>
            ) : (
              <>
                <Button onClick={handleUpgrade}>
                  <IconSparkles className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
                {hasSubscriptionMismatch() && (
                  <Button variant="outline" size="sm" onClick={handleSyncSubscription}>
                    <IconRefresh className="h-4 w-4 mr-2" />
                    Sync Subscription
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Usage Metrics */}
      <UsageMetrics />

      {/* Billing History */}
      <BillingHistory />

      {/* Plans */}
      <div id="pricing-plans" className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Available Plans</h2>
          {userTier === 'free' && (
            <Badge variant="outline" className="text-primary">
              Choose your plan
            </Badge>
          )}
        </div>

        {/* Clerk Pricing Component */}
        <CustomClerkPricing />
      </div>

    </div>
  )
}
