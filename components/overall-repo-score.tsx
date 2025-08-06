"use client"

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { IconSparkles, IconLock } from '@tabler/icons-react'
import { cn } from '@/lib/utils'

interface OverallRepoScoreProps {
  score: number // 0-100 percentage
  label: string // e.g., "Retrieval Quality Score"
  caption?: string // e.g., "Last updated 2 days ago"
  size?: 'sm' | 'md' | 'lg'
  showUpgradePrompt?: boolean // For free tier users
  onUpgrade?: () => void
  className?: string
}

export function OverallRepoScore({
  score,
  label,
  caption,
  size = 'md',
  showUpgradePrompt = false,
  onUpgrade,
  className
}: OverallRepoScoreProps) {
  const sizeConfig = {
    sm: {
      container: 'w-32 h-32',
      strokeWidth: 8,
      radius: 56,
      textSize: 'text-lg',
      labelSize: 'text-sm'
    },
    md: {
      container: 'w-40 h-40',
      strokeWidth: 10,
      radius: 70,
      textSize: 'text-2xl',
      labelSize: 'text-base'
    },
    lg: {
      container: 'w-48 h-48',
      strokeWidth: 12,
      radius: 84,
      textSize: 'text-3xl',
      labelSize: 'text-lg'
    }
  }

  const config = sizeConfig[size]
  const circumference = 2 * Math.PI * config.radius
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 100) * circumference

  // Color based on score
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600'
    if (score >= 70) return 'text-blue-600'
    if (score >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreStroke = (score: number) => {
    if (score >= 90) return 'stroke-green-600'
    if (score >= 70) return 'stroke-blue-600'
    if (score >= 50) return 'stroke-yellow-600'
    return 'stroke-red-600'
  }

  if (showUpgradePrompt) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-6 text-center">
          <div className="relative">
            {/* Blurred background score */}
            <div className={cn("mx-auto relative", config.container)}>
              <svg className="transform -rotate-90 w-full h-full">
                <circle
                  cx="50%"
                  cy="50%"
                  r={config.radius}
                  stroke="currentColor"
                  strokeWidth={config.strokeWidth}
                  fill="transparent"
                  className="text-muted-foreground/20"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r={config.radius}
                  stroke="currentColor"
                  strokeWidth={config.strokeWidth}
                  fill="transparent"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className={cn(getScoreStroke(score), "blur-sm opacity-30")}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center blur-sm opacity-30">
                  <div className={cn("font-bold", config.textSize, getScoreColor(score))}>
                    {score}%
                  </div>
                </div>
              </div>
            </div>

            {/* Upgrade overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
              <div className="text-center space-y-3">
                <IconLock className="h-8 w-8 mx-auto text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Detailed Score</p>
                  <p className="text-xs text-muted-foreground">Upgrade to see breakdown</p>
                </div>
                <Button size="sm" onClick={onUpgrade} className="gap-2">
                  <IconSparkles className="h-4 w-4" />
                  Upgrade
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-1">
            <h3 className={cn("font-medium", config.labelSize)}>{label}</h3>
            {caption && (
              <p className="text-xs text-muted-foreground">{caption}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6 text-center">
        <div className={cn("mx-auto relative", config.container)}>
          <svg className="transform -rotate-90 w-full h-full">
            {/* Background circle */}
            <circle
              cx="50%"
              cy="50%"
              r={config.radius}
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              fill="transparent"
              className="text-muted-foreground/20"
            />
            {/* Progress circle */}
            <circle
              cx="50%"
              cy="50%"
              r={config.radius}
              stroke="currentColor"
              strokeWidth={config.strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={cn(getScoreStroke(score), "transition-all duration-1000 ease-out")}
              strokeLinecap="round"
            />
          </svg>
          
          {/* Score text */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={cn("font-bold", config.textSize, getScoreColor(score))}>
                {score}%
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                SCORE
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1">
          <h3 className={cn("font-medium", config.labelSize)}>{label}</h3>
          {caption && (
            <p className="text-xs text-muted-foreground">{caption}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
