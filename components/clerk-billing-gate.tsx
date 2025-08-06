"use client"

import React from 'react'
import { Protect, useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { TierGatedContent, UpgradePromptOverlay } from '@/components/tier-gated-content'
import { type UserTier, type FeatureKey } from '@/lib/tier-permissions'
import CustomClerkPricing from '@/components/custom-clerk-pricing'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface ClerkBillingGateProps {
  feature: FeatureKey
  userTier?: UserTier
  children: React.ReactNode
  fallback?: React.ReactNode
  className?: string
}

export function ClerkBillingGate({
  feature,
  userTier = 'free',
  children,
  fallback,
  className
}: ClerkBillingGateProps) {
  const handleUpgrade = () => {
    // Open Clerk's billing portal instead of routing to a custom page
    window.open('https://billing.clerk.com', '_blank')
  }

  // If we have a custom fallback, use TierGatedContent
  if (fallback) {
    return (
      <TierGatedContent
        feature={feature}
        userTier={userTier}
        fallback={fallback}
        onUpgrade={handleUpgrade}
        className={className}
      >
        {children}
      </TierGatedContent>
    )
  }

  // Use Clerk's Protect component with the original working plan structure
  return (
    <Protect
      condition={(has) => {
        // Use the same logic as the original payment-gated page
        // Check if user doesn't have free plan (meaning they have a paid plan)
        return !has({ plan: "free_user" })
      }}
      fallback={
        <UpgradePromptOverlay
          feature={feature}
          userTier={userTier}
          onUpgrade={handleUpgrade}
          className={className}
        />
      }
    >
      {children}
    </Protect>
  )
}

interface ClerkBillingPageGateProps {
  requiredPlan?: 'starter' | 'pro' | 'enterprise'
  children: React.ReactNode
  title?: string
  description?: string
}

export function ClerkBillingPageGate({
  requiredPlan = 'starter',
  children,
  title = "Upgrade to a paid plan",
  description = "This feature is available on paid plans. Choose a plan that fits your needs."
}: ClerkBillingPageGateProps) {
  const UpgradeCard = () => (
    <div className="space-y-8">
      <div className="mx-auto max-w-2xl space-y-4 text-center">
        <h1 className="text-center text-2xl font-semibold lg:text-3xl">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="px-4 lg:px-8">
        <CustomClerkPricing />
      </div>
    </div>
  )

  return (
    <Protect
      condition={(has) => {
        // Use the same logic as the original payment-gated page
        // Check if user doesn't have free plan (meaning they have a paid plan)
        return !has({ plan: "free_user" })
      }}
      fallback={<UpgradeCard />}
    >
      {children}
    </Protect>
  )
}

// Hook to get current user tier from Clerk
export function useUserTier(): UserTier {
  const { user } = useUser()

  if (!user) {
    return 'free'
  }

  // Check user's public metadata for subscription information
  const subscription = user.publicMetadata?.subscription as any
  const subscriptionTier = subscription?.tier || subscription?.plan

  // Map Clerk subscription tiers to our UserTier type
  switch (subscriptionTier) {
    case 'starter':
    case 'basic':
      return 'starter'
    case 'pro':
    case 'premium':
      return 'pro'
    case 'enterprise':
    case 'business':
      return 'enterprise'
    default:
      return 'free'
  }
}

// Component to display current subscription status
export function SubscriptionStatus() {
  const userTier = useUserTier()
  const { user } = useUser()

  const subscription = user?.publicMetadata?.subscription as any
  const isActive = subscription?.status === 'active' || userTier === 'free'
  const nextBillingDate = subscription?.nextBillingDate

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Current Plan</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">Plan</span>
            <span className="text-sm font-medium capitalize">{userTier}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            <span className={`text-sm ${isActive ? 'text-green-600' : 'text-red-600'}`}>
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          {nextBillingDate && userTier !== 'free' && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Next billing</span>
              <span className="text-sm text-muted-foreground">
                {new Date(nextBillingDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
