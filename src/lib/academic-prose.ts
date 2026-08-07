/**
 * Strip common “AI tells” from generated academic prose:
 * em/en dashes, bullet markers, underscore emphasis, arrow glyphs, etc.
 */
export function sanitizeAcademicProse(text: string): string {
  let s = text;
  // Unicode dashes and AI-ish separators → plain punctuation / words
  s = s.replace(/[\u2014\u2013\u2015]/g, ", "); // em/en/horizontal bar
  s = s.replace(/\s+-\s+/g, ", "); // spaced hyphen used as dash
  s = s.replace(/[•●○▪◦‣∙]/g, "");
  s = s.replace(/[→⇒➔➜⟶]/g, " to ");
  s = s.replace(/[_*]{1,2}([A-Za-z][^_*]{0,40}?)[_*]{1,2}/g, "$1");
  s = s.replace(/_{2,}/g, " ");
  // Numbered / lettered pseudo-bullets at line starts
  s = s.replace(/(^|\n)\s*(?:[-*+]|\d+[.)]|[A-Za-z][.)]|Phase\s+[A-Z]\s*[:.-])\s+/g, "$1");
  // Collapse leftover double spaces / commas
  s = s.replace(/\s+,/g, ",");
  s = s.replace(/,\s*,+/g, ",");
  s = s.replace(/[ \t]{2,}/g, " ");
  s = s.replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

export function joinParagraphs(parts: string[]): string {
  return parts
    .map((p) => sanitizeAcademicProse(p))
    .filter(Boolean)
    .join("\n\n");
}
