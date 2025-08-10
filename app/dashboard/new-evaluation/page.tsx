"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { EvaluationForm } from "@/app/dashboard/evaluation-form"
import { EvaluationResultsDisplay } from "@/components/evaluation-results-display"
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

  // Fetch evaluation details when we have an ID
  const evaluation = useQuery(
    api.evaluations.getEvaluationById,
    currentEvaluationId ? { evaluationId: currentEvaluationId } : "skip"
  )

  const handleEvaluationSuccess = (evaluationId: string, data: { repoUrl: string; courseType: string }) => {
    setCurrentEvaluationId(evaluationId)
    setEvaluationData(data)
  }

  const handleBackToForm = () => {
    setCurrentEvaluationId(null)
    setEvaluationData(null)
  }

  // Trigger confetti + toast once when evaluation completes
  const hasCelebratedRef = useRef(false)
  useEffect(() => {
    if (
      !hasCelebratedRef.current &&
      currentEvaluationId &&
      evaluation &&
      evaluation.status === 'completed' &&
      evaluation.results &&
      evaluationData
    ) {
      hasCelebratedRef.current = true

      const stop = celebrate(1800)
      const score = Math.round((evaluation.results.totalScore / evaluation.results.maxScore) * 100)
      toast.success('Evaluation completed! 🎉', {
        description: `Great job! Your repository scored ${score}% in the ${evaluationData.courseType} evaluation.`,
        duration: 4000,
      })

      return () => stop()
    }
  }, [currentEvaluationId, evaluation, evaluationData])

  // Show results if we have a completed evaluation
  if (currentEvaluationId && evaluation && evaluation.status === 'completed' && evaluation.results && evaluationData) {
    return (
      <EvaluationResultsDisplay
        results={evaluation.results}
        repoUrl={evaluationData.repoUrl}
        courseType={evaluationData.courseType}
        evaluationId={currentEvaluationId}
        onBack={handleBackToForm}
      />
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
