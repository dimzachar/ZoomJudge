import { EvaluationForm } from "@/app/dashboard/evaluation-form"

export default function NewEvaluationPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">New Evaluation</h1>
        <p className="text-muted-foreground">
          Submit a GitHub repository for AI-powered evaluation and detailed feedback.
        </p>
      </div>

      {/* Centered evaluation form */}
      <div className="flex justify-center">
        <div className="w-full max-w-2xl">
          <EvaluationForm />
        </div>
      </div>

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
            <p className="text-muted-foreground">Receive detailed scores and actionable recommendations for improvement.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
