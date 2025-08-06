"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useUserTier, SubscriptionStatus } from "@/components/clerk-billing-gate"
import { getTierInfo } from "@/lib/tier-permissions"
import CustomClerkPricing from "@/components/custom-clerk-pricing"
import {
  IconCreditCard,
  IconDownload,
  IconCheck,
  IconSparkles,
  IconArrowRight,
  IconCalendar,
  IconReceipt,
  IconExternalLink
} from "@tabler/icons-react"

export default function BillingPage() {
  const { user } = useUser()
  const userTier = useUserTier()
  const tierInfo = getTierInfo(userTier)

  // Get subscription info from user metadata
  const subscription = user?.publicMetadata?.subscription as any
  const isActive = subscription?.status === 'active' || userTier === 'free'
  const nextBillingDate = subscription?.nextBillingDate

  const handleManageBilling = () => {
    // Open Clerk's billing portal
    window.open('https://billing.clerk.com', '_blank')
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
                <Button variant="outline" size="sm" onClick={handleManageBilling}>
                  <IconDownload className="h-4 w-4 mr-2" />
                  Download Invoices
                </Button>
              </>
            ) : (
              <Button onClick={handleUpgrade}>
                <IconSparkles className="h-4 w-4 mr-2" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </CardContent>
      </Card>



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

      {/* Billing Management */}
      {userTier !== 'free' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconReceipt className="h-5 w-5" />
                <CardTitle>Billing Management</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageBilling}>
                <IconExternalLink className="h-4 w-4 mr-2" />
                Open Billing Portal
              </Button>
            </div>
            <CardDescription>
              Manage your subscription, download invoices, and update payment methods.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button variant="outline" onClick={handleManageBilling} className="justify-start">
                <IconCreditCard className="h-4 w-4 mr-2" />
                Update Payment Method
              </Button>
              <Button variant="outline" onClick={handleManageBilling} className="justify-start">
                <IconDownload className="h-4 w-4 mr-2" />
                Download Invoices
              </Button>
              <Button variant="outline" onClick={handleManageBilling} className="justify-start">
                <IconCalendar className="h-4 w-4 mr-2" />
                Change Billing Cycle
              </Button>
              <Button variant="outline" onClick={handleManageBilling} className="justify-start text-destructive hover:text-destructive">
                <IconReceipt className="h-4 w-4 mr-2" />
                Cancel Subscription
              </Button>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground">
              <p>
                All billing operations are handled securely through Clerk's billing portal.
                You'll be redirected to manage your subscription, view invoices, and update payment information.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
