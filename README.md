# LeadUnlock

RocketReach / SignalHire-style B2B contact search and enrichment SaaS.

Search professionals with advanced filters, unlock verified email + phone with credits, browse companies, bulk unlock selections, and export CSV lead lists.

## Tech Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS v4 + Shadcn UI
- Supabase (PostgreSQL + Magic Link Auth)
- People Data Labs / Apollo.io (search)
- Hunter.io / Dropcontact (email enrichment)
- Full demo mode when keys are missing

## Features

- Advanced people search: name, title, seniority, department, company, domain, industry, location, company size, skills
- Masked email + phone with confidence score until unlock
- Bulk unlock selected profiles
- Company search with drill-down into people at that domain
- Saved contacts + CSV export (email, phone, LinkedIn, location)
- Billing credit packages (simulated)
- Magic Link auth + demo workspace (25 credits)

## Getting Started (Windows / macOS / Linux)

```bash
npm install
copy .env.example .env.local   # Windows
# cp .env.example .env.local   # macOS/Linux
npm run dev
```

If port 3000 is busy:

```bash
npm run dev -- -p 3001
```

Open the app → **Continue with demo account**.

## Supabase setup (optional for production)

1. Run `supabase/migrations/001_initial_schema.sql`
2. Enable Email magic-link auth
3. Set env vars from `.env.example`
4. Add redirect URL `/auth/callback`

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/search` | Advanced people search |
| `POST /api/unlock-contact` | Unlock one or many contacts |
| `GET /api/companies` | Company search |
| `GET /api/contacts` | Saved unlocked contacts |
| `GET/POST /api/credits` | Balance / top-up |
