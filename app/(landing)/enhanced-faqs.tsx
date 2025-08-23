import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

const enhancedFaqs = [
  {
    q: "What is ZoomJudge?",
    a: "ZoomJudge is an AI-powered GitHub repository evaluation platform specifically designed for Zoomcamp projects. It provides automated code review, rubric-based scoring, and detailed feedback for Data Engineering, Machine Learning, MLOps, LLM, and Stock Market courses. The platform analyzes repository structure, code quality, documentation, testing practices, and adherence to course requirements.",
  },
  {
    q: "How does ZoomJudge evaluate GitHub repositories?",
    a: "ZoomJudge uses advanced AI algorithms to analyze multiple aspects of your repository: code structure and organization, documentation quality, testing coverage, configuration files, logging practices, and adherence to course-specific requirements. Each evaluation follows a detailed rubric aligned with Zoomcamp course expectations to provide consistent, transparent scoring.",
  },
  {
    q: "Which Zoomcamp courses does ZoomJudge support?",
    a: "ZoomJudge supports all major Zoomcamp courses including Data Engineering, Machine Learning, MLOps, LLM Zoomcamp, and Stock Markets. Each course has specialized evaluation criteria tailored to the specific technologies, frameworks, and best practices expected in that domain.",
  },
  {
    q: "How accurate and reliable are the AI evaluations?",
    a: "ZoomJudge evaluations are highly accurate, using course-specific rubrics developed in alignment with Zoomcamp expectations. The AI analyzes multiple signals including repository structure, code quality, documentation completeness, testing practices, and configuration management to generate consistent, objective scoring with detailed explanations.",
  },
  {
    q: "What's included in each subscription plan?",
    a: "Free plan includes 4 basic evaluations per month with core scoring. Starter plan adds detailed AI feedback, performance charts, and PDF exports. Pro plan includes advanced analytics, comparison tools, priority processing, and API access. Enterprise plan offers unlimited evaluations, team collaboration, custom criteria, and dedicated support.",
  },
  {
    q: "How quickly do I get evaluation results?",
    a: "Most evaluations complete within 2-5 minutes for standard repositories. Pro and Enterprise users get priority processing for faster results. The evaluation time depends on repository size and complexity, but our AI-powered system is optimized for speed without compromising accuracy.",
  },
  {
    q: "What makes ZoomJudge different from other code review tools?",
    a: "ZoomJudge is specifically designed for Zoomcamp projects with course-tailored evaluation criteria. Unlike generic code review tools, it understands the specific requirements, technologies, and best practices for each Zoomcamp course, providing contextually relevant feedback and scoring.",
  },
  {
    q: "Can I cancel or change my subscription plan?",
    a: "Yes, you can cancel or modify your subscription anytime from your account dashboard. Plan upgrades take effect immediately with prorated billing. Downgrades apply at the next billing cycle. We also offer a 30-day money-back guarantee for new subscribers.",
  },
]

export default function EnhancedFAQs() {
  return (
    <section id="faq" className="scroll-py-12 py-12 sm:py-16 md:scroll-py-24 md:py-24 lg:scroll-py-32 lg:py-32">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="text-center">
          <h2 className="mb-2 text-2xl sm:text-3xl md:text-4xl font-semibold">Frequently Asked Questions</h2>
          <p className="text-muted-foreground text-base sm:text-lg">Comprehensive answers about ZoomJudge's AI-powered repository evaluation platform.</p>
        </div>

        <div className="mt-8 sm:mt-10 space-y-3 sm:space-y-4 sm:mx-auto sm:max-w-2xl">
          {enhancedFaqs.map((item, idx) => (
            <Collapsible key={idx} className="rounded-lg sm:rounded-xl border bg-background">
              <CollapsibleTrigger className="w-full px-4 py-4 text-left font-medium flex items-center justify-between gap-4 min-h-[44px]">
                <span className="text-sm sm:text-base">{item.q}</span>
                <ChevronDown className="size-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 text-sm sm:text-base text-muted-foreground">
                {item.a}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>

        {/* Structured Data for FAQ */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": enhancedFaqs.map(faq => ({
                "@type": "Question",
                "name": faq.q,
                "acceptedAnswer": {
                  "@type": "Answer",
                  "text": faq.a
                }
              }))
            })
          }}
        />
      </div>
    </section>
  )
}
