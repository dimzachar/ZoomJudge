"use client"

import { OverallRepoScore } from "@/components/overall-repo-score"
import { EvaluationCard } from "@/components/evaluation-card"
import { TierGatedContent, UsageLimitWarning } from "@/components/tier-gated-content"
import { ClerkBillingGate, SubscriptionStatus } from "@/components/clerk-billing-gate"
import { DashboardStats } from "@/components/dashboard-stats"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { IconSparkles, IconArrowRight } from "@tabler/icons-react"
import Link from "next/link"
import { useState } from "react"
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs"
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react"

export default function PublicDemoPage() {
  const [userTier, setUserTier] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free')

  const handleUpgrade = () => {
    console.log('Upgrade clicked for tier:', userTier)
    // In real app, this would open the subscription modal
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/" className="flex items-center gap-2">
                <IconSparkles className="h-6 w-6 text-primary" />
                <span className="text-lg sm:text-xl font-bold">ZoomJudge</span>
              </Link>
              <Badge variant="secondary" className="ml-2 text-xs">Demo</Badge>
            </div>
            <div className="flex items-center gap-2">
              <AuthLoading>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-8 bg-muted animate-pulse rounded"></div>
                  <div className="w-20 h-8 bg-muted animate-pulse rounded"></div>
                </div>
              </AuthLoading>

              <Authenticated>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                    <Link href="/dashboard">
                      Dashboard
                    </Link>
                  </Button>
                  <UserButton afterSignOutUrl="/" />
                </div>
              </Authenticated>

              <Unauthenticated>
                <SignInButton mode="modal">
                  <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button size="sm" className="min-h-[44px]">
                    <span className="hidden sm:inline">Get Started</span>
                    <span className="sm:hidden">Start</span>
                    <IconArrowRight className="ml-1 sm:ml-2 h-4 w-4" />
                  </Button>
                </SignUpButton>
              </Unauthenticated>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
            ZoomJudge Component Demo
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto px-4">
            Showcase of ZoomJudge UI components with tier-based functionality.
            Switch between different subscription tiers to see how content visibility changes.
          </p>

          <AuthLoading>
            <Alert className="max-w-2xl mx-auto">
              <IconSparkles className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">
                Loading demo...
              </AlertDescription>
            </Alert>
          </AuthLoading>

          <Authenticated>
            <Alert className="max-w-2xl mx-auto">
              <IconSparkles className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">
                This is a live demonstration of ZoomJudge tier-based features.
                <strong> Visit your dashboard to start evaluating repositories!</strong>
              </AlertDescription>
            </Alert>
          </Authenticated>

          <Unauthenticated>
            <Alert className="max-w-2xl mx-auto">
              <IconSparkles className="h-4 w-4" />
              <AlertDescription className="text-sm sm:text-base">
                This is a live demonstration of ZoomJudge tier-based features.
                <strong> Sign up to access the full platform!</strong>
              </AlertDescription>
            </Alert>
          </Unauthenticated>
        </div>

        {/* Tier Switcher */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <span className="text-sm font-medium">Demo Tier:</span>
          <div className="grid grid-cols-2 sm:flex gap-2">
            {(['free', 'starter', 'pro', 'enterprise'] as const).map((tier) => (
              <Button
                key={tier}
                variant={userTier === tier ? "default" : "outline"}
                size="sm"
                onClick={() => setUserTier(tier)}
                className="capitalize min-h-[44px]"
              >
                {tier}
              </Button>
            ))}
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
          <h2 className="text-xl sm:text-2xl font-semibold">Clerk Billing Integration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <SubscriptionStatus />

            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Billing Features</CardTitle>
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

        {/* Call to Action */}
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-8 space-y-4">
            <AuthLoading>
              <div className="space-y-4">
                <div className="h-8 bg-muted animate-pulse rounded mx-auto w-3/4"></div>
                <div className="h-4 bg-muted animate-pulse rounded mx-auto w-1/2"></div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <div className="h-12 bg-muted animate-pulse rounded w-40"></div>
                  <div className="h-12 bg-muted animate-pulse rounded w-32"></div>
                </div>
              </div>
            </AuthLoading>

            <Authenticated>
              <h3 className="text-2xl font-semibold">Welcome Back!</h3>
              <p className="text-muted-foreground">
                Ready to evaluate your repository? Head to your dashboard to get started.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/dashboard">
                  <Button size="lg">
                    Go to Dashboard
                    <IconArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg">
                    Back to Home
                  </Button>
                </Link>
              </div>
            </Authenticated>

            <Unauthenticated>
              <h3 className="text-2xl font-semibold">Ready to Evaluate Your Repository?</h3>
              <p className="text-muted-foreground">
                Join thousands of developers using ZoomJudge to improve their projects and get better grades.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <SignUpButton mode="modal">
                  <Button size="lg">
                    Start Free Evaluation
                    <IconArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </SignUpButton>
                <SignInButton mode="modal">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </SignInButton>
              </div>
              <p className="text-xs text-muted-foreground">
                Free tier includes 4 evaluations per month • No credit card required
              </p>
            </Unauthenticated>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconSparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">ZoomJudge</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI-powered repository evaluation for Zoomcamp courses
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
