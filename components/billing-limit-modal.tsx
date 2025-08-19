"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  IconSparkles, 
  IconCheck, 
  IconX,
  IconClock,
  IconTrendingUp 
} from '@tabler/icons-react'

interface BillingLimitModalProps {
  isOpen: boolean
  onClose: () => void
  userTier: 'free' | 'starter' | 'pro' | 'enterprise'
  currentUsage: number
  monthlyLimit: number
  resetDate?: Date
}

export function BillingLimitModal({
  isOpen,
  onClose,
  userTier,
  currentUsage,
  monthlyLimit,
  resetDate
}: BillingLimitModalProps) {
  const handleUpgrade = () => {
    window.open('/dashboard/billing#pricing-plans', '_blank')
    onClose()
  }

  const handleManageBilling = () => {
    window.open('/dashboard/billing', '_blank')
    onClose()
  }

  const formatResetDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const nextMonthDate = new Date()
  nextMonthDate.setMonth(nextMonthDate.getMonth() + 1, 1)
  nextMonthDate.setHours(0, 0, 0, 0)

  const displayResetDate = resetDate || nextMonthDate

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <IconX className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Monthly Evaluation Limit Reached</DialogTitle>
              <DialogDescription>
                You've used all {monthlyLimit} evaluations for your {userTier} plan this month.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Usage Card */}
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Current Usage</p>
                  <p className="text-2xl font-bold text-red-600">
                    {currentUsage}/{monthlyLimit}
                  </p>
                </div>
                <Badge variant="destructive" className="capitalize">
                  {userTier} Plan
                </Badge>
              </div>
              
              <div className="mt-3">
                <div className="w-full bg-red-100 dark:bg-red-900/20 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full bg-red-600 transition-all duration-300"
                    style={{ width: '100%' }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>Limit reached</span>
                  <div className="flex items-center gap-1">
                    <IconClock className="h-3 w-3" />
                    <span>Resets {formatResetDate(displayResetDate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">What you can do:</h4>
            
            {userTier === 'free' && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded-full mt-0.5">
                      <IconSparkles className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        Upgrade your plan
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        Get unlimited evaluations and advanced features
                      </p>
                      <Button 
                        size="sm" 
                        className="mt-2"
                        onClick={handleUpgrade}
                      >
                        <IconTrendingUp className="h-4 w-4 mr-2" />
                        View Plans
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-gray-100 dark:bg-gray-800 rounded-full mt-0.5">
                    <IconClock className="h-4 w-4 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Wait for monthly reset</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your evaluation limit will reset on {formatResetDate(displayResetDate)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {userTier !== 'free' && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/20 rounded-full mt-0.5">
                      <IconSparkles className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Manage your billing</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        View usage details or upgrade to a higher tier
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="mt-2"
                        onClick={handleManageBilling}
                      >
                        Manage Billing
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {userTier === 'free' && (
            <Button onClick={handleUpgrade}>
              <IconSparkles className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Hook for easy usage
export function useBillingLimitModal() {
  const [isOpen, setIsOpen] = React.useState(false)

  const showModal = () => setIsOpen(true)
  const hideModal = () => setIsOpen(false)

  return {
    isOpen,
    showModal,
    hideModal,
    BillingLimitModal
  }
}
