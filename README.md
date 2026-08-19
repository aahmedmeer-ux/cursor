# SurveyForge

Turn a research **synthesis matrix** into a journal-style **survey paper draft**.

## What it does

1. **Ingest** a CSV/XLSX synthesis matrix (Title, Authors, Year, Method, Findings, Gaps, Themes, …)
2. **Discover** related literature via OpenAlex (Semantic Scholar fallback)
3. **Draft** a cited survey (intro → methods → taxonomy → themes → gaps → conclusion)
4. **Humanize** prose to reduce formulaic AI phrasing (writing quality — not detector evasion)
5. **Generate** SVG figures (taxonomy, methods, timeline, comparison, gaps)
6. **Format / export** for IEEE, ACM, Springer, Elsevier, and Nature-style templates (HTML, Markdown, LaTeX)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), load the sample matrix, and click **Generate survey paper**.

Optional: set `OPENAI_API_KEY` in the environment (or paste a key in the UI) to enhance drafting with GPT-4o-mini.

## Sample matrix

[`public/samples/synthesis-matrix-sample.csv`](public/samples/synthesis-matrix-sample.csv)

## Academic integrity

SurveyForge is a drafting assistant. Authors must verify citations against primary sources, ensure originality, and follow venue authorship policies. The humanize step improves readability and structural variety; it is **not** a tool for bypassing Turnitin or AI detectors.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- OpenAlex / Semantic Scholar for discovery
- Local structured synthesis engine + optional OpenAI enhancement
