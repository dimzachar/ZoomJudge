"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useUserTier } from "@/components/clerk-billing-gate"
import { getTierInfo, getUsagePercentage, TIER_LIMITS } from "@/lib/tier-permissions"
import {
  IconChartBar,
  IconCalendar,
  IconTrendingUp,
  IconSparkles,
  IconAlertTriangle,
  IconCheck,
  IconClock
} from "@tabler/icons-react"

interface UsageData {
  currentUsage: number
  monthlyLimit: number
  resetDate: string
  dailyUsage: number[]
  weeklyUsage: number[]
}

interface UsageMetricsProps {
  showTitle?: boolean
  className?: string
  compact?: boolean
}

export function UsageMetrics({ showTitle = true, className, compact = false }: UsageMetricsProps) {
  const { user } = useUser()
  const userTier = useUserTier()
  const tierInfo = getTierInfo(userTier)
  const [mounted, setMounted] = useState(false)

  // Get real usage data from Convex
  const currentUsage = useQuery(api.userUsage.getCurrentUsage)
  const usageHistory = useQuery(api.userUsage.getUserUsageHistory, { months: 4 })

  useEffect(() => {
    setMounted(true)
  }, [])

  // Calculate usage data from real Convex data
  const usageData: UsageData | null = mounted && currentUsage ? {
    currentUsage: currentUsage.evaluationsCount || 0,
    monthlyLimit: TIER_LIMITS[userTier].evaluationsPerMonth,
    resetDate: new Date(currentUsage.resetAt || Date.now()).toISOString(),
    dailyUsage: [2, 1, 0, 3, 1, 2, 0], // TODO: Calculate from real data
    weeklyUsage: usageHistory?.slice(0, 4).map(h => h.evaluationsCount) || [0, 0, 0, 0]
  } : mounted ? {
    // Default data when user is authenticated but no usage data exists
    currentUsage: 0,
    monthlyLimit: TIER_LIMITS[userTier].evaluationsPerMonth,
    resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString(),
    dailyUsage: [0, 0, 0, 0, 0, 0, 0],
    weeklyUsage: [0, 0, 0, 0]
  } : null

  const isLoading = !mounted || currentUsage === undefined

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Usage Metrics</CardTitle>
            <CardDescription>Loading usage information...</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-2 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!usageData) {
    return null
  }

  const usagePercentage = getUsagePercentage(usageData.currentUsage, userTier)
  const isNearLimit = usagePercentage >= 80
  const isAtLimit = usagePercentage >= 100
  const resetDate = new Date(usageData.resetDate)
  const daysUntilReset = Math.ceil((resetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

  const getUsageColor = () => {
    if (isAtLimit) return "text-red-600"
    if (isNearLimit) return "text-orange-600"
    return "text-green-600"
  }

  const getProgressColor = () => {
    if (isAtLimit) return "bg-red-500"
    if (isNearLimit) return "bg-orange-500"
    return "bg-green-500"
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconChartBar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Monthly Usage</span>
              </div>
              <Badge variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "default"}>
                {usageData.currentUsage} / {usageData.monthlyLimit === -1 ? "∞" : usageData.monthlyLimit}
              </Badge>
            </div>
            
            {usageData.monthlyLimit !== -1 && (
              <Progress 
                value={usagePercentage} 
                className="h-2"
                style={{
                  '--progress-background': getProgressColor()
                } as React.CSSProperties}
              />
            )}
            
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resets in {daysUntilReset} days</span>
              <span className={getUsageColor()}>
                {usagePercentage.toFixed(0)}% used
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconChartBar className="h-5 w-5" />
            <CardTitle>Usage Metrics</CardTitle>
          </div>
          <CardDescription>
            Track your evaluation usage and limits for the current billing period.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {/* Current Usage Overview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Monthly Evaluations</h4>
              <p className="text-sm text-muted-foreground">
                Current billing period usage
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">
                {usageData.currentUsage}
                <span className="text-lg text-muted-foreground">
                  /{usageData.monthlyLimit === -1 ? "∞" : usageData.monthlyLimit}
                </span>
              </div>
              <Badge variant={isAtLimit ? "destructive" : isNearLimit ? "secondary" : "default"}>
                {tierInfo.name} Plan
              </Badge>
            </div>
          </div>

          {usageData.monthlyLimit !== -1 && (
            <div className="space-y-2">
              <Progress 
                value={usagePercentage} 
                className="h-3"
                style={{
                  '--progress-background': getProgressColor()
                } as React.CSSProperties}
              />
              <div className="flex justify-between text-sm">
                <span className={getUsageColor()}>
                  {usagePercentage.toFixed(1)}% used
                </span>
                <span className="text-muted-foreground">
                  {usageData.monthlyLimit - usageData.currentUsage} remaining
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Usage Warnings */}
        {isAtLimit && (
          <div className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-red-900 dark:text-red-100">
                  Usage Limit Reached
                </p>
                <p className="text-sm text-red-700 dark:text-red-200">
                  You've reached your monthly evaluation limit. Upgrade your plan to continue evaluating repositories.
                </p>
                <Button size="sm" className="bg-red-600 hover:bg-red-700">
                  <IconSparkles className="h-4 w-4 mr-2" />
                  Upgrade Plan
                </Button>
              </div>
            </div>
          </div>
        )}

        {isNearLimit && !isAtLimit && (
          <div className="p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
            <div className="flex items-start gap-3">
              <IconAlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Approaching Usage Limit
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-200">
                  You're using {usagePercentage.toFixed(0)}% of your monthly evaluations. Consider upgrading to avoid interruptions.
                </p>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Billing Period Info */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <IconCalendar className="h-4 w-4" />
            Billing Period
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Period</p>
              <p className="font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Resets In</p>
              <p className="font-medium flex items-center gap-1">
                <IconClock className="h-4 w-4" />
                {daysUntilReset} days
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <Separator />
        
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <IconTrendingUp className="h-4 w-4" />
            Recent Activity
          </h4>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-2xl font-bold text-green-600">
                {usageData.dailyUsage.reduce((a, b) => a + b, 0)}
              </p>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-600">
                {usageData.dailyUsage[usageData.dailyUsage.length - 1] || 0}
              </p>
              <p className="text-xs text-muted-foreground">Today</p>
            </div>
            
            <div className="space-y-1">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(usageData.dailyUsage.reduce((a, b) => a + b, 0) / 7 * 10) / 10}
              </p>
              <p className="text-xs text-muted-foreground">Daily avg</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
