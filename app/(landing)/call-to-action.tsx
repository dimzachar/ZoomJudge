"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import PixelCard from '@/components/react-bits/pixel-card'

export default function CallToAction() {
    return (
        <section id="newsletter" className="py-16 px-6">
            <div className=" mx-auto max-w-5xl rounded-3xl px-6 py-12 md:py-20 lg:py-32">
                <PixelCard variant="blue" className="w-full max-w-5xl h-auto aspect-[16/9]">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center px-6">
                        <h2 className="text-balance text-4xl font-semibold lg:text-5xl">Ready to Evaluate?</h2>
                        <p className="mt-4 max-w-xl mx-auto">Join thousands of developers improving their Zoomcamp projects with AI-powered feedback. Subscribe for launch updates and pro tips.</p>

                        <div className="mt-8 flex flex-wrap justify-center gap-3">
                            <form
                                onSubmit={(e) => e.preventDefault()}
                                className="flex w-full max-w-xl items-center gap-3">
                                <Input type="email" required placeholder="Enter your email" className="flex-1" />
                                <Button type="submit" size="lg">Subscribe</Button>
                            </form>
                        </div>

                        <div className="mt-6 flex flex-wrap justify-center gap-4">
                            <Button asChild size="lg">
                                <Link href="/dashboard">
                                    <span>Start Evaluating</span>
                                </Link>
                            </Button>
                            <Button asChild size="lg" variant="outline">
                                <Link href="#features">
                                    <span>Learn More</span>
                                </Link>
                            </Button>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">No spam. Unsubscribe anytime.</p>
                    </div>
                </div>
                </PixelCard>
            </div>
            
        </section>
    )
}