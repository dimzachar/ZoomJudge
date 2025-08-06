"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  IconLock, 
  IconSparkles, 
  IconTrendingUp,
  IconX
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { canAccessFeature, getMinimumTierForFeature, getTierInfo, type UserTier, type FeatureKey } from '@/lib/tier-permissions'

interface TierGatedContentProps {
  feature: FeatureKey
  userTier: UserTier
  fallback?: React.ReactNode // Custom upgrade prompt component
  children: React.ReactNode
  className?: string
  onUpgrade?: () => void
}

export function TierGatedContent({ 
  feature, 
  userTier, 
  fallback, 
  children,
  className,
  onUpgrade
}: TierGatedContentProps) {
  if (canAccessFeature(feature, userTier)) {
    return <>{children}</>
  }
  
  if (fallback) {
    return <>{fallback}</>
  }

  return <UpgradePromptOverlay feature={feature} userTier={userTier} onUpgrade={onUpgrade} className={className} />
}

interface UpgradePromptOverlayProps {
  feature: FeatureKey
  userTier: UserTier
  onUpgrade?: () => void
  className?: string
}

export function UpgradePromptOverlay({ 
  feature, 
  userTier, 
  onUpgrade,
  className 
}: UpgradePromptOverlayProps) {
  const requiredTier = getMinimumTierForFeature(feature)
  const tierInfo = getTierInfo(requiredTier)
  
  const featureNames: Record<FeatureKey, string> = {
    'detailed-feedback': 'Detailed Feedback',
    'performance-charts': 'Performance Charts',
    'comparison-tools': 'Comparison Tools',
    'custom-criteria': 'Custom Criteria',
    'api-access': 'API Access',
    'priority-processing': 'Priority Processing',
    'team-collaboration': 'Team Collaboration',
    'export-pdf': 'PDF Export',
    'export-advanced': 'Advanced Export',
    'analytics-advanced': 'Advanced Analytics',
    'bulk-processing': 'Bulk Processing',
  }

  return (
    <Card className={cn("relative overflow-hidden border-dashed", className)}>
      <CardContent className="p-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <IconLock className="h-8 w-8 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-lg">
              {featureNames[feature]} Locked
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              Upgrade to {tierInfo.name} to unlock {featureNames[feature].toLowerCase()} and get more detailed insights.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline" className="text-xs">
              Current: {getTierInfo(userTier).name}
            </Badge>
            <IconTrendingUp className="h-4 w-4 text-muted-foreground" />
            <Badge 
              variant="secondary" 
              className={cn(
                "text-xs",
                tierInfo.color === 'blue' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
                tierInfo.color === 'purple' && "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
                tierInfo.color === 'gold' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
              )}
            >
              Requires: {tierInfo.name}
            </Badge>
          </div>

          <div className="pt-2">
            <Button
              onClick={onUpgrade || (() => window.location.href = '/dashboard/subscription')}
              className="gap-2"
            >
              <IconSparkles className="h-4 w-4" />
              Upgrade to {tierInfo.name}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface UsageLimitWarningProps {
  currentUsage: number
  monthlyLimit: number
  resetDate: Date
  tier: UserTier
  onUpgrade?: () => void
  className?: string
}

export function UsageLimitWarning({
  currentUsage,
  monthlyLimit,
  resetDate,
  tier,
  onUpgrade,
  className
}: UsageLimitWarningProps) {
  const percentage = (currentUsage / monthlyLimit) * 100
  const isNearLimit = percentage >= 75
  const isAtLimit = percentage >= 100
  
  if (percentage < 75) return null

  const getWarningStyle = () => {
    if (isAtLimit) return "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"
    if (percentage >= 90) return "border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20"
    return "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20"
  }

  const getWarningIcon = () => {
    if (isAtLimit) return <IconX className="h-5 w-5 text-red-600" />
    return <IconTrendingUp className="h-5 w-5 text-yellow-600" />
  }

  return (
    <Card className={cn("border-2", getWarningStyle(), className)}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {getWarningIcon()}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">
                {isAtLimit ? 'Evaluation Limit Reached' : 'Approaching Limit'}
              </h4>
              <Badge variant="outline" className="text-xs">
                {currentUsage}/{monthlyLimit}
              </Badge>
            </div>
            
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  isAtLimit ? "bg-red-600" : percentage >= 90 ? "bg-orange-600" : "bg-yellow-600"
                )}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              {isAtLimit 
                ? `Limit resets ${resetDate.toLocaleDateString()}. Upgrade for more evaluations.`
                : `${monthlyLimit - currentUsage} evaluations remaining this month.`
              }
            </p>
            
            {(isAtLimit || percentage >= 90) && (
              <Button
                size="sm"
                onClick={onUpgrade || (() => window.location.href = '/dashboard/subscription')}
                className="gap-2 mt-2"
              >
                <IconSparkles className="h-4 w-4" />
                Upgrade Plan
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
