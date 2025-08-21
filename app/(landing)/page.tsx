import HeroSection from "./hero-section";
import Testimonials from "./testimonials";
import FeaturesOne from "./features-one";
import PricingSection from "./pricing-section";
import CallToAction from "./call-to-action";
import FAQs from "./faqs";
import { MobileFooter } from "@/components/mobile-footer";
import FooterSection from "./footer";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <Testimonials />
      <FeaturesOne />
      <PricingSection />
      <FAQs />
      <CallToAction />
      {/* <FooterSection /> */}
      <MobileFooter variant="full" />
    </div>
  );
}
