"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  IconBrandGithub,
  IconCheck,
  IconExternalLink,
  IconUnlink,
  IconAlertTriangle
} from "@tabler/icons-react"

interface GitHubConnectionInlineProps {
  className?: string
}

export function GitHubConnectionInline({ className }: GitHubConnectionInlineProps) {
  const { user } = useUser()
  const [isLoading, setIsLoading] = useState<string | null>(null)

  if (!user) {
    return null
  }

  const externalAccounts = user.externalAccounts || []
  const githubAccount = externalAccounts.find(account => account.provider === 'github')

  const handleConnectGitHub = async () => {
    setIsLoading('github')
    try {
      // This would typically redirect to OAuth flow
      // For now, we'll show a placeholder
      console.log('Connecting to GitHub...')
      // In a real implementation, you'd use Clerk's OAuth methods
      // await user.createExternalAccount({ provider: 'github' })
    } catch (error) {
      console.error('Failed to connect GitHub:', error)
    } finally {
      setIsLoading(null)
    }
  }

  const handleDisconnectGitHub = async () => {
    if (!githubAccount) return
    
    setIsLoading('github')
    try {
      console.log(`Disconnecting GitHub account ${githubAccount.id}...`)
      // In a real implementation:
      // await user.deleteExternalAccount(githubAccount.id)
    } catch (error) {
      console.error('Failed to disconnect GitHub:', error)
    } finally {
      setIsLoading(null)
    }
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

        {githubAccount ? (
          // Connected GitHub Account
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
                  View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectGitHub}
                  disabled={isLoading === 'github'}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  <IconUnlink className="h-3 w-3 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground">
              Your GitHub account is used to access repositories for evaluation and analysis.
            </p>
          </div>
        ) : (
          // No GitHub Account Connected
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 sm:p-4 rounded-lg border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
              <IconAlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 sm:space-y-3 flex-1 min-w-0">
                <p className="text-sm sm:text-base font-medium text-orange-900 dark:text-orange-100">
                  GitHub Account Required
                </p>
                <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-200 break-words">
                  Connect your GitHub account to evaluate repositories and access all ZoomJudge features.
                </p>
                <Button
                  size="sm"
                  onClick={handleConnectGitHub}
                  disabled={isLoading === 'github'}
                  className="min-h-[44px] w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                >
                  <IconBrandGithub className="h-3 w-3 mr-2" />
                  Connect GitHub
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
