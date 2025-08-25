"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { usePathname } from "next/navigation"

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// Conditional theme provider that forces dark theme for landing page
export function ConditionalThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = React.useState(false)
  const pathname = usePathname()
  const isLandingPage = pathname === "/"

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR, default to system theme to prevent hydration mismatch
  if (!mounted) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    )
  }

  if (isLandingPage) {
    return (
      <NextThemesProvider
        attribute="class"
        defaultTheme="dark"
        forcedTheme="dark"
        enableSystem={false}
        disableTransitionOnChange
      >
        {children}
      </NextThemesProvider>
    )
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}