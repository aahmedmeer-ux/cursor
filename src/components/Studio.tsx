"use client";

import { useEffect, useMemo, useState } from "react";
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
import MatrixUploader, { type SheetEmbedInfo } from "@/components/MatrixUploader";
import { inferTopic } from "@/lib/matrix-utils";
import { TEMPLATES, paperToHtml, paperToLatex, paperToMarkdown } from "@/lib/templates";
import { paperToDocxBlob } from "@/lib/export-docx";
import { paperToPdfBlob } from "@/lib/export-pdf";
import { downloadBlob as downloadAny } from "@/lib/export-media";
import {
  HIGH_IMPACT_SURVEY_PRINCIPLES,
  REQUIRED_SURVEY_ARTIFACTS,
  SURVEY_SECTION_BLUEPRINT,
} from "@/lib/survey-rubric";
import type {
  DiscoveredPaper,
  JournalTemplateId,
  MatrixRow,
  PipelineStage,
  SurveyPaper,
  TaxonomyStyle,
} from "@/lib/types";

const TAXONOMY_STYLES: { id: TaxonomyStyle; label: string; hint: string }[] = [
  { id: "scientific", label: "Scientific", hint: "Multi-axis: phenomena, mechanisms, methods, evidence" },
  { id: "semi-scientific", label: "Semi-scientific", hint: "Problem / methods / evaluation taxonomy" },
  { id: "simple", label: "Simple", hint: "Flat theme cards for quick reading" },
  { id: "professional", label: "Professional", hint: "Capability framework for applied audiences" },
];

const STAGES: { id: PipelineStage; label: string }[] = [
  { id: "parsing", label: "Parse matrix" },
  { id: "discovering", label: "Discover literature" },
  { id: "outlining", label: "Outline survey" },
  { id: "drafting", label: "Draft sections" },
  { id: "humanizing", label: "Humanize prose" },
  { id: "figuring", label: "Compose figures" },
  { id: "reviewing", label: "Expert review loop" },
  { id: "formatting", label: "Apply template" },
  { id: "done", label: "Ready" },
];

function downloadText(filename: string, content: string, type: string) {
  downloadAny(filename, content, type);
}

export default function Studio() {
  const [rows, setRows] = useState<MatrixRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [sheetEmbed, setSheetEmbed] = useState<SheetEmbedInfo | null>(null);
  const [parsing, setParsing] = useState(false);
  const [topic, setTopic] = useState("");
  const [authorName, setAuthorName] = useState("Author Name");
  const [template, setTemplate] = useState<JournalTemplateId>("ieee");
  const [taxonomyStyle, setTaxonomyStyle] = useState<TaxonomyStyle>("semi-scientific");
  const [humanize, setHumanize] = useState(true);
  const [includeFigures, setIncludeFigures] = useState(true);
  const [discoverOnline, setDiscoverOnline] = useState(true);
  const [maxDiscover, setMaxDiscover] = useState(12);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [review, setReview] = useState<{
    passes: number;
    perfect: boolean;
    issues: { id: string; severity: string; message: string; fixed?: boolean }[];
  } | null>(null);
  const [paper, setPaper] = useState<SurveyPaper | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredPaper[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"formatted" | "markdown" | "figures" | "rubric">(
    "formatted"
  );
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | null>(null);
  const [isInsecureHttp, setIsInsecureHttp] = useState(false);

  useEffect(() => {
    const host = window.location.hostname;
    const insecure =
      window.location.protocol === "http:" && host !== "localhost" && host !== "127.0.0.1";
    setIsInsecureHttp(insecure);
  }, []);

  const suggestedTopic = useMemo(() => (rows.length ? inferTopic(rows) : ""), [rows]);

  async function runPipeline() {
    if (!rows.length) {
      setError("Upload a synthesis matrix first.");
      return;
    }
    setError(null);
    setWarnings([]);
    setReview(null);
    setPaper(null);
    setGenerating(true);
    setStage("discovering");

    const timers = [
      setTimeout(() => setStage("outlining"), 700),
      setTimeout(() => setStage("drafting"), 1400),
      setTimeout(() => setStage(humanize ? "humanizing" : "figuring"), 2200),
      setTimeout(() => setStage(includeFigures ? "figuring" : "reviewing"), 3000),
      setTimeout(() => setStage("reviewing"), 4200),
      setTimeout(() => setStage("formatting"), 5600),
    ];

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows,
          topic: topic || suggestedTopic,
          template,
          taxonomyStyle,
          humanize,
          includeFigures,
          discoverOnline,
          maxDiscover,
          authorName,
          openaiApiKey: openaiApiKey || undefined,
          enrichCitations: true,
          expertReview: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setPaper(data.paper);
      setDiscovered(data.papers || []);
      setQueries(data.queries || []);
      setWarnings(data.warnings || []);
      setReview(data.review || null);
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

  async function exportPdf() {
    if (!paper) return;
    setExporting("pdf");
    setError(null);
    try {
      const blob = await paperToPdfBlob(paper);
      downloadAny(`${slugify(paper.title)}.pdf`, blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportDocx() {
    if (!paper) return;
    setExporting("docx");
    setError(null);
    try {
      const blob = await paperToDocxBlob(paper);
      downloadAny(`${slugify(paper.title)}.docx`, blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Word export failed");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
      {isInsecureHttp && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          This page is open over plain <strong>HTTP</strong> (“Not secure”). Some browsers block
          imports and clicks in that mode. Open the app via <strong>localhost</strong> or an{" "}
          <strong>HTTPS</strong> link instead.
        </div>
      )}
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
            Upload your synthesis matrix. We draft a high-impact survey structure—taxonomy, problem
            diagram, comparison tables, challenges map, and trends–gaps Venn—then discover literature,
            humanize prose, and format to IEEE/ACM and other journal styles.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">Taxonomy + problem diagram</span>
            <span className="chip">Comparison &amp; challenges tables</span>
            <span className="chip">Trends–gaps Venn</span>
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
            sheetEmbed={sheetEmbed}
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
            onParsed={(parsed, name, inferred, sheet) => {
              setRows(parsed);
              setFileName(name);
              setSheetEmbed(sheet ?? null);
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

            <div
              id="taxonomy-type"
              className="rounded-xl border-2 border-[var(--sea)] bg-[var(--foam)] p-3 shadow-sm"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="text-xs font-bold uppercase tracking-wide text-[var(--ink)]">
                  Taxonomy type
                </div>
                <span className="rounded bg-[var(--sea)] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Required
                </span>
              </div>
              <p className="mb-2 text-[11px] leading-snug text-[var(--muted)]">
                Choose Scientific, Semi-scientific, Simple, or Professional — this changes the
                taxonomy figure and organizing schema.
              </p>
              <label className="mb-2 block text-[11px] font-medium text-[var(--muted)]">
                Quick select
                <select
                  className="field mt-1"
                  value={taxonomyStyle}
                  onChange={(e) => setTaxonomyStyle(e.target.value as TaxonomyStyle)}
                  aria-label="Taxonomy type"
                >
                  {TAXONOMY_STYLES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label} — {t.hint}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TAXONOMY_STYLES.map((t) => {
                  const active = taxonomyStyle === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTaxonomyStyle(t.id)}
                      aria-pressed={active}
                      className={`rounded-lg border px-2 py-2 text-left text-xs transition ${
                        active
                          ? "border-[var(--sea)] bg-[var(--sea)] text-white shadow-sm"
                          : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--sea)]"
                      }`}
                    >
                      <div className="font-semibold">{t.label}</div>
                      <div className={`mt-0.5 leading-snug ${active ? "text-white/85" : "text-[var(--muted)]"}`}>
                        {t.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] font-medium text-[var(--sea)]">
                Selected: {TAXONOMY_STYLES.find((t) => t.id === taxonomyStyle)?.label}
              </p>
            </div>

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
                Generate taxonomy, diagrams &amp; tables
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

          {review && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                review.perfect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-sky-200 bg-sky-50 text-sky-950"
              }`}
            >
              <p className="font-semibold">
                Expert review · {review.passes} pass{review.passes === 1 ? "" : "es"} ·{" "}
                {review.perfect ? "passed" : "needs human attention"}
              </p>
              {review.issues.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {review.issues.slice(0, 8).map((issue) => (
                    <li key={issue.id}>
                      [{issue.severity}] {issue.message}
                      {issue.fixed ? " (auto-fixed)" : ""}
                    </li>
                  ))}
                </ul>
              )}
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
                Start with the sample matrix to see taxonomy, comparison tables, Venn gaps map,
                discovery, and IEEE formatting in one pass.
              </p>
            </section>
          )}

          {generating && !paper && (
            <section className="panel flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-10 text-center">
              <Loader2 className="mb-4 h-10 w-10 animate-spin text-[var(--sea)]" />
              <h2 className="brand-display text-3xl capitalize">{stage.replace(/ing$/, "ing…")}</h2>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Building a taxonomy-driven survey with comparison tables and challenge maps
                {discoverOnline ? ", plus live literature discovery" : ""}.
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
                      {paper.metadata.humanized ? "yes" : "no"} · Figures{" "}
                      {paper.figures?.length ?? 0} · Tables {paper.tables?.length ?? 0}
                      {paper.taxonomyStyle ? ` · Taxonomy ${paper.taxonomyStyle}` : ""}
                      {paper.metadata.rubric ? ` · Rubric ${paper.metadata.rubric}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="btn btn-primary"
                      disabled={!!exporting}
                      onClick={() => void exportPdf()}
                    >
                      {exporting === "pdf" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      PDF
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={!!exporting}
                      onClick={() => void exportDocx()}
                    >
                      {exporting === "docx" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      Word
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        downloadText(
                          `${slugify(paper.title)}.html`,
                          paperToHtml(paper),
                          "text/html;charset=utf-8"
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> HTML
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() =>
                        downloadText(
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
                        downloadText(
                          `${slugify(paper.title)}.tex`,
                          paperToLatex(paper),
                          "application/x-tex;charset=utf-8"
                        )
                      }
                    >
                      <Download className="h-4 w-4" /> LaTeX
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {(
                    [
                      ["formatted", "Formatted preview"],
                      ["markdown", "Markdown"],
                      ["figures", "Figures & tables"],
                      ["rubric", "Survey rubric"],
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
                  <div className="scroll-thin grid max-h-[80vh] gap-8 overflow-auto p-6">
                    {(paper.figures ?? []).map((fig) => (
                      <figure
                        key={fig.id}
                        className="rounded-xl border border-[var(--line)] bg-[var(--foam)] p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">{fig.title}</h4>
                          <span className="chip">{fig.kind}</span>
                        </div>
                        <div
                          dangerouslySetInnerHTML={{ __html: fig.html || fig.svg }}
                          className="overflow-x-auto"
                        />
                        <figcaption className="mt-2 text-sm text-[var(--muted)]">
                          {fig.caption}
                        </figcaption>
                      </figure>
                    ))}
                    {(paper.tables ?? []).map((table) => (
                      <div
                        key={table.id}
                        className="rounded-xl border border-[var(--line)] bg-white p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">{table.title}</h4>
                          <span className="chip">{table.kind}</span>
                        </div>
                        <p className="mb-3 text-sm text-[var(--muted)]">{table.caption}</p>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr>
                                {table.headers.map((h) => (
                                  <th
                                    key={h}
                                    className="border border-[var(--line)] bg-[var(--foam)] px-2 py-1.5 font-semibold"
                                  >
                                    {h}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows.map((row, i) => (
                                <tr key={i}>
                                  {row.map((cell, j) => (
                                    <td
                                      key={j}
                                      className="border border-[var(--line)] px-2 py-1.5 align-top"
                                    >
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                    {!paper.figures?.length && !paper.tables?.length && (
                      <p className="text-sm text-[var(--muted)]">
                        No figures or tables in this draft. Enable “Generate taxonomy, diagrams &amp;
                        tables” and regenerate.
                      </p>
                    )}
                  </div>
                )}
                {previewMode === "rubric" && (
                  <div className="scroll-thin max-h-[80vh] space-y-6 overflow-auto p-6">
                    <div>
                      <h3 className="brand-display text-2xl">High-impact survey rubric</h3>
                      <p className="mt-2 text-sm text-[var(--muted)]">
                        Embedded guidance distilled from ACM CSUR-style expectations, survey
                        methodology papers, and CS survey practice: synthesize with a taxonomy, not a
                        laundry list.
                      </p>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Principles</h4>
                      <ul className="space-y-2 text-sm">
                        {HIGH_IMPACT_SURVEY_PRINCIPLES.map((p) => (
                          <li key={p} className="flex gap-2">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sea)]" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Required artifacts</h4>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {REQUIRED_SURVEY_ARTIFACTS.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-lg border border-[var(--line)] bg-[var(--foam)] px-3 py-2 text-sm"
                          >
                            <div className="font-semibold">{a.label}</div>
                            <div className="mt-1 text-[var(--muted)]">{a.why}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-2 font-semibold">Section blueprint</h4>
                      <ol className="space-y-2 text-sm">
                        {SURVEY_SECTION_BLUEPRINT.map((s, i) => (
                          <li key={s.id} className="rounded-lg border border-[var(--line)] px-3 py-2">
                            <span className="font-semibold">
                              {i + 1}. {s.heading}
                            </span>
                            <span className="mt-1 block text-[var(--muted)]">{s.purpose}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                    {paper.contributions?.length > 0 && (
                      <div>
                        <h4 className="mb-2 font-semibold">This draft’s contributions</h4>
                        <ol className="list-decimal space-y-1 pl-5 text-sm">
                          {paper.contributions.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ol>
                      </div>
                    )}
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
