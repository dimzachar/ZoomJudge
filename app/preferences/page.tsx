"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { IconSettings, IconCheck, IconX, IconMail } from "@tabler/icons-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

function EmailPreferencesContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [selectedPreferences, setSelectedPreferences] = useState({
    welcomeEmails: true,
    productUpdates: true,
    feedbackRequests: true,
    marketingEmails: true,
    securityAlerts: true,
    weeklyReports: true,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState("")

  // Get current email preferences
  const emailPreferences = useQuery(api.emails.getEmailPreferences, 
    email ? { email } : "skip"
  )

  // Update email preferences mutation
  const updatePreferences = useMutation(api.emails.updateEmailPreferences)

  // Load current preferences when data is available
  useEffect(() => {
    if (emailPreferences) {
      setSelectedPreferences({
        welcomeEmails: emailPreferences.welcomeEmails,
        productUpdates: emailPreferences.productUpdates,
        feedbackRequests: emailPreferences.feedbackRequests,
        marketingEmails: emailPreferences.marketingEmails,
        securityAlerts: emailPreferences.securityAlerts,
        weeklyReports: emailPreferences.weeklyReports,
      })
    }
  }, [emailPreferences])

  const handleUpdatePreferences = async () => {
    if (!email) return

    setIsSubmitting(true)
    setError("")

    try {
      await updatePreferences({
        email,
        preferences: selectedPreferences
      })
      setIsSuccess(true)
      setTimeout(() => setIsSuccess(false), 3000) // Hide success message after 3 seconds
    } catch (err) {
      setError("Failed to update preferences. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePreferenceChange = (preference: string, checked: boolean) => {
    setSelectedPreferences(prev => ({
      ...prev,
      [preference]: checked
    }))
  }

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <IconX className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <CardTitle>Invalid Request</CardTitle>
            <CardDescription>
              No email address provided. Please use the preferences link from your email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <IconSettings className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>
            Manage your email preferences for {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2">
                <IconCheck className="h-4 w-4 text-green-600" />
                <p className="text-green-600 text-sm">Preferences updated successfully!</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-medium">Choose which emails you'd like to receive</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="welcomeEmails"
                  checked={selectedPreferences.welcomeEmails}
                  onCheckedChange={(checked) => handlePreferenceChange("welcomeEmails", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="welcomeEmails" className="text-sm font-medium">
                    Welcome emails and onboarding
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Get started with ZoomJudge and learn about key features
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="productUpdates"
                  checked={selectedPreferences.productUpdates}
                  onCheckedChange={(checked) => handlePreferenceChange("productUpdates", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="productUpdates" className="text-sm font-medium">
                    Product updates and new features
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stay informed about new features and improvements
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="feedbackRequests"
                  checked={selectedPreferences.feedbackRequests}
                  onCheckedChange={(checked) => handlePreferenceChange("feedbackRequests", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="feedbackRequests" className="text-sm font-medium">
                    Feedback requests and surveys
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Help us improve by sharing your feedback
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="marketingEmails"
                  checked={selectedPreferences.marketingEmails}
                  onCheckedChange={(checked) => handlePreferenceChange("marketingEmails", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="marketingEmails" className="text-sm font-medium">
                    Marketing emails and promotions
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Special offers, tips, and ZoomJudge news
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="weeklyReports"
                  checked={selectedPreferences.weeklyReports}
                  onCheckedChange={(checked) => handlePreferenceChange("weeklyReports", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="weeklyReports" className="text-sm font-medium">
                    Weekly reports and summaries
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Weekly digest of your evaluation activity
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id="securityAlerts"
                  checked={selectedPreferences.securityAlerts}
                  onCheckedChange={(checked) => handlePreferenceChange("securityAlerts", checked as boolean)}
                />
                <div className="flex-1">
                  <Label htmlFor="securityAlerts" className="text-sm font-medium text-blue-900">
                    Security alerts (recommended)
                  </Label>
                  <p className="text-xs text-blue-800 mt-1">
                    Important security and account notifications
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex flex-col gap-3">
            <Button
              onClick={handleUpdatePreferences}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Updating..." : "Save Preferences"}
            </Button>
            
            <div className="text-center">
              <a 
                href={`/unsubscribe?email=${encodeURIComponent(email)}`}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Unsubscribe from all emails
              </a>
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              You will continue to receive important security and account-related emails.
            </p>
            <p className="text-xs text-muted-foreground">
              Need help? Contact us at{" "}
              <a href="mailto:support@zoomjudge.com" className="underline">
                support@zoomjudge.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function EmailPreferencesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading preferences...</p>
        </div>
      </div>
    }>
      <EmailPreferencesContent />
    </Suspense>
  )
}
