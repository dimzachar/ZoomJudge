import { EvaluationResults } from "@/app/dashboard/evaluation-results"
import { QuickActions } from "@/app/dashboard/quick-actions"
import { DashboardContent } from "@/app/dashboard/dashboard-content"
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard - ZoomJudge | AI Repository Evaluation Platform',
  description: 'Access your ZoomJudge dashboard to evaluate GitHub repositories, view evaluation history, and get AI-powered feedback for your Zoomcamp projects.',
  keywords: 'ZoomJudge dashboard, repository evaluation dashboard, GitHub analysis dashboard, AI code review dashboard',
  alternates: {
    canonical: '/dashboard',
  },
  robots: {
    index: false, // Dashboard should not be indexed as it's user-specific
    follow: true,
  },
}

export default function Page() {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Welcome Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Welcome to ZoomJudge</h1>
          <p className="text-muted-foreground text-base sm:text-lg">
            Get AI-powered evaluation and feedback for your GitHub repositories across different Zoomcamp courses.
          </p>
        </div>
        <QuickActions />
      </div>

      {/* Dashboard Content - Client Component */}
      <DashboardContent />

      {/* Recent Evaluations */}
      <div className="space-y-3 sm:space-y-4">
        <EvaluationResults />
      </div>
    </div>
  )
}


