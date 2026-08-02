import Studio from "@/components/Studio";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col">
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <div className="brand-display text-lg tracking-tight">SurveyForge</div>
        <a
          className="text-sm font-medium text-[var(--sea)] transition hover:text-[var(--ink)]"
          href="/samples/synthesis-matrix-sample.csv"
        >
          Sample matrix
        </a>
      </nav>
      <Studio />
      <footer className="mt-auto border-t border-[var(--line)]/70 px-4 py-6 text-center text-xs text-[var(--muted)]">
        SurveyForge drafts are research assistants — verify sources, originality, and venue rules before submission.
      </footer>
    </div>
  );
}
