import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Analytics - ZoomJudge | Repository Performance Insights',
  description: 'Analyze your repository evaluation performance with detailed analytics, trends, and insights. Track your progress across multiple evaluations and identify areas for improvement.',
  keywords: 'repository analytics, evaluation analytics, code quality metrics, performance insights, ZoomJudge analytics dashboard',
  alternates: {
    canonical: '/dashboard/analytics',
  },
  robots: {
    index: false, // User-specific analytics should not be indexed
    follow: true,
  },
}

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
