"use client"

import React, { useEffect, useMemo, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { HeroHeader } from "./header"
import Script from 'next/script'
import gsap from 'gsap'
import HeroBackground from './hero-background'
import ThreeAnimation from './three-animation'

export default function HeroSection() {
    const headlineRef = useRef<HTMLDivElement | null>(null)
    const ctaContainerRef = useRef<HTMLDivElement | null>(null)

    const HEADLINE = 'AI-POWERED REPO EVALUATION, FINALLY.'
    const words = useMemo(() => HEADLINE.split(' '), [])

    useEffect(() => {
        if (!headlineRef.current) return
        const chars = headlineRef.current.querySelectorAll('.headline-char')
        gsap.set(chars, { yPercent: 120, opacity: 0 })
        gsap.to(chars, {
            yPercent: 0,
            opacity: 1,
            ease: 'power3.out',
            duration: 0.6,
            stagger: 0.03,
        })
    }, [])

    useEffect(() => {
        const container = ctaContainerRef.current
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
    }, [])

    return (
        <>
            <HeroHeader />
            <main>
                <section className="relative min-h-[100vh]">
                    <HeroBackground />
                    <ThreeAnimation />

                    <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-12 min-h-[100vh] flex items-center">
                        <div className="relative pb-16 sm:pb-20 md:pb-24 max-w-[56ch] mt-12 sm:mt-16 md:mt-20">
                            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70 [mask-image:radial-gradient(65%_55%_at_45%_50%,#000_70%,transparent)]" />

                            <h1 className="text-left text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[0.95] text-balance" aria-label={HEADLINE}>
                                <div ref={headlineRef} className="flex flex-wrap gap-x-2 sm:gap-x-3 gap-y-1 sm:gap-y-2">
                                    {words.map((word, wi) => (
                                        <div key={wi} className="overflow-hidden">
                                            {Array.from(word).map((ch, ci) => (
                                                <span key={`${wi}-${ci}`} className="headline-char inline-block">{ch}</span>
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            </h1>

                            <p className="mt-6 sm:mt-8 text-base sm:text-lg md:text-xl text-white/70 max-w-prose">
                                Instant, AI‑powered codebase evaluations with clear, prioritized insights.
                            </p>

                            <div ref={ctaContainerRef} className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                                <Button asChild size="lg" className="w-full sm:w-auto h-12 md:h-14 px-6 sm:px-7 md:px-8 text-base md:text-lg hero-glow-button min-h-[44px]">
                                    <Link href="/dashboard">
                                        <span>Evaluate For Free</span>
                                    </Link>
                                </Button>
                                <Button variant="outline" asChild className="w-full sm:w-auto h-12 md:h-14 px-6 sm:px-7 md:px-8 text-base md:text-lg border-white/20 bg-white/5 text-white/90 hover:bg-white/10 hover:border-white/30 hover:text-white backdrop-blur-sm transition-all duration-300 min-h-[44px]">
                                    <Link href="/demo">See it in action</Link>
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>
        </>
    )
}
