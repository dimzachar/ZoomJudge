"use client"

import { OverallRepoScore } from "@/components/overall-repo-score"
import { EvaluationCard } from "@/components/evaluation-card"
import { TierGatedContent, UsageLimitWarning } from "@/components/tier-gated-content"
import { ClerkBillingGate, SubscriptionStatus } from "@/components/clerk-billing-gate"
import { DashboardStats } from "@/components/dashboard-stats"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useState } from "react"

export default function DemoPage() {
  const [userTier, setUserTier] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free')

  const handleUpgrade = () => {
    console.log('Upgrade clicked for tier:', userTier)
    // In real app, this would open the subscription modal
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Component Demo</h1>
            <p className="text-muted-foreground">
              Showcase of ZoomJudge UI components with tier-based functionality
            </p>
          </div>
          
          {/* Tier Switcher */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Demo Tier:</span>
            {(['free', 'starter', 'pro', 'enterprise'] as const).map((tier) => (
              <Button
                key={tier}
                variant={userTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setUserTier(tier)}
                className="capitalize"
              >
                {tier}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Warning Demo */}
      {userTier === 'free' && (
        <UsageLimitWarning
          currentUsage={3}
          monthlyLimit={4}
          resetDate={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)}
          tier="free"
          onUpgrade={handleUpgrade}
        />
      )}

      {/* Dashboard Stats */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Dashboard Stats</h2>
        <DashboardStats 
          stats={{
            total: 15,
            completed: 12,
            processing: 2,
            pending: 1,
            averageScore: 85
          }}
          userTier={userTier}
          currentUsage={3}
          monthlyLimit={userTier === 'free' ? 4 : userTier === 'starter' ? 20 : userTier === 'pro' ? 200 : -1}
        />
      </div>

      {/* Overall Score Demo */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Overall Repository Score</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <OverallRepoScore
            score={85}
            label="Data Engineering Project"
            caption="Last updated 2 days ago"
            size="md"
            showUpgradePrompt={userTier === 'free'}
            onUpgrade={handleUpgrade}
          />
          <OverallRepoScore
            score={92}
            label="Machine Learning Model"
            caption="Last updated 1 day ago"
            size="md"
            showUpgradePrompt={false}
          />
          <OverallRepoScore
            score={78}
            label="MLOps Pipeline"
            caption="Last updated 3 days ago"
            size="md"
            showUpgradePrompt={false}
          />
        </div>
      </div>

      {/* Evaluation Cards Demo */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Evaluation Breakdown</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <EvaluationCard
            title="Problem Description"
            description="Clear explanation of the problem being solved and approach taken"
            score={2}
            maxScore={2}
            statusLabel="Excellent"
            delta="+1"
            feedback="The problem description is comprehensive and well-structured. It clearly outlines the business case, technical requirements, and expected outcomes. Consider adding more details about data sources and constraints."
            isLocked={userTier === 'free'}
            onUpgrade={handleUpgrade}
          />

          <EvaluationCard
            title="Data Ingestion Pipeline"
            description="Implementation of data collection and preprocessing workflows"
            score={1}
            maxScore={2}
            statusLabel="OK"
            feedback="The ingestion pipeline covers basic requirements but lacks error handling and monitoring. Consider implementing retry mechanisms and data quality checks."
            isLocked={userTier === 'free'}
            onUpgrade={handleUpgrade}
          />

          <EvaluationCard
            title="Code Quality"
            description="Code organization, documentation, and best practices"
            score={2}
            maxScore={2}
            statusLabel="Excellent"
            delta="+2"
            feedback="Excellent code structure with proper documentation and type hints. The modular design makes it easy to understand and maintain."
            isLocked={userTier === 'free'}
            onUpgrade={handleUpgrade}
          />

          <EvaluationCard
            title="Testing Coverage"
            description="Unit tests, integration tests, and test coverage"
            score={0}
            maxScore={1}
            statusLabel="Needs Work"
            delta="-1"
            feedback="Limited testing coverage detected. Consider adding unit tests for core functions and integration tests for the pipeline. Aim for at least 80% code coverage."
            isLocked={userTier === 'free'}
            onUpgrade={handleUpgrade}
          />
        </div>
      </div>

      {/* Tier-Gated Content Demo */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Advanced Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TierGatedContent
            feature="performance-charts"
            userTier={userTier}
            onUpgrade={handleUpgrade}
          >
            <Card>
              <CardHeader>
                <CardTitle>Performance Charts</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Advanced performance analytics and trend visualization would appear here.
                </p>
              </CardContent>
            </Card>
          </TierGatedContent>

          <ClerkBillingGate
            feature="comparison-tools"
            userTier={userTier}
          >
            <Card>
              <CardHeader>
                <CardTitle>Repository Comparison (Clerk Protected)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  This content is protected by Clerk billing integration.
                </p>
              </CardContent>
            </Card>
          </ClerkBillingGate>
        </div>
      </div>

      {/* Clerk Billing Integration Demo */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Clerk Billing Integration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SubscriptionStatus />

          <Card>
            <CardHeader>
              <CardTitle>Billing Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>✅ Clerk PricingTable component integrated</p>
              <p>✅ Webhook-based payment tracking</p>
              <p>✅ Real-time subscription status</p>
              <p>✅ Automatic content gating</p>
              <p>✅ Seamless upgrade flow</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Current Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Current Demo Tier: 
            <Badge variant="secondary" className="capitalize">
              {userTier}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Switch between different tiers using the buttons above to see how content visibility changes based on subscription level.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
