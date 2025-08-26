"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import {
  IconDashboard,
  IconFileAi,
  IconListDetails,
  IconChartBar,
  IconBell,
} from "@tabler/icons-react"

import { ZoomJudgeLogo } from "@/components/zoomjudge-logo"
import { ThemeToggle } from "@/components/theme-toggle"
import { ModeToggle } from "@/components/mode-toggle"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useUser, useClerk } from "@clerk/nextjs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconLogout, IconUser, IconCreditCard, IconSettings } from "@tabler/icons-react"

const navigationItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: IconDashboard,
  },
  {
    title: "New Evaluation",
    href: "/dashboard/new-evaluation",
    icon: IconFileAi,
  },
  // {
  //   title: "Hybrid AI (Beta)",
  //   href: "/dashboard/hybrid-evaluation",
  //   icon: IconBrain,
  // },
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



export function TopNavigation() {
  const pathname = usePathname()
  const { user } = useUser()
  const { signOut } = useClerk()
  const [mounted, setMounted] = useState(false)

  // Ensure component is mounted before accessing theme
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-6">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <ZoomJudgeLogo variant="full" size="sm" />
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 transition-colors hover:text-foreground/80",
                    isActive ? "text-foreground" : "text-foreground/60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <IconBell className="h-4 w-4" />
            </Button>
            <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 sm:h-14 items-center px-3 sm:px-4 md:px-6">
        {/* Logo - always visible */}
        <div className="mr-4 md:mr-6">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <ZoomJudgeLogo variant="full" size="sm" />
          </Link>
        </div>

        {/* Main Navigation - Desktop only (mobile/tablet uses bottom nav) */}
        <nav className="hidden lg:flex items-center space-x-6 text-sm font-medium">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center space-x-2 transition-colors hover:text-foreground/80",
                  isActive ? "text-foreground" : "text-foreground/60"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.title}</span>
              </Link>
            )
          })}
        </nav>



        {/* Right side - User menu and actions */}
        <div className="ml-auto flex items-center space-x-2 lg:space-x-4">
          {/* Theme Toggle - Mobile: compact button, Desktop: full toggle */}
          <div className="lg:hidden">
            <ModeToggle />
          </div>
          <div className="hidden lg:block">
            <ThemeToggle />
          </div>

          {/* Notifications - Desktop only */}
          <Button variant="ghost" size="sm" className="hidden lg:flex h-8 w-8 p-0">
            <IconBell className="h-4 w-4" />
          </Button>



          {/* Custom User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.imageUrl} alt="" />
                  <AvatarFallback>
                    {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.fullName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.primaryEmailAddress?.emailAddress}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings">
                  <IconSettings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard/billing">
                  <IconCreditCard className="mr-2 h-4 w-4" />
                  <span>Billing</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/" })}>
                <IconLogout className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
