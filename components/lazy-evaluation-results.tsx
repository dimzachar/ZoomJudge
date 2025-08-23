"use client"

import dynamic from 'next/dynamic'
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load the EvaluationResults component
const EvaluationResults = dynamic(
  () => import('@/app/dashboard/evaluation-results').then(mod => ({ default: mod.EvaluationResults })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    ssr: false,
  }
)

export { EvaluationResults as LazyEvaluationResults }
