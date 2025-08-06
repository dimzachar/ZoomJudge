import { TopNavigation } from "@/app/dashboard/top-navigation"
import { BreadcrumbNavigation } from "@/app/dashboard/breadcrumb-navigation"
import { LoadingBar } from "@/app/dashboard/loading-bar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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