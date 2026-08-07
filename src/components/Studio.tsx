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
  Presentation,
  ScrollText,
  ArrowRight,
} from "lucide-react";
import MatrixUploader, { type SheetEmbedInfo } from "@/components/MatrixUploader";
import GuideUploader from "@/components/GuideUploader";
import { downloadBlob, downloadFromApi, slugify } from "@/lib/download";
import { inferTopic } from "@/lib/matrix-utils";
import { TEMPLATES, paperToHtml, paperToMarkdown } from "@/lib/templates";
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
  ResearchPresentation,
  ResearchProposal,
  SurveyPaper,
  TaxonomyStyle,
  UploadedGuide,
  WorkflowStep,
} from "@/lib/types";

const WORKFLOW_STEPS: { id: WorkflowStep; label: string; hint: string }[] = [
  { id: "survey", label: "1 · Survey paper", hint: "Write the survey from your matrix" },
  { id: "proposal", label: "2 · Research proposal", hint: "Upload template + guidelines" },
  { id: "presentation", label: "3 · Presentation", hint: "Upload slide template" },
];

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
  { id: "formatting", label: "Apply template" },
  { id: "reviewing", label: "Expert professor review" },
  { id: "documentQc", label: "PDF & Word QC loop" },
  { id: "done", label: "Ready" },
];

function downloadText(filename: string, content: string, type: string) {
  downloadBlob(filename, content, type);
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
  const [targetPages, setTargetPages] = useState(10);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [review, setReview] = useState<{
    passes: number;
    perfect: boolean;
    issues: { id: string; severity: string; message: string; fixed?: boolean }[];
  } | null>(null);
  const [documentQc, setDocumentQc] = useState<{
    passes: number;
    perfect: boolean;
    pdfBytes: number;
    docxBytes: number;
    issues: { id: string; severity: string; message: string; fixed?: boolean; source?: string }[];
  } | null>(null);
  const [paper, setPaper] = useState<SurveyPaper | null>(null);
  const [discovered, setDiscovered] = useState<DiscoveredPaper[]>([]);
  const [queries, setQueries] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState<"formatted" | "markdown" | "figures" | "rubric">(
    "formatted"
  );
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "docx" | "proposal" | "pptx" | "latex" | null>(
    null
  );
  const [isInsecureHttp, setIsInsecureHttp] = useState(false);

  /** Sequential product wizard — survey first, then proposal, then presentation */
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("survey");
  const [proposal, setProposal] = useState<ResearchProposal | null>(null);
  const [presentation, setPresentation] = useState<ResearchPresentation | null>(null);
  const [proposalTemplate, setProposalTemplate] = useState<UploadedGuide | null>(null);
  const [proposalGuidelines, setProposalGuidelines] = useState<UploadedGuide | null>(null);
  const [presentationTemplate, setPresentationTemplate] = useState<UploadedGuide | null>(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);

  function clearDownstreamArtifacts() {
    setProposal(null);
    setPresentation(null);
    setProposalTemplate(null);
    setProposalGuidelines(null);
    setPresentationTemplate(null);
    setWorkflowStep("survey");
  }

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
    setDocumentQc(null);
    // Always rewrite the survey from scratch, and invalidate proposal/presentation
    setPaper(null);
    clearDownstreamArtifacts();
    setGenerating(true);
    setStage("discovering");
    setWorkflowStep("survey");

    const timers = [
      setTimeout(() => setStage("outlining"), 700),
      setTimeout(() => setStage("drafting"), 1400),
      setTimeout(() => setStage(humanize ? "humanizing" : "figuring"), 2200),
      setTimeout(() => setStage(includeFigures ? "figuring" : "formatting"), 3000),
      setTimeout(() => setStage("formatting"), 4200),
      setTimeout(() => setStage("reviewing"), 5600),
      setTimeout(() => setStage("documentQc"), 7000),
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
          targetPages,
          authorName,
          openaiApiKey: openaiApiKey || undefined,
          enrichCitations: true,
          expertReview: true,
          documentQc: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setPaper(data.paper);
      setDiscovered(data.papers || []);
      setQueries(data.queries || []);
      setWarnings(data.warnings || []);
      setReview(data.review || null);
      setDocumentQc(data.documentQc || null);
      setStage("done");
      setPreviewMode("formatted");
      setWorkflowStep("survey");
    } catch (err) {
      setStage("error");
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      timers.forEach(clearTimeout);
      setGenerating(false);
    }
  }

  function slimGuide(guide: UploadedGuide | null) {
    if (!guide) return null;
    // Keep text/structure + server templateId. Never ship multi-MB base64 in generate calls.
    return {
      fileName: guide.fileName,
      kind: guide.kind,
      mimeType: guide.mimeType,
      text: guide.text?.slice(0, 80_000) || "",
      structureNotes: guide.structureNotes?.slice(0, 30),
      byteLength: guide.byteLength,
      templateId: guide.templateId,
      slideCount: guide.slideCount,
      warnings: guide.warnings,
    };
  }

  function slimPaperForProposal(src: SurveyPaper) {
    return {
      ...src,
      figures: (src.figures || []).map((f) => ({
        ...f,
        svg: "",
        html: undefined,
        mermaid: undefined,
      })),
      equations: (src.equations || []).map((e) => ({
        ...e,
        svg: undefined,
      })),
    };
  }

  async function runProposal() {
    if (!paper) {
      setError("Generate the survey paper first.");
      return;
    }
    if (!proposalTemplate && !proposalGuidelines) {
      setError("Upload a proposal template and/or proposal guidelines.");
      return;
    }
    setError(null);
    setGeneratingProposal(true);
    setProposal(null);
    setPresentation(null);
    setPresentationTemplate(null);
    try {
      const res = await fetch("/api/generate-proposal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper: slimPaperForProposal(paper),
          rows,
          templateGuide: slimGuide(proposalTemplate),
          guidelinesGuide: slimGuide(proposalGuidelines),
          authorName,
          topic: topic || suggestedTopic,
        }),
      });
      let data: { error?: string; proposal?: ResearchProposal } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Proposal generation failed (HTTP ${res.status}). Try re-uploading smaller guideline files.`);
      }
      if (!res.ok) throw new Error(data.error || "Proposal generation failed");
      if (!data.proposal?.title) throw new Error("Proposal generation returned an empty document.");
      setProposal(data.proposal);
      setWorkflowStep("proposal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal generation failed");
    } finally {
      setGeneratingProposal(false);
    }
  }

  async function runPresentation() {
    if (!paper) {
      setError("Generate the survey paper first.");
      return;
    }
    if (!presentationTemplate) {
      setError("Upload a presentation template first.");
      return;
    }
    setError(null);
    setGeneratingPresentation(true);
    setPresentation(null);
    try {
      const res = await fetch("/api/generate-presentation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper: slimPaperForProposal(paper),
          proposal,
          templateGuide: slimGuide(presentationTemplate),
          authorName,
          topic: topic || suggestedTopic,
        }),
      });
      let data: { error?: string; presentation?: ResearchPresentation } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Presentation generation failed (HTTP ${res.status}).`);
      }
      if (!res.ok) throw new Error(data.error || "Presentation generation failed");
      if (!data.presentation?.slides?.length) {
        throw new Error("Presentation generation returned an empty deck.");
      }
      setPresentation(data.presentation);
      setWorkflowStep("presentation");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Presentation generation failed");
    } finally {
      setGeneratingPresentation(false);
    }
  }

  const stageIndex = STAGES.findIndex((s) => s.id === stage);

  async function exportPdf() {
    if (!paper) return;
    setExporting("pdf");
    setError(null);
    try {
      // Server-side export keeps jspdf/docx/sharp out of the browser bundle
      // (those libs previously broke hydration and made all buttons dead).
      await downloadFromApi("/api/export-pdf", { paper }, `${slugify(paper.title)}.pdf`);
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
      await downloadFromApi("/api/export-docx", { paper }, `${slugify(paper.title)}.docx`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Word export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportProposalDocx() {
    if (!proposal) {
      setError("Generate a research proposal first, then download.");
      return;
    }
    setExporting("proposal");
    setError(null);
    try {
      await downloadFromApi(
        "/api/export-proposal-docx",
        { proposal },
        `${slugify(proposal.title)}.docx`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Proposal Word export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportPptx() {
    if (!presentation) {
      setError("Generate a presentation first, then download.");
      return;
    }
    setExporting("pptx");
    setError(null);
    try {
      await downloadFromApi(
        "/api/export-pptx",
        {
          presentation,
          // Server-stored template id (preferred) — avoids huge base64 POST bodies
          templateId:
            presentationTemplate?.templateId || presentation.metadata.templateId || null,
          templateBase64: presentationTemplate?.originalBase64 || null,
        },
        `${slugify(presentation.title)}.pptx`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "PPTX export failed");
    } finally {
      setExporting(null);
    }
  }

  async function exportLatex() {
    if (!paper) return;
    setExporting("latex");
    setError(null);
    try {
      await downloadFromApi(
        "/api/export-latex",
        { paper },
        `${slugify(paper.title)}-latex.zip`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "LaTeX export failed");
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
            Survey → research proposal → presentation
          </div>
          <h1 className="brand-display text-5xl leading-[0.95] text-[var(--ink)] sm:text-6xl md:text-7xl">
            SurveyForge
          </h1>
          <p className="serif mt-5 max-w-xl text-lg leading-relaxed text-[var(--muted)]">
            First forge the survey from your synthesis matrix. Then upload proposal templates and
            guidelines to draft the research proposal. Finally upload a presentation template for
            slides. Every new matrix feed rewrites the paper from scratch.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">1 Survey paper</span>
            <span className="chip">2 Research proposal</span>
            <span className="chip">3 Presentation deck</span>
            <span className="chip">Rewrite from scratch</span>
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
              // New data → rewrite survey from scratch; drop proposal & presentation
              setPaper(null);
              setDiscovered([]);
              setQueries([]);
              setWarnings([]);
              setReview(null);
              setDocumentQc(null);
              setError(null);
              setStage("idle");
              clearDownstreamArtifacts();
            }}
          />

          <section className="panel rounded-2xl p-5">
            <div className="mb-3 text-sm font-semibold">Workflow</div>
            <ol className="space-y-2">
              {WORKFLOW_STEPS.map((step) => {
                const unlocked =
                  step.id === "survey" ||
                  (step.id === "proposal" && !!paper && stage === "done") ||
                  (step.id === "presentation" && !!proposal);
                const complete =
                  (step.id === "survey" && !!paper && stage === "done") ||
                  (step.id === "proposal" && !!proposal) ||
                  (step.id === "presentation" && !!presentation);
                const active = workflowStep === step.id;
                return (
                  <li key={step.id}>
                    <button
                      type="button"
                      disabled={!unlocked}
                      onClick={() => setWorkflowStep(step.id)}
                      className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                        active
                          ? "border-[var(--sea)] bg-[var(--foam)]"
                          : unlocked
                            ? "border-[var(--line)] bg-white hover:border-[var(--sea)]"
                            : "cursor-not-allowed border-[var(--line)] bg-[var(--mist)] opacity-60"
                      }`}
                    >
                      <span
                        className={`mt-0.5 stage-dot ${complete ? "done" : ""} ${active ? "active" : ""}`}
                      />
                      <span>
                        <span
                          className={
                            active ? "font-semibold text-[var(--ink)]" : "text-[var(--muted)]"
                          }
                        >
                          {step.label}
                        </span>
                        <span className="mt-0.5 block text-[11px] text-[var(--muted)]">
                          {step.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 text-[11px] leading-snug text-[var(--muted)]">
              Finish the survey, then unlock proposal uploads, then the presentation template.
            </p>
          </section>

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
              Target paper length (pages)
              <input
                type="number"
                min={4}
                max={30}
                className="field mt-1"
                value={targetPages}
                onChange={(e) => setTargetPages(Math.max(4, Math.min(30, Number(e.target.value) || 10)))}
              />
              <span className="mt-1 block text-[11px] leading-snug text-[var(--muted)]">
                Controls how deep synthesis and paper-by-paper reviews go (about {targetPages} IEEE
                two-column pages).
              </span>
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
                  Forging survey from scratch…
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  {paper ? "Rewrite survey from scratch" : "Generate survey paper"}
                </>
              )}
            </button>
            <p className="text-[11px] leading-snug text-[var(--muted)]">
              Regenerating always rebuilds the survey from scratch and clears any proposal or
              presentation built from the previous draft.
            </p>
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
                Professor review · {review.passes} pass{review.passes === 1 ? "" : "es"} ·{" "}
                {review.perfect ? "passed" : "needs human attention"}
                {paper?.metadata.templateName ? ` · after ${paper.metadata.templateName}` : ""}
              </p>
              {paper?.metadata.professorNotes?.length ? (
                <ul className="mt-1 list-disc pl-5 text-[var(--muted)]">
                  {paper.metadata.professorNotes.slice(0, 5).map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              ) : null}
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

          {documentQc && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                documentQc.perfect
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-amber-200 bg-amber-50 text-amber-950"
              }`}
            >
              <p className="font-semibold">
                PDF &amp; Word QC · {documentQc.passes} pass{documentQc.passes === 1 ? "" : "es"} ·{" "}
                {documentQc.perfect ? "passed" : "needs attention"} · PDF{" "}
                {Math.round(documentQc.pdfBytes / 1024)}KB · Word{" "}
                {Math.round(documentQc.docxBytes / 1024)}KB
              </p>
              {documentQc.issues.length > 0 && (
                <ul className="mt-1 list-disc pl-5">
                  {documentQc.issues.slice(0, 8).map((issue) => (
                    <li key={`${issue.id}-${issue.message.slice(0, 24)}`}>
                      [{issue.severity}/{issue.source || "doc"}] {issue.message}
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
                      disabled={!!exporting}
                      onClick={() => void exportLatex()}
                    >
                      {exporting === "latex" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      LaTeX ZIP
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

              {(workflowStep === "survey" || !proposal) && (
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
              )}

              {stage === "done" && (
                <section className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[var(--sea)]">
                        <ScrollText className="h-4 w-4" />
                        Next: research proposal
                      </div>
                      <h3 className="brand-display mt-1 text-2xl">Upload proposal materials</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Survey is ready. Upload your proposal template and/or guidelines so we can
                        draft a fresh research proposal from this survey.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setWorkflowStep("proposal")}
                    >
                      Open proposal step
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {(workflowStep === "proposal" || workflowStep === "presentation" || proposal) && (
                    <div className="mt-4 space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <GuideUploader
                          label="Proposal template"
                          hint="DOCX / TXT / MD / PDF / image — section structure for the proposal"
                          accept=".docx,.pdf,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/*"
                          kind="template"
                          guide={proposalTemplate}
                          onUploaded={(g) => {
                            setProposalTemplate(g);
                            if (g?.warnings?.length) setWarnings((w) => [...w, ...g.warnings!]);
                          }}
                          onError={(m) => setError(m || null)}
                        />
                        <GuideUploader
                          label="Proposal guidelines"
                          hint="DOCX / TXT / PDF or a photo/screenshot of guidelines (PNG/JPG)"
                          accept=".docx,.pdf,.txt,.md,.markdown,.png,.jpg,.jpeg,.webp,.gif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown,image/*"
                          kind="guidelines"
                          guide={proposalGuidelines}
                          onUploaded={(g) => {
                            setProposalGuidelines(g);
                            if (g?.warnings?.length) setWarnings((w) => [...w, ...g.warnings!]);
                          }}
                          onError={(m) => setError(m || null)}
                        />
                      </div>
                      <button
                        className="btn btn-primary w-full sm:w-auto"
                        disabled={
                          generatingProposal || (!proposalTemplate && !proposalGuidelines)
                        }
                        onClick={() => void runProposal()}
                      >
                        {generatingProposal ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Writing proposal from scratch…
                          </>
                        ) : (
                          <>
                            <ScrollText className="h-4 w-4" />
                            {proposal ? "Rewrite proposal from scratch" : "Generate research proposal"}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {proposal && (
                <section className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[var(--ok)]">
                        <CheckCircle2 className="h-4 w-4" />
                        Proposal ready · rewritten from scratch
                      </div>
                      <h3 className="brand-display mt-1 text-2xl">{proposal.title}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        From survey “{proposal.metadata.surveyTitle}”
                        {proposal.metadata.templateFileName
                          ? ` · Template ${proposal.metadata.templateFileName}`
                          : ""}
                        {proposal.metadata.guidelinesFileName
                          ? ` · Guidelines ${proposal.metadata.guidelinesFileName}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!!exporting || !proposal}
                      onClick={() => void exportProposalDocx()}
                    >
                      {exporting === "proposal" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download Proposal Word
                    </button>
                  </div>
                  <div className="scroll-thin mt-4 max-h-[50vh] space-y-4 overflow-auto rounded-xl border border-[var(--line)] bg-white p-4 text-sm">
                    <div>
                      <h4 className="font-semibold">Abstract</h4>
                      <p className="mt-1 leading-relaxed text-[var(--muted)]">{proposal.abstract}</p>
                    </div>
                    {proposal.sections.map((s) => (
                      <div key={s.id}>
                        <h4 className="font-semibold">{s.heading}</h4>
                        <p className="mt-1 leading-relaxed text-[var(--muted)]">{s.content}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {proposal && (
                <section className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[var(--sea)]">
                        <Presentation className="h-4 w-4" />
                        Next: presentation
                      </div>
                      <h3 className="brand-display mt-1 text-2xl">Upload presentation template</h3>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Proposal is ready. Upload a PPTX/DOCX/PDF/TXT template so we can build slides
                        from the survey and proposal.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setWorkflowStep("presentation")}
                    >
                      Open presentation step
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {(workflowStep === "presentation" || presentation) && (
                    <div className="mt-4 space-y-3">
                      <GuideUploader
                        label="Presentation template"
                        hint="Upload your PPTX — download is a true duplicate (images, backgrounds, masters kept), with research text filled into placeholders"
                        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                        kind="template"
                        guide={presentationTemplate}
                        onUploaded={(g) => {
                          setPresentationTemplate(g);
                          if (g?.warnings?.length) setWarnings((w) => [...w, ...g.warnings!]);
                        }}
                        onError={(m) => setError(m || null)}
                      />
                      <button
                        className="btn btn-primary w-full sm:w-auto"
                        disabled={generatingPresentation || !presentationTemplate}
                        onClick={() => void runPresentation()}
                      >
                        {generatingPresentation ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Building presentation from scratch…
                          </>
                        ) : (
                          <>
                            <Presentation className="h-4 w-4" />
                            {presentation
                              ? "Rewrite presentation from scratch"
                              : "Generate presentation"}
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </section>
              )}

              {presentation && (
                <section className="panel rounded-2xl p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-sm text-[var(--ok)]">
                        <CheckCircle2 className="h-4 w-4" />
                        Presentation ready · {presentation.slides.length} slides
                      </div>
                      <h3 className="brand-display mt-1 text-2xl">{presentation.title}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        {presentation.subtitle}
                        {presentation.metadata.templateFileName
                          ? ` · Template ${presentation.metadata.templateFileName}`
                          : ""}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={!!exporting || !presentation}
                      onClick={() => void exportPptx()}
                    >
                      {exporting === "pptx" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Download PPTX
                    </button>
                  </div>
                  <div className="scroll-thin mt-4 grid max-h-[50vh] gap-3 overflow-auto md:grid-cols-2">
                    {presentation.slides.map((slide, i) => (
                      <div
                        key={slide.id}
                        className="rounded-xl border border-[var(--line)] bg-white px-3 py-3 text-sm"
                      >
                        <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                          Slide {i + 1} · {slide.kind}
                        </div>
                        <div className="mt-1 font-semibold">{slide.title}</div>
                        <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--muted)]">
                          {slide.bullets.map((b) => (
                            <li key={b.slice(0, 40)}>{b}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
