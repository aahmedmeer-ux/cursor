export type MatrixRow = {
  id: string;
  title: string;
  authors: string;
  year: number | null;
  venue: string;
  method: string;
  findings: string;
  gaps: string;
  themes: string;
  keywords: string;
  doi: string;
  url: string;
  notes: string;
  raw: Record<string, string>;
};

export type DiscoveredPaper = {
  id: string;
  title: string;
  authors: string[];
  year: number | null;
  venue: string;
  abstract: string;
  doi: string | null;
  url: string | null;
  citedBy: number;
  source: "openalex" | "semanticscholar" | "crossref" | "matrix";
  relevanceScore: number;
  themes: string[];
};

export type JournalTemplateId =
  | "ieee"
  | "acm"
  | "springer"
  | "elsevier"
  | "nature";

export type SurveyFigureKind =
  | "taxonomy"
  | "problem"
  | "comparison"
  | "challenges"
  | "venn"
  | "timeline"
  | "methods"
  | "gaps";

export type SurveyFigure = {
  id: string;
  title: string;
  caption: string;
  kind: SurveyFigureKind;
  svg: string;
  /** Optional HTML table/figure body rendered in journal preview */
  html?: string;
  mermaid?: string;
};

export type SurveyTable = {
  id: string;
  title: string;
  caption: string;
  kind: "comparison" | "challenges" | "related-surveys" | "taxonomy";
  headers: string[];
  rows: string[][];
};

export type SurveySection = {
  id: string;
  heading: string;
  level: 1 | 2 | 3;
  content: string;
  citations: string[];
};

export type TaxonomyStyle = "scientific" | "semi-scientific" | "simple" | "professional";

export type SurveyEquation = {
  id: string;
  number: number;
  label: string;
  latex: string;
  plaintext: string;
  /** Word-like Unicode display form (no caret/underscore markup). */
  display: string;
  description: string;
  sectionId: string;
  /** Optional pre-rendered equation SVG for PDF/Word embedding */
  svg?: string;
};

export type SurveyPaper = {
  title: string;
  abstract: string;
  keywords: string[];
  authorsPlaceholder: string;
  contributions: string[];
  sections: SurveySection[];
  references: ReferenceEntry[];
  figures: SurveyFigure[];
  tables: SurveyTable[];
  equations: SurveyEquation[];
  template: JournalTemplateId;
  taxonomyStyle: TaxonomyStyle;
  metadata: {
    generatedAt: string;
    matrixPaperCount: number;
    discoveredPaperCount: number;
    humanized: boolean;
    topic: string;
    rubric?: "high-impact-v1";
    taxonomyStyle?: TaxonomyStyle;
    targetPages?: number;
    templateApplied?: JournalTemplateId;
    templateName?: string;
    professorNotes?: string[];
  };
};

export type ReferenceEntry = {
  id: string;
  key: string;
  text: string;
  doi?: string | null;
  year?: number | null;
};

export type GenerateOptions = {
  topic?: string;
  template: JournalTemplateId;
  humanize: boolean;
  includeFigures: boolean;
  discoverOnline: boolean;
  maxDiscover: number;
  authorName?: string;
  affiliation?: string;
  openaiApiKey?: string;
  taxonomyStyle?: TaxonomyStyle;
  /** Target length of the generated survey draft (IEEE two-column pages). */
  targetPages?: number;
};

export type PipelineStage =
  | "idle"
  | "parsing"
  | "discovering"
  | "outlining"
  | "drafting"
  | "humanizing"
  | "figuring"
  | "reviewing"
  | "formatting"
  | "documentQc"
  | "done"
  | "error";

/** Top-level product wizard: survey → proposal → presentation */
export type WorkflowStep = "survey" | "proposal" | "presentation";

export type UploadedGuide = {
  fileName: string;
  kind: "template" | "guidelines" | "notes";
  mimeType: string;
  text: string;
  /** For PPTX/DOCX we keep a short structure summary extracted from the file */
  structureNotes?: string[];
  byteLength: number;
  /**
   * Server-side id for the uploaded binary template (preferred).
   * Avoids shipping multi‑MB base64 through the browser on download.
   */
  templateId?: string;
  /** @deprecated Prefer templateId — kept only for tiny templates */
  originalBase64?: string;
  /** Slide count detected in an uploaded PPTX template */
  slideCount?: number;
  warnings?: string[];
};

export type ProposalSection = {
  id: string;
  heading: string;
  level: 1 | 2 | 3;
  content: string;
};

export type ResearchProposal = {
  title: string;
  authorsPlaceholder: string;
  abstract: string;
  sections: ProposalSection[];
  references: ReferenceEntry[];
  metadata: {
    generatedAt: string;
    topic: string;
    surveyTitle: string;
    templateFileName?: string;
    guidelinesFileName?: string;
    rewrittenFromScratch: true;
  };
};

export type PresentationSlide = {
  id: string;
  title: string;
  bullets: string[];
  notes?: string;
  kind:
    | "title"
    | "agenda"
    | "motivation"
    | "gap"
    | "objectives"
    | "method"
    | "taxonomy"
    | "results"
    | "contribution"
    | "timeline"
    | "closing";
};

export type ResearchPresentation = {
  title: string;
  subtitle: string;
  authorsPlaceholder: string;
  slides: PresentationSlide[];
  metadata: {
    generatedAt: string;
    topic: string;
    surveyTitle: string;
    proposalTitle?: string;
    templateFileName?: string;
    /** Server-side stored PPTX template id for true-clone download */
    templateId?: string;
    rewrittenFromScratch: true;
  };
};
