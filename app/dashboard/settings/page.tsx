"use client"

import { useState, useEffect } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { GitHubConnectionInline } from "@/components/github-connection-inline"
import { UsageMetrics } from "@/components/usage-metrics"
import { toast } from "sonner"
import {
  IconUser,
  IconBell,
  IconShield,
  IconTrash,
  IconEdit,
  IconCheck,
  IconX,

} from "@tabler/icons-react"

export default function SettingsPage() {
  const { user } = useUser()
  const { openUserProfile } = useClerk()
  const [isEditingName, setIsEditingName] = useState(false)
  const [firstName, setFirstName] = useState(user?.firstName || "")
  const [lastName, setLastName] = useState(user?.lastName || "")
  const [mounted, setMounted] = useState(false)

  // Get user preferences from Convex
  const userPreferences = useQuery(api.userPreferences.getUserPreferences)
  const updateNotificationPreferences = useMutation(api.userPreferences.updateNotificationPreferences)
  const updateSecurityPreferences = useMutation(api.userPreferences.updateSecurityPreferences)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Local state for preferences
  const [emailNotifications, setEmailNotifications] = useState(userPreferences?.emailNotifications ?? true)
  const [pushNotifications, setPushNotifications] = useState(userPreferences?.pushNotifications ?? false)

  // Update local state when preferences load
  useEffect(() => {
    if (userPreferences) {
      setEmailNotifications(userPreferences.emailNotifications)
      setPushNotifications(userPreferences.pushNotifications)
    }
  }, [userPreferences])

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-2">
          <div className="h-8 bg-muted rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-96 animate-pulse"></div>
        </div>
        <div className="space-y-4">
          <div className="h-64 bg-muted rounded animate-pulse"></div>
          <div className="h-32 bg-muted rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  const handleSaveName = async () => {
    try {
      await user?.update({
        firstName,
        lastName,
      })
      setIsEditingName(false)
      toast.success("Name updated successfully")
    } catch (error) {
      console.error("Error updating name:", error)
      toast.error("Failed to update name")
    }
  }

  const handleNotificationChange = async (type: 'email' | 'push', value: boolean) => {
    try {
      if (type === 'email') {
        setEmailNotifications(value)
        await updateNotificationPreferences({ emailNotifications: value })
      } else {
        setPushNotifications(value)
        await updateNotificationPreferences({ pushNotifications: value })
      }
      toast.success("Notification preferences updated")
    } catch (error) {
      console.error("Error updating notification preferences:", error)
      toast.error("Failed to update notification preferences")
      // Revert the change
      if (type === 'email') {
        setEmailNotifications(!value)
      } else {
        setPushNotifications(!value)
      }
    }
  }



  const handleEnable2FA = () => {
    // Open Clerk's user profile for 2FA management
    openUserProfile()
  }

  const handleDeleteAccount = () => {
    // Show confirmation dialog and redirect to Clerk's account deletion
    if (confirm("Are you sure you want to delete your account? This action cannot be undone.")) {
      openUserProfile()
    }
  }

  const handleChangePhoto = () => {
    // Open Clerk's user profile for photo management
    openUserProfile()
  }

  const handleChangePassword = () => {
    // Open Clerk's user profile for password management
    openUserProfile()
  }

  // Check if user has password authentication enabled
  const hasPasswordAuth = user?.passwordEnabled
  const hasOAuthOnly = user?.externalAccounts && user.externalAccounts.length > 0 && !hasPasswordAuth
  const primaryOAuthProvider = user?.externalAccounts?.[0]?.provider

  // Capitalize the provider name for display
  const getProviderDisplayName = (provider: string | undefined) => {
    if (!provider) return 'OAuth provider'
    return provider.charAt(0).toUpperCase() + provider.slice(1)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconUser className="h-5 w-5" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>
            Update your personal information and profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
              <AvatarFallback className="text-lg">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button variant="outline" size="sm" onClick={handleChangePhoto}>
                <IconEdit className="h-4 w-4 mr-2" />
                Change photo
              </Button>
              <p className="text-xs text-muted-foreground">
                JPG, GIF or PNG. 1MB max.
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium select-text">Full name</span>
                <p className="text-sm text-muted-foreground">
                  This is your display name on ZoomJudge.
                </p>
              </div>
              {!isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                >
                  <IconEdit className="h-4 w-4" />
                </Button>
              )}
            </div>

            {isEditingName ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaveName}>
                    <IconCheck className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditingName(false)
                      setFirstName(user?.firstName || "")
                      setLastName(user?.lastName || "")
                    }}
                  >
                    <IconX className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-sm">
                {user?.fullName || "No name set"}
              </div>
            )}
          </div>

          <Separator />

          {/* Email */}
          <div className="space-y-2">
            <span className="text-sm font-medium select-text">Email address</span>
            <div className="flex items-center gap-2">
              <span className="text-sm">{user?.primaryEmailAddress?.emailAddress}</span>
              <Badge variant="secondary" className="text-xs">Primary</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              This is your primary email address for account notifications.
            </p>
          </div>

          {/* GitHub Connection - Inline */}
          <GitHubConnectionInline />
        </CardContent>
      </Card>

      {/* Usage Overview */}
      <UsageMetrics compact />

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconBell className="h-5 w-5" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>
            Configure how you receive notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium select-text">Email notifications</span>
              <p className="text-sm text-muted-foreground">
                Receive notifications about evaluations and updates via email.
              </p>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={(value) => handleNotificationChange('email', value)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium select-text">Push notifications</span>
              <p className="text-sm text-muted-foreground">
                Receive push notifications in your browser.
              </p>
            </div>
            <Switch
              checked={pushNotifications}
              onCheckedChange={(value) => handleNotificationChange('push', value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconShield className="h-5 w-5" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>
            Manage your account security and authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasPasswordAuth ? (
            <>
              {/* Password Management - Only for email/password users */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium select-text">Password</span>
                  <p className="text-sm text-muted-foreground">
                    {userPreferences?.lastPasswordChange
                      ? `Last updated ${new Date(userPreferences.lastPasswordChange).toLocaleDateString()}`
                      : "Password change date not available"
                    }
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleChangePassword}>
                  Change password
                </Button>
              </div>

              <Separator />

              {/* Two-Factor Authentication - Only for email/password users */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium select-text">Two-factor authentication</span>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security to your account
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={handleEnable2FA}>
                  Manage 2FA
                </Button>
              </div>
            </>
          ) : (
            /* OAuth Users - Show different security info */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <IconShield className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Security managed by {getProviderDisplayName(primaryOAuthProvider)}</p>
                  <p className="text-xs text-muted-foreground">
                    Your account security is managed by your {getProviderDisplayName(primaryOAuthProvider)} account.
                    Password and 2FA settings should be configured there.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium select-text">Account Settings</span>
                  <p className="text-sm text-muted-foreground">
                    Manage your account settings and security preferences
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
                  Open Profile
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone
      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconTrash className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium select-text">Delete account</span>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data.
              </p>
            </div>
            <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card> */}
    </div>
  )
}
