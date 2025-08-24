"use client"

import { TopNavigation } from "@/app/dashboard/top-navigation"
import { BreadcrumbNavigation } from "@/app/dashboard/breadcrumb-navigation"
import { LoadingBar } from "@/app/dashboard/loading-bar"
import { BottomNavigation, useBottomNavigationPadding } from "@/components/bottom-navigation"
import { FeedbackWidget } from "@/components/feedback/feedback-widget"
import { FeedbackProvider } from "@/components/feedback/feedback-context"
import { GlobalFeedbackModal } from "@/components/feedback/global-feedback-modal"
import { useUser } from "@clerk/nextjs"
import { Loader2 } from "lucide-react"
import {
  IconDashboard,
  IconFileAi,
  IconListDetails,
  IconChartBar,
} from "@tabler/icons-react"
import { cn } from "@/lib/utils"

// Bottom navigation items for mobile/tablet
const bottomNavigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: IconDashboard,
    shortLabel: "Home",
  },
  {
    title: "New Evaluation",
    href: "/dashboard/new-evaluation",
    icon: IconFileAi,
    shortLabel: "New",
  },
  {
    title: "History",
    href: "/dashboard/history",
    icon: IconListDetails,
  },
  {
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: IconChartBar,
  },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const bottomPadding = useBottomNavigationPadding()


  // Show loading while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  // Show nothing while redirecting unauthenticated users
  if (!user) {
    return null
  }

  return (
    <FeedbackProvider>
      <div className="min-h-screen bg-background">
        <LoadingBar />
        <TopNavigation />

        <main className={cn(
          "container mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6",
          bottomPadding
        )}>
          <div className="mb-3 sm:mb-4 md:mb-6">
            <BreadcrumbNavigation />
          </div>

          <div className="@container/main">
            {children}
          </div>
        </main>

        {/* Bottom Navigation for Mobile/Tablet */}
        <BottomNavigation items={bottomNavigationItems} />

        {/* Feedback Widget */}
        <FeedbackWidget />

        {/* Global Feedback Modal */}
        <GlobalFeedbackModal />
      </div>
    </FeedbackProvider>
  )
}