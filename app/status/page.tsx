import { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, CheckCircle, AlertCircle, XCircle, Clock, Activity, Server, Database, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'System Status - ZoomJudge',
  description: 'Real-time status of ZoomJudge services and infrastructure.',
}

// Mock status data - in a real app, this would come from your monitoring system
const systemStatus = {
  overall: 'operational', // operational, degraded, outage
  lastUpdated: new Date().toISOString(),
  services: [
    {
      name: 'Web Application',
      status: 'operational',
      description: 'Main ZoomJudge web interface',
      uptime: '99.9%',
      responseTime: '245ms'
    },
    {
      name: 'AI Evaluation Engine',
      status: 'operational',
      description: 'Repository analysis and scoring system',
      uptime: '99.8%',
      responseTime: '1.2s'
    },
    {
      name: 'Authentication Service',
      status: 'operational',
      description: 'User login and account management',
      uptime: '99.9%',
      responseTime: '180ms'
    },
    {
      name: 'Database',
      status: 'operational',
      description: 'Data storage and retrieval',
      uptime: '99.9%',
      responseTime: '45ms'
    },
    {
      name: 'GitHub Integration',
      status: 'operational',
      description: 'Repository access and analysis',
      uptime: '99.7%',
      responseTime: '320ms'
    },
    {
      name: 'PDF Generation',
      status: 'operational',
      description: 'Report export functionality',
      uptime: '99.5%',
      responseTime: '890ms'
    }
  ],
  incidents: [
    {
      id: '1',
      title: 'Scheduled Maintenance - Database Optimization',
      status: 'resolved',
      severity: 'maintenance',
      startTime: '2025-08-20T02:00:00Z',
      endTime: '2025-08-20T04:30:00Z',
      description: 'Routine database maintenance to improve performance. No user impact expected.',
      updates: [
        {
          time: '2025-08-20T04:30:00Z',
          message: 'Maintenance completed successfully. All services restored.'
        },
        {
          time: '2025-08-20T02:00:00Z',
          message: 'Maintenance window started. Database optimizations in progress.'
        }
      ]
    }
  ]
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'operational':
      return <CheckCircle className="h-5 w-5 text-green-500" />
    case 'degraded':
      return <AlertCircle className="h-5 w-5 text-yellow-500" />
    case 'outage':
      return <XCircle className="h-5 w-5 text-red-500" />
    default:
      return <Clock className="h-5 w-5 text-gray-500" />
  }
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'operational':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Operational</Badge>
    case 'degraded':
      return <Badge variant="secondary" className="bg-yellow-500 hover:bg-yellow-600">Degraded</Badge>
    case 'outage':
      return <Badge variant="destructive">Outage</Badge>
    case 'maintenance':
      return <Badge variant="outline">Maintenance</Badge>
    case 'resolved':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Resolved</Badge>
    default:
      return <Badge variant="outline">Unknown</Badge>
  }
}

const getServiceIcon = (serviceName: string) => {
  switch (serviceName.toLowerCase()) {
    case 'web application':
      return <Activity className="h-5 w-5" />
    case 'ai evaluation engine':
      return <Zap className="h-5 w-5" />
    case 'authentication service':
      return <CheckCircle className="h-5 w-5" />
    case 'database':
      return <Database className="h-5 w-5" />
    default:
      return <Server className="h-5 w-5" />
  }
}

export default function StatusPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex items-center gap-4 mb-4">
            <h1 className="text-4xl font-bold">System Status</h1>
            {getStatusIcon(systemStatus.overall)}
          </div>
          <p className="text-muted-foreground">
            Current status of ZoomJudge services and infrastructure.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {new Date(systemStatus.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Overall Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(systemStatus.overall)}
              Overall System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {getStatusBadge(systemStatus.overall)}
              <span className="text-lg">
                {systemStatus.overall === 'operational' 
                  ? 'All systems operational' 
                  : 'Some systems experiencing issues'
                }
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Services Status */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Services</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {systemStatus.services.map((service, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getServiceIcon(service.name)}
                      <CardTitle className="text-lg">{service.name}</CardTitle>
                    </div>
                    {getStatusBadge(service.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{service.description}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Uptime:</span>
                      <span className="ml-2 font-medium">{service.uptime}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Response:</span>
                      <span className="ml-2 font-medium">{service.responseTime}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Recent Incidents */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Recent Incidents</h2>
          {systemStatus.incidents.length > 0 ? (
            <div className="space-y-4">
              {systemStatus.incidents.map((incident) => (
                <Card key={incident.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{incident.title}</CardTitle>
                      {getStatusBadge(incident.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(incident.startTime).toLocaleString()} - {' '}
                      {incident.endTime ? new Date(incident.endTime).toLocaleString() : 'Ongoing'}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="mb-4">{incident.description}</p>
                    <div className="space-y-2">
                      <h4 className="font-medium">Updates:</h4>
                      {incident.updates.map((update, updateIndex) => (
                        <div key={updateIndex} className="border-l-2 border-muted pl-4">
                          <p className="text-sm text-muted-foreground">
                            {new Date(update.time).toLocaleString()}
                          </p>
                          <p className="text-sm">{update.message}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-lg font-medium">No recent incidents</p>
                <p className="text-muted-foreground">All systems have been running smoothly.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              If you're experiencing issues not reflected on this page, please contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild>
                <Link href="mailto:support@zoomjudge.com">
                  Contact Support
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  Go to Dashboard
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
