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
      container: 'w-40 h-24',
      strokeWidth: 8,
      radius: 60,
      textSize: 'text-lg',
      labelSize: 'text-sm'
    },
    md: {
      container: 'w-48 h-28',
      strokeWidth: 10,
      radius: 75,
      textSize: 'text-2xl',
      labelSize: 'text-base'
    },
    lg: {
      container: 'w-56 h-32',
      strokeWidth: 12,
      radius: 90,
      textSize: 'text-3xl',
      labelSize: 'text-lg'
    }
  }

  const config = sizeConfig[size]

  // Semicircle gauge calculations
  const radius = config.radius
  const strokeWidth = config.strokeWidth
  const normalizedRadius = radius - strokeWidth
  const circumference = normalizedRadius * Math.PI // Half circle
  const strokeDasharray = `${circumference} ${circumference}`
  const strokeDashoffset = circumference - (score / 100) * circumference

  // Color based on score with gradient-like transitions
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-blue-600'
    if (score >= 40) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreStroke = (score: number) => {
    if (score >= 80) return 'stroke-green-500'
    if (score >= 60) return 'stroke-blue-500'
    if (score >= 40) return 'stroke-yellow-500'
    return 'stroke-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'EXCELLENT'
    if (score >= 60) return 'GOOD'
    if (score >= 40) return 'FAIR'
    return 'NEEDS WORK'
  }

  if (showUpgradePrompt) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardContent className="p-6 text-center">
          <div className="relative">
            {/* Blurred background score */}
            <div className={cn("mx-auto relative", config.container)}>
              <svg className="w-full h-full" viewBox={`0 0 ${radius * 2} ${radius + 20}`}>
                {/* Background semicircle */}
                <path
                  d={`M ${strokeWidth} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth} ${radius}`}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
                  fill="transparent"
                  className="text-muted-foreground/20"
                />
                {/* Progress semicircle */}
                <path
                  d={`M ${strokeWidth} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth} ${radius}`}
                  stroke="currentColor"
                  strokeWidth={strokeWidth}
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
          <svg className="w-full h-full" viewBox={`0 0 ${radius * 2} ${radius + 20}`}>
            {/* Background semicircle */}
            <path
              d={`M ${strokeWidth} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth} ${radius}`}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              className="text-muted-foreground/20"
            />
            {/* Progress semicircle */}
            <path
              d={`M ${strokeWidth} ${radius} A ${normalizedRadius} ${normalizedRadius} 0 0 1 ${radius * 2 - strokeWidth} ${radius}`}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={cn(getScoreStroke(score), "transition-all duration-1000 ease-out")}
              strokeLinecap="round"
            />

            {/* Scale markers */}
            <text x={strokeWidth} y={radius + 15} className="fill-muted-foreground text-xs" textAnchor="start">0</text>
            <text x={radius} y={radius + 15} className="fill-muted-foreground text-xs" textAnchor="middle">50</text>
            <text x={radius * 2 - strokeWidth} y={radius + 15} className="fill-muted-foreground text-xs" textAnchor="end">100</text>
          </svg>

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ marginTop: '-10px' }}>
            <div className="text-center">
              <div className={cn("font-bold", config.textSize, getScoreColor(score))}>
                {score}
              </div>
              <div className={cn("text-xs font-medium", getScoreColor(score))}>
                {getScoreLabel(score)}
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
