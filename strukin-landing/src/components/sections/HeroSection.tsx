import AppStoreBadges from '@/components/ui/AppStoreBadges';
import PhoneMockup from '@/components/ui/PhoneMockup';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-12 items-center">

          {/* Left: Copy */}
          <div className="max-w-2xl">
            <h1 className="text-5xl lg:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 mb-6">
              Kendalikan Uangmu, Raih{' '}
              <span className="text-primary">Kebebasan Finansial</span>
            </h1>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              Kelola keuangan Anda dengan cerdas dan capai tujuan finansial lebih cepat bersama
              STRUKIN. Lacak pengeluaran secara otomatis dan investasikan masa depan Anda hari ini.
            </p>
            <AppStoreBadges />
          </div>

          {/* Right: Phone Mockup */}
          <div className="mt-16 lg:mt-0 relative flex justify-center">
            <PhoneMockup variant="hero" />
          </div>

        </div>
      </div>
    </section>
  );
}
