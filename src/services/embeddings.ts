import { createHash } from "crypto";
import OpenAI from "openai";
import { redisGet, redisSet } from "@/lib/redis";

export type EmbeddingProvider = "openai" | "local";

const DIM = 384;

function getProvider(): EmbeddingProvider {
  const configured = (process.env.EMBEDDING_PROVIDER ?? "local").toLowerCase();
  if (configured === "openai" && process.env.OPENAI_API_KEY) return "openai";
  return "local";
}

/**
 * Deterministic local embedding fallback using hashed bag-of-words.
 * Useful for offline/dev when OpenAI is unavailable.
 */
export function localEmbed(text: string, dimensions = DIM): number[] {
  const vec = new Array<number>(dimensions).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2);

  for (const token of tokens) {
    const digest = createHash("sha256").update(token).digest();
    for (let i = 0; i < 4; i++) {
      const idx = digest.readUInt16BE(i * 2) % dimensions;
      const sign = digest[8 + i] % 2 === 0 ? 1 : -1;
      vec[idx] += sign;
    }
  }

  return l2Normalize(vec);
}

function l2Normalize(vec: number[]): number[] {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum) || 1;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function openaiEmbed(texts: string[]): Promise<number[][]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";
  const response = await client.embeddings.create({
    model,
    input: texts,
  });
  return response.data
    .sort((a, b) => a.index - b.index)
    .map((row) => l2Normalize(row.embedding));
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const provider = getProvider();
  const cacheKeyPrefix = `emb:${provider}:`;

  const results: Array<number[] | null> = new Array(texts.length).fill(null);
  const missing: { index: number; text: string }[] = [];

  for (let i = 0; i < texts.length; i++) {
    const key =
      cacheKeyPrefix +
      createHash("sha1").update(texts[i].slice(0, 2000)).digest("hex");
    const cached = await redisGet(key);
    if (cached) {
      try {
        results[i] = JSON.parse(cached) as number[];
        continue;
      } catch {
        /* miss */
      }
    }
    missing.push({ index: i, text: texts[i] });
  }

  if (missing.length === 0) {
    return results as number[][];
  }

  let embedded: number[][];
  if (provider === "openai") {
    try {
      embedded = await openaiEmbed(missing.map((m) => m.text));
    } catch (err) {
      console.warn("OpenAI embeddings failed; falling back to local.", err);
      embedded = missing.map((m) => localEmbed(m.text));
    }
  } else {
    embedded = missing.map((m) => localEmbed(m.text));
  }

  for (let i = 0; i < missing.length; i++) {
    const { index, text } = missing[i];
    results[index] = embedded[i];
    const key =
      cacheKeyPrefix +
      createHash("sha1").update(text.slice(0, 2000)).digest("hex");
    await redisSet(key, JSON.stringify(embedded[i]), 60 * 60 * 24);
  }

  return results as number[][];
}

export async function embedText(text: string): Promise<number[]> {
  const [vec] = await embedTexts([text]);
  return vec;
}
