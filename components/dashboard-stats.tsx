"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { 
  IconFileText,
  IconCheck,
  IconClock,
  IconTrendingUp,
  IconCalendar,
  IconTarget,
  IconSparkles
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: React.ComponentType<{ className?: string }>
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon, 
  trend,
  className 
}: StatsCardProps) {
  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1 sm:space-y-2 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-medium text-muted-foreground truncate">{title}</p>
            <p className="text-xl sm:text-2xl md:text-3xl font-bold">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1">
                <IconTrendingUp
                  className={cn(
                    "h-3 w-3",
                    trend.isPositive ? "text-green-600" : "text-red-600"
                  )}
                />
                <span className={cn(
                  "text-xs font-medium",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
          </div>
          <div className="p-2 sm:p-3 bg-muted/50 rounded-full ml-2 sm:ml-3 flex-shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface DashboardStatsProps {
  stats: {
    total: number
    completed: number
    processing: number
    pending: number
    averageScore: number
  }
  userTier?: 'free' | 'starter' | 'pro' | 'enterprise'
  currentUsage?: number
  monthlyLimit?: number
  className?: string
}

export function DashboardStats({ 
  stats, 
  userTier = 'free',
  currentUsage = 0,
  monthlyLimit = 4,
  className 
}: DashboardStatsProps) {
  const usagePercentage = monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0
  
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6", className)}>
      {/* Total Evaluations */}
      <StatsCard
        title="Total Evaluations"
        value={stats.total}
        description="All time"
        icon={IconFileText}
      />

      {/* Completed */}
      <StatsCard
        title="Completed"
        value={stats.completed}
        description="Successfully analyzed"
        icon={IconCheck}
        className="border-green-200 dark:border-green-800"
      />

      {/* In Progress */}
      <StatsCard
        title="In Progress"
        value={stats.processing + stats.pending}
        description="Currently analyzing"
        icon={IconClock}
        className="border-blue-200 dark:border-blue-800"
      />

      {/* Average Score or Usage */}
      {userTier === 'free' ? (
        <Card className="transition-all duration-200 hover:shadow-md border-purple-200 dark:border-purple-800">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs sm:text-sm font-medium text-muted-foreground">Monthly Usage</p>
                  <Badge variant="outline" className="text-xs">
                    {userTier.charAt(0).toUpperCase() + userTier.slice(1)}
                  </Badge>
                </div>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold">
                  {currentUsage}<span className="text-sm sm:text-base md:text-lg text-muted-foreground">/{monthlyLimit}</span>
                </p>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      usagePercentage >= 100 ? "bg-red-600" :
                      usagePercentage >= 75 ? "bg-yellow-600" : "bg-blue-600"
                    )}
                    style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthlyLimit - currentUsage} evaluations remaining
                </p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-50 dark:bg-purple-950/20 rounded-full ml-2 sm:ml-3 flex-shrink-0">
                <IconTarget className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <StatsCard
          title="Average Score"
          value={stats.averageScore > 0 ? `${Math.round(stats.averageScore)}%` : '-'}
          description="Across all evaluations"
          icon={IconTrendingUp}
          className="border-purple-200 dark:border-purple-800"
        />
      )}
    </div>
  )
}

interface MonthlyUsageCardProps {
  currentUsage: number
  monthlyLimit: number
  tier: 'free' | 'starter' | 'pro' | 'enterprise'
  resetDate: Date
  onUpgrade?: () => void
  className?: string
}

export function MonthlyUsageCard({
  currentUsage,
  monthlyLimit,
  tier,
  resetDate,
  onUpgrade,
  className
}: MonthlyUsageCardProps) {
  const percentage = monthlyLimit > 0 ? (currentUsage / monthlyLimit) * 100 : 0
  const isUnlimited = monthlyLimit === -1
  
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">Monthly Usage</h3>
              <Badge variant="outline" className="text-xs capitalize">
                {tier}
              </Badge>
            </div>
            <IconCalendar className="h-5 w-5 text-muted-foreground" />
          </div>

          {isUnlimited ? (
            <div className="space-y-2">
              <p className="text-2xl font-bold">{currentUsage}</p>
              <p className="text-sm text-muted-foreground">Unlimited evaluations</p>
              <div className="flex items-center gap-1 text-green-600">
                <IconSparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Enterprise Plan</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold">{currentUsage}</span>
                <span className="text-muted-foreground">/ {monthlyLimit}</span>
              </div>
              
              <div className="space-y-2">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all duration-300",
                      percentage >= 100 ? "bg-red-600" : 
                      percentage >= 75 ? "bg-yellow-600" : "bg-blue-600"
                    )}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{monthlyLimit - currentUsage} remaining</span>
                  <span>Resets {resetDate.toLocaleDateString()}</span>
                </div>
              </div>

              {percentage >= 75 && tier === 'free' && (
                <button
                  onClick={onUpgrade}
                  className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  Upgrade for more evaluations →
                </button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
