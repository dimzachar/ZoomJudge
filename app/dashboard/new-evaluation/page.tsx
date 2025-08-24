"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { EvaluationForm } from "@/app/dashboard/evaluation-form"
import { EvaluationResultsDisplay } from "@/components/evaluation-results-display"
import { ContextualFeedbackPrompt } from "@/components/feedback/contextual-feedback-prompt"
import { useFeedback } from "@/components/feedback/feedback-context"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { celebrate } from "@/lib/confetti"
import { toast } from "sonner"

export default function NewEvaluationPage() {
  const [currentEvaluationId, setCurrentEvaluationId] = useState<string | null>(null)
  const [evaluationData, setEvaluationData] = useState<{
    repoUrl: string
    courseType: string
  } | null>(null)
  const [cachedResults, setCachedResults] = useState<any>(null)
  const [showTestPrompt, setShowTestPrompt] = useState(false)
  const { resetFeedbackInteraction } = useFeedback()

  // Reset feedback interaction tracking when starting a new evaluation
  useEffect(() => {
    console.log('NewEvaluationPage: Resetting feedback interaction on page load')
    resetFeedbackInteraction()
  }, []) // Only run once on mount

  // Fetch evaluation details when we have an ID (only if we don't have cached results)
  const evaluation = useQuery(
    api.evaluations.getEvaluationById,
    currentEvaluationId && !cachedResults ? { evaluationId: currentEvaluationId as any } : "skip"
  )

  const handleEvaluationSuccess = (evaluationId: string, data: { repoUrl: string; courseType: string }, results?: any) => {
    console.log('=== EVALUATION SUCCESS CALLBACK ===')
    console.log('evaluationId:', evaluationId)
    console.log('results provided:', !!results)
    if (results) {
      console.log('results structure:', {
        totalScore: results.totalScore,
        maxScore: results.maxScore,
        hasBreakdown: !!results.breakdown,
        breakdownKeys: results.breakdown ? Object.keys(results.breakdown) : []
      })
    }

    // Reset feedback interaction tracking for this new evaluation
    console.log('NewEvaluationPage: Resetting feedback interaction for new evaluation:', evaluationId)
    resetFeedbackInteraction()

    setCurrentEvaluationId(evaluationId)
    setEvaluationData(data)
    // If results are provided (from cached evaluation), use them directly
    if (results) {
      setCachedResults(results)
    }
    console.log('=== END EVALUATION SUCCESS CALLBACK ===')
  }

  const handleBackToForm = () => {
    setCurrentEvaluationId(null)
    setEvaluationData(null)
    setCachedResults(null)
  }

  // Trigger confetti + toast once when evaluation completes
  const hasCelebratedRef = useRef(false)
  useEffect(() => {
    const resultsForCelebration = cachedResults || evaluation?.results
    const statusForCelebration = cachedResults ? 'completed' : evaluation?.status

    if (
      !hasCelebratedRef.current &&
      currentEvaluationId &&
      statusForCelebration === 'completed' &&
      resultsForCelebration &&
      evaluationData
    ) {
      hasCelebratedRef.current = true

      const stop = celebrate(1800)
      const score = Math.round((resultsForCelebration.totalScore / resultsForCelebration.maxScore) * 100)
      toast.success('Evaluation completed! 🎉', {
        description: `Great job! Your repository scored ${score}% in the ${evaluationData.courseType} evaluation.`,
        duration: 4000,
      })

      return () => stop()
    }
  }, [currentEvaluationId, evaluation, evaluationData, cachedResults])



  // Determine which results to use - cached results take priority
  const resultsToUse = cachedResults || evaluation?.results
  const statusToCheck = cachedResults ? 'completed' : evaluation?.status

  // Debug the display logic
  console.log('=== RESULTS DISPLAY CHECK ===')
  console.log('currentEvaluationId:', currentEvaluationId)
  console.log('statusToCheck:', statusToCheck)
  console.log('resultsToUse exists:', !!resultsToUse)
  console.log('evaluationData exists:', !!evaluationData)
  console.log('cachedResults exists:', !!cachedResults)
  console.log('evaluation?.results exists:', !!evaluation?.results)

  const shouldShowResults = currentEvaluationId && statusToCheck === 'completed' && resultsToUse && evaluationData
  console.log('shouldShowResults:', shouldShowResults)
  console.log('=== END RESULTS DISPLAY CHECK ===')

  // Show results if we have a completed evaluation (either cached or from query)
  if (shouldShowResults) {
    return (
      <>
        <EvaluationResultsDisplay
          results={resultsToUse}
          repoUrl={evaluationData.repoUrl}
          courseType={evaluationData.courseType}
          evaluationId={currentEvaluationId}
          onBack={handleBackToForm}
        />

        {/* Contextual feedback prompt for completed evaluations */}
        {console.log('Rendering ContextualFeedbackPrompt for completed evaluation:', currentEvaluationId)}
        <ContextualFeedbackPrompt
          trigger="evaluation-completed"
          evaluationId={currentEvaluationId}
          delay={8000} // Show after 8 seconds to let user see results first
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">New Evaluation</h1>
        <p className="text-muted-foreground">
          Submit a GitHub repository for AI-powered evaluation and detailed feedback.
        </p>
      </div> */}
      {/* Help section */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">1</div>
              <span className="font-medium">Submit Repository</span>
            </div>
            <p className="text-muted-foreground">Enter your GitHub repository URL and select the relevant Zoomcamp course.</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">2</div>
              <span className="font-medium">AI Analysis</span>
            </div>
            <p className="text-muted-foreground">Our AI analyzes your code against course-specific criteria and best practices.</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-semibold">3</div>
              <span className="font-medium">Get Feedback</span>
            </div>
            <p className="text-muted-foreground">Receive detailed scores and specific recommendations for improvement.</p>
          </div>
        </div>
      </div>

      {/* Centered evaluation form */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <EvaluationForm onSubmissionSuccess={handleEvaluationSuccess} />
        </div>
      </div>


    </div>
  )
}
