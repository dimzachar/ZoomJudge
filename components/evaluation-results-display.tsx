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
  // Safety check for results structure
  if (!results || !results.breakdown || typeof results.breakdown !== 'object') {
    console.error('Invalid results structure:', results);
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Error: Invalid evaluation results structure</p>
      </div>
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
      'dataIngestion': 'Data ingestion',
      'dataWarehouse': 'Data warehouse',
      'transformations': 'Transformations',
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

  // Get criteria order from the course data, but map to camelCase for matching
  const getCriteriaOrder = () => {
    if (!courseData?.criteria) {
      console.warn('No course data or criteria found, falling back to alphabetical order');
      return [];
    }
    return courseData.criteria.map(criterion => toCamelCase(criterion.name));
  };

  // Convert breakdown to evaluation cards - use actual criterion names from the evaluation results
  const criteriaOrder = getCriteriaOrder();
  const breakdownEntries = Object.entries(results.breakdown);



  // Sort entries based on the expected order
  const sortedEntries = breakdownEntries.sort(([nameA], [nameB]) => {
    const indexA = criteriaOrder.indexOf(nameA);
    const indexB = criteriaOrder.indexOf(nameB);
    
    // If both are in the order array, sort by index
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    // If only A is in the order, A comes first
    if (indexA !== -1) return -1;
    // If only B is in the order, B comes first  
    if (indexB !== -1) return 1;
    // If neither is in the order, maintain alphabetical
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

    return {
      key: criterionName,
      title: fromCamelCase(criterionName), // Convert camelCase back to proper display name
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
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <IconArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <h1 className="text-2xl font-bold tracking-tight">Evaluation Results</h1>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{repoName}</span>
            <Badge variant="outline">{courseType}</Badge>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <IconShare className="h-4 w-4 mr-2" />
            Share
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={repoUrl} target="_blank" rel="noopener noreferrer">
              <IconExternalLink className="h-4 w-4 mr-2" />
              View Repo
            </a>
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <div className="flex justify-center">
        <OverallRepoScore
          score={percentage}
          label="Overall Repository Score"
          caption={`${results.totalScore} out of ${results.maxScore} points`}
          size="lg"
        />
      </div>



      {/* Detailed Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detailed Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {evaluationCards.map((card) => (
              <EvaluationCard
                key={card.key}
                title={card.title}
                description={card.description}
                score={card.score}
                maxScore={card.maxScore}
                statusLabel={card.statusLabel as "Needs Work" | "Excellent" | "OK"}
                feedback={card.feedback}
                sourceFiles={card.sourceFiles}
                repoUrl={card.repoUrl}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Score Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Evaluation ID: {evaluationId}</span>
            <span>Completed just now</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
