"use client"

import React, { useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { EvaluationResultsDisplay } from "@/components/evaluation-results-display"
import { ContextualFeedbackPrompt } from "@/components/feedback/contextual-feedback-prompt"
import { useFeedback } from "@/components/feedback/feedback-context"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, ArrowLeft } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { celebrate } from "@/lib/confetti"
import { toast } from "sonner"

interface EvaluationDetailPageProps {
  params: Promise<{
    id: string
  }>
}

export default function EvaluationDetailPage({ params }: EvaluationDetailPageProps) {
  const router = useRouter()
  const resolvedParams = React.use(params)
  const evaluation = useQuery(api.evaluations.getEvaluationById, {
    evaluationId: resolvedParams.id as any
  })
  const { resetFeedbackInteraction } = useFeedback()

  // Reset feedback interaction tracking when this evaluation page loads
  useEffect(() => {
    console.log('EvaluationDetailPage: Resetting feedback interaction for evaluation:', resolvedParams.id)
    resetFeedbackInteraction()
  }, [resolvedParams.id]) // Only depend on the evaluation ID, not the function

  const hasCelebratedRef = React.useRef(false)
  React.useEffect(() => {
    if (
      !hasCelebratedRef.current &&
      evaluation &&
      evaluation.status === 'completed' &&
      evaluation.results
    ) {
      hasCelebratedRef.current = true
      const stop = celebrate(1800)
      const score = Math.round((evaluation.results.totalScore / evaluation.results.maxScore) * 100)
      toast.success('Evaluation completed! 🎉', {
        description: `Great job! Your repository scored ${score}% in the ${evaluation.course} evaluation.`,
        duration: 4000,
      })
      return () => stop()
    }
  }, [evaluation])

  if (evaluation === undefined) {
    return <EvaluationDetailSkeleton />
  }

  if (evaluation === null) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluation Not Found</h1>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm sm:text-base">
            This evaluation could not be found or you don't have permission to view it.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild className="w-full sm:w-auto min-h-[44px]">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto min-h-[44px]">
            <Link href="/dashboard/history">View History</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (evaluation.status !== 'completed' || !evaluation.results) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="min-h-[44px]">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Evaluation Details</h1>
        </div>
        
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">
                {evaluation.repoOwner}/{evaluation.repoName}
              </h3>
              <p className="text-muted-foreground">
                {evaluation.status === 'processing' || evaluation.status === 'pending' 
                  ? 'This evaluation is still being processed. Please check back later.'
                  : evaluation.status === 'failed'
                  ? 'This evaluation failed to complete. You can try submitting it again.'
                  : 'This evaluation is not yet complete.'
                }
              </p>
              <div className="flex justify-center gap-2">
                <Button asChild>
                  <Link href="/dashboard/new-evaluation">New Evaluation</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/dashboard/history">View History</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <EvaluationResultsDisplay
        results={evaluation.results}
        repoUrl={evaluation.repoUrl}
        courseType={evaluation.course}
        evaluationId={evaluation._id}
        onBack={() => router.back()}
      />

      {/* Contextual feedback prompt for completed evaluations */}
      {evaluation.status === 'completed' && (
        <ContextualFeedbackPrompt
          trigger="evaluation-completed"
          evaluationId={evaluation._id}
          delay={8000} // Show after 8 seconds to let user see results first
        />
      )}

      {/* Contextual feedback prompt for failed evaluations */}
      {evaluation.status === 'failed' && (
        <ContextualFeedbackPrompt
          trigger="evaluation-failed"
          evaluationId={evaluation._id}
          delay={3000} // Show sooner for failed evaluations
        />
      )}
    </>
  )
}

function EvaluationDetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-48" />
      </div>
      
      <div className="flex justify-center">
        <Skeleton className="w-56 h-32 rounded-lg" />
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-6 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4 mt-2" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
