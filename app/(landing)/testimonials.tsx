"use client"

import { Card, CardContent } from '@/components/ui/card'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React, { useEffect, useRef } from 'react'

type Testimonial = {
    name: string
    company: string
    image: string
    quote: string
}

const allTestimonials: Testimonial[] = [
    { name: 'Marta Nowak', company: 'DeepVisor', image: 'https://randomuser.me/api/portraits/women/1.jpg', quote: 'The repo score and suggestions made my capstone much stronger.' },
    { name: 'Arman Patel', company: 'DataForge', image: 'https://randomuser.me/api/portraits/men/6.jpg', quote: 'Specific feedback tied to files. Huge time saver.' },
    { name: 'Lina Kovacs', company: 'ModelOps', image: 'https://randomuser.me/api/portraits/women/7.jpg', quote: 'Rubric-based scoring gave me confidence at review.' },
    { name: 'Diego Ramirez', company: 'Promptly', image: 'https://randomuser.me/api/portraits/men/4.jpg', quote: 'Caught prompt leakage and logging gaps instantly.' },
    { name: 'Yuki Tanaka', company: 'Nebula', image: 'https://randomuser.me/api/portraits/women/2.jpg', quote: 'My pre‑submission checklist. Clear and fair.' },
    { name: 'Omar Siddiqui', company: 'Atlas ML', image: 'https://randomuser.me/api/portraits/men/8.jpg', quote: 'Feels like a senior engineer reviewed my PRs. Clear and actionable.' },
    { name: 'Sofia Rossi', company: 'Cloudloop', image: 'https://randomuser.me/api/portraits/women/8.jpg', quote: 'Loved the clarity of the comments and score breakdown.' },
    { name: 'Nikolai Petrov', company: 'StackPilot', image: 'https://randomuser.me/api/portraits/men/12.jpg', quote: 'Helped me ship a cleaner repo before peer review.' },
    { name: 'Amelia Clark', company: 'VectorBay', image: 'https://randomuser.me/api/portraits/women/12.jpg', quote: 'Fast checks, fair scoring, simple fixes. Perfect.' },
    { name: 'Hassan Ali', company: 'Pipeline AI', image: 'https://randomuser.me/api/portraits/men/13.jpg', quote: 'Flagged config and logging issues I had missed.' },
    { name: 'Zoë Martin', company: 'DeltaForge', image: 'https://randomuser.me/api/portraits/women/15.jpg', quote: 'Made my project review-ready in a single day.' },
    { name: 'Rafael Souza', company: 'Metrika', image: 'https://randomuser.me/api/portraits/men/15.jpg', quote: 'The rubric aligns with course expectations. Super helpful.' },
    { name: 'Priya Sharma', company: 'SynthWorks', image: 'https://randomuser.me/api/portraits/women/16.jpg', quote: 'Loved the inline suggestions tied to files.' },
    { name: 'Jasper Lee', company: 'ByteLab', image: 'https://randomuser.me/api/portraits/men/16.jpg', quote: 'Made my refactors obvious and easy to prioritize.' },
    { name: 'Noor Al‑Hassan', company: 'Jetstream', image: 'https://randomuser.me/api/portraits/women/17.jpg', quote: 'Exactly what I needed to pass peer review with confidence.' },
    { name: 'Ethan Walker', company: 'ApexScale', image: 'https://randomuser.me/api/portraits/men/17.jpg', quote: 'Great developer experience. Clear, fast, reliable.' },
    { name: 'Valentina Ruiz', company: 'LambdaHub', image: 'https://randomuser.me/api/portraits/women/18.jpg', quote: 'It caught problems my classmates missed.' },
    { name: 'Jonas Müller', company: 'QuantLeap', image: 'https://randomuser.me/api/portraits/men/18.jpg', quote: 'Scored my repo fairly and suggested concrete fixes.' },
    { name: 'Leila Farahani', company: 'ModelMint', image: 'https://randomuser.me/api/portraits/women/19.jpg', quote: 'The feedback quality is outstanding.' },
    { name: 'Marc Dubois', company: 'TrainSet', image: 'https://randomuser.me/api/portraits/men/19.jpg', quote: 'I trust it before submitting any project now.' },
]

const topRow = allTestimonials.slice(0, 10)
const bottomRow = allTestimonials.slice(10, 20)



export default function WallOfLoveSection() {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const topRowRef = useRef<HTMLDivElement | null>(null)
    const bottomRowRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        gsap.registerPlugin(ScrollTrigger)
        if (!containerRef.current || !topRowRef.current || !bottomRowRef.current) return

        // marquee base motion (infinite)
        const t1 = gsap.to(topRowRef.current, {
            xPercent: -50,
            duration: 40,
            ease: 'linear',
            repeat: -1,
        })
        const t2 = gsap.to(bottomRowRef.current, {
            xPercent: 50,
            duration: 40,
            ease: 'linear',
            repeat: -1,
        })

        // scroll-in stagger for both rows, synchronized
        const cards = containerRef.current.querySelectorAll('.testimonial-card')
        gsap.set(cards, { y: 100, opacity: 0 })
        gsap.to(cards, {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: 'power3.out',
            stagger: 0.06,
            scrollTrigger: {
                trigger: containerRef.current,
                start: 'top 80%',
            },
        })

        return () => {
            t1.kill()
            t2.kill()
        }
    }, [])

    return (
        <section id="testimonials" className="py-16 md:py-24 testimonials-section">
            <div className="mx-auto max-w-7xl px-6">
                <div className="text-center max-w-3xl mx-auto">
                    <h2 className="text-foreground text-4xl font-semibold">What Developers Are Saying</h2>
                    <p className="text-muted-foreground mt-3">Actionable, fair, and fast feedback that helps you ship with confidence.</p>
                </div>
                <div ref={containerRef} className="mt-16 md:mt-20">
                    <div className="overflow-hidden">
                        <div ref={topRowRef} className="flex gap-5 will-change-transform">
                            {topRow.map((t, i) => (
                                <Card key={`top-${i}`} className="testimonial-card min-w-[420px]">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={t.image}
                                                alt={t.name}
                                                className="size-9 rounded-full object-cover"
                                            />
                                            <div>
                                                <h3 className="font-medium leading-none">{t.name}</h3>
                                                <p className="text-muted-foreground text-xs">{t.company}</p>
                                            </div>
                                        </div>
                                        <blockquote className="mt-4 text-sm leading-relaxed">“{t.quote}”</blockquote>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    <div className="mt-4 overflow-hidden">
                        <div ref={bottomRowRef} className="flex gap-5 will-change-transform">
                            {bottomRow.map((t, i) => (
                                <Card key={`bottom-${i}`} className="testimonial-card min-w-[420px]">
                                    <CardContent className="pt-6">
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={t.image}
                                                alt={t.name}
                                                className="size-9 rounded-full object-cover"
                                            />
                                            <div>
                                                <h3 className="font-medium leading-none">{t.name}</h3>
                                                <p className="text-muted-foreground text-xs">{t.company}</p>
                                            </div>
                                        </div>
                                        <blockquote className="mt-4 text-sm leading-relaxed">“{t.quote}”</blockquote>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
