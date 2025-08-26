import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard - ZoomJudge',
  description: 'Administrative dashboard for managing ZoomJudge platform operations, users, and system settings.',
  robots: {
    index: false, // Admin pages should not be indexed
    follow: false,
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="space-y-6">
      {children}
    </div>
  )
}
