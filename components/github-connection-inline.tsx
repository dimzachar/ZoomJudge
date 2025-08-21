"use client"

import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  IconBrandGithub,
  IconCheck,
  IconExternalLink
} from "@tabler/icons-react"

interface GitHubConnectionInlineProps {
  className?: string
}

export function GitHubConnectionInline({ className }: GitHubConnectionInlineProps) {
  const { user } = useUser()

  if (!user) {
    return null
  }

  const externalAccounts = user.externalAccounts || []
  const githubAccount = externalAccounts.find(account => account.provider === 'github')

  // Only show GitHub section if user has GitHub connected
  if (!githubAccount) {
    return null
  }

  const handleViewProfile = () => {
    if (githubAccount?.username) {
      window.open(`https://github.com/${githubAccount.username}`, '_blank')
    }
  }

  return (
    <div className={className}>
      <Separator />

      {/* GitHub Connection */}
      <div className="space-y-3 sm:space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <IconBrandGithub className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm sm:text-base font-medium select-text">GitHub Account</span>
            {githubAccount && (
              <Badge variant="secondary" className="text-xs">
                Connected
              </Badge>
            )}
          </div>
        </div>

        {/* Connected GitHub Account - Read Only */}
        <div className="space-y-3 sm:space-y-4">
          <div className="p-3 rounded-lg border bg-muted/50 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                <IconBrandGithub className="h-4 w-4 text-gray-900 dark:text-gray-100" />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium break-all">@{githubAccount.username}</span>
                  {githubAccount.verification?.status === 'verified' && (
                    <IconCheck className="h-3 w-3 text-green-600 flex-shrink-0" />
                  )}
                </div>
                {githubAccount.emailAddress && (
                  <p className="text-xs text-muted-foreground break-all">
                    {githubAccount.emailAddress}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleViewProfile}
                className="min-h-[44px] w-full sm:w-auto"
              >
                <IconExternalLink className="h-3 w-3 mr-2" />
                View Profile
              </Button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
