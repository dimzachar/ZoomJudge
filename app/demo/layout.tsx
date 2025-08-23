import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Demo - ZoomJudge | Try AI-Powered Repository Evaluation',
  description: 'Experience ZoomJudge\'s AI-powered repository evaluation system. See live demonstrations of GitHub repository analysis, scoring, and feedback for Data Engineering, ML, MLOps, and LLM projects.',
  keywords: 'ZoomJudge demo, repository evaluation demo, AI code review demo, GitHub analysis demo, Zoomcamp project demo',
  alternates: {
    canonical: '/demo',
  },
  openGraph: {
    title: 'ZoomJudge Demo - AI Repository Evaluation',
    description: 'See how ZoomJudge analyzes GitHub repositories and provides detailed feedback for Zoomcamp courses. Try our AI-powered evaluation system.',
    url: '/demo',
    type: 'website',
    images: [
      {
        url: '/demo-og-image.png',
        width: 1200,
        height: 630,
        alt: 'ZoomJudge Demo - AI Repository Evaluation Interface'
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ZoomJudge Demo - AI Repository Evaluation',
    description: 'Try ZoomJudge\'s AI-powered repository evaluation system. See live analysis and scoring.',
    images: ['/demo-twitter-image.png'],
  },
  robots: {
    index: true,
    follow: true,
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
