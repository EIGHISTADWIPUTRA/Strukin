import { Apple, Play } from 'lucide-react';

interface AppStoreBadgesProps {
  /** Layout alignment: 'start' = left, 'center' = centered */
  align?: 'start' | 'center';
}

export default function AppStoreBadges({ align = 'start' }: AppStoreBadgesProps) {
  const alignClass = align === 'center' ? 'justify-center' : 'justify-start';

  return (
    <div className={`flex flex-wrap gap-4 ${alignClass}`}>
      <button className="flex items-center gap-3 bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors">
        <Apple className="w-8 h-8" />
        <div className="text-left">
          <p className="text-[10px] uppercase leading-none text-slate-300">Download on the</p>
          <p className="text-lg font-bold leading-none">App Store</p>
        </div>
      </button>

      <button className="flex items-center gap-3 bg-slate-800 text-white px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors">
        <Play className="w-8 h-8 fill-current" />
        <div className="text-left">
          <p className="text-[10px] uppercase leading-none text-slate-300">Get it on</p>
          <p className="text-lg font-bold leading-none">Google Play</p>
        </div>
      </button>
    </div>
  );
}
