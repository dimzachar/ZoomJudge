import { Card } from '@/components/ui/card'
import { Table } from './table'
import { CpuArchitecture } from './cpu-architecture'
import { AnimatedListCustom } from './animated-list-custom'
  

export default function FeaturesOne() {
    return (
        <section className="py-12 sm:py-16 md:py-20">
            <div className="py-16 sm:py-20 md:py-24">
                <div className="mx-auto w-full max-w-5xl px-4 sm:px-6">
                    <div className="text-center" id="features">
                        <h2 className="text-foreground text-2xl sm:text-3xl md:text-4xl font-semibold">Intelligent Repository Analysis</h2>
                        <p className="text-muted-foreground mb-8 sm:mb-12 mt-4 text-balance text-base sm:text-lg max-w-4xl mx-auto">Get comprehensive feedback on your GitHub repositories with AI-powered evaluation across multiple Zoomcamp courses. Detailed scoring and prioritized insights to improve your projects.</p>
                        <div className="bg-foreground/5 rounded-2xl sm:rounded-3xl p-4 sm:p-6">
                            <Table />
                        </div>
                    </div>

                    <div className="border-foreground/10 relative mt-12 sm:mt-16 grid gap-8 sm:gap-12 border-b pb-8 sm:pb-12 [--radius:1rem] md:grid-cols-2">
                        <div className="space-y-4">
                            <h3 className="text-foreground text-lg sm:text-xl font-semibold">Multi-Course Support</h3>
                            <p className="text-muted-foreground text-base sm:text-lg">Evaluate repositories across Data Engineering, Machine Learning, MLOps, LLM, and Stock Markets Zoomcamp courses.</p>
                            <Card className="aspect-video overflow-hidden px-4 sm:px-6">
                                <Card className="h-full translate-y-4 sm:translate-y-6 rounded-b-none border-b-0 bg-muted/50">
                                    <CpuArchitecture />
                                </Card>
                            </Card>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-foreground text-lg sm:text-xl font-semibold">Detailed Feedback</h3>
                            <p className="text-muted-foreground text-base sm:text-lg">Get comprehensive scoring breakdowns and guided feedback to improve your project quality.</p>
                            <Card
                                className="aspect-video overflow-hidden">
                                <Card className="translate-6 h-full rounded-bl-none border-b-0 border-r-0 bg-muted/50 pt-6 pb-0">
                                    <AnimatedListCustom />
                                </Card>
                            </Card>
                        </div>
                    </div>
{/* 
                    <blockquote className="before:bg-primary relative mt-12 max-w-xl pl-6 before:absolute before:inset-y-0 before:left-0 before:w-1 before:rounded-full">
                        <p className="text-foreground text-lg">ZoomJudge has transformed how I evaluate my projects. The AI feedback is incredibly detailed and helps me understand exactly what I need to improve.</p>
                        <footer className="mt-4 flex items-center gap-2">
                            <cite>Alex Chen</cite>
                            <span
                                aria-hidden
                                className="bg-foreground/15 size-1 rounded-full"></span>
                            <span className="text-muted-foreground">Data Engineering Student</span>
                        </footer>
                    </blockquote> */}
                </div>
            </div>
        </section>
    )
}
