import { EvaluationResults } from "@/app/dashboard/evaluation-results"

export default function HistoryPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Evaluation History</h1>
        <p className="text-muted-foreground">
          View and manage all your repository evaluations with advanced filtering options.
        </p>
      </div>

      {/* TODO: Add filter bar with date range, course, status, score range */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          🚧 Advanced filtering coming soon: date range, course selection, status filters, and score range.
        </p>
      </div>

      {/* Evaluation Results with extended limit for history view */}
      <EvaluationResults limit={50} />
    </div>
  )
}
