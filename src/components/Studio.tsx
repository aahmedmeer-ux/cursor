"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Download,
  Globe2,
  Loader2,
  PenLine,
  Sparkles,
  Wand2,
  ImageIcon,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from "lucide-react";
import MatrixUploader from "@/components/MatrixUploader";
import { inferTopic } from "@/lib/matrix-utils";
import { TEMPLATES, paperToHtml, paperToLatex, paperToMarkdown } from "@/lib/templates";
import type {
  DiscoveredPaper,
  JournalTemplateId,
  MatrixRow,
  PipelineStage,
  SurveyPaper,
} from "@/lib/types";

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "parsing", label: "Parse matrix" },
  { id: "discovering", label: "Discover literature" },
  { id: "outlining", label: "Outline survey" },
  { id: "drafting", label: "Draft sections" },
  { id: "humanizing", label: "Humanize prose" },
  { id: "figuring", label: "Compose figures" },
  { id: "formatting", label: "Apply template" },
  { id: "done", label: "Ready" },
];

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Studio() {
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parsing, setParsing] = useState(false);
  const [topic, setTopic] = useState("");
  const [authorName, setAuthorName] = useState("Author Name");
  const [template, setTemplate] = useState<JournalTemplateId>("ieee");
  const [humanize, setHumanize] = useState(true);
  const [includeFigures, setIncludeFigures] = useState(true);
  const [discoverOnline, setDiscoverOnline] = useState(true);
  const [maxDiscover, setMaxDiscover] = useState(12);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [paper, setPaper] = useState<SurveyPaper | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredPaper[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"formatted" | "markdown" | "figures">("formatted");
  const [generating, setGenerating] = useState(false);

  const suggestedTopic = useMemo(() => (rows.length ? inferTopic(rows) : ""), [rows]);

  async function runPipeline() {
    if (!rows.length) {
      setError("Upload a synthesis matrix first.");
      return;
    }
    setError(null);
    setWarnings([]);
    setPaper(null);
    setGenerating(true);
    setStage("discovering");

    const timers = [
      setTimeout(() => setStage("outlining"), 700),
      setTimeout(() => setStage("drafting"), 1400),
      setTimeout(() => setStage(humanize ? "humanizing" : "figuring"), 2200),
      setTimeout(() => setStage(includeFigures ? "figuring" : "formatting"), 3000),
      setTimeout(() => setStage("formatting"), 3800),
    ];

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          topic: topic || suggestedTopic,
          template,
          humanize,
          includeFigures,
          discoverOnline,
          maxDiscover,
          authorName,
          openaiApiKey: openaiApiKey || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setPaper(data.paper);
      setDiscovered(data.papers || []);
      setQueries(data.queries || []);
      setWarnings(data.warnings || []);
      setStage("done");
      setPreviewMode("formatted");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      timers.forEach(clearTimeout);
      setGenerating(false);
    }
  }

  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      <header className="rise mb-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 text-sm text-[var(--sea)]">
            <Sparkles className="h-4 w-4" />
            Synthesis matrix → journal-ready survey draft
          </div>
          <h1 className="brand-display text-5xl leading-[0.95] text-[var(--ink)] sm:text-6xl md:text-7xl">
            SurveyForge
          </h1>
          <p className="serif mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            Upload your synthesis matrix. We discover related literature, draft a cited survey,
            humanize the prose, generate figures, and format to IEEE and other top-journal styles.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">OpenAlex discovery</span>
            <span className="chip">Humanize pass</span>
            <span className="chip">SVG figures</span>
            <span className="chip">IEEE · ACM · Springer · Elsevier</span>
          </div>
        </div>

        <div className="panel rise rise-delay-1 rounded-2xl p-5">
          <p className="text-sm font-semibold text-[var(--ink)]">Academic integrity note</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            SurveyForge improves clarity and reduces formulaic phrasing. It does not bypass
            plagiarism or AI detectors. You must verify citations, rewrite claims against sources,
            and follow your venue’s authorship policy.
          </p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <MatrixUploader
            parsing={parsing}
            fileName={fileName}
            rowCount={rows.length}
            onParsingChange={(v) => {
              setParsing(v);
              setStage(v ? "parsing" : "idle");
            }}
            onError={(message) => {
              if (message) {
                setError(message);
                setStage("error");
              } else {
                setError(null);
              }
            }}
            onParsed={(parsed, name, inferred) => {
              setRows(parsed);
              setFileName(name);
              setTopic(inferred || inferTopic(parsed));
              setPaper(null);
              setDiscovered([]);
              setQueries([]);
              setWarnings([]);
              setError(null);
              setStage("idle");
            }}
          />

          <section className="panel rise rise-delay-2 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-semibold">
              <PenLine className="h-4 w-4 text-[var(--sea)]" />
              Generation controls
            </div>

            <label className="block text-xs font-medium text-[var(--muted)]">
              Survey title / topic
              <input
                className="field mt-1"
                value={topic}
                placeholder={suggestedTopic || "A Survey of …"}
                onChange={(e) => setTopic(e.target.value)}
              />
            </label>

            <label className="block text-xs font-medium text-[var(--muted)]">
              Author name
              <input
                className="field mt-1"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
              />
            </label>

            <label className="block text-xs font-medium text-[var(--muted)]">
              Journal template
              <select
                className="field mt-1"
                value={template}
                onChange={(e) => setTemplate(e.target.value as JournalTemplateId)}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.venueHint}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-[var(--muted)]">
              Max related papers to discover
              <input
                type="number"
                min={3}
                max={40}
                className="field mt-1"
                value={maxDiscover}
                onChange={(e) => setMaxDiscover(Number(e.target.value))}
              />
            </label>

            <label className="block text-xs font-medium text-[var(--muted)]">
              Optional OpenAI API key (enhances drafting)
              <input
                type="password"
                className="field mt-1"
                value={openaiApiKey}
                placeholder="sk-… (optional)"
                onChange={(e) => setOpenaiApiKey(e.target.value)}
              />
            </label>

            <div className="space-y-2 pt-1 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={discoverOnline}
                  onChange={(e) => setDiscoverOnline(e.target.checked)}
                />
                <Globe2 className="h-4 w-4 text-[var(--sea)]" />
                Visit open indexes for related papers
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={humanize}
                  onChange={(e) => setHumanize(e.target.checked)}
                />
                <Wand2 className="h-4 w-4 text-[var(--sea)]" />
                Humanize prose (reduce formulaic phrasing)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeFigures}
                  onChange={(e) => setIncludeFigures(e.target.checked)}
                />
                <ImageIcon className="h-4 w-4 text-[var(--sea)]" />
                Generate relevant figures
              </label>
            </div>

            <button
              className="btn btn-primary mt-2 w-full"
              disabled={!rows.length || generating}
              onClick={() => void runPipeline()}
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Forging survey…
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Generate survey paper
                </>
              )}
            </button>
          </section>

          <section className="panel rounded-2xl p-5">
            <div className="mb-3 text-sm font-semibold">Pipeline</div>
            <ul className="space-y-2">
              {STAGES.map((s, i) => {
                const done = stage === "done" || (stageIndex > i && stage !== "error" && stage !== "idle");
                const active = stage === s.id;
                return (
                  <li key={s.id} className="flex items-center gap-3 text-sm">
                    <span className={`stage-dot ${done ? "done" : ""} ${active ? "active" : ""}`} />
                    <span className={active ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"}>
                      {s.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        </aside>

        <main className="space-y-4">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-semibold">Discovery notes</p>
              <ul className="mt-1 list-disc pl-5">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {rows.length > 0 && (
            <section className="panel rise rounded-2xl p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold">Matrix preview</h2>
                <span className="chip">{rows.length} rows</span>
              </div>
              <div className="scroll-thin max-h-56 overflow-auto rounded-xl border border-[var(--line)]">
                <table className="min-w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[var(--mist)] text-[var(--muted)]">
                    <tr>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Year</th>
                      <th className="px-3 py-2 font-medium">Method</th>
                      <th className="px-3 py-2 font-medium">Themes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-[var(--line)] align-top">
                        <td className="px-3 py-2 font-medium">{r.title}</td>
                        <td className="px-3 py-2">{r.year ?? "—"}</td>
                        <td className="px-3 py-2">{r.method || "—"}</td>
                        <td className="px-3 py-2">{r.themes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {!paper && stage === "idle" && (
            <section className="panel flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-10 text-center">
              <FileText className="mb-4 h-12 w-12 text-[var(--sea)]" />
              <h2 className="brand-display text-3xl">Your survey draft appears here</h2>
              <p className="serif mt-3 max-w-md text-[var(--muted)]">
                Start with the sample matrix to see discovery, humanization, figures, and IEEE
                formatting in one pass.
              </p>
            </section>
          )}

          {generating && !paper && (
            <section className="panel flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-10 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--sea)]" />
              <h2 className="brand-display text-3xl capitalize">{stage.replace(/ing$/, "ing…")}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Building a cited narrative from your matrix{discoverOnline ? " and live literature indexes" : ""}.
              </p>
            </section>
          )}

          {paper && (
            <>
              <section className="panel rounded-2xl p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-[var(--ok)]">
                      <CheckCircle2 className="h-4 w-4" />
                      Draft ready · {TEMPLATES.find((t) => t.id === paper.template)?.name}
                    </div>
                    <h2 className="brand-display mt-1 text-2xl">{paper.title}</h2>
                    <p className="text-xs text-[var(--muted)]">
                      Matrix {paper.metadata.matrixPaperCount} · Discovered{" "}
                      {paper.metadata.discoveredPaperCount} · Humanized{" "}
                      {paper.metadata.humanized ? "yes" : "no"} · Figures {paper.figures.length}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        downloadBlob(
                          `${slugify(paper.title)}.md`,
                          paperToMarkdown(paper),
                          "text/markdown;charset=utf-8"
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> Markdown
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        downloadBlob(
                          `${slugify(paper.title)}.tex`,
                          paperToLatex(paper),
                          "application/x-tex;charset=utf-8"
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> LaTeX
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() =>
                        downloadBlob(
                          `${slugify(paper.title)}.html`,
                          paperToHtml(paper),
                          "text/html;charset=utf-8"
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> Journal HTML
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["formatted", "Formatted preview"],
                      ["markdown", "Markdown"],
                      ["figures", "Figures"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      className={`btn ${previewMode === id ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setPreviewMode(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              {discovered.length > 0 && (
                <section className="panel rounded-2xl p-5">
                  <h3 className="mb-2 font-semibold">Literature corpus ({discovered.length})</h3>
                  {queries.length > 0 && (
                    <p className="mb-3 text-xs text-[var(--muted)]">
                      Queries: {queries.slice(0, 6).join(" · ")}
                    </p>
                  )}
                  <div className="scroll-thin grid max-h-48 gap-2 overflow-auto md:grid-cols-2">
                    {discovered.slice(0, 16).map((p) => (
                      <div key={p.id} className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs">
                        <div className="font-semibold">{p.title}</div>
                        <div className="mt-1 text-[var(--muted)]">
                          {(p.authors[0] || "Unknown") + (p.authors.length > 1 ? " et al." : "")} ·{" "}
                          {p.year ?? "n.d."} · {p.source}
                          {p.citedBy ? ` · cited ${p.citedBy}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="paper-shell rise overflow-hidden rounded-2xl">
                {previewMode === "formatted" && (
                  <iframe
                    title="Journal preview"
                    className="h-[80vh] w-full bg-white"
                    srcDoc={paperToHtml(paper)}
                  />
                )}
                {previewMode === "markdown" && (
                  <pre className="scroll-thin max-h-[80vh] overflow-auto whitespace-pre-wrap p-6 font-mono text-xs leading-relaxed text-[var(--ink)]">
                    {paperToMarkdown(paper)}
                  </pre>
                )}
                {previewMode === "figures" && (
                  <div className="scroll-thin grid max-h-[80vh] gap-6 overflow-auto p-6">
                    {paper.figures.map((fig) => (
                      <figure key={fig.id} className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4">
                        <h4 className="mb-2 font-semibold">{fig.title}</h4>
                        <div dangerouslySetInnerHTML={{ __html: fig.svg }} />
                        <figcaption className="mt-2 text-sm text-[var(--muted)]">{fig.caption}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "survey-draft";
}
