/** Variants:
 *  - "hero" : tall full phone frame used in the hero section
 *  - "cta"  : detailed dashboard mockup used in the CTA section
 */
type PhoneMockupProps = {
  variant: 'hero' | 'cta';
};

function HeroMockup() {
  return (
    <div
      className="w-full max-w-[400px] aspect-[9/18] bg-neutral-100 rounded-[3rem] border-8 border-slate-200 shadow-2xl relative overflow-hidden"
      aria-label="Smartphone app mockup interface showing dashboard"
    >
      <div className="absolute inset-0 flex flex-col p-6 gap-6">
        {/* Top bar placeholder */}
        <div className="h-8 w-1/2 bg-neutral-200 rounded-lg" />

        {/* Balance card placeholder */}
        <div className="h-32 w-full bg-primary/20 border border-primary/30 rounded-2xl relative">
          <div className="absolute bottom-4 left-4 right-4 h-12 bg-white/50 rounded-lg backdrop-blur-sm" />
        </div>

        {/* Transaction list placeholders */}
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 w-full bg-neutral-200 rounded-xl flex items-center px-4"
            >
              <div className="h-8 w-8 rounded-full bg-neutral-300 mr-3" />
              <div className="h-4 w-1/3 bg-neutral-300 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CTAMockup() {
  return (
    <div
      className="w-full aspect-[9/16] bg-neutral-100 rounded-[2.5rem] border-[6px] border-white p-2 shadow-2xl relative"
      aria-label="App dashboard on a smartphone float mockup"
    >
      <div className="w-full h-full bg-white rounded-[1.8rem] p-4 flex flex-col gap-4 border border-neutral-200 shadow-inner">
        {/* Header row */}
        <div className="flex justify-between items-center mt-2">
          <div className="h-4 w-1/3 bg-neutral-200 rounded" />
          <div className="h-6 w-6 rounded-full bg-neutral-200" />
        </div>

        {/* Balance card */}
        <div className="h-28 w-full bg-primary/20 border border-primary/30 rounded-2xl mt-2 flex flex-col justify-center px-4">
          <div className="h-3 w-1/2 bg-primary/40 rounded mb-2" />
          <div className="h-6 w-3/4 bg-primary/60 rounded" />
        </div>

        {/* Transaction list */}
        <div className="mt-4 space-y-3 flex-1">
          <div className="flex justify-between items-center mb-2">
            <div className="h-3 w-1/4 bg-neutral-200 rounded" />
            <div className="h-3 w-8 bg-neutral-200 rounded" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-12 w-full bg-slate-50 border border-slate-100 rounded-xl flex items-center px-3 gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-neutral-200 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2.5 w-1/2 bg-neutral-200 rounded" />
                <div className="h-2 w-1/3 bg-neutral-100 rounded" />
              </div>
              <div className="h-3 w-1/4 bg-neutral-200 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function PhoneMockup({ variant }: PhoneMockupProps) {
  return variant === 'hero' ? <HeroMockup /> : <CTAMockup />;
}
