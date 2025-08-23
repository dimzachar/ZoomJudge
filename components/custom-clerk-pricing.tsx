'use client'
import { PricingTable } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { useUserTier } from "@/components/clerk-billing-gate"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconAlertTriangle, IconRefresh } from "@tabler/icons-react"

export default function CustomClerkPricing() {
    const { user } = useUser()
    const { theme } = useTheme()
    const pathname = usePathname()
    const userTier = useUserTier()
    const [mounted, setMounted] = useState(false)
    const [hasError, setHasError] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    // Force dark theme for landing page, otherwise use system theme
    const isLandingPage = pathname === "/"
    const effectiveTheme = isLandingPage ? "dark" : theme

    // Ensure component is mounted before accessing theme
    useEffect(() => {
        setMounted(true)
        // Set a timeout to detect if pricing table fails to load
        const timer = setTimeout(() => {
            if (isLoading) {
                console.error('Clerk PricingTable failed to load within 10 seconds')
                setHasError(true)
                setIsLoading(false)
                toast.error('Pricing table failed to load. This may be due to CSP restrictions or billing configuration.')
            }
        }, 10000) // 10 second timeout (increased from 5 seconds)

        return () => clearTimeout(timer)
    }, [isLoading])

    // Check for successful pricing table load by observing DOM changes
    useEffect(() => {
        if (!mounted || hasError) return

        const checkForPricingTable = () => {
            // Look for Clerk pricing table elements in the DOM
            const pricingElements = document.querySelectorAll('[data-clerk-element="pricing-table"], .cl-pricing-table, [class*="pricing"]')
            if (pricingElements.length > 0) {
                // console.log('Clerk PricingTable elements detected in DOM') // Disabled to reduce console noise
                setIsLoading(false)
                setHasError(false)
                return true
            }
            return false
        }

        // Check immediately
        if (checkForPricingTable()) return

        // Set up a MutationObserver to watch for DOM changes
        const observer = new MutationObserver(() => {
            checkForPricingTable()
        })

        observer.observe(document.body, {
            childList: true,
            subtree: true
        })

        return () => observer.disconnect()
    }, [mounted, hasError])

    // Debug logging (disabled to reduce console noise)
    // useEffect(() => {
    //     console.log('CustomClerkPricing state:', { mounted, hasError, isLoading, userTier, user: !!user })

    //     // Check if Stripe is available
    //     if (typeof window !== 'undefined') {
    //         console.log('Stripe availability check:', {
    //             stripeExists: typeof (window as any).Stripe !== 'undefined',
    //             clerkExists: typeof (window as any).Clerk !== 'undefined'
    //         })
    //     }
    // }, [mounted, hasError, isLoading, userTier, user])



    const handleRetry = () => {
        setHasError(false)
        setIsLoading(true)
        // Force re-render by updating mounted state
        setMounted(false)
        setTimeout(() => setMounted(true), 100)
    }

    const handleContactSupport = () => {
        window.open('mailto:support@zoomjudge.com?subject=Billing Issue - Unable to Load Pricing', '_blank')
    }

    if (!mounted) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    // Show error state if pricing table fails to load
    if (hasError) {
        return (
            <div className="space-y-6">
                <Card className="max-w-md mx-auto">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                            <IconAlertTriangle className="h-6 w-6 text-orange-600" />
                        </div>
                        <CardTitle>Unable to Load Pricing</CardTitle>
                        <CardDescription>
                            We're having trouble loading the pricing information. This could be due to a Content Security Policy issue or billing configuration.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <Button onClick={handleRetry} variant="outline" className="w-full">
                                <IconRefresh className="h-4 w-4 mr-2" />
                                Try Again
                            </Button>
                            <Button onClick={handleContactSupport} variant="default" className="w-full">
                                Contact Support
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground text-center">
                            <p>If this issue persists, please contact our support team for assistance with upgrading your plan.</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Fallback pricing display */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                    <Card className="relative">
                        <CardHeader>
                            <CardTitle className="text-lg">Starter</CardTitle>
                            <CardDescription>Perfect for individual projects</CardDescription>
                            <div className="text-3xl font-bold">$20<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li>• 100 evaluations/month</li>
                                <li>• All evaluation features</li>
                                <li>• Email support</li>
                            </ul>
                            <Button className="w-full mt-4" onClick={handleContactSupport}>
                                Contact Support to Upgrade
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="relative border-primary">
                        <CardHeader>
                            <CardTitle className="text-lg">Pro</CardTitle>
                            <CardDescription>For professional developers</CardDescription>
                            <div className="text-3xl font-bold">$50<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li>• 500 evaluations/month</li>
                                <li>• Priority support</li>
                                <li>• Advanced analytics</li>
                            </ul>
                            <Button className="w-full mt-4" onClick={handleContactSupport}>
                                Contact Support to Upgrade
                            </Button>
                        </CardContent>
                    </Card>

                    <Card className="relative">
                        <CardHeader>
                            <CardTitle className="text-lg">Enterprise</CardTitle>
                            <CardDescription>For teams and organizations</CardDescription>
                            <div className="text-3xl font-bold">Custom</div>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2 text-sm">
                                <li>• Unlimited evaluations</li>
                                <li>• Dedicated support</li>
                                <li>• Custom integrations</li>
                            </ul>
                            <Button className="w-full mt-4" onClick={handleContactSupport}>
                                Contact Sales
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="w-full space-y-8">
            {/* Feature Comparison Note */}
            <div className="text-center text-sm text-muted-foreground">
                <p>All plans include core evaluation features. Higher tiers unlock advanced capabilities and increased limits.</p>
            </div>

            <PricingTable
                    appearance={{
                        baseTheme: effectiveTheme === "dark" ? dark : undefined,
                        elements: {
                            pricingTableCardTitle: { // title
                                fontSize: 18,
                                fontWeight: 600,
                            },
                            pricingTableCardDescription: { // description
                                fontSize: 14,
                                color: effectiveTheme === "dark" ? "#a1a1aa" : "#71717a"
                            },
                            pricingTableCardFee: { // price
                                fontSize: 32,
                                fontWeight: 700,
                            },
                            pricingTable: {
                                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                gap: '1.5rem',
                                maxWidth: '100%',
                            },
                            pricingTableCard: {
                                borderRadius: '12px',
                                border: effectiveTheme === "dark" ? '1px solid #374151' : '1px solid #e5e7eb',
                                boxShadow: effectiveTheme === "dark"
                                    ? '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
                                    : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease-in-out',
                            },
                            pricingTableCardButton: {
                                borderRadius: '8px',
                                fontWeight: 500,
                                padding: '12px 24px',
                                fontSize: '14px',
                            },
                            // Fix modal z-index and positioning issues
                            modalBackdrop: {
                                zIndex: 999999,
                                position: 'fixed',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            },
                            modalContent: {
                                zIndex: 1000000,
                                position: 'fixed',
                                top: '50%',
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                                backgroundColor: effectiveTheme === "dark" ? "#0a0a0a" : "#ffffff",
                                border: `1px solid ${effectiveTheme === "dark" ? "#27272a" : "#e4e4e7"}`,
                                borderRadius: '12px',
                                boxShadow: effectiveTheme === "dark"
                                    ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                    : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            },
                            // Style form elements in modal
                            formFieldInput: {
                                backgroundColor: effectiveTheme === "dark" ? "#18181b" : "#f4f4f5",
                                border: `1px solid ${effectiveTheme === "dark" ? "#3f3f46" : "#d4d4d8"}`,
                                color: effectiveTheme === "dark" ? "#ffffff" : "#000000",
                                borderRadius: '6px',
                            },
                            formFieldLabel: {
                                color: effectiveTheme === "dark" ? "#ffffff" : "#000000",
                            },
                            formButtonPrimary: {
                                backgroundColor: "hsl(var(--primary))",
                                color: "hsl(var(--primary-foreground))",
                                borderRadius: '6px',
                            },
                            // Ensure overlays appear above navigation
                            overlay: {
                                zIndex: 999999,
                            },
                            // Fix any popup/dropdown z-index issues
                            popover: {
                                zIndex: 1000000,
                            }
                        },
                    }}

                />
        </div>
    )
}