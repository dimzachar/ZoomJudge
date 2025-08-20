"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { EvaluationResults } from "@/app/dashboard/evaluation-results"
import { QuickActions } from "@/app/dashboard/quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { IconSparkles, IconTrendingUp } from "@tabler/icons-react"
import { TIER_LIMITS } from "@/lib/tier-permissions"

export default function Page() {
  // Fetch real data from Convex
  const evaluationStats = useQuery(api.evaluations.getUserEvaluationStats)
  const currentUsage = useQuery(api.userUsage.getCurrentUsage)

  // Show loading state while data is being fetched
  if (evaluationStats === undefined || currentUsage === undefined || currentUsage === null) {
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Welcome Section */}
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome to ZoomJudge</h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Get AI-powered evaluation and feedback for your GitHub repositories across different Zoomcamp courses.
            </p>
          </div>
          <QuickActions />
        </div>

        {/* Loading Dashboard Stats */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Overview</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 sm:h-32" />
            ))}
          </div>
        </div>

        {/* Recent Evaluations */}
        <div className="space-y-3 sm:space-y-4">
          {/* <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Recent Evaluations</h2> */}
          <EvaluationResults />
        </div>
      </div>
    )
  }

  // Determine user tier from usage data
  const userTier = currentUsage?.subscriptionTier || 'free'

  // Calculate monthly limits based on tier using centralized config
  const monthlyLimit = TIER_LIMITS[userTier as keyof typeof TIER_LIMITS]?.evaluationsPerMonth || TIER_LIMITS.free.evaluationsPerMonth
  const currentCount = currentUsage?.evaluationsCount || 0
  const isNearLimit = currentCount >= monthlyLimit * 0.8 && userTier === 'free'
  const isAtLimit = currentCount >= monthlyLimit && userTier !== 'enterprise'

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Usage Warning Banner */}
      {(isNearLimit || isAtLimit) && (
        <Alert className={isAtLimit ? "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20" : "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"}>
          <IconTrendingUp className={`h-4 w-4 ${isAtLimit ? 'text-red-600' : 'text-yellow-600'}`} />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <p className={`font-medium ${isAtLimit ? 'text-red-800 dark:text-red-200' : 'text-yellow-800 dark:text-yellow-200'}`}>
                  {isAtLimit ? 'Monthly evaluation limit reached' : 'You\'re close to your monthly limit'}
                </p>
                <p className={`text-sm ${isAtLimit ? 'text-red-700 dark:text-red-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                  {isAtLimit
                    ? `You've used all ${monthlyLimit} evaluations this month. Upgrade for unlimited access.`
                    : `You have ${monthlyLimit - currentCount} evaluations remaining this month.`
                  }
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => window.open('/dashboard/billing#pricing-plans', '_blank')}
                className={isAtLimit ? '' : 'border-yellow-300 text-yellow-800 hover:bg-yellow-100 dark:border-yellow-700 dark:text-yellow-200 dark:hover:bg-yellow-900/20'}
                variant={isAtLimit ? 'default' : 'outline'}
              >
                <IconSparkles className="h-4 w-4 mr-2" />
                {isAtLimit ? 'Upgrade Now' : 'View Plans'}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Welcome Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome to ZoomJudge</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Get AI-powered evaluation and feedback for your GitHub repositories across different Zoomcamp courses.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>

      {/* Dashboard Stats - Now using real data */}
      <div className="space-y-3 sm:space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">Overview</h2>
        <DashboardStats
          stats={{
            total: evaluationStats.total,
            completed: evaluationStats.completed,
            processing: evaluationStats.processing,
            pending: evaluationStats.pending,
            averageScore: evaluationStats.averageScore
          }}
          userTier={userTier as 'free' | 'starter' | 'pro' | 'enterprise'}
          currentUsage={currentUsage.evaluationsCount}
          monthlyLimit={monthlyLimit}
        />
      </div>

      {/* Recent Evaluations */}
      <div className="space-y-3 sm:space-y-4">
        <EvaluationResults />
      </div>
    </div>
  )
}
