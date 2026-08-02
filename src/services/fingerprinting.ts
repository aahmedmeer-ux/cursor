import { createHash } from "crypto";
import { tokenizeWords } from "@/services/text/normalize";
import type { Fingerprint } from "@/types";

/**
 * Winnowing document fingerprinting (Schleimer et al.)
 * + MinHash-style signatures for coarse set similarity.
 */

function hashToken(value: string): number {
  const digest = createHash("sha1").update(value).digest();
  return digest.readUInt32BE(0);
}

export function buildNgrams(tokens: string[], n = 5): string[] {
  if (tokens.length < n) return tokens.length ? [tokens.join(" ")] : [];
  const grams: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    grams.push(tokens.slice(i, i + n).join(" "));
  }
  return grams;
}

/**
 * Winnowing: select min hash in each window of size `windowSize`.
 */
export function winnowFingerprints(
  text: string,
  options?: { n?: number; windowSize?: number },
): Fingerprint[] {
  const n = options?.n ?? 5;
  const windowSize = options?.windowSize ?? 4;
  const tokens = tokenizeWords(text);
  const grams = buildNgrams(tokens, n);
  if (grams.length === 0) return [];

  const hashes = grams.map((g) => ({
    hash: hashToken(g).toString(16),
    gramText: g,
  }));

  const selected = new Map<number, Fingerprint>();

  for (let i = 0; i <= hashes.length - windowSize; i++) {
    let minIdx = i;
    let minHash = hashes[i].hash;
    for (let j = i; j < i + windowSize; j++) {
      if (hashes[j].hash <= minHash) {
        minHash = hashes[j].hash;
        minIdx = j;
      }
    }
    if (!selected.has(minIdx)) {
      selected.set(minIdx, {
        hash: hashes[minIdx].hash,
        position: minIdx,
        gramText: hashes[minIdx].gramText,
      });
    }
  }

  // Short docs: keep all gram hashes
  if (selected.size === 0) {
    return hashes.map((h, position) => ({
      hash: h.hash,
      position,
      gramText: h.gramText,
    }));
  }

  return [...selected.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, fp]) => fp);
}

/** Jaccard similarity of two hash sets. */
export function jaccardSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Simple MinHash signature (many hash permutations approximated via salt).
 */
export function minHashSignature(hashes: string[], size = 64): number[] {
  const nums = hashes.map((h) => parseInt(h, 16) >>> 0);
  const sig: number[] = [];
  for (let i = 0; i < size; i++) {
    let min = 0xffffffff;
    const salt = (i + 1) * 0x9e3779b9;
    for (const n of nums) {
      const v = (Math.imul(n ^ salt, 0x85ebca6b) >>> 0) % 0xffffff;
      if (v < min) min = v;
    }
    sig.push(min === 0xffffffff ? 0 : min);
  }
  return sig;
}

export function estimateJaccardFromMinHash(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / a.length;
}
