import { Download } from 'lucide-react';
import PhoneMockup from '@/components/ui/PhoneMockup';

export default function CTASection() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative bg-card rounded-[3rem] p-8 md:p-16 overflow-hidden flex flex-col md:flex-row items-center gap-12 border border-slate-200">

          {/* Decorative background blobs */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 blur-[100px] rounded-full mix-blend-multiply opacity-70 -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-100 blur-[80px] rounded-full mix-blend-multiply opacity-50 translate-y-1/3 -translate-x-1/4 pointer-events-none" />

          {/* Copy */}
          <div className="relative z-10 flex-1 text-center md:text-left">
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 mb-6">
              Take Control of Your Money Today
            </h2>
            <p className="text-gray-600 text-lg mb-10 max-w-lg">
              Join thousands of users who have already started their journey towards financial
              freedom with STRUKIN.
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <button className="bg-primary hover:bg-primary-hover text-slate-900 px-8 py-4 rounded-2xl font-bold hover:scale-105 transition-transform flex items-center gap-2 shadow-sm border border-primary/20">
                <Download className="w-5 h-5" />
                Start for Free
              </button>
            </div>
          </div>

          {/* Phone Mockup */}
          <div className="relative z-10 flex-1 w-full max-w-sm hidden md:block">
            <PhoneMockup variant="cta" />
          </div>

        </div>
      </div>
    </section>
  );
}
