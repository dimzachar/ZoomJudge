"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  IconMail, 
  IconUsers, 
  IconChartBar, 
  IconSettings, 
  IconAlertCircle,
  IconArrowRight 
} from "@tabler/icons-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

export default function AdminDashboardPage() {
  const router = useRouter()
  const [adminStatus, setAdminStatus] = useState<{ isAdmin: boolean; userId: string } | null>(null)

  // Check admin status
  const checkAdminStatus = useMutation(api.adminAPI.checkAdminStatus)

  // Admin queries (only run if admin)
  const emailStats = useQuery(api.emails.getEmailStats, adminStatus?.isAdmin ? {} : "skip")
  const recentEmailLogs = useQuery(api.emails.getRecentEmailLogs, adminStatus?.isAdmin ? { limit: 10 } : "skip")

  // Check admin status on mount
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const result = await checkAdminStatus({})
        setAdminStatus(result)
      } catch (error) {
        console.error('Failed to check admin status:', error)
        setAdminStatus({ isAdmin: false, userId: '' })
      }
    }

    checkAdmin()
  }, [checkAdminStatus])

  // Loading state
  if (adminStatus === null) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Check admin permissions
  if (!adminStatus.isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Alert>
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const adminSections = [
    {
      title: "Email Management",
      description: "Manage email templates, monitor delivery, and run campaigns",
      icon: IconMail,
      href: "/dashboard/admin/emails",
      stats: emailStats ? `${emailStats.totalSent || 0} emails sent` : "Loading...",
      color: "text-blue-500"
    },
    {
      title: "User Management",
      description: "View and manage user accounts, permissions, and activity",
      icon: IconUsers,
      href: "/dashboard/admin/users",
      stats: "Coming soon",
      color: "text-green-500"
    },
    {
      title: "Analytics & Reports",
      description: "Platform analytics, usage reports, and performance metrics",
      icon: IconChartBar,
      href: "/dashboard/admin/analytics",
      stats: "Coming soon",
      color: "text-purple-500"
    },
    {
      title: "System Settings",
      description: "Configure platform settings, integrations, and security",
      icon: IconSettings,
      href: "/dashboard/admin/settings",
      stats: "Coming soon",
      color: "text-orange-500"
    }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage and monitor the ZoomJudge platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Emails Sent</CardTitle>
            <IconMail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{emailStats?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              All time email sends
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <IconChartBar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {emailStats?.totalSent ? 
                Math.round(((emailStats.delivered || 0) / emailStats.totalSent) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Email delivery success rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <IconUsers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentEmailLogs?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              Recent email logs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <IconSettings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Healthy</div>
            <p className="text-xs text-muted-foreground">
              All systems operational
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminSections.map((section) => {
          const Icon = section.icon
          return (
            <Card key={section.href} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Icon className={`h-6 w-6 ${section.color}`} />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{section.stats}</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => router.push(section.href)}
                    className="gap-2"
                  >
                    Open
                    <IconArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Email Activity</CardTitle>
          <CardDescription>
            Latest email sends and delivery status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentEmailLogs === undefined ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : recentEmailLogs.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No recent email activity
            </p>
          ) : (
            <div className="space-y-2">
              {recentEmailLogs.slice(0, 5).map((log: any) => (
                <div key={log._id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.status === 'sent' ? 'bg-green-500' :
                      log.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                    }`} />
                    <div>
                      <p className="font-medium">{log.subject}</p>
                      <p className="text-sm text-muted-foreground">{log.recipientEmail}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium capitalize">{log.status}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log._creationTime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
              {recentEmailLogs.length > 5 && (
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => router.push('/dashboard/admin/emails')}
                >
                  View All Email Logs
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
