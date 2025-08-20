"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { 
  IconFileAi, 
  IconHistory, 
  IconChartBar,
  IconPlus,
  IconGitBranch,
  IconSearch
} from "@tabler/icons-react"

export function QuickActions() {
  return (
    <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-blue-200 dark:border-blue-800">
      <CardContent className="p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="space-y-1 sm:space-y-2">
            <h3 className="text-sm sm:text-base md:text-lg font-semibold flex items-center gap-2">
              <IconGitBranch className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
              Ready to evaluate a repository?
            </h3>
            <p className="text-xs sm:text-sm md:text-base text-muted-foreground">
              Submit your GitHub repository for AI-powered analysis and detailed feedback.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto min-h-[44px] text-sm sm:text-base">
              <Link href="/dashboard/new-evaluation">
                <IconPlus className="h-4 w-4 mr-2" />
                New Evaluation
              </Link>
            </Button>
            {/* COMMENTED OUT: Web search evaluation button
            <Button asChild size="lg" variant="secondary">
              <Link href="/dashboard/web-evaluation">
                <IconSearch className="h-4 w-4 mr-2" />
                Web Search Evaluation
              </Link>
            </Button>
            */}

            <div className="flex sm:hidden items-center gap-2">
              <Button asChild variant="outline" size="sm" className="flex-1 min-h-[44px] text-xs sm:text-sm">
                <Link href="/dashboard/history">
                  <IconHistory className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  History
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm" className="flex-1 min-h-[44px] text-xs sm:text-sm">
                <Link href="/dashboard/analytics">
                  <IconChartBar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Analytics
                </Link>
              </Button>
            </div>

            <div className="hidden sm:flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/history">
                  <IconHistory className="h-4 w-4 mr-2" />
                  History
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/analytics">
                  <IconChartBar className="h-4 w-4 mr-2" />
                  Analytics
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
