"use client"

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OverallRepoScore } from '@/components/overall-repo-score'
import { EvaluationCard } from '@/components/evaluation-card'
import { IconArrowLeft, IconExternalLink, IconShare } from '@tabler/icons-react'
import { cn } from '@/lib/utils'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useUserTier } from '@/components/clerk-billing-gate'
import { TierGatedContent } from '@/components/tier-gated-content'
import { ContextualFeedbackPrompt } from '@/components/feedback/contextual-feedback-prompt'
import { canAccessFeature } from '@/lib/tier-permissions'

interface EvaluationResultsDisplayProps {
  results: {
    totalScore: number
    maxScore: number
    breakdown: Record<string, { score: number; feedback: string; maxScore: number; sourceFiles?: string[] }>
    overallFeedback: string
  }
  repoUrl: string
  courseType: string
  evaluationId: string
  onBack?: () => void
  className?: string
}

export function EvaluationResultsDisplay({
  results,
  repoUrl,
  courseType,
  evaluationId,
  onBack,
  className
}: EvaluationResultsDisplayProps) {
  // Get user tier for feature gating
  const userTier = useUserTier()
  const canViewDetailedFeedback = canAccessFeature('detailed-feedback', userTier)

  // Safety check for results structure
  if (!results || !results.breakdown || typeof results.breakdown !== 'object') {
    console.error('Invalid results structure - results object is malformed');
    return (
      <>
        <div className="text-center py-8">
          <p className="text-red-600">Error: Invalid evaluation results structure</p>
        </div>
        <ContextualFeedbackPrompt
          trigger="error-occurred"
          evaluationId={evaluationId}
          delay={1000}
        />
      </>
    );
  }

  // Fetch course data to get the correct criteria order
  const courseData = useQuery(api.courses.getCourse, { courseId: courseType });

  // Show loading state while course data is being fetched
  if (courseData === undefined) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Loading evaluation details...</p>
      </div>
    );
  }

  // If course data is null (not found), fall back to alphabetical ordering
  if (courseData === null) {
    console.warn(`Course not found: ${courseType}. Falling back to alphabetical ordering.`);
  }

  const percentage = Math.round((results.totalScore / results.maxScore) * 100)
  
  // Extract repo name from URL
  const repoName = repoUrl.split('/').slice(-2).join('/')
  
  // Helper function to convert criterion name to camelCase (as used in AI responses)
  const toCamelCase = (str: string) => {
    return str
      .replace(/[^a-zA-Z0-9 ]/g, ' ') // Replace special characters with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim() // Remove leading/trailing spaces
      .split(' ')
      .map((word, index) => {
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join('');
  };

  // Helper function to convert camelCase back to proper name
  const fromCamelCase = (str: string) => {
    // Handle special cases first
    const specialCases: Record<string, string> = {
      'problemDescription': 'Problem description',
      'retrievalFlow': 'Retrieval flow',
      'retrievalEvaluation': 'Retrieval evaluation',
      'llmEvaluation': 'LLM evaluation',
      'interface': 'Interface',
      'ingestionPipeline': 'Ingestion pipeline',
      'monitoring': 'Monitoring',
      'containerization': 'Containerization',
      'reproducibility': 'Reproducibility',
      'bestPractices': 'Best practices',
      'bonusPoints': 'Bonus points',
      'cloud': 'Cloud',
      'dataIngestionBatchWorkflowOrchestration': 'Data Ingestion: Batch / Workflow orchestration',
      'dataIngestionStream': 'Data Ingestion: Stream',
      'dataWarehouse': 'Data warehouse',
      'transformations': 'Transformations (dbt, spark, etc)',
      'Transformations': 'Transformations (dbt, spark, etc)', // Added uppercase version
      'dashboard': 'Dashboard',
      'eda': 'EDA',
      'modelTraining': 'Model training',
      'exportingNotebookToScript': 'Exporting notebook to script',
      'modelDeployment': 'Model deployment',
      'dependencyAndEnvironmentManagement': 'Dependency and environment management',
      'cloudDeployment': 'Cloud deployment',
      'experimentTrackingAndModelRegistry': 'Experiment tracking and model registry',
      'workflowOrchestration': 'Workflow orchestration',
      'modelMonitoring': 'Model monitoring',
      'dataSources': 'Data Sources',
      'dataTransformationsEda': 'Data Transformations + EDA',
      'modeling': 'Modeling',
      'tradingSimulation': 'Trading Simulation',
      'automation': 'Automation'
    };

    if (specialCases[str]) {
      return specialCases[str];
    }

    // Fallback: convert camelCase to space-separated words
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (match) => match.toUpperCase())
      .trim();
  };

  // Create a mapping from AI criterion names to course criterion names
  const mapCriterionName = (aiName: string): string | null => {
    // For data engineering course, map AI names to course criteria
    if (courseType === 'data-engineering') {
      const mappings: Record<string, string> = {
        'problemDescription': 'Problem description',
        'cloud': 'Cloud',
        'dataIngestionBatchWorkflowOrchestration': 'Data Ingestion: Batch / Workflow orchestration',
        'dataIngestionStream': 'Data Ingestion: Stream',
        'dataWarehouse': 'Data warehouse',
        'transformations': 'Transformations (dbt, spark, etc)',
        'Transformations': 'Transformations (dbt, spark, etc)', // Added uppercase version
        'dashboard': 'Dashboard',
        'reproducibility': 'Reproducibility'
      };
      return mappings[aiName] || null;
    }
    
    // For other courses, use existing logic
    return null;
  };

  // Helper function to normalize criterion names for comparison
  const normalizeCriterionName = (name: string): string => {
    // Handle special cases where AI might return shortened names
    const specialMappings: Record<string, string> = {
      'transformations': 'transformationsdbtsparketc', // Map "Transformations" to match "Transformations (dbt, spark, etc)"
      'dataingestionbatchworkfloworchestration': 'dataingestionbatchworkfloworchestration',
      'dataingestionstream': 'dataingestionstream',
      'datawarehouse': 'datawarehouse',
      'dashboard': 'dashboard',
      'problemdescription': 'problemdescription',
      'reproducibility': 'reproducibility',
      'cloud': 'cloud'
    };

    const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return specialMappings[normalized] || normalized;
  };

  // Create a mapping from evaluation result names to course criterion names
  const mapEvaluationNameToCourseOrder = (evalName: string): number => {
    if (!courseData?.criteria) return -1;

    // Handle specific known cases where AI returns shortened names
    const directMappings: Record<string, string> = {
      'Transformations': 'Transformations (dbt, spark, etc)',
      'transformations': 'Transformations (dbt, spark, etc)',
      'Data Ingestion: Batch / Workflow orchestration': 'Data Ingestion: Batch / Workflow orchestration',
      'Data Ingestion: Stream': 'Data Ingestion: Stream',
      'Data warehouse': 'Data warehouse',
      'Dashboard': 'Dashboard',
      'Problem description': 'Problem description',
      'Reproducibility': 'Reproducibility',
      'Cloud': 'Cloud'
    };

    // Get the proper criterion name
    const properName = directMappings[evalName] || evalName;

    // Find the index in course criteria
    for (let i = 0; i < courseData.criteria.length; i++) {
      const courseCriterion = courseData.criteria[i];
      if (courseCriterion.name === properName) {
        return i;
      }
    }

    // Fallback to normalized comparison
    const normalizedEvalName = normalizeCriterionName(evalName);
    for (let i = 0; i < courseData.criteria.length; i++) {
      const courseCriterion = courseData.criteria[i];
      const normalizedCourseName = normalizeCriterionName(courseCriterion.name);

      if (normalizedEvalName === normalizedCourseName) {
        return i;
      }
    }

    return -1; // Not found
  };

  // Convert breakdown to evaluation cards
  const breakdownEntries = Object.entries(results.breakdown);

  // Sort entries based on the course criteria order
  const sortedEntries = breakdownEntries.sort(([nameA], [nameB]) => {
    // Get the order indices for both names
    const orderA = mapEvaluationNameToCourseOrder(nameA);
    const orderB = mapEvaluationNameToCourseOrder(nameB);

    // If both are found in course criteria, sort by order
    if (orderA !== -1 && orderB !== -1) {
      return orderA - orderB;
    }
    // If only A is found, A comes first
    if (orderA !== -1) return -1;
    // If only B is found, B comes first
    if (orderB !== -1) return 1;
    // If neither is found, maintain alphabetical order
    return nameA.localeCompare(nameB);
  });

  const evaluationCards = sortedEntries.map(([criterionName, data]) => {
    // Ensure score is a valid number and clamp to 0-2 range for most courses
    const rawScore = typeof data.score === 'number' ? data.score : 0
    const maxScore = typeof data.maxScore === 'number' ? data.maxScore : 2

    // For most Zoomcamp courses, scores are 0-2, but some criteria can have higher max scores
    // Calculate status based on the score relative to max score
    const percentage = maxScore > 0 ? (rawScore / maxScore) * 100 : 0
    const statusLabel = percentage >= 80 ? "Excellent" : percentage >= 40 ? "OK" : "Needs Work"

    // Map evaluation result name to proper course criterion name
    const getProperCriterionName = (evalName: string): string => {
      if (!courseData?.criteria) return evalName;

      // Handle specific known cases where AI returns shortened names
      const directMappings: Record<string, string> = {
        'Transformations': 'Transformations (dbt, spark, etc)',
        'transformations': 'Transformations (dbt, spark, etc)',
        'Data Ingestion: Batch / Workflow orchestration': 'Data Ingestion: Batch / Workflow orchestration',
        'Data Ingestion: Stream': 'Data Ingestion: Stream',
        'Data warehouse': 'Data warehouse',
        'Dashboard': 'Dashboard',
        'Problem description': 'Problem description',
        'Reproducibility': 'Reproducibility',
        'Cloud': 'Cloud'
      };

      // Check direct mappings first
      if (directMappings[evalName]) {
        return directMappings[evalName];
      }

      // Fallback to normalized comparison
      const normalizedEvalName = normalizeCriterionName(evalName);

      for (const courseCriterion of courseData.criteria) {
        const normalizedCourseName = normalizeCriterionName(courseCriterion.name);
        if (normalizedEvalName === normalizedCourseName) {
          return courseCriterion.name;
        }
      }

      return evalName; // Fallback to original name if no match found
    };

    const title = getProperCriterionName(criterionName);

    return {
      key: criterionName,
      title: title,
      description: "", // Empty description as feedback contains the details
      score: rawScore,
      maxScore: maxScore,
      statusLabel,
      feedback: data.feedback,
      sourceFiles: data.sourceFiles,
      repoUrl: repoUrl,
    }
  })

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${repoName} Evaluation Results`,
          text: `My repository scored ${results.totalScore}/${results.maxScore} points (${percentage}%) in the ${courseType} evaluation!`,
          url: window.location.href
        })
      } catch (error) {
        // Fallback to clipboard
        copyToClipboard()
      }
    } else {
      copyToClipboard()
    }
  }

  const copyToClipboard = () => {
    const text = `${repoName} scored ${results.totalScore}/${results.maxScore} points (${percentage}%) in the ${courseType} evaluation! ${window.location.href}`
    navigator.clipboard.writeText(text)
  }

  return (
    <div className={cn("space-y-4 sm:space-y-6 w-full max-w-full overflow-hidden", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="flex-shrink-0">
                <IconArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight break-words">Evaluation Results</h1>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-muted-foreground">
            <span className="text-sm sm:text-base break-all">{repoName}</span>
            <Badge variant="outline" className="text-xs sm:text-sm flex-shrink-0 w-fit">{courseType}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={handleShare} className="min-h-[44px] text-xs sm:text-sm">
            <IconShare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Share</span>
            <span className="sm:hidden">Share</span>
          </Button>
          <Button variant="outline" size="sm" asChild className="min-h-[44px] text-xs sm:text-sm">
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">
              <IconExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">View Repo</span>
              <span className="sm:hidden">Repo</span>
            </a>
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="flex justify-center px-4 sm:px-0">
        <OverallRepoScore
          score={percentage}
          label="Overall Repository Score"
          caption={`${results.totalScore} out of ${results.maxScore} points`}
          size="lg"
        />
      </div>

      {/* Detailed Breakdown */}
      <Card className="w-full max-w-full overflow-hidden">
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg break-words">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid gap-3 sm:gap-4 w-full">
            {evaluationCards.map((card) => (
              <EvaluationCard
                key={card.key}
                title={card.title}
                description={card.description}
                score={card.score}
                maxScore={card.maxScore}
                statusLabel={card.statusLabel as "Needs Work" | "Excellent" | "OK"}
                feedback={canViewDetailedFeedback ? card.feedback : undefined}
                sourceFiles={canViewDetailedFeedback ? card.sourceFiles : undefined}
                repoUrl={card.repoUrl}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Metadata */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm text-muted-foreground">
            <span>Evaluation ID: {evaluationId}</span>
            <span>Completed just now</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
