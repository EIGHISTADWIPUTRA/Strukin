'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';

// ─── Data ──────────────────────────────────────────────────────────────────

const plans = [
  {
    name: 'Free',
    tagline: 'For basic usage',
    monthlyPrice: 0,
    annualPrice: 0,
    cta: 'Start Free',
    popular: false,
    features: [
      'Wallet access',
      'Send & receive money',
      'Transaction history',
      'Card Management',
      'Basic security',
    ],
  },
  {
    name: 'Starter',
    tagline: 'For individuals',
    monthlyPrice: 9,
    annualPrice: 7,
    cta: 'Get Started',
    popular: false,
    features: [
      'Wallet access',
      'Send & receive money',
      'Transaction history',
      'Card Management',
      'Basic security',
    ],
  },
  {
    name: 'Pro',
    tagline: 'For professionals',
    monthlyPrice: 29,
    annualPrice: 23,
    cta: 'Get Started',
    popular: true,
    features: [
      'Wallet access',
      'Send & receive money',
      'Transaction history',
      'Card Management',
      'Basic security',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For teams',
    monthlyPrice: 99,
    annualPrice: 79,
    cta: 'Get Started',
    popular: false,
    features: [
      'Wallet access',
      'Send & receive money',
      'Transaction history',
      'Card Management',
      'Basic security',
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────

type BillingToggleProps = {
  isAnnual: boolean;
  onToggle: () => void;
};

function BillingToggle({ isAnnual, onToggle }: BillingToggleProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <span
        className={`text-sm font-semibold transition-colors ${
          !isAnnual ? 'text-slate-900' : 'text-gray-400'
        }`}
      >
        Monthly
      </span>

      {/* Toggle switch */}
      <button
        onClick={onToggle}
        role="switch"
        aria-checked={isAnnual}
        className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
          isAnnual ? 'bg-primary' : 'bg-slate-300'
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
            isAnnual ? 'translate-x-6' : 'translate-x-0'
          }`}
        />
      </button>

      <span
        className={`text-sm font-semibold transition-colors ${
          isAnnual ? 'text-slate-900' : 'text-gray-400'
        }`}
      >
        Annually
      </span>

      <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-0.5 rounded-full">
        -20%
      </span>
    </div>
  );
}

type PlanCardProps = {
  plan: (typeof plans)[0];
  isAnnual: boolean;
};

function PlanCard({ plan, isAnnual }: PlanCardProps) {
  const price = isAnnual ? plan.annualPrice : plan.monthlyPrice;

  if (plan.popular) {
    return (
      // Highlighted "Pro" card — lime green gradient, dark text
      <div className="relative rounded-3xl p-px bg-gradient-to-b from-primary to-primary/60 shadow-lg shadow-primary/30">
        {/* Popular badge */}
        <span className="absolute -top-3 right-6 bg-white text-slate-900 text-xs font-bold px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          Popular
        </span>

        <div className="h-full rounded-[calc(1.5rem-1px)] bg-gradient-to-b from-primary/30 to-primary/10 p-8 flex flex-col">
          {/* Plan info */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
            <p className="text-sm text-slate-600 mt-0.5">{plan.tagline}</p>
          </div>

          {/* Price */}
          <div className="flex items-end gap-1 mb-6">
            <span className="text-5xl font-black text-slate-900">${price}</span>
            <span className="text-slate-600 text-sm mb-2">/month</span>
          </div>

          {/* CTA button */}
          <button className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-700 transition-colors mb-8">
            {plan.cta}
          </button>

          {/* Features */}
          <ul className="space-y-3 flex-1">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-slate-700">
                <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={3} />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    // Standard card — white with subtle border
    <div className="h-full bg-white border border-slate-200 rounded-3xl p-8 shadow-sm flex flex-col hover:shadow-md hover:border-slate-300 transition-all">
      {/* Plan info */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
        <p className="text-sm text-gray-500 mt-0.5">{plan.tagline}</p>
      </div>

      {/* Price */}
      <div className="flex items-end gap-1 mb-6">
        <span className="text-5xl font-black text-slate-900">${price}</span>
        <span className="text-gray-400 text-sm mb-2">/month</span>
      </div>

      {/* CTA button */}
      <button className="w-full border-2 border-slate-200 text-slate-900 py-3 rounded-xl font-bold text-sm hover:border-primary hover:text-primary transition-colors mb-8">
        {plan.cta}
      </button>

      {/* Features */}
      <ul className="space-y-3 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm text-gray-600">
            <Check className="w-4 h-4 text-primary shrink-0" strokeWidth={3} />
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────

export default function PricingSection() {
  const [isAnnual, setIsAnnual] = useState(false);

  return (
    <section className="py-24 bg-background-light" id="pricing">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Heading */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Choose a plan that fits your financial needs.{' '}
            <span className="text-primary font-semibold">Upgrade or cancel anytime.</span>
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex justify-center mb-12">
          <BillingToggle isAnnual={isAnnual} onToggle={() => setIsAnnual((v) => !v)} />
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} isAnnual={isAnnual} />
          ))}
        </div>

      </div>
    </section>
  );
}
