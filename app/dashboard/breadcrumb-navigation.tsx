"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { IconChevronRight, IconHome } from "@tabler/icons-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface BreadcrumbItem {
  label: string
  href?: string
  isCurrentPage?: boolean
}

const pathMappings: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/new-evaluation': 'New Evaluation',
  '/dashboard/history': 'History',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/settings': 'Settings',
  '/dashboard/subscription': 'Subscription',
  '/dashboard/payment-gated': 'Premium Features',
}

export function BreadcrumbNavigation({ 
  customItems 
}: { 
  customItems?: BreadcrumbItem[] 
}) {
  const pathname = usePathname()

  // If custom items are provided, use them
  if (customItems) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/dashboard">
                <IconHome className="h-4 w-4" />
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {customItems.map((item, index) => (
            <React.Fragment key={index}>
              <BreadcrumbSeparator>
                <IconChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {item.isCurrentPage ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={item.href!}>{item.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // Auto-generate breadcrumbs from pathname
  const pathSegments = pathname.split('/').filter(Boolean)
  const breadcrumbItems: BreadcrumbItem[] = []

  // Build breadcrumb items from path segments
  let currentPath = ''
  pathSegments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === pathSegments.length - 1
    const label = pathMappings[currentPath] || segment.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
    
    breadcrumbItems.push({
      label,
      href: isLast ? undefined : currentPath,
      isCurrentPage: isLast
    })
  })

  // Don't show breadcrumbs for just the dashboard root
  if (breadcrumbItems.length <= 1) {
    return null
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">
              <IconHome className="h-4 w-4" />
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbItems.map((item, index) => (
          <React.Fragment key={index}>
            <BreadcrumbSeparator>
              <IconChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {item.isCurrentPage ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={item.href!}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
