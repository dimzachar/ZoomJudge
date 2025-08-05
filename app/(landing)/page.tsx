import HeroSection from "./hero-section";
import FeaturesOne from "./features-one";
import Testimonials from "./testimonials";
import CallToAction from "./call-to-action";
import FAQs from "./faqs";
import Footer from "./footer";
import PricingSection from "./pricing-section";

export default function Home() {
  return (
    <div>
      <HeroSection />
      <FeaturesOne />
      <PricingSection />
      <Testimonials />
      <CallToAction />
      <FAQs />
      <Footer />
    </div>
  );
}
