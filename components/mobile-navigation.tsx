"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

interface NavigationItem {
  title: string
  href: string
  icon?: React.ComponentType<{ className?: string }>
}

interface MobileNavigationProps {
  items: NavigationItem[]
  logo?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

export function MobileNavigation({ 
  items, 
  logo, 
  actions, 
  className 
}: MobileNavigationProps) {
  const [open, setOpen] = React.useState(false)
  const pathname = usePathname()

  // Close mobile menu when route changes
  React.useEffect(() => {
    setOpen(false)
  }, [pathname])

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[300px] sm:w-[350px]">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2">
              {logo}
            </SheetTitle>
          </SheetHeader>
          
          <nav className="mt-8 space-y-2">
            {items.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive 
                      ? "bg-accent text-accent-foreground" 
                      : "text-muted-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  {Icon && <Icon className="h-5 w-5" />}
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </nav>
          
          {actions && (
            <div className="mt-8 space-y-4 border-t pt-6">
              {actions}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// Mobile-specific navigation trigger for cases where you need just the trigger
export function MobileNavigationTrigger({ 
  onClick, 
  className 
}: { 
  onClick?: () => void
  className?: string 
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-10 w-10 md:hidden", className)}
      onClick={onClick}
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}
