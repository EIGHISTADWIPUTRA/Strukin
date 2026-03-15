import { Star } from 'lucide-react';

const stats = [
  {
    label: 'Assets Managed',
    value: '$2B+',
    growth: '+12% this year',
    borderClass: '',
  },
  {
    label: 'Active Users',
    value: '5,000+',
    growth: '+25% monthly',
    borderClass: 'border-y md:border-y-0 md:border-x border-slate-200',
  },
  {
    label: 'App Store Rating',
    value: '4.8',
    growth: 'Top Rated Finance App',
    borderClass: '',
    showStar: true,
  },
];

export default function StatsSection() {
  return (
    <section className="py-12 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label} className={`p-6 ${stat.borderClass}`}>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-2">
                {stat.label}
              </p>
              <div className="flex items-center justify-center gap-2">
                <h3 className="text-4xl font-black text-slate-900">{stat.value}</h3>
                {stat.showStar && <Star className="text-yellow-400 fill-current w-8 h-8" />}
              </div>
              <p className="text-primary font-bold text-sm mt-1">{stat.growth}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
