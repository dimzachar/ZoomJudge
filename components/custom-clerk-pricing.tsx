'use client'
import { PricingTable } from "@clerk/nextjs";
import { dark } from '@clerk/themes'
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export default function CustomClerkPricing() {
    const { theme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Ensure component is mounted before accessing theme
    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        )
    }

    return (
        <>
            <PricingTable
                appearance={{
                    baseTheme: theme === "dark" ? dark : undefined,
                    elements: {
                        pricingTableCardTitle: { // title
                            fontSize: 20,
                            fontWeight: 400,
                        },
                        pricingTableCardDescription: { // description
                            fontSize: 14
                        },
                        pricingTableCardFee: { // price
                            fontSize: 36,
                            fontWeight: 800,
                        },
                        pricingTable: {
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        },
                    },
                }}

            />
        </>
    )
}