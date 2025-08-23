import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Evaluation - ZoomJudge | Start Repository Analysis',
  description: 'Start a new AI-powered evaluation of your GitHub repository. Get detailed feedback and scoring for your Zoomcamp project with instant analysis and improvement suggestions.',
  keywords: 'new repository evaluation, GitHub analysis, AI code review, Zoomcamp project evaluation, repository scoring',
  alternates: {
    canonical: '/dashboard/new-evaluation',
  },
  robots: {
    index: false, // User-specific functionality should not be indexed
    follow: true,
  },
}

export default function NewEvaluationLayout({
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
