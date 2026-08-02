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

export type SurveyFigure = {
  id: string;
  title: string;
  caption: string;
  kind: "taxonomy" | "comparison" | "timeline" | "methods" | "gaps";
  svg: string;
  mermaid?: string;
};

export type SurveySection = {
  id: string;
  heading: string;
  level: 1 | 2 | 3;
  content: string;
  citations: string[];
};

export type SurveyPaper = {
  title: string;
  abstract: string;
  keywords: string[];
  authorsPlaceholder: string;
  sections: SurveySection[];
  references: ReferenceEntry[];
  figures: SurveyFigure[];
  template: JournalTemplateId;
  metadata: {
    generatedAt: string;
    matrixPaperCount: number;
    discoveredPaperCount: number;
    humanized: boolean;
    topic: string;
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
};

export type PipelineStage =
  | "idle"
  | "parsing"
  | "discovering"
  | "outlining"
  | "drafting"
  | "humanizing"
  | "figuring"
  | "formatting"
  | "done"
  | "error";
