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
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <IconGitBranch className="h-5 w-5 text-blue-600" />
              Ready to evaluate a repository?
            </h3>
            <p className="text-muted-foreground">
              Submit your GitHub repository for AI-powered analysis and detailed feedback.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
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
            
            <div className="hidden md:flex items-center gap-2">
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
