import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Evaluation History - ZoomJudge | View Past Repository Analyses',
  description: 'View your complete evaluation history and track improvements across multiple repository analyses. Access detailed reports, scores, and feedback from all your ZoomJudge evaluations.',
  keywords: 'evaluation history, repository analysis history, GitHub evaluation reports, code review history, ZoomJudge dashboard',
  alternates: {
    canonical: '/dashboard/history',
  },
  robots: {
    index: false, // User-specific content should not be indexed
    follow: true,
  },
}

export default function HistoryLayout({
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
