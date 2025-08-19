"use client"

import { TopNavigation } from "@/app/dashboard/top-navigation"
import { BreadcrumbNavigation } from "@/app/dashboard/breadcrumb-navigation"
import { LoadingBar } from "@/app/dashboard/loading-bar"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { Loader2 } from "lucide-react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    // Only redirect if Clerk has finished loading and user is not authenticated
    if (isLoaded && !user) {
      router.push("/")
    }
  }, [isLoaded, user, router])

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
    <div className="min-h-screen bg-background">
      <LoadingBar />
      <TopNavigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <BreadcrumbNavigation />
        </div>

        <div className="@container/main">
          {children}
        </div>
      </main>
    </div>
  )
}