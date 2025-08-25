"use client";

import dynamic from "next/dynamic";

const CustomClerkPricing = dynamic(() => import("@/components/custom-clerk-pricing"), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ),
});

export default function PricingSection() {
  return (
    <section id="pricing" className="bg-muted/50 py-12 sm:py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-8 sm:mb-12 mx-auto max-w-2xl space-y-4 sm:space-y-6 text-center">
          <h1 className="text-center text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold">Pricing that Scales with You</h1>
          <p className="text-base sm:text-lg text-muted-foreground">Choose the perfect plan for your evaluation needs. From individual projects to enterprise-scale repository analysis, we have you covered.</p>
        </div>
        <div suppressHydrationWarning>
          <CustomClerkPricing key="clerk-pricing-component" />
        </div>
      </div>
    </section>
  );
}
