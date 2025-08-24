import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Calendar, GitCommit, Zap, Bug, Plus, Wrench } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Changelog - ZoomJudge',
  description: 'Latest updates and improvements to ZoomJudge AI-powered repository evaluation platform.',
}

const changelogEntries = [
  {
    version: '1.2.0',
    date: '2025-08-24',
    type: 'feature',
    title: 'Enhanced AI Evaluation Engine',
    changes: [
      'Improved accuracy of code quality assessment',
      'Added support for more programming languages',
      'Enhanced feedback generation with detailed explanations',
      'Optimized evaluation speed by 40%'
    ]
  },
  {
    version: '1.1.5',
    date: '2025-08-20',
    type: 'fix',
    title: 'Bug Fixes and Performance Improvements',
    changes: [
      'Fixed authentication redirect issues',
      'Resolved CORS configuration problems',
      'Improved error handling for large repositories',
      'Enhanced mobile responsiveness'
    ]
  },
  {
    version: '1.1.0',
    date: '2025-08-15',
    type: 'feature',
    title: 'Dashboard Enhancements',
    changes: [
      'Added evaluation history with filtering and search',
      'Introduced comparison tools for multiple evaluations',
      'Enhanced PDF export functionality',
      'Added dark mode support'
    ]
  },
  {
    version: '1.0.5',
    date: '2025-08-10',
    type: 'improvement',
    title: 'User Experience Improvements',
    changes: [
      'Streamlined evaluation form with better validation',
      'Added real-time progress indicators',
      'Improved error messages and user feedback',
      'Enhanced accessibility features'
    ]
  },
  {
    version: '1.0.0',
    date: '2025-08-01',
    type: 'feature',
    title: 'Initial Release',
    changes: [
      'AI-powered repository evaluation system',
      'Support for Data Engineering, ML, MLOps, LLM, and Stock Market projects',
      'Comprehensive scoring with detailed feedback',
      'User authentication and billing integration',
      'Responsive web interface'
    ]
  }
]

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'feature':
      return <Plus className="h-4 w-4" />
    case 'fix':
      return <Bug className="h-4 w-4" />
    case 'improvement':
      return <Zap className="h-4 w-4" />
    default:
      return <GitCommit className="h-4 w-4" />
  }
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'feature':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Feature</Badge>
    case 'fix':
      return <Badge variant="destructive">Bug Fix</Badge>
    case 'improvement':
      return <Badge variant="secondary">Improvement</Badge>
    default:
      return <Badge variant="outline">Update</Badge>
  }
}

export default function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-4xl font-bold mb-4">Changelog</h1>
          <p className="text-muted-foreground">
            Stay up to date with the latest features, improvements, and bug fixes.
          </p>
        </div>

        <div className="space-y-6">
          {changelogEntries.map((entry, index) => (
            <Card key={index} className="relative">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(entry.type)}
                      <CardTitle className="text-xl">v{entry.version}</CardTitle>
                    </div>
                    {getTypeBadge(entry.type)}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm">{entry.date}</span>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-muted-foreground">{entry.title}</h3>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {entry.changes.map((change, changeIndex) => (
                    <li key={changeIndex} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-sm">{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Have suggestions for new features or found a bug?{' '}
            <Link href="mailto:support@zoomjudge.com" className="text-primary hover:underline">
              Let us know!
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
