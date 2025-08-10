import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown } from "lucide-react"

const faqs = [
  {
    q: "What is ZoomJudge?",
    a: "ZoomJudge is an AI-powered evaluator for GitHub repositories that provides rubric-based scoring and practical feedback tailored to Zoomcamp projects.",
  },
  {
    q: "How accurate is the evaluation?",
    a: "We use a rubric aligned with course expectations plus multiple signals (structure, config, logging, tests) to generate consistent, transparent scoring.",
  },
  {
    q: "Do you support private repositories?",
    a: "Yes. Private repos are supported. We only access the data required for evaluation and never share your code.",
  },
  {
    q: "What’s included in each plan?",
    a: "All plans include core evaluations. Higher tiers unlock deeper checks, more monthly runs, and faster turnaround.",
  },
  {
    q: "Can I cancel or change my plan?",
    a: "You can cancel anytime from your account. Upgrades take effect immediately; downgrades apply next cycle.",
  },
  {
    q: "Do you offer refunds?",
    a: "Yes, we offer a 30-day money-back guarantee for new customers. Contact support with your order details.",
  },
]

export default function FAQs() {
  return (
    <section id="faq" className="scroll-py-16 py-16 md:scroll-py-32 md:py-32">
      <div className="mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="mb-2 text-3xl font-semibold md:text-4xl">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Quick answers to common questions about ZoomJudge.</p>
        </div>

        <div className="mt-10 space-y-4 sm:mx-auto sm:max-w-2xl">
          {faqs.map((item, idx) => (
            <Collapsible key={idx} className="rounded-xl border bg-background">
              <CollapsibleTrigger className="w-full px-4 py-4 text-left font-medium flex items-center justify-between">
                <span>{item.q}</span>
                <ChevronDown className="size-4 shrink-0 transition-transform data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent className="px-4 pb-4 text-sm text-muted-foreground">
                {item.a}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>
    </section>
  )
}
