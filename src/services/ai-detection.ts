import OpenAI from "openai";
import { tokenizeWords } from "@/services/text/normalize";

export type AiSegmentResult = {
  startChar: number;
  endChar: number;
  score: number;
  reason: string;
};

export type AiDetectionResult = {
  aiScore: number;
  aiLabel: "HUMAN" | "MIXED" | "AI";
  aiSummary: string;
  segments: AiSegmentResult[];
  provider: "local" | "openai";
};

const AI_PHRASES = [
  "in conclusion",
  "it is important to note",
  "in today's world",
  "plays a crucial role",
  "delve into",
  "a wide range of",
  "furthermore",
  "moreover",
  "in summary",
  "to summarize",
  "it is worth noting",
  "as previously mentioned",
  "from a broader perspective",
  "this highlights the importance",
  "in the realm of",
  "navigating the complexities",
  "a multifaceted approach",
  "leveraging",
  "underscore the significance",
  "it goes without saying",
];

type SentenceSpan = {
  text: string;
  start: number;
  end: number;
};

function splitSentences(text: string): SentenceSpan[] {
  const spans: SentenceSpan[] = [];
  const re = /[^.!?]+[.!?]+|[^.!?]+$/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const raw = match[0];
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const local = raw.indexOf(trimmed);
    const start = match.index + local;
    spans.push({
      text: trimmed,
      start,
      end: start + trimmed.length,
    });
  }
  return spans;
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = mean(values.map((x) => (x - m) ** 2));
  return Math.sqrt(v);
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * Local heuristic AI-writing detector.
 * Combines burstiness, sentence uniformity, stock LLM phrasing,
 * and type-token diversity into a 0–100 AI likelihood score.
 */
export function detectAiLocal(text: string): AiDetectionResult {
  const sentences = splitSentences(text);
  if (sentences.length === 0 || tokenizeWords(text).length < 40) {
    return {
      aiScore: 0,
      aiLabel: "HUMAN",
      aiSummary: "Not enough text for a reliable AI writing estimate.",
      segments: [],
      provider: "local",
    };
  }

  const lengths = sentences.map((s) => tokenizeWords(s.text).length);
  const lengthMean = mean(lengths);
  const lengthStd = stdDev(lengths);
  const burstiness = lengthMean === 0 ? 0 : lengthStd / lengthMean;

  // Low burstiness / uniform sentence length → more AI-like
  const uniformityScore = clamp((0.55 - burstiness) / 0.55) * 100;

  const lower = text.toLowerCase();
  let phraseHits = 0;
  for (const phrase of AI_PHRASES) {
    if (lower.includes(phrase)) phraseHits++;
  }
  const phraseScore = clamp((phraseHits / 4) * 100);

  const words = tokenizeWords(text);
  const unique = new Set(words);
  const ttr = unique.size / Math.max(words.length, 1);
  // Moderately low lexical diversity is common in LLM prose
  const diversityScore = clamp((0.55 - ttr) / 0.35) * 100;

  // Transition / connective density
  const connectives = (
    lower.match(
      /\b(however|therefore|additionally|furthermore|moreover|consequently|thus|hence)\b/g,
    ) ?? []
  ).length;
  const connectiveScore = clamp(
    (connectives / Math.max(sentences.length / 3, 1)) * 55,
  );

  // First-person / informal human markers reduce AI score
  const humanMarkers = (
    lower.match(
      /\b(i think|i believe|i feel|in my opinion|we used|our team|kinda|gonna|sort of)\b/g,
    ) ?? []
  ).length;
  const humanDiscount = Math.min(35, humanMarkers * 12);

  const documentScore = clamp(
    uniformityScore * 0.35 +
      phraseScore * 0.3 +
      diversityScore * 0.2 +
      connectiveScore * 0.15 -
      humanDiscount,
  );

  const segments: AiSegmentResult[] = [];
  for (const sentence of sentences) {
    const sLower = sentence.text.toLowerCase();
    const sWords = tokenizeWords(sentence.text);
    if (sWords.length < 8) continue;

    let local = 0;
    let reasonParts: string[] = [];

    const sLen = sWords.length;
    if (Math.abs(sLen - lengthMean) < lengthStd * 0.45 && sLen >= 12) {
      local += 28;
      reasonParts.push("uniform sentence length");
    }

    const hit = AI_PHRASES.find((p) => sLower.includes(p));
    if (hit) {
      local += 42;
      reasonParts.push(`stock phrase (“${hit}”)`);
    }

    const sConnectives = (
      sLower.match(
        /\b(however|therefore|additionally|furthermore|moreover|consequently)\b/g,
      ) ?? []
    ).length;
    if (sConnectives > 0) {
      local += 18;
      reasonParts.push("formal connective density");
    }

    // Long, evenly punctuated sentences
    if (sLen >= 22 && (sentence.text.match(/,/g)?.length ?? 0) >= 2) {
      local += 16;
      reasonParts.push("long polished construction");
    }

    const score = clamp(local);
    if (score >= 40) {
      segments.push({
        startChar: sentence.start,
        endChar: sentence.end,
        score,
        reason: reasonParts.join(", ") || "stylometric AI signal",
      });
    }
  }

  // Coverage-weighted blend; heavy stock-phrase density boosts overall AI likelihood
  let covered = 0;
  for (const seg of segments) covered += seg.endChar - seg.startChar;
  const coverage = covered / Math.max(text.length, 1);
  const phraseBoost = phraseHits >= 5 ? 18 : phraseHits >= 3 ? 10 : 0;
  const aiScore = Math.round(
    clamp(documentScore * 0.5 + coverage * 100 * 0.4 + phraseBoost),
  );

  const aiLabel =
    aiScore >= 60 ? "AI" : aiScore >= 30 ? "MIXED" : "HUMAN";

  const aiSummary =
    aiLabel === "AI"
      ? `High AI-writing likelihood (${aiScore}%). Uniform sentence patterns and formal phrasing resemble generated prose.`
      : aiLabel === "MIXED"
        ? `Mixed signal (${aiScore}%). Some passages look machine-polished; review highlighted segments.`
        : `Low AI-writing likelihood (${aiScore}%). Stylometry looks closer to human drafting.`;

  return {
    aiScore,
    aiLabel,
    aiSummary,
    segments: segments
      .sort((a, b) => b.score - a.score)
      .slice(0, 40),
    provider: "local",
  };
}

/**
 * Optional OpenAI classifier. Falls back to local heuristics on failure
 * or when OPENAI_API_KEY / AI_DETECTION_PROVIDER is not configured.
 */
export async function detectAiWriting(text: string): Promise<AiDetectionResult> {
  const provider = (process.env.AI_DETECTION_PROVIDER ?? "local").toLowerCase();
  const local = detectAiLocal(text);

  if (provider !== "openai" || !process.env.OPENAI_API_KEY) {
    return local;
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const excerpt = text.slice(0, 6000);
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_AI_DETECT_MODEL ?? "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You estimate whether academic text was written by AI. Return JSON: {\"aiScore\":0-100,\"aiLabel\":\"HUMAN|MIXED|AI\",\"aiSummary\":\"short\",\"hotSpans\":[{\"quote\":\"exact substring\",\"score\":0-100,\"reason\":\"...\"}]}. Be conservative.",
        },
        {
          role: "user",
          content: excerpt,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      aiScore?: number;
      aiLabel?: "HUMAN" | "MIXED" | "AI";
      aiSummary?: string;
      hotSpans?: Array<{ quote?: string; score?: number; reason?: string }>;
    };

    const segments: AiSegmentResult[] = [];
    for (const span of parsed.hotSpans ?? []) {
      const quote = span.quote?.trim();
      if (!quote) continue;
      const idx = text.indexOf(quote);
      if (idx < 0) continue;
      segments.push({
        startChar: idx,
        endChar: idx + quote.length,
        score: clamp(Number(span.score) || 60),
        reason: span.reason ?? "model-flagged span",
      });
    }

    const aiScore = clamp(Number(parsed.aiScore) || local.aiScore);
    const aiLabel =
      parsed.aiLabel === "AI" ||
      parsed.aiLabel === "MIXED" ||
      parsed.aiLabel === "HUMAN"
        ? parsed.aiLabel
        : aiScore >= 60
          ? "AI"
          : aiScore >= 30
            ? "MIXED"
            : "HUMAN";

    return {
      aiScore: Math.round(aiScore),
      aiLabel,
      aiSummary:
        parsed.aiSummary ??
        local.aiSummary,
      segments: segments.length ? segments : local.segments,
      provider: "openai",
    };
  } catch (err) {
    console.warn("OpenAI AI detection failed; using local heuristics.", err);
    return local;
  }
}
