"use client"

import { useQuery, useMutation, useAction } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import {
  IconMail,
  IconSend,
  IconChartBar,
  IconTemplate,
  IconAlertCircle,
  IconCheck,
  IconX,
  IconClock
} from "@tabler/icons-react"
import { formatDistanceToNow } from "date-fns"

// Template Card Component
function TemplateCard({
  template,
  onEdit,
  onSendTest
}: {
  template: any;
  onEdit: (templateId: string) => void;
  onSendTest: (templateId: string) => void;
}) {
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="font-medium">{template.name}</h4>
          <p className="text-sm text-muted-foreground">{template.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ID: {template.templateId} | Version: {template.version}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {template.isActive ? (
            <Badge variant="default">Active</Badge>
          ) : (
            <Badge variant="secondary">Inactive</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(template.templateId)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSendTest(template.templateId)}
          >
            Send Test
          </Button>
        </div>
      </div>
    </div>
  )
}

// Test Email Form Component
function TestEmailForm({
  onSendTest,
  onSendWelcome,
  onSendFeedback,
  onSendProductUpdate,
  onSendEvaluationComplete
}: {
  onSendTest: any;
  onSendWelcome: any;
  onSendFeedback: any;
  onSendProductUpdate: any;
  onSendEvaluationComplete: any;
}) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [userTier, setUserTier] = useState("free")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState("test")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setIsLoading(true)
    setResult(null)

    try {
      let response;
      const emailData = {
        recipientEmail: email,
        recipientName: name || undefined,
        ...(selectedTemplate === "evaluation-complete" && { userTier }),
      };

      switch (selectedTemplate) {
        case "welcome":
          response = await onSendWelcome(emailData);
          break;
        case "feedback":
          response = await onSendFeedback(emailData);
          break;
        case "product-update":
          response = await onSendProductUpdate(emailData);
          break;
        case "evaluation-complete":
          response = await onSendEvaluationComplete(emailData);
          break;
        default:
          response = await onSendTest(emailData);
      }

      setResult(response)
      if (response.success) {
        setEmail("")
        setName("")
      }
    } catch (error) {
      setResult({ success: false, error: "Failed to send test email" })
    } finally {
      setIsLoading(false)
    }
  }

  const templateOptions = [
    { value: "test", label: "🧪 System Test Email", description: "Basic test to verify email configuration" },
    { value: "welcome", label: "👋 Welcome Email", description: "New user onboarding email" },
    { value: "feedback", label: "💬 Feedback Request", description: "User feedback collection email" },
    { value: "product-update", label: "✨ Product Update", description: "New features announcement" },
    { value: "evaluation-complete", label: "✅ Evaluation Complete", description: "Code evaluation results" },
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="template" className="text-sm font-medium">
          Email Template *
        </label>
        <select
          id="template"
          value={selectedTemplate}
          onChange={(e) => setSelectedTemplate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {templateOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          {templateOptions.find(opt => opt.value === selectedTemplate)?.description}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address *
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="test@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Recipient Name (optional)
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Test User"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {selectedTemplate === "evaluation-complete" && (
        <div className="space-y-2">
          <label htmlFor="userTier" className="text-sm font-medium">
            User Tier (for Evaluation Complete email)
          </label>
          <select
            id="userTier"
            value={userTier}
            onChange={(e) => setUserTier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="free">Free User (no detailed feedback access)</option>
            <option value="paid">Paid User (full access to detailed feedback)</option>
          </select>
        </div>
      )}

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isLoading || !email} className="gap-2">
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <IconSend className="w-4 h-4" />
              Send {templateOptions.find(opt => opt.value === selectedTemplate)?.label || "Test Email"}
            </>
          )}
        </Button>

        {result && (
          <div className={`flex items-center gap-2 text-sm ${
            result.success ? 'text-green-600' : 'text-red-600'
          }`}>
            {result.success ? (
              <>
                <IconCheck className="w-4 h-4" />
                Test email sent successfully!
              </>
            ) : (
              <>
                <IconX className="w-4 h-4" />
                {result.error || 'Failed to send test email'}
              </>
            )}
          </div>
        )}
      </div>
    </form>
  )
}

export default function AdminEmailsPage() {
  const [activeTab, setActiveTab] = useState("overview")
  const [adminStatus, setAdminStatus] = useState<{ isAdmin: boolean; userId: string } | null>(null)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)

  // Mutations
  const checkAdminStatus = useMutation(api.adminAPI.checkAdminStatus)

  // Actions
  const sendFeedbackCampaign = useAction(api.emails.scheduleFeedbackRequestEmails)
  const sendTestEmail = useAction(api.emails.sendTestEmail)
  const sendTestWelcomeEmail = useAction(api.emails.sendTestWelcomeEmail)
  const sendTestFeedbackEmail = useAction(api.emails.sendTestFeedbackEmail)
  const sendTestProductUpdateEmail = useAction(api.emails.sendTestProductUpdateEmail)
  const sendTestEvaluationCompleteEmail = useAction(api.emails.sendTestEvaluationCompleteEmail)

  // Queries (only run if admin)
  const emailStats = useQuery(api.emails.getEmailStats, adminStatus?.isAdmin ? {} : "skip")
  const recentEmailLogs = useQuery(api.emails.getRecentEmailLogs, adminStatus?.isAdmin ? { limit: 50 } : "skip")
  const emailTemplates = useQuery(api.emails.getAllEmailTemplates, adminStatus?.isAdmin ? {} : "skip")

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
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    )
  }

  // Check admin permissions
  if (!adminStatus.isAdmin) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Email Management</h1>
        <Alert>
          <IconAlertCircle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access this page. Admin privileges required.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const handleSendFeedbackCampaign = async () => {
    try {
      const result = await sendFeedbackCampaign({})
      if (result.success) {
        toast.success(`Feedback campaign sent! ${result.sent} emails sent, ${result.failed} failed.`)
      } else {
        toast.error(`Failed to send feedback campaign: ${result.error}`)
      }
    } catch (error) {
      toast.error("Failed to send feedback campaign")
    }
  }

  const handleCreateTemplate = (campaignType: string) => {
    setSelectedCampaign(campaignType)
    setIsCreatingTemplate(true)
    // TODO: Open template creation modal/form
    toast.info(`Creating template for ${campaignType} campaign`)
  }

  const handleEditTemplate = (templateId: string) => {
    // TODO: Open template editing modal/form
    toast.info(`Editing template: ${templateId}`)
  }

  const handleSendTestTemplate = (templateId: string) => {
    // TODO: Open test email modal
    toast.info(`Sending test email for template: ${templateId}`)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="default" className="bg-green-100 text-green-800"><IconCheck className="w-3 h-3 mr-1" />Sent</Badge>
      case "delivered":
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><IconCheck className="w-3 h-3 mr-1" />Delivered</Badge>
      case "failed":
        return <Badge variant="destructive"><IconX className="w-3 h-3 mr-1" />Failed</Badge>
      case "bounced":
        return <Badge variant="destructive"><IconX className="w-3 h-3 mr-1" />Bounced</Badge>
      case "pending":
        return <Badge variant="secondary"><IconClock className="w-3 h-3 mr-1" />Pending</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Management</h1>
          <p className="text-muted-foreground">
            Manage email templates, monitor delivery, and run campaigns
          </p>
        </div>
        <Button onClick={handleSendFeedbackCampaign} className="gap-2">
          <IconSend className="w-4 h-4" />
          Send Feedback Campaign
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Email Logs</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Email Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
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
                <div className="text-2xl font-bold">{emailStats?.deliveryRate?.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Successfully delivered
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <IconAlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailStats?.bounceRate?.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  Bounced emails
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Templates</CardTitle>
                <IconTemplate className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{emailTemplates?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Active templates
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Test Email Section */}
          <Card>
            <CardHeader>
              <CardTitle>Send Test Email</CardTitle>
              <CardDescription>
                Send a test email to verify your email configuration is working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TestEmailForm
                onSendTest={sendTestEmail}
                onSendWelcome={sendTestWelcomeEmail}
                onSendFeedback={sendTestFeedbackEmail}
                onSendProductUpdate={sendTestProductUpdateEmail}
                onSendEvaluationComplete={sendTestEvaluationCompleteEmail}
              />
            </CardContent>
          </Card>


        </TabsContent>

        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Logs</CardTitle>
              <CardDescription>
                Detailed log of all email sends
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentEmailLogs === undefined ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentEmailLogs.map((log: any) => (
                      <TableRow key={log._id}>
                        <TableCell className="font-medium">{log.templateId}</TableCell>
                        <TableCell>{log.recipientEmail}</TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {formatDistanceToNow(new Date(log.sentAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.errorMessage || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Email Campaigns</h2>
              <p className="text-muted-foreground">
                Manage email templates organized by campaign categories
              </p>
            </div>
            <Button onClick={() => handleCreateTemplate('general')}>
              <IconTemplate className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          {emailTemplates === undefined ? (
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-32 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Onboarding Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconMail className="h-5 w-5 text-blue-500" />
                    Onboarding Campaigns
                  </CardTitle>
                  <CardDescription>
                    Welcome new users and guide them through getting started
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {emailTemplates
                      .filter((t: any) => t.templateId === 'welcome')
                      .map((template: any) => (
                        <TemplateCard
                          key={template._id}
                          template={template}
                          onEdit={handleEditTemplate}
                          onSendTest={handleSendTestTemplate}
                        />
                      ))}
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Suggested templates: Getting Started Guide, First Evaluation Reminder
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTemplate('onboarding')}
                      >
                        Add Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Engagement Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconChartBar className="h-5 w-5 text-green-500" />
                    Engagement Campaigns
                  </CardTitle>
                  <CardDescription>
                    Keep users engaged and collect feedback
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {emailTemplates
                      .filter((t: any) => t.templateId === 'feedback-request')
                      .map((template: any) => (
                        <TemplateCard
                          key={template._id}
                          template={template}
                          onEdit={handleEditTemplate}
                          onSendTest={handleSendTestTemplate}
                        />
                      ))}
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Suggested templates: Weekly Progress Reports, Re-engagement for Inactive Users
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTemplate('engagement')}
                      >
                        Add Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Product Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconSend className="h-5 w-5 text-purple-500" />
                    Product Campaigns
                  </CardTitle>
                  <CardDescription>
                    Announce new features and product updates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {emailTemplates
                      .filter((t: any) => t.templateId === 'product-update')
                      .map((template: any) => (
                        <TemplateCard
                          key={template._id}
                          template={template}
                          onEdit={handleEditTemplate}
                          onSendTest={handleSendTestTemplate}
                        />
                      ))}
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Suggested templates: New Feature Announcements, Beta Feature Invitations
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTemplate('product')}
                      >
                        Add Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Transactional Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconCheck className="h-5 w-5 text-orange-500" />
                    Transactional Campaigns
                  </CardTitle>
                  <CardDescription>
                    Automated emails triggered by user actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {emailTemplates
                      .filter((t: any) => t.templateId === 'evaluation-complete')
                      .map((template: any) => (
                        <TemplateCard
                          key={template._id}
                          template={template}
                          onEdit={handleEditTemplate}
                          onSendTest={handleSendTestTemplate}
                        />
                      ))}
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Suggested templates: Payment Confirmations, Security Alerts
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTemplate('transactional')}
                      >
                        Add Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Marketing Campaigns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconAlertCircle className="h-5 w-5 text-red-500" />
                    Marketing Campaigns
                  </CardTitle>
                  <CardDescription>
                    Newsletters, promotions, and marketing communications
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Suggested templates: Monthly Newsletter, Course Recommendations, Success Stories
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCreateTemplate('marketing')}
                      >
                        Add Template
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Analytics</CardTitle>
              <CardDescription>
                Detailed analytics and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent>
              {emailStats === undefined ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{emailStats.delivered}</div>
                    <div className="text-sm text-muted-foreground">Delivered</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{emailStats.bounced}</div>
                    <div className="text-sm text-muted-foreground">Bounced</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{emailStats.failed}</div>
                    <div className="text-sm text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{emailStats.pending}</div>
                    <div className="text-sm text-muted-foreground">Pending</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
