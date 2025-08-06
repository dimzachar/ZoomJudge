"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  IconReceipt,
  IconDownload,
  IconCheck,
  IconX,
  IconClock,
  IconCreditCard,
  IconCalendar,
  IconExternalLink
} from "@tabler/icons-react"

interface PaymentMethod {
  id: string
  type: 'card' | 'paypal' | 'bank'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

interface Invoice {
  id: string
  date: string
  amount: number
  currency: string
  status: 'paid' | 'pending' | 'failed' | 'refunded'
  description: string
  downloadUrl?: string
  paymentMethod?: string
}

interface BillingHistoryProps {
  showTitle?: boolean
  className?: string
  compact?: boolean
}

export function BillingHistory({ showTitle = true, className, compact = false }: BillingHistoryProps) {
  const { user } = useUser()
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [mounted, setMounted] = useState(false)

  // Get real payment attempts from Convex
  const paymentAttempts = useQuery(api.paymentAttempts.getUserPaymentAttempts, { limit: 20 })

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !user) return

    // Mock payment methods (these would come from Clerk billing portal)
    const mockPaymentMethods: PaymentMethod[] = [
      {
        id: 'card_1234',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2025,
        isDefault: true
      }
    ]

    setPaymentMethods(mockPaymentMethods)
  }, [mounted, user])

  // Convert payment attempts to invoice format
  const invoices: Invoice[] = paymentAttempts?.map(attempt => ({
    id: attempt.payment_id,
    date: new Date(attempt.billing_date).toISOString().split('T')[0],
    amount: attempt.totals.grand_total.amount,
    currency: attempt.totals.grand_total.currency,
    status: attempt.status === 'paid' ? 'paid' : attempt.status === 'failed' ? 'failed' : 'pending',
    description: `${attempt.payer.first_name} ${attempt.payer.last_name} - Subscription`,
    downloadUrl: '#', // Would come from Clerk billing portal
    paymentMethod: `${attempt.payment_source.card_type} •••• ${attempt.payment_source.last4}`
  })) || []

  const isLoading = !mounted || paymentAttempts === undefined

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusIcon = (status: Invoice['status']) => {
    switch (status) {
      case 'paid':
        return <IconCheck className="h-4 w-4 text-green-600" />
      case 'pending':
        return <IconClock className="h-4 w-4 text-orange-600" />
      case 'failed':
        return <IconX className="h-4 w-4 text-red-600" />
      case 'refunded':
        return <IconX className="h-4 w-4 text-gray-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: Invoice['status']) => {
    const variants = {
      paid: 'default',
      pending: 'secondary',
      failed: 'destructive',
      refunded: 'outline'
    } as const

    return (
      <Badge variant={variants[status]} className="capitalize">
        {status}
      </Badge>
    )
  }

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.downloadUrl) {
      window.open(invoice.downloadUrl, '_blank')
    }
  }

  const handleManageBilling = () => {
    // Open Clerk's billing portal
    window.open('https://billing.clerk.com', '_blank')
  }

  if (isLoading) {
    return (
      <Card className={className}>
        {showTitle && (
          <CardHeader>
            <CardTitle>Billing History</CardTitle>
            <CardDescription>Loading billing information...</CardDescription>
          </CardHeader>
        )}
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (compact) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconReceipt className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Recent Invoices</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleManageBilling}>
                <IconExternalLink className="h-3 w-3 mr-1" />
                Manage
              </Button>
            </div>
            
            <div className="space-y-2">
              {invoices.slice(0, 3).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(invoice.status)}
                    <span className="text-sm">{formatDate(invoice.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatAmount(invoice.amount, invoice.currency)}
                    </span>
                    {getStatusBadge(invoice.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <IconReceipt className="h-5 w-5" />
              <CardTitle>Billing History</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={handleManageBilling}>
              <IconExternalLink className="h-4 w-4 mr-2" />
              Manage Billing
            </Button>
          </div>
          <CardDescription>
            View your payment history, download invoices, and manage payment methods.
          </CardDescription>
        </CardHeader>
      )}
      <CardContent className="space-y-6">
        {/* Payment Methods */}
        {paymentMethods.length > 0 && (
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <IconCreditCard className="h-4 w-4" />
              Payment Methods
            </h4>
            
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="p-2 rounded-lg bg-muted">
                  <IconCreditCard className="h-5 w-5" />
                </div>
                
                <div className="flex-1">
                  <p className="font-medium capitalize">
                    {method.brand} •••• {method.last4}
                  </p>
                  {method.expiryMonth && method.expiryYear && (
                    <p className="text-sm text-muted-foreground">
                      Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                    </p>
                  )}
                </div>
                
                {method.isDefault && (
                  <Badge variant="secondary">Default</Badge>
                )}
              </div>
            ))}
          </div>
        )}

        <Separator />

        {/* Invoices Table */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <IconCalendar className="h-4 w-4" />
            Invoice History
          </h4>
          
          {invoices.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {formatDate(invoice.date)}
                      </TableCell>
                      <TableCell>{invoice.description}</TableCell>
                      <TableCell className="font-medium">
                        {formatAmount(invoice.amount, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(invoice.status)}
                          {getStatusBadge(invoice.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {invoice.downloadUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadInvoice(invoice)}
                          >
                            <IconDownload className="h-4 w-4 mr-2" />
                            Download
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <IconReceipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billing history available</p>
              <p className="text-sm">Invoices will appear here after your first payment</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
