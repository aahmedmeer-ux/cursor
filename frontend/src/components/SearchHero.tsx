"use client";

interface SearchHeroProps {
  keyword: string;
  loading: boolean;
  onKeywordChange: (value: string) => void;
  onSubmit: () => void;
}

export function SearchHero({
  keyword,
  loading,
  onKeywordChange,
  onSubmit,
}: SearchHeroProps) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-4xl px-6 pt-16 pb-10 sm:pt-24">
      <p className="font-display text-sm font-semibold tracking-[0.22em] text-tide uppercase animate-fade-up">
        LeadHunt
      </p>
      <h1
        className="mt-4 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl animate-fade-up"
        style={{ animationDelay: "80ms" }}
      >
        Find real job posts
        <span className="block text-tide">then the people behind them.</span>
      </h1>
      <p
        className="mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg animate-fade-up"
        style={{ animationDelay: "140ms" }}
      >
        Free route: searches public boards (RemoteOK, Remotive, Arbeitnow), shows
        job details first, then best-effort company/poster clues — no paid APIs.
      </p>

      <form
        className="mt-10 animate-fade-up"
        style={{ animationDelay: "220ms" }}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label htmlFor="intent-keyword" className="sr-only">
          Job search keyword
        </label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <input
            id="intent-keyword"
            type="text"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder='e.g. "python developer" or "customer support"'
            disabled={loading}
            className="w-full border border-line bg-white/80 px-5 py-4 text-base text-ink shadow-[0_1px_0_rgba(19,32,51,0.04)] outline-none backdrop-blur transition focus:border-tide focus:ring-2 focus:ring-tide/25 disabled:opacity-70"
          />
          <button
            type="submit"
            disabled={loading || !keyword.trim()}
            className="shrink-0 bg-tide px-8 py-4 font-display text-base font-semibold tracking-wide text-white transition hover:bg-tideDark disabled:cursor-not-allowed disabled:opacity-55"
          >
            {loading ? "Searching…" : "Find Jobs"}
          </button>
        </div>
      </form>
    </section>
  );
}
