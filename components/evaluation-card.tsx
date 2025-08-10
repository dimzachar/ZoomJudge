"use client"

import React from 'react'
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
  score: number // Actual score achieved
  maxScore?: number // Maximum possible score (defaults to 1)
  statusLabel: "Needs Work" | "Excellent" | "OK"
  delta?: string // e.g., "+1 since last scan"
  feedback?: string // Detailed feedback (only for paid tiers)
  sourceFiles?: string[] // Files used for evaluation (new)
  repoUrl?: string // Repository URL for source file links
  isLocked?: boolean // For free tier users
  onUpgrade?: () => void // Upgrade prompt callback
  className?: string
}

export function EvaluationCard({
  title,
  description,
  score,
  maxScore = 1,
  statusLabel,
  delta,
  feedback,
  sourceFiles,
  repoUrl,
  isLocked = false,
  onUpgrade,
  className
}: EvaluationCardProps) {


  // Calculate percentage for dynamic styling
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
  
  // Dynamic score configuration based on percentage
  const getScoreConfig = (percentage: number) => {
    if (percentage >= 80) {
      return {
        icon: IconCheck,
        color: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/20',
        borderColor: 'border-green-200 dark:border-green-800'
      }
    } else if (percentage >= 40) {
      return {
        icon: IconMinus,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
        borderColor: 'border-yellow-200 dark:border-yellow-800'
      }
    } else {
      return {
        icon: IconX,
        color: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/20',
        borderColor: 'border-red-200 dark:border-red-800'
      }
    }
  }

  const config = getScoreConfig(percentage)
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
              <div className="text-sm font-medium">{score}/{maxScore} points</div>
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

  // Build a stable GitHub blob URL for a file path based on the provided repoUrl
  const buildGithubFileUrl = (repoUrlValue: string | undefined, filePath: string): string | undefined => {
    if (!repoUrlValue) return undefined
    try {
      const cleanedRepoUrl = repoUrlValue.replace(/\/$/, '')

      // Case 1: commit URL → keep the SHA to ensure correctness regardless of default branch
      const commitMatch = cleanedRepoUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\/commit\/([0-9a-f]{7,40})$/i)
      if (commitMatch) {
        const [, owner, repo, sha] = commitMatch
        return `https://github.com/${owner}/${repo}/blob/${sha}/${filePath}`
      }

      // Case 2: repo URL possibly with tree/blob and a ref; default to HEAD to respect default branch
      const repoMatch = cleanedRepoUrl.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/#?]+)(?:\/(tree|blob)\/([^\/]+))?/i)
      if (repoMatch) {
        const [, owner, repo, _kind, ref] = repoMatch
        const refToUse = ref || 'HEAD'
        return `https://github.com/${owner}/${repo}/blob/${refToUse}/${filePath}`
      }

      return undefined
    } catch {
      return undefined
    }
  }

  // Prepare a deduplicated display list of source files (preserve first occurrence formatting)
  const displaySourceFiles: string[] | undefined = Array.isArray(sourceFiles)
    ? (() => {
        const seen = new Set<string>()
        const result: string[] = []
        for (const item of sourceFiles) {
          if (typeof item !== 'string') continue
          const trimmed = item.trim()
          const isUrl = /^(https?:)\/\//i.test(trimmed)
          const key = isUrl
            ? trimmed
            : trimmed.replace(/^\.\/+/, '').replace(/^\/+/, '')
          if (!seen.has(key)) {
            seen.add(key)
            result.push(item)
          }
        }
        return result
      })()
    : undefined

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
            <div className="text-sm font-medium">{score}/{maxScore} points</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-1">
              <div 
                className={cn("h-1.5 rounded-full transition-all duration-500", 
                  percentage >= 80 ? 'bg-green-600' : percentage >= 40 ? 'bg-yellow-600' : 'bg-red-600'
                )}
                style={{ width: `${(score / maxScore) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {feedback && (
          <div className="mt-3 p-3 bg-muted/30 rounded-md">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {feedback}
            </p>
          </div>
        )}

        {displaySourceFiles && displaySourceFiles.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-1 mb-1">
              <svg className="h-3 w-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Sources analyzed:</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {displaySourceFiles.map((file, index) => {
                const isUrl = typeof file === 'string' && /^(https?:)\/\//i.test(file)
                const normalizedPath = typeof file === 'string'
                  ? file.trim().replace(/^\.\/+/, '').replace(/^\/+/, '')
                  : ''
                const href = isUrl ? file : buildGithubFileUrl(repoUrl, normalizedPath)
                const label = isUrl ? new URL(file).pathname.split('/').slice(-3).join('/') || file : file
                return (
                <span key={index} className="inline-flex items-center">
                    {href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
                        title={file}
                      >
                        {label}
                      </a>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded" title={file}>
                        {label}
                      </span>
                    )}
                  {index < displaySourceFiles.length - 1 && <span className="text-blue-400 mx-0.5">•</span>}
                  </span>
                )})}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
