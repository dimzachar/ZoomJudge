"use client"

import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load the DashboardStats component
const DashboardStats = dynamic(
  () => import('@/components/dashboard-stats').then(mod => ({ default: mod.DashboardStats })),
  {
    loading: () => (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 sm:p-6 border rounded-lg">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
    ),
    ssr: false,
  }
)

export { DashboardStats as LazyDashboardStats }
