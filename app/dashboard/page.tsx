import { EvaluationForm } from "@/app/dashboard/evaluation-form"
import { EvaluationResults } from "@/app/dashboard/evaluation-results"

export default function Page() {
  return (
    <div className="space-y-8 p-4 lg:p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">ZoomJudge</h1>
        <p className="text-muted-foreground">
          Submit your GitHub repositories for AI-powered evaluation and feedback across different Zoomcamp courses.
        </p>
      </div>

      <EvaluationForm />

      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Your Evaluations</h2>
        <EvaluationResults />
      </div>
    </div>
  )
}
