/** Clean and normalize extracted document text while preserving paragraph breaks. */
export function normalizeText(input: string, options?: { lowercase?: boolean }): string {
  let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Strip control chars except newlines/tabs
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");

  // Collapse excessive blank lines but keep paragraph structure
  text = text.replace(/[ \t]+\n/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n");
  text = text.replace(/[ \t]{2,}/g, " ");

  text = text.trim();

  if (options?.lowercase) {
    text = text.toLowerCase();
  }

  return text;
}

export function tokenizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export function countWords(text: string): number {
  return tokenizeWords(text).length;
}

export function looksLikeBibliography(text: string): boolean {
  const lower = text.toLowerCase();
  if (/^(references|bibliography|works cited|citations)\b/.test(lower.trim())) {
    return true;
  }
  // Common citation patterns
  const citationHits =
    (lower.match(/\(\d{4}\)/g)?.length ?? 0) +
    (lower.match(/\bet al\./g)?.length ?? 0) +
    (lower.match(/doi:\s*\S+/g)?.length ?? 0);
  return citationHits >= 2 && text.length < 500;
}

export function looksLikeQuote(text: string): boolean {
  const trimmed = text.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("“") && trimmed.endsWith("”"))
  ) {
    return trimmed.length > 40;
  }
  return /"[^"]{40,}"/.test(trimmed);
}
