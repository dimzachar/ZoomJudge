import { EvaluationResults } from "@/app/dashboard/evaluation-results"
import { QuickActions } from "@/app/dashboard/quick-actions"
import { DashboardStats } from "@/components/dashboard-stats"

export default function Page() {
  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to ZoomJudge</h1>
          <p className="text-muted-foreground text-lg">
            Get AI-powered evaluation and feedback for your GitHub repositories across different Zoomcamp courses.
          </p>
        </div>

        {/* Quick Actions */}
        <QuickActions />
      </div>

      {/* Dashboard Stats */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
        <DashboardStats
          stats={{
            total: 12,
            completed: 8,
            processing: 2,
            pending: 2,
            averageScore: 78
          }}
          userTier="free"
          currentUsage={3}
          monthlyLimit={4}
        />
      </div>

      {/* Recent Evaluations */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Recent Evaluations</h2>
        <EvaluationResults />
      </div>
    </div>
  )
}
