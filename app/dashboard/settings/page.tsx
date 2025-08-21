"use client"

import { useState, useEffect } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTheme } from "next-themes"
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
  IconPalette,
  IconSun,
  IconMoon,
  IconDeviceDesktop,
} from "@tabler/icons-react"

export default function SettingsPage() {
  const { user } = useUser()
  const { openUserProfile } = useClerk()
  const { theme, setTheme } = useTheme()
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header */}
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
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
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
            <Avatar className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0">
              <AvatarImage src={user?.imageUrl} alt={user?.fullName || ""} />
              <AvatarFallback className="text-base sm:text-lg">
                {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2 text-center sm:text-left">
              <Button variant="outline" size="sm" onClick={handleChangePhoto} className="min-h-[44px] w-full sm:w-auto">
                <IconEdit className="h-4 w-4 mr-2" />
                Change photo
              </Button>
              <p className="text-xs sm:text-sm text-muted-foreground">
                JPG, GIF or PNG. 1MB max.
              </p>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm sm:text-base font-medium select-text">Full name</span>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This is your display name on ZoomJudge.
                </p>
              </div>
              {!isEditingName && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingName(true)}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  <IconEdit className="h-4 w-4 mr-2 sm:mr-0" />
                  <span className="sm:hidden">Edit Name</span>
                </Button>
              )}
            </div>

            {isEditingName ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="First name"
                      className="min-h-[44px]"
                    />
                  </div>
                  <div>
                    <Input
                      id="lastName"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Last name"
                      className="min-h-[44px]"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button size="sm" onClick={handleSaveName} className="min-h-[44px] w-full sm:w-auto">
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
                    className="min-h-[44px] w-full sm:w-auto"
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

      {/* Appearance */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <IconPalette className="h-5 w-5" />
            <CardTitle>Appearance</CardTitle>
          </div>
          <CardDescription>
            Customize the appearance of the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Theme</span>
              <p className="text-sm text-muted-foreground">
                Choose your preferred theme for the application.
              </p>
            </div>

            {mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Light Theme */}
                <button
                  onClick={() => setTheme("light")}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:bg-accent/50 ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-accent-foreground/20"
                  }`}
                >
                  <IconSun className={`h-6 w-6 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <div className={`text-sm font-medium ${theme === "light" ? "text-primary" : "text-foreground"}`}>
                      Light
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Light theme
                    </div>
                  </div>
                  {theme === "light" && (
                    <div className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
                  )}
                </button>

                {/* Dark Theme */}
                <button
                  onClick={() => setTheme("dark")}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:bg-accent/50 ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-accent-foreground/20"
                  }`}
                >
                  <IconMoon className={`h-6 w-6 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <div className={`text-sm font-medium ${theme === "dark" ? "text-primary" : "text-foreground"}`}>
                      Dark
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Dark theme
                    </div>
                  </div>
                  {theme === "dark" && (
                    <div className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
                  )}
                </button>

                {/* System Theme */}
                <button
                  onClick={() => setTheme("system")}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all hover:bg-accent/50 ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-accent-foreground/20"
                  }`}
                >
                  <IconDeviceDesktop className={`h-6 w-6 ${theme === "system" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-center">
                    <div className={`text-sm font-medium ${theme === "system" ? "text-primary" : "text-foreground"}`}>
                      System
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Follow system
                    </div>
                  </div>
                  {theme === "system" && (
                    <div className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full" />
                  )}
                </button>
              </div>
            )}

            {!mounted && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex flex-col items-center gap-3 p-4 rounded-lg border-2 border-border">
                    <div className="h-6 w-6 bg-muted rounded animate-pulse" />
                    <div className="text-center space-y-1">
                      <div className="h-4 w-12 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
