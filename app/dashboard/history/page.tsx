import { EvaluationResults } from "@/app/dashboard/evaluation-results"

export default function HistoryPage() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Evaluation History</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          View and manage all your repository evaluations with advanced filtering options.
        </p>
      </div>

      {/* TODO: Add filter bar with date range, course, status, score range */}
      <div className="rounded-lg border bg-card p-3 sm:p-4">
        <p className="text-xs sm:text-sm text-muted-foreground">
          🚧 Advanced filtering coming soon: date range, course selection, status filters, and score range.
        </p>
      </div>

      {/* Evaluation Results with extended limit for history view */}
      <EvaluationResults limit={50} />
    </div>
  )
}
