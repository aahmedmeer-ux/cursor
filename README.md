# LeadUnlock

B2B contact search and enrichment SaaS (RocketReach-style). Search professionals by job title, company, or industry, then unlock verified emails with a credit system.

## Tech Stack

- **Frontend & Backend:** Next.js (App Router), React, TypeScript
- **Styling:** Tailwind CSS v4, Shadcn UI
- **Database & Auth:** Supabase (PostgreSQL + Magic Link Auth)
- **External APIs:** People Data Labs / Apollo.io (search), Hunter.io / Dropcontact (email enrichment)
- **Fallbacks:** Mock people + email data when external keys are missing; file-backed demo auth when Supabase is not configured

## Features

- Magic Link auth (Supabase) + one-click demo login
- Dashboard with sidebar (Search, Saved Contacts, Billing) and live credit balance
- People search with title / company domain / industry filters
- Masked emails + **Unlock Contact (1 Credit)** enrichment flow
- Saved contacts list with **Export to CSV**
- Simulated credit packages on Billing

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Continue with demo account**.

### Environment variables

See `.env.example`:

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase project |
| `PDL_API_KEY` or `APOLLO_API_KEY` | People search |
| `HUNTER_API_KEY` or `DROPCONTACT_API_KEY` | Email enrichment |

Without these keys, the app runs fully in **demo/mock mode**.

### Supabase setup

1. Create a Supabase project
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL Editor
3. Enable Email (Magic Link) auth
4. Add env vars and set Site URL / redirect URL to `/auth/callback`

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint

## API Routes

| Route | Description |
|-------|-------------|
| `GET /api/search` | Search people |
| `POST /api/unlock-contact` | Enrich email, deduct credit, save contact |
| `GET /api/contacts` | List unlocked contacts |
| `GET/POST /api/credits` | Read balance / add credits |
| `POST /api/auth/demo` | Demo session |
| `POST /api/auth/magic-link` | Supabase OTP |
| `POST /api/auth/signout` | Sign out |
