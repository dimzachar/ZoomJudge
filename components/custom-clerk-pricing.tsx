'use client'
import { PricingTable } from "@clerk/nextjs";
import { useUser } from "@clerk/nextjs";
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { useUserTier } from "@/components/clerk-billing-gate"

export default function CustomClerkPricing() {
    const { user } = useUser()
    const { theme } = useTheme()
    const userTier = useUserTier()
    const [mounted, setMounted] = useState(false)

    // Ensure component is mounted before accessing theme
    useEffect(() => {
        setMounted(true)
    }, [])

    // Map user tier to Clerk plan ID
    const getCurrentPlanId = () => {
        switch (userTier) {
            case 'free':
                return 'free_user'
            case 'starter':
                return 'starter'
            case 'pro':
                return 'pro'
            case 'enterprise':
                return 'enterprise'
            default:
                return 'free_user'
        }
    }

    if (!mounted) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
                    baseTheme: theme === "dark" ? dark : undefined,
                    elements: {
                        pricingTableCardTitle: { // title
                            fontSize: 18,
                            fontWeight: 600,
                        },
                        pricingTableCardDescription: { // description
                            fontSize: 14,
                            color: theme === "dark" ? "#a1a1aa" : "#71717a"
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
                            border: theme === "dark" ? '1px solid #374151' : '1px solid #e5e7eb',
                            boxShadow: theme === "dark"
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
                            backgroundColor: theme === "dark" ? "#0a0a0a" : "#ffffff",
                            border: `1px solid ${theme === "dark" ? "#27272a" : "#e4e4e7"}`,
                            borderRadius: '12px',
                            boxShadow: theme === "dark"
                                ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                                : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                        },
                        // Style form elements in modal
                        formFieldInput: {
                            backgroundColor: theme === "dark" ? "#18181b" : "#f4f4f5",
                            border: `1px solid ${theme === "dark" ? "#3f3f46" : "#d4d4d8"}`,
                            color: theme === "dark" ? "#ffffff" : "#000000",
                            borderRadius: '6px',
                        },
                        formFieldLabel: {
                            color: theme === "dark" ? "#ffffff" : "#000000",
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