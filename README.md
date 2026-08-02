# Originality

A modern Turnitin-style originality platform: upload PDF/DOCX/TXT, run hybrid similarity checks (exact fingerprints + semantic embeddings + web search), and explore an interactive split-screen report.

## Defaults chosen for this scaffold

| Concern | Default | Swap path |
|---|---|---|
| Database | Local PostgreSQL via Prisma | Set `DATABASE_URL` to a Supabase Postgres URL |
| Embeddings | Local hashed bag-of-words (`EMBEDDING_PROVIDER=local`) | Set `EMBEDDING_PROVIDER=openai` + `OPENAI_API_KEY` |
| AI writing detection | Local stylometric heuristics (`AI_DETECTION_PROVIDER=local`) | Set `AI_DETECTION_PROVIDER=openai` + `OPENAI_API_KEY` |
| File storage | Local `./uploads` | Replace `src/lib/storage.ts` with S3/Supabase |
| Web matching | Simulated corpus | Set `SERPER_API_KEY` for live Serper.dev results |
| Queue | Inline async processing + Redis cache | Can be upgraded to BullMQ workers |
| Privacy / indexing | `ALLOW_REPOSITORY_INDEXING=false` (default) | Uploads are check-only, raw files deleted after analysis, never added to a shared corpus |

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Prisma 7 + PostgreSQL (`@prisma/adapter-pg`)
- Redis (fingerprint/embedding cache)
- Shadcn-style Radix UI primitives + Lucide icons
- `pdf-parse` / `mammoth` for extraction

## Quick start

### 1) Prerequisites

```bash
# PostgreSQL + Redis (Docker)
docker compose up -d

# Or local services already running on :5432 / :6379
```

### 2) Install & configure

```bash
npm install
cp .env.example .env
# edit .env if needed
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3) Demo identities

Use the sidebar switcher:

- **Student** — `student@example.com`
- **Instructor** — `instructor@example.com`

## Phase map

1. **Project shell** — Next.js, Prisma schema, UI kit, app layout
2. **Ingestion** — drag/drop upload + PDF/DOCX/TXT extraction
3. **Indexing** — chunking, winnowing fingerprints, embeddings
4. **Scoring** — hybrid exact + semantic + web match merge
5. **Report UI** — split-screen highlights + source sidebar + filters
6. **Web API** — Serper integration with simulated fallback
7. **AI writing detection** — document AI score + flagged passage highlights

## Key paths

```
src/app/                  # App Router pages + API routes
src/components/report/    # Interactive similarity report
src/components/upload/    # Drag-and-drop uploader
src/services/             # Extraction, chunking, fingerprints, embeddings, similarity
prisma/schema.prisma      # User, Submission, DocumentChunk, MatchResult, fingerprints
```

## API

- `POST /api/submissions` — multipart upload (`file`, `title`, `addToIndex`)
- `GET /api/submissions` — list submissions for current role
- `GET /api/submissions/:id` — submission + matches
- `POST /api/session` — switch demo user
- `GET /api/files/:name` — serve stored upload

## Privacy (important)

- **Default is check-only.** Public/demo deployments keep `ALLOW_REPOSITORY_INDEXING=false`.
- Raw uploaded files are **deleted from disk immediately after text extraction**.
- User papers are **not** added to the shared comparison repository, so other uploads cannot match against them.
- File downloads require the owner session; deleted files 404.
- Use **Delete my submission** on a report to wipe stored report text from the database.
- To hard-reset polluted demo data: `node scripts/purge-user-index.mjs`

## Notes

- Indexing can only be enabled when `ALLOW_REPOSITORY_INDEXING=true` (private institutional installs).
- A tiny synthetic seed corpus exists for demo matching only — never your uploads.
