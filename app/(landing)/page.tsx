import HeroSection from "./hero-section";
import Testimonials from "./testimonials";
import FeaturesOne from "./features-one";
import PricingSection from "./pricing-section";
import CallToAction from "./call-to-action";
import EnhancedFAQs from "./enhanced-faqs";
import { MobileFooter } from "@/components/mobile-footer";
import FooterSection from "./footer";
import { HeroHeader } from "./header";

export default function Home() {
  return (
    <>
      <HeroHeader />
      <main>
        <HeroSection />
        <Testimonials />
        <FeaturesOne />
        <PricingSection />
        <EnhancedFAQs />
        <CallToAction />
      </main>
      <MobileFooter variant="full" />
    </>
  );
}
