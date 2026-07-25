const STAGES = [
  "Scraping hiring companies via Apify…",
  "Enriching decision-makers with Proxycurl…",
  "Verifying emails through Hunter…",
];

export function LoadingState() {
  return (
    <section
      className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16 animate-fade-up"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="border border-line bg-white/70 p-6 backdrop-blur sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              Enrichment in progress
            </p>
            <p className="mt-1 text-sm text-muted">
              Scraping and verifying leads — this usually takes a few seconds.
            </p>
          </div>
          <div className="hidden h-10 w-10 items-center justify-center border border-tide/30 sm:flex">
            <span className="h-3 w-3 rounded-full bg-tide animate-pulse-soft" />
          </div>
        </div>

        <div className="relative mt-6 h-1 overflow-hidden bg-mist">
          <div className="absolute inset-y-0 w-1/3 bg-tide animate-progress" />
        </div>

        <ul className="mt-6 space-y-2">
          {STAGES.map((stage, index) => (
            <li
              key={stage}
              className="flex items-center gap-3 text-sm text-muted"
              style={{ animationDelay: `${index * 120}ms` }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sand animate-pulse-soft" />
              {stage}
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="grid grid-cols-12 gap-3"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="skeleton col-span-3 h-10" />
              <div className="skeleton col-span-2 h-10" />
              <div className="skeleton col-span-2 h-10" />
              <div className="skeleton col-span-3 h-10" />
              <div className="skeleton col-span-2 h-10" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
