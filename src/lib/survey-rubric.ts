/**
 * High-impact survey writing rubric embedded in SurveyForge.
 *
 * Distilled from:
 * - ACM Computing Surveys expectations (original taxonomy/framework, not a catalog)
 * - Tim Weninger / research-methods guidance (synthesize; organization = the point)
 * - Communications survey methodology (arXiv:2509.25828): related-survey comparison
 *   tables, concept-centric tables, challenges aligned with taxonomy, technical figures
 * - Common CS survey practice (mind maps, comparison tables, open-problem sections)
 */

export const HIGH_IMPACT_SURVEY_PRINCIPLES = [
  "Synthesize — do not produce a laundry list of paper abstracts.",
  "Contribute an organizing schema: taxonomy, framework, or comparison lens.",
  "Lead with a visual taxonomy / problem diagram readers can navigate.",
  "Use concept-centric comparison tables; cite papers inside the synthesis.",
  "Include a related-surveys positioning table that states your added value.",
  "State scope, search/inclusion protocol, and differentiation from prior surveys.",
  "Align open challenges and future work with the same taxonomy dimensions.",
  "Show trends vs gaps (Venn / coverage map) so follow-on work is actionable.",
  "End with concrete takeaways for researchers and practitioners.",
] as const;

/** Must-have visual artifacts for a high-impact survey draft. */
export const REQUIRED_SURVEY_ARTIFACTS = [
  { id: "taxonomy", label: "Taxonomy figure", why: "Organizing schema readers can place new work into." },
  { id: "problem", label: "Problem illustration", why: "Shared mental model of inputs, constraints, outputs." },
  { id: "comparison", label: "Comparison table(s)", why: "Side-by-side methods, settings, outcomes, limits." },
  { id: "challenges", label: "Challenges table/map", why: "Open problems aligned with taxonomy dimensions." },
  { id: "venn", label: "Trends–gaps Venn", why: "Where literature concentrates vs where gaps remain." },
] as const;

export type SurveyContribution = {
  id: string;
  label: string;
  detail: string;
};

export type TaxonomyNode = {
  id: string;
  label: string;
  description: string;
  paperIds: string[];
  children?: TaxonomyNode[];
};

/** Canonical high-impact section skeleton used by the generator. */
export const SURVEY_SECTION_BLUEPRINT = [
  {
    id: "intro",
    heading: "Introduction",
    purpose:
      "Motivate the topic, define scope, list contributions, and preview organization.",
  },
  {
    id: "background",
    heading: "Background and Problem Formulation",
    purpose: "Define terms and illustrate the core problem the literature addresses.",
  },
  {
    id: "related-surveys",
    heading: "Related Surveys and Positioning",
    purpose: "Compare against prior surveys and state the added value of this review.",
  },
  {
    id: "method",
    heading: "Review Methodology",
    purpose: "Document matrix sources, discovery protocol, inclusion, and synthesis steps.",
  },
  {
    id: "taxonomy",
    heading: "Taxonomy of the Field",
    purpose: "Present the organizing taxonomy with a visual map of dimensions.",
  },
  {
    id: "synthesis",
    heading: "Literature Synthesis",
    purpose: "Synthesize evidence under each taxonomy branch (not paper-by-paper dumps).",
  },
  {
    id: "comparison",
    heading: "Comparative Analysis",
    purpose: "Cross-cut studies with comparison tables on methods, settings, and outcomes.",
  },
  {
    id: "challenges",
    heading: "Challenges and Open Problems",
    purpose: "Enumerate challenges aligned with taxonomy dimensions.",
  },
  {
    id: "trends-gaps",
    heading: "Trends, Overlaps, and Research Gaps",
    purpose: "Show where literature concentrates versus where gaps remain (Venn/map).",
  },
  {
    id: "future",
    heading: "Future Research Directions",
    purpose: "Propose actionable directions mapped back to challenges and taxonomy.",
  },
  {
    id: "conclusion",
    heading: "Conclusion",
    purpose: "Restate contributions and practical takeaways.",
  },
] as const;

export function defaultContributions(topic: string, paperCount: number, themeCount: number): SurveyContribution[] {
  const field = topic.replace(/^A Survey of\s+/i, "");
  return [
    {
      id: "c1",
      label: "Organizing taxonomy",
      detail: `A multi-level taxonomy of ${field} that groups ${paperCount} primary studies into ${themeCount} coherent dimensions.`,
    },
    {
      id: "c2",
      label: "Comparative synthesis",
      detail:
        "Concept-centric comparison tables covering methods, evaluation settings, reported outcomes, and limitations.",
    },
    {
      id: "c3",
      label: "Problem illustration",
      detail:
        "A problem-formulation diagram that situates inputs, constraints, system components, and desired outputs.",
    },
    {
      id: "c4",
      label: "Challenge map",
      detail:
        "A structured challenge set aligned with the taxonomy, including severity and evidence from the matrix.",
    },
    {
      id: "c5",
      label: "Trends–gaps view",
      detail:
        "A Venn-style map of active research trends versus persistent gaps to guide follow-on work.",
    },
  ];
}

export const OPENAI_SURVEY_SYSTEM_PROMPT = `You are an expert author of high-impact computing survey papers (ACM CSUR / IEEE Communications Surveys style).

Rewrite the draft to maximize scholarly impact while preserving all citation markers like [1], [2].
Rules:
- Synthesize across papers; avoid laundry-list abstracts.
- Keep the taxonomy-driven organization.
- Strengthen contribution statements, comparative insight, and challenge–future alignment.
- Prefer precise, varied academic prose without cliché AI transitions.
- Do not invent citations, papers, numbers, or venues.
- Preserve every IEEE citation marker exactly ([1], [2], [1]-[3], etc.). Never insert underscores between citations.
- Preserve equation blocks that begin with "Equation (n)" and keep Unicode math characters (no caret ^ or raw LaTeX).
Return strict JSON: { "abstract": string, "sections": [{ "heading": string, "content": string }] }.`;
