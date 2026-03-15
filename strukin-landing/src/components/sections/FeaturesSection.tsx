import { Activity, Lock, ScanLine, TrendingUp } from 'lucide-react';

// ─── Sub-components ────────────────────────────────────────────────────────

function SmartBudgetingCard() {
  const barHeights = ['30%', '50%', '85%', '45%', '60%', '40%'];

  return (
    <div className="md:col-span-3 md:row-span-2 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 flex flex-col justify-between overflow-hidden">
      <div>
        <div className="bg-primary/20 w-12 h-12 rounded-2xl flex items-center justify-center mb-6">
          <Activity className="text-primary-hover w-6 h-6" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-slate-900">Smart Budgeting</h3>
        <p className="text-gray-500">
          Track every penny automatically with our AI-powered categorization engine. Set limits
          and get notified before you overspend.
        </p>
      </div>

      {/* Bar chart placeholder */}
      <div
        className="mt-8 bg-neutral-50 rounded-2xl h-64 border border-neutral-200 p-4"
        aria-label="Interactive spending chart visualization"
      >
        <div className="flex items-end justify-between h-full gap-2 px-2">
          {barHeights.map((h, i) => (
            <div
              key={i}
              style={{ height: h }}
              className={`w-full rounded-t-sm ${
                h === '85%'
                  ? 'bg-primary shadow-[0_0_15px_rgba(163,230,53,0.5)]'
                  : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SecurePaymentsCard() {
  return (
    <div className="md:col-span-3 bg-white border border-slate-200 shadow-sm rounded-3xl p-8 flex items-center justify-between gap-6">
      <div className="flex-1">
        <h3 className="text-xl font-bold mb-2 text-slate-900">Secure Payments</h3>
        <p className="text-gray-500 text-sm">
          End-to-end encrypted transactions for your peace of mind.
        </p>
      </div>
      <div
        className="w-32 h-32 bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-200 shrink-0"
        aria-label="Security lock icon graphic"
      >
        <Lock className="w-12 h-12 text-slate-400" />
      </div>
    </div>
  );
}

function QuickQRCard() {
  return (
    <div className="md:col-span-1.5 lg:col-span-1 border border-slate-200 shadow-sm rounded-3xl p-6 text-center flex flex-col items-center justify-center bg-white">
      <div
        className="w-full aspect-square max-h-32 bg-neutral-50 rounded-2xl mb-4 flex items-center justify-center border border-neutral-200"
        aria-label="QR Code scanner graphic"
      >
        <ScanLine className="w-10 h-10 text-slate-400" />
      </div>
      <h3 className="font-bold text-slate-900 text-sm xl:text-base">Quick QR</h3>
    </div>
  );
}

function InvestmentsCard() {
  return (
    <div className="md:col-span-1.5 lg:col-span-2 border border-slate-200 shadow-sm rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white overflow-hidden relative">
      <div className="flex-1 text-left z-10 w-full sm:w-auto">
        <h3 className="font-bold text-lg text-slate-900 mb-1">Investments</h3>
        <p className="text-xs text-gray-500">Grow wealth easily.</p>
      </div>
      <div
        className="w-full sm:w-24 aspect-2/1 sm:aspect-square bg-neutral-50 rounded-2xl flex items-center justify-center border border-neutral-200 z-10 shrink-0"
        aria-label="Stock market growth chart icon"
      >
        <TrendingUp className="w-10 h-10 text-slate-400" />
      </div>
      {/* Decorative blob */}
      <div className="absolute right-0 bottom-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-10 -mb-10" />
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

export default function FeaturesSection() {
  return (
    <section className="py-24 bg-background-light" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
            Your Everyday Finance, Simplified
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto">
            Everything you need to manage your money in one place. Fast, secure, and incredibly
            intuitive.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-6 md:grid-rows-2 gap-4">
          <SmartBudgetingCard />
          <SecurePaymentsCard />
          <QuickQRCard />
          <InvestmentsCard />
        </div>

      </div>
    </section>
  );
}
