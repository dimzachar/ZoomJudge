import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demo - ZoomJudge',
  description: 'Experience ZoomJudge\'s AI-powered repository evaluation system. See how we analyze and score GitHub repositories for Zoomcamp courses.',
  openGraph: {
    title: 'ZoomJudge Demo - AI Repository Evaluation',
    description: 'See how ZoomJudge analyzes GitHub repositories and provides detailed feedback for Zoomcamp courses.',
    type: 'website',
  },
}

export default function DemoLayout({
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
