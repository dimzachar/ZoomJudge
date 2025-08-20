'use client'
import Link from 'next/link'
import { ZoomJudgeLogo } from '@/components/zoomjudge-logo'
import { Loader2, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import React from 'react'
import { cn } from '@/lib/utils'

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { MobileNavigation } from "@/components/mobile-navigation"

import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"



const menuItems = [
    { name: 'Demo', href: '/demo' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Testimonials', href: '#testimonials' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Newsletter', href: '#newsletter' },
]

export const HeroHeader = () => {
    const [menuState, setMenuState] = React.useState(false)
    const [isScrolled, setIsScrolled] = React.useState(false)
    const [mounted, setMounted] = React.useState(false)
    const { theme } = useTheme()
    const signUpButtonRef = React.useRef<HTMLDivElement>(null)
    const getStartedButtonRef = React.useRef<HTMLDivElement>(null)

    const appearance = {
        baseTheme: mounted && theme === "dark" ? dark : undefined,
    }

    React.useEffect(() => {
        setMounted(true)
    }, [])

    React.useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50)
        }
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Add interactive glow effect for sign up buttons
    React.useEffect(() => {
        const setupButtonInteraction = (containerRef: React.RefObject<HTMLDivElement | null>) => {
            const container = containerRef.current
            if (!container) return

            const button = container.querySelector<HTMLButtonElement>('button, [data-slot="button"]')
            if (!button) return

            let rafId = 0
            const handleMove = (e: MouseEvent) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                const x = (e.clientX - rect.left) / rect.width
                const y = (e.clientY - rect.top) / rect.height
                // Map to percents for background-position
                const px = Math.round(20 + x * 60) // 20% .. 80%
                const py = Math.round(20 + y * 60)
                cancelAnimationFrame(rafId)
                rafId = requestAnimationFrame(() => {
                    button.style.setProperty('--bg-x', `${px}%`)
                    button.style.setProperty('--bg-y', `${py}%`)
                })
            }

            const handleLeave = () => {
                cancelAnimationFrame(rafId)
                button.style.removeProperty('--bg-x')
                button.style.removeProperty('--bg-y')
            }

            container.addEventListener('mousemove', handleMove)
            container.addEventListener('mouseleave', handleLeave)
            return () => {
                container.removeEventListener('mousemove', handleMove)
                container.removeEventListener('mouseleave', handleLeave)
                cancelAnimationFrame(rafId)
            }
        }

        const cleanupSignUp = setupButtonInteraction(signUpButtonRef)
        const cleanupGetStarted = setupButtonInteraction(getStartedButtonRef)

        return () => {
            cleanupSignUp?.()
            cleanupGetStarted?.()
        }
    }, [])
    return (
        <header>
            <nav
                data-state={menuState && 'active'}
                className="fixed z-20 w-full px-2">
                <div className={cn('mx-auto mt-2 max-w-6xl px-6 transition-all duration-300 lg:px-12', isScrolled && 'bg-background/50 max-w-4xl rounded-2xl border backdrop-blur-lg lg:px-5')}>
                    <div className="relative flex flex-wrap items-center justify-between gap-6 py-3 lg:gap-0 lg:py-4">
                        <div className="flex w-full justify-between lg:w-auto">
                            <Link
                                href="/"
                                aria-label="home"
                                className="flex items-center space-x-2">
                                <ZoomJudgeLogo variant="full" size="sm" />
                                <Badge variant="outline" className="text-muted-foreground  text-xs">Beta</Badge>
                            </Link>

                            <button
                                onClick={() => setMenuState(!menuState)}
                                aria-label={menuState == true ? 'Close Menu' : 'Open Menu'}
                                className="relative z-20 -m-2.5 -mr-4 block cursor-pointer p-2.5 lg:hidden">
                                <Menu className="in-data-[state=active]:rotate-180 in-data-[state=active]:scale-0 in-data-[state=active]:opacity-0 m-auto size-6 duration-200" />
                                <X className="in-data-[state=active]:rotate-0 in-data-[state=active]:scale-100 in-data-[state=active]:opacity-100 absolute inset-0 m-auto size-6 -rotate-180 scale-0 opacity-0 duration-200" />
                            </button>
                        </div>

                        <div className="absolute inset-0 m-auto hidden size-fit lg:block">
                            <ul className="flex gap-8 text-sm">
                                {menuItems.map((item, index) => (
                                    <li key={index}>
                                        <Link
                                            href={item.href}
                                            className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                            <span>{item.name}</span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="bg-background in-data-[state=active]:block lg:in-data-[state=active]:flex mb-6 hidden w-full flex-wrap items-center justify-end space-y-8 rounded-3xl border p-6 shadow-2xl shadow-zinc-300/20 md:flex-nowrap lg:m-0 lg:flex lg:w-fit lg:gap-6 lg:space-y-0 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none dark:shadow-none dark:lg:bg-transparent">
                            <div className="lg:hidden">
                                <ul className="space-y-6 text-base">
                                    {menuItems.map((item, index) => (
                                        <li key={index}>
                                            <Link
                                                href={item.href}
                                                className="text-muted-foreground hover:text-accent-foreground block duration-150">
                                                <span>{item.name}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="flex w-full flex-col space-y-3 sm:flex-row sm:gap-3 sm:space-y-0 md:w-fit">
                                <AuthLoading>
                                    <div className="flex items-center justify-center">
                                        <Loader2 className="size-8 p-2 animate-spin" />
                                    </div>
                                </AuthLoading>
                                <Authenticated>
                                    <Button asChild size="sm">
                                        <Link href="/dashboard">
                                            <span>Dashboard</span>
                                        </Link>
                                    </Button>
                                    <UserButton appearance={appearance} />
                                </Authenticated>

                                <Unauthenticated>
                                    <SignInButton mode="modal">
                                        <Button
                                            asChild
                                            variant="outline"
                                            size="sm"
                                            className={cn(isScrolled && 'lg:hidden')}>
                                            <Link href="#">
                                                <span>Login</span>
                                            </Link>
                                        </Button>
                                    </SignInButton>
                                    <SignUpButton mode="modal">
                                        <div ref={signUpButtonRef}>
                                            <Button
                                                asChild
                                                size="sm"
                                                className={cn('hero-glow-button', isScrolled && 'lg:hidden')}>
                                                <Link href="#">
                                                    <span>Sign Up</span>
                                                </Link>
                                            </Button>
                                        </div>
                                    </SignUpButton>
                                    <SignUpButton mode="modal">
                                        <div ref={getStartedButtonRef}>
                                            <Button
                                                asChild
                                                size="sm"
                                                className={cn('hero-glow-button', isScrolled ? 'lg:inline-flex' : 'hidden')}>
                                                <Link href="#">
                                                    <span>Get Started</span>
                                                </Link>
                                            </Button>
                                        </div>
                                    </SignUpButton>
                                </Unauthenticated>
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        </header>
    )
}
