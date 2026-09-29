import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';

import MarketsSection from './components/MarketsSection';
import HowItWorksSection from './components/HowItWorksSection';
import CopyTradingSection from './components/CopyTradingSection';
import ToolsSection from './components/ToolsSection';
import PlansSection from './components/PlansSection';
import TestimonialsSection from './components/TestimonialsSection';
import ComplianceSection from './components/ComplianceSection';

export default function HomePage() {
  return (
    <div className="bg-[#0B0E14] text-gray-300 selection:bg-blue-500/30">
      <Navbar />
      <HeroSection />
      <MarketsSection />
      <HowItWorksSection />
      <CopyTradingSection />
      <ToolsSection />
      <PlansSection />
      <TestimonialsSection />
      <ComplianceSection />
    </div>
  );
}