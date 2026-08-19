/**
 * Academic prose humanizer.
 *
 * Goal: improve natural variation and reduce formulaic AI phrasing for
 * readable scholarly drafts. This is NOT a plagiarism or detector-evasion tool.
 * Authors remain responsible for originality, citation integrity, and venue policy.
 */

const CLICHE_REPLACEMENTS: [RegExp, string | string[]][] = [
  [/\bIn today's (?:rapidly changing|fast-paced) world,?\s*/gi, ""],
  [/\bIt is (?:important|crucial|vital|imperative) to note that\s*/gi, ""],
  [/\bIt is worth noting that\s*/gi, ""],
  [/\bFurthermore,\s*/gi, ["Moreover, ", "Beyond this, ", "Additionally, ", ""]],
  [/\bAdditionally,\s*/gi, ["Also, ", "In addition, ", "Meanwhile, ", ""]],
  [/\bMoreover,\s*/gi, ["Further, ", "On top of that, ", ""]],
  [/\bIn conclusion,\s*/gi, ["Taken together, ", "Overall, ", "In sum, "]],
  [/\bTo summarize,\s*/gi, ["In brief, ", "Collectively, "]],
  [/\bplays a (?:crucial|critical|vital) role\b/gi, "matters"],
  [/\ba myriad of\b/gi, "many"],
  [/\bleverage\b/gi, ["use", "apply", "exploit"]],
  [/\butilize\b/gi, "use"],
  [/\bfacilitate\b/gi, ["enable", "support", "aid"]],
  [/\brobust\b/gi, ["reliable", "strong", "resilient"]],
  [/\bdelve into\b/gi, ["examine", "study", "investigate"]],
  [/\blandscape\b/gi, ["field", "area", "domain"]],
  [/\bcutting-edge\b/gi, ["recent", "advanced"]],
  [/\bgroundbreaking\b/gi, ["notable", "influential"]],
  [/\bseamless(?:ly)?\b/gi, ["effective", "effectively"]],
  [/\bcomprehensive overview\b/gi, "survey"],
  [/\bThis paper aims to\b/gi, "This survey"],
  [/\bWe can observe that\s*/gi, ""],
  [/\bAs previously mentioned,?\s*/gi, ""],
  [/\bIn this section, we (?:will |shall )?discuss\b/gi, "This section examines"],
  [/\bThe findings suggest that\b/gi, ["Evidence indicates that", "Results point to"]],
];

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function hashSeed(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

function splitSentences(paragraph: string): string[] {
  return paragraph
    .split(/(?<=[.!?])\s+(?=[A-Z(“"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function varySentenceOpeners(sentences: string[], seed: number): string[] {
  const openers = [
    null,
    "Notably, ",
    "By contrast, ",
    "Empirically, ",
    "In practice, ",
    "From another angle, ",
  ];

  return sentences.map((sentence, i) => {
    if (i === 0 || sentence.length < 40) return sentence;
    if ((seed + i) % 5 !== 0) return sentence;
    if (/^(Notably|By contrast|Empirically|In practice|From another|However|Although|While|Despite)/i.test(sentence)) {
      return sentence;
    }
    const opener = pick(openers, seed + i * 7);
    if (!opener) return sentence;
    return opener + sentence.charAt(0).toLowerCase() + sentence.slice(1);
  });
}

function mergeAndSplitRhythm(sentences: string[], seed: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const next = sentences[i + 1];
    // Occasionally merge a short sentence into the previous one via semicolon-like join
    if (next && s.length < 90 && next.length < 110 && (seed + i) % 6 === 0) {
      const joined = s.replace(/\.$/, "") + "; " + next.charAt(0).toLowerCase() + next.slice(1);
      out.push(joined);
      i++;
      continue;
    }
    // Occasionally break a long sentence at a comma into two
    if (s.length > 180 && s.includes(",")) {
      const idx = s.indexOf(",", Math.floor(s.length / 2));
      if (idx > 0 && (seed + i) % 4 === 0) {
        const a = s.slice(0, idx).trim() + ".";
        const b = s.slice(idx + 1).trim();
        out.push(a);
        out.push(b.charAt(0).toUpperCase() + b.slice(1));
        continue;
      }
    }
    out.push(s);
  }
  return out;
}

function replaceCliches(text: string, seed: number): string {
  let out = text;
  let i = 0;
  for (const [pattern, replacement] of CLICHE_REPLACEMENTS) {
    out = out.replace(pattern, () => {
      if (Array.isArray(replacement)) return pick(replacement, seed + i++);
      return replacement;
    });
  }
  return out;
}

function tidyWhitespace(text: string): string {
  return text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/^\s*,\s*/gm, "")
    .trim();
}

function humanizeParagraph(paragraph: string, seed: number): string {
  const text = replaceCliches(paragraph, seed);
  let sentences = splitSentences(text);
  sentences = varySentenceOpeners(sentences, seed);
  sentences = mergeAndSplitRhythm(sentences, seed + 11);
  // Drop consecutive sentences that start with the same 2 words
  const filtered: string[] = [];
  for (const s of sentences) {
    const prev = filtered[filtered.length - 1];
    if (prev) {
      const a = prev.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
      const b = s.split(/\s+/).slice(0, 2).join(" ").toLowerCase();
      if (a && a === b) continue;
    }
    filtered.push(s);
  }
  return tidyWhitespace(filtered.join(" "));
}

export function humanizeText(input: string): string {
  const seed = hashSeed(input);
  // Protect IEEE citation markers during rewriting
  const citeMap = new Map<string, string>();
  let citeI = 0;
  const protectedText = input.replace(/\[\d+\](?:-\[\d+\])?/g, (m) => {
    const key = `{{CITE${citeI++}}}`;
    citeMap.set(key, m);
    return key;
  });

  const blocks = protectedText.split(/\n{2,}/);
  let out = blocks
    .map((block, i) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // Keep headings / lists / equations mostly intact
      if (
        /^#{1,6}\s/.test(trimmed) ||
        /^[-*]\s/.test(trimmed) ||
        /^\d+\.\s/.test(trimmed) ||
        /^Equation\s*\(\d+\)/i.test(trimmed)
      ) {
        return replaceCliches(trimmed, seed + i);
      }
      return humanizeParagraph(trimmed, seed + i * 17);
    })
    .filter(Boolean)
    .join("\n\n");

  for (const [key, cite] of citeMap) {
    out = out.split(key).join(cite);
  }
  return out;
}

export function humanizePaperSections<T extends { content: string }>(sections: T[]): T[] {
  return sections.map((section, i) => ({
    ...section,
    content: humanizeText(section.content + " ".repeat(i % 3)),
  }));
}
