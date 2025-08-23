import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing - ZoomJudge | Subscription Management',
  description: 'Manage your ZoomJudge subscription, billing information, and payment methods. View usage statistics and upgrade or downgrade your plan.',
  robots: {
    index: false, // Billing pages should never be indexed
    follow: false,
  },
}

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}
