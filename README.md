# LeadUnlock

B2B contact search and enrichment SaaS (RocketReach-style). Search professionals by job title, company, or industry, then unlock verified emails with a credit system.

## Tech Stack

- **Frontend & Backend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS v4, Shadcn UI
- **Database & Auth:** Supabase (PostgreSQL + Auth) — planned
- **External APIs:** People Data Labs / Apollo.io (search), Hunter.io / Dropcontact (email enrichment)

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Status

| Step | Description | Status |
|------|-------------|--------|
| 1 | Next.js + Shadcn UI foundation | ✅ Done |
| 2 | Supabase schema + RLS | ⏳ Pending approval |
| 3 | Auth, layout, search & unlock APIs | Pending |
| 4 | Search UI, saved contacts, CSV export | Pending |

## Scripts

- `npm run dev` — start development server
- `npm run build` — production build
- `npm run start` — start production server
- `npm run lint` — run ESLint
