"use client"

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { SignUpButton } from '@clerk/nextjs'
import PixelCard from '@/components/react-bits/pixel-card'

export default function CallToAction() {
    return (
        <section id="newsletter" className="py-12 sm:py-16 px-4 sm:px-6">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <PixelCard variant="blue" className="w-full h-[500px] sm:h-[400px] md:h-[350px]">
                    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6">
                        <div className="text-center w-full max-w-2xl">
                            <h2 className="text-balance text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold text-white">
                                Ready to Evaluate?
                            </h2>
                            <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-200 max-w-lg mx-auto">
                                Join thousands of developers improving their Zoomcamp projects with AI-powered feedback. 
                                Subscribe for launch updates and pro tips.
                            </p>

                            <div className="mt-6 sm:mt-8 space-y-4">
                                <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto">
                                    <Input 
                                        type="email" 
                                        required 
                                        placeholder="Enter your email" 
                                        className="flex-1 min-h-[44px] text-base bg-white text-black" 
                                    />
                                    <Button 
                                        type="submit" 
                                        size="lg" 
                                        className="min-h-[44px] px-6"
                                    >
                                        Subscribe
                                    </Button>
                                </div>

                                <div className="flex flex-col sm:flex-row justify-center gap-3 max-w-md mx-auto">
                                    <SignUpButton mode="modal">
                                        <Button size="lg" className="w-full sm:flex-1 min-h-[44px]">
                                            Start Evaluating
                                        </Button>
                                    </SignUpButton>
                                    <Button asChild size="lg" variant="outline" className="w-full sm:flex-1 min-h-[44px] border-white text-white hover:bg-white hover:text-black">
                                        <Link href="#features">
                                            Learn More
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                            
                            <p className="mt-4 text-xs sm:text-sm text-gray-300">
                                No spam. Unsubscribe anytime.
                            </p>
                        </div>
                    </div>
                </PixelCard>
            </div>
        </section>
    )
}