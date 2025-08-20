"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface BottomNavigationItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  shortLabel?: string // Optional shorter label for mobile
  badge?: string | number // Optional badge for notifications
}

interface BottomNavigationProps {
  items: BottomNavigationItem[]
  className?: string
}

export function BottomNavigation({ items, className }: BottomNavigationProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        // Base styles
        "fixed bottom-0 left-0 right-0 z-50",
        // Background and border
        "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        "border-t border-border",
        // Layout
        "flex items-center justify-around",
        // Responsive visibility - only show on mobile and tablet
        "lg:hidden",
        // Padding and height
        "px-2 py-2",
        // Safe area for devices with home indicators
        "pb-safe-area-inset-bottom min-h-[60px]",
        className
      )}
      role="navigation"
      aria-label="Bottom navigation"
    >
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href || (pathname === '/dashboard' && item.href === '/dashboard')
        
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              // Base button styles
              "relative flex flex-col items-center justify-center",
              "min-w-0 flex-1 px-1 py-1",
              // Touch target size - ensure minimum 44px for accessibility
              "min-h-[48px]",
              // Transitions
              "transition-all duration-200 ease-in-out",
              // Focus styles
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              // Hover styles
              "hover:bg-accent/50 hover:scale-105",
              // Active styles - better touch feedback
              "active:bg-accent/70 active:scale-95",
              // Rounded corners
              "rounded-lg",
              // Text and icon colors with better contrast
              isActive
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {/* Active indicator */}
            <div
              className={cn(
                "absolute -top-1 left-1/2 transform -translate-x-1/2",
                "w-1 h-1 rounded-full transition-all duration-200",
                isActive ? "bg-primary scale-100" : "bg-transparent scale-0"
              )}
            />

            <div className="relative">
              <Icon
                className={cn(
                  "h-5 w-5 mb-1 transition-all duration-200",
                  isActive ? "text-primary scale-110" : "text-muted-foreground"
                )}
              />
              {/* Badge for notifications (future feature) */}
              {item.badge && (
                <span className={cn(
                  "absolute -top-1 -right-1",
                  "min-w-[16px] h-4 px-1",
                  "bg-destructive text-destructive-foreground",
                  "text-xs font-medium",
                  "rounded-full flex items-center justify-center",
                  "animate-pulse"
                )}>
                  {item.badge}
                </span>
              )}
            </div>
            <span
              className={cn(
                "text-xs font-medium leading-none text-center",
                "max-w-full truncate transition-all duration-200",
                isActive ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {item.shortLabel || item.title}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}

// Hook to determine if bottom navigation should add bottom padding to content
export function useBottomNavigationPadding() {
  return "pb-[76px] lg:pb-0" // 60px nav height + 16px extra padding
}
