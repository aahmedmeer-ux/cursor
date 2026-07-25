# LeadHunt — Free-route job hunter

LeadHunt searches **real public job boards for free**, shows job details first, then tries to find company/poster clues from the job text and public company data.

> This free route does **not** log into Upwork or Indeed. Those platforms block free scrapers. It uses open job APIs instead.

## What it does

1. **Find jobs** from free sources:
   - [RemoteOK](https://remoteok.com/api)
   - [Remotive](https://remotive.com/api/remote-jobs)
   - [Arbeitnow](https://www.arbeitnow.com/api/job-board-api)
2. **Show job details** (title, company, source, location, salary, link)
3. **Find poster/company clues** (Clearbit company domain + emails/LinkedIn/names found in the job description)
4. **Export jobs to CSV**

## Stack

| Layer    | Tech                         |
|----------|------------------------------|
| Backend  | Python, FastAPI, httpx       |
| Frontend | Next.js, React, Tailwind CSS |

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- App API docs: http://localhost:8000/docs
- Health: http://localhost:8000/api/health

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open **http://localhost:3000**

## API

### `POST /api/jobs/search`

```json
{ "keyword": "python developer", "limit": 40 }
```

Returns normalized jobs from whichever free sources responded.

### `POST /api/jobs/enrich`

```json
{
  "company_name": "EverAI",
  "job_title": "AI Video Editor",
  "job_url": "https://remotive.com/...",
  "description": "optional job text"
}
```

Returns company website hint + any emails / LinkedIn links / name mentions found in the text.

## Honest limits (free route)

| Works today | Does not work for free |
|-------------|------------------------|
| Real jobs from RemoteOK / Remotive / Arbeitnow | Private Upwork / Indeed account feeds |
| Company website guess (Clearbit autocomplete) | Guaranteed CEO/Founder contact data |
| Emails/LinkedIn if present in the job post | Hunter-style verified emails at scale |

For Upwork/Indeed-grade coverage you’ll need paid scrapers later (Apify etc.). See `n8n-spec.md` for the older paid-webhook contract if you go that route.

## Attribution

Remotive asks that you link back to their job URL and mention Remotive as the source when displaying their listings — this UI does that via the job title link.
