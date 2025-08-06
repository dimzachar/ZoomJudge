export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Track your evaluation performance and improvement trends over time.
        </p>
      </div>

      {/* Placeholder for analytics content */}
      <div className="grid gap-6">
        <div className="rounded-lg border bg-card p-6">
          <h3 className="text-lg font-semibold mb-2">Performance Overview</h3>
          <p className="text-sm text-muted-foreground">
            🚧 Coming soon: Score trends, course performance comparison, and improvement analytics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Score Distribution</h3>
            <p className="text-sm text-muted-foreground">
              📊 Histogram of evaluation scores across all courses.
            </p>
          </div>

          <div className="rounded-lg border bg-card p-6">
            <h3 className="text-lg font-semibold mb-2">Course Performance</h3>
            <p className="text-sm text-muted-foreground">
              📈 Radar chart comparing performance across different Zoomcamp courses.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
