"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { IconMail, IconCheck, IconX } from "@tabler/icons-react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"

function UnsubscribeContent() {
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
  const [unsubscribeReason, setUnsubscribeReason] = useState("")
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

  const handleUnsubscribeAll = async () => {
    if (!email) return

    setIsSubmitting(true)
    setError("")

    try {
      await updatePreferences({
        email,
        preferences: {
          welcomeEmails: false,
          productUpdates: false,
          feedbackRequests: false,
          marketingEmails: false,
          securityAlerts: true, // Keep security alerts enabled
          weeklyReports: false,
        },
        unsubscribeReason: unsubscribeReason || "Unsubscribed from all emails"
      })
      setIsSuccess(true)
    } catch (err) {
      setError("Failed to update preferences. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdatePreferences = async () => {
    if (!email) return

    setIsSubmitting(true)
    setError("")

    try {
      await updatePreferences({
        email,
        preferences: selectedPreferences,
        unsubscribeReason: unsubscribeReason || undefined
      })
      setIsSuccess(true)
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
              No email address provided. Please use the unsubscribe link from your email.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <IconCheck className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>Preferences Updated</CardTitle>
            <CardDescription>
              Your email preferences have been successfully updated.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              You can close this page now.
            </p>
            <Button 
              onClick={() => window.close()} 
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <IconMail className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <CardTitle>Manage Email Preferences</CardTitle>
          <CardDescription>
            Update your email preferences for {email}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="font-medium">Email Types</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="welcomeEmails"
                  checked={selectedPreferences.welcomeEmails}
                  onCheckedChange={(checked) => handlePreferenceChange("welcomeEmails", checked as boolean)}
                />
                <Label htmlFor="welcomeEmails" className="text-sm">
                  Welcome emails and onboarding
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="productUpdates"
                  checked={selectedPreferences.productUpdates}
                  onCheckedChange={(checked) => handlePreferenceChange("productUpdates", checked as boolean)}
                />
                <Label htmlFor="productUpdates" className="text-sm">
                  Product updates and new features
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="feedbackRequests"
                  checked={selectedPreferences.feedbackRequests}
                  onCheckedChange={(checked) => handlePreferenceChange("feedbackRequests", checked as boolean)}
                />
                <Label htmlFor="feedbackRequests" className="text-sm">
                  Feedback requests and surveys
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="marketingEmails"
                  checked={selectedPreferences.marketingEmails}
                  onCheckedChange={(checked) => handlePreferenceChange("marketingEmails", checked as boolean)}
                />
                <Label htmlFor="marketingEmails" className="text-sm">
                  Marketing emails and promotions
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="weeklyReports"
                  checked={selectedPreferences.weeklyReports}
                  onCheckedChange={(checked) => handlePreferenceChange("weeklyReports", checked as boolean)}
                />
                <Label htmlFor="weeklyReports" className="text-sm">
                  Weekly reports and summaries
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="securityAlerts"
                  checked={selectedPreferences.securityAlerts}
                  onCheckedChange={(checked) => handlePreferenceChange("securityAlerts", checked as boolean)}
                />
                <Label htmlFor="securityAlerts" className="text-sm">
                  Security alerts (recommended)
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label htmlFor="reason" className="text-sm font-medium">
              Reason for unsubscribing (optional)
            </Label>
            <Textarea
              id="reason"
              placeholder="Help us improve by telling us why you're unsubscribing..."
              value={unsubscribeReason}
              onChange={(e) => setUnsubscribeReason(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleUpdatePreferences}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Updating..." : "Update Preferences"}
            </Button>
            <Button
              onClick={handleUnsubscribeAll}
              disabled={isSubmitting}
              variant="destructive"
              className="flex-1"
            >
              {isSubmitting ? "Unsubscribing..." : "Unsubscribe from All"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            You will continue to receive important security and account-related emails.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading unsubscribe options...</p>
        </div>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
