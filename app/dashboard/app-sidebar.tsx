"use client"

import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconMessageCircle,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconUsers,
  IconSparkles,
  IconBrandOpenai,
} from "@tabler/icons-react"

import { NavDocuments } from "@/app/dashboard/nav-documents"
import { NavMain } from "@/app/dashboard/nav-main"
import { NavSecondary } from "@/app/dashboard/nav-secondary"
import { NavUser } from "@/app/dashboard/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ZoomJudgeLogo } from "@/components/zoomjudge-logo"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "New Evaluation",
      url: "/dashboard/new-evaluation",
      icon: IconFileAi,
    },
    {
      title: "History",
      url: "/dashboard/history",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: IconChartBar,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Subscription",
      url: "/dashboard/subscription",
      icon: IconSparkles,
    },
  ],
  courses: [
    {
      name: "Data Engineering",
      url: "/dashboard?course=data-engineering",
      icon: IconDatabase,
    },
    {
      name: "Machine Learning",
      url: "/dashboard?course=machine-learning",
      icon: IconBrandOpenai,
    },
    {
      name: "MLOps",
      url: "/dashboard?course=mlops",
      icon: IconInnerShadowTop,
    },
    {
      name: "LLM Zoomcamp",
      url: "/dashboard?course=llm-zoomcamp",
      icon: IconMessageCircle,
    },
    {
      name: "Stock Markets",
      url: "/dashboard?course=stock-markets",
      icon: IconChartBar,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <ZoomJudgeLogo variant="full" size="sm" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.courses} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
