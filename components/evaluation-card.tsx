"use client"

import React, { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  IconChevronDown, 
  IconChevronUp, 
  IconLock, 
  IconSparkles,
  IconCheck,
  IconX,
  IconMinus,
  IconTrendingUp,
  IconTrendingDown
} from '@tabler/icons-react'
import { cn } from '@/lib/utils'

interface EvaluationCardProps {
  title: string // e.g., "Retrieval Flow"
  description: string // Criteria explanation
  score: 0 | 1 | 2 // Scoring scale
  statusLabel: "Needs Work" | "Excellent" | "OK"
  delta?: string // e.g., "+1 since last scan"
  feedback?: string // Detailed feedback (only for paid tiers)
  isLocked?: boolean // For free tier users
  onUpgrade?: () => void // Upgrade prompt callback
  className?: string
}

export function EvaluationCard({
  title,
  description,
  score,
  statusLabel,
  delta,
  feedback,
  isLocked = false,
  onUpgrade,
  className
}: EvaluationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Score configuration
  const scoreConfig = {
    0: {
      icon: IconX,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20',
      borderColor: 'border-red-200 dark:border-red-800'
    },
    1: {
      icon: IconMinus,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      borderColor: 'border-yellow-200 dark:border-yellow-800'
    },
    2: {
      icon: IconCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      borderColor: 'border-green-200 dark:border-green-800'
    }
  }

  const config = scoreConfig[score]
  const ScoreIcon = config.icon

  // Status label styling
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'OK':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'Needs Work':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  // Delta styling
  const getDeltaIcon = (delta?: string) => {
    if (!delta) return null
    if (delta.startsWith('+')) return IconTrendingUp
    if (delta.startsWith('-')) return IconTrendingDown
    return null
  }

  const getDeltaColor = (delta?: string) => {
    if (!delta) return ''
    if (delta.startsWith('+')) return 'text-green-600'
    if (delta.startsWith('-')) return 'text-red-600'
    return 'text-muted-foreground'
  }

  if (isLocked) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h3 className="font-medium text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Badge variant="secondary" className={getStatusStyle(statusLabel)}>
                {statusLabel}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {/* Blurred score indicator */}
          <div className="flex items-center gap-3 opacity-30 blur-sm">
            <div className={cn("p-2 rounded-full", config.bgColor)}>
              <ScoreIcon className={cn("h-4 w-4", config.color)} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium">{score}/2 points</div>
            </div>
          </div>

          {/* Upgrade overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="text-center space-y-3 p-4">
              <IconLock className="h-6 w-6 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Detailed Breakdown</p>
                <p className="text-xs text-muted-foreground">Upgrade to see criteria analysis</p>
              </div>
              <Button size="sm" onClick={onUpgrade} className="gap-2">
                <IconSparkles className="h-4 w-4" />
                Upgrade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const DeltaIcon = getDeltaIcon(delta)

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <h3 className="font-medium text-sm">{title}</h3>
            <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge variant="secondary" className={getStatusStyle(statusLabel)}>
              {statusLabel}
            </Badge>
            {delta && DeltaIcon && (
              <div className={cn("flex items-center gap-1 text-xs", getDeltaColor(delta))}>
                <DeltaIcon className="h-3 w-3" />
                <span>{delta}</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-full", config.bgColor)}>
            <ScoreIcon className={cn("h-4 w-4", config.color)} />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium">{score}/2 points</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div 
                className={cn("h-1.5 rounded-full transition-all duration-500", 
                  score === 2 ? 'bg-green-600' : score === 1 ? 'bg-yellow-600' : 'bg-red-600'
                )}
                style={{ width: `${(score / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {feedback && (
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded} className="mt-4">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-full justify-between p-0 h-auto">
                <span className="text-xs font-medium">View Details</span>
                {isExpanded ? (
                  <IconChevronUp className="h-3 w-3" />
                ) : (
                  <IconChevronDown className="h-3 w-3" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                {feedback}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
