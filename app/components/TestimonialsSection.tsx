import { Star } from 'lucide-react';

interface TestimonialProps {
  text: string;
  author: string;
  role: string;
}

function Testimonial({ text, author, role }: TestimonialProps) {
  return (
    <div className="p-8 rounded-2xl bg-[#0B0E14] border border-white/5 text-left">
      <div className="flex gap-1 text-yellow-500 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={16} fill="currentColor" />
        ))}
      </div>
      <p className="text-gray-300 mb-6 leading-relaxed text-sm">"{text}"</p>
      <div>
        <div className="text-white font-bold">{author}</div>
        <div className="text-xs text-gray-500">{role}</div>
      </div>
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section className="py-24 bg-[#151924]/30 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-12">Trusted by global capital.</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <Testimonial text="The ability to fund via USDT and immediately allocate to regulated ETFs and quant traders is game-changing." author="Michael T." role="Family Office Director" />
          <Testimonial text="Zero latency copy trading. I booked a call with my master trader, verified their thesis, and allocated $50k the next day." author="Sarah J." role="Pro Investor" />
          <Testimonial text="The UI is flawless. It feels like a high-end terminal but runs entirely in my browser. Next level." author="David R." role="Day Trader" />
        </div>
      </div>
    </section>
  );
}