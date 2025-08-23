import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings - ZoomJudge | Account Configuration',
  description: 'Manage your ZoomJudge account settings, preferences, and configuration options. Customize your evaluation experience and account details.',
  robots: {
    index: false, // Settings pages should never be indexed
    follow: false,
  },
}

export default function SettingsLayout({
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
