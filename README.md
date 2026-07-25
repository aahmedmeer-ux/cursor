# LeadHunt — B2B Lead Generation Engine

LeadHunt accepts a job-related intent keyword (e.g. `"Amazon Seller Central"`), forwards it to an n8n webhook for Apify → Proxycurl → Hunter enrichment, and returns verified CEO/Founder leads in a clean dashboard.

## Stack

| Layer        | Tech                                      |
|--------------|-------------------------------------------|
| Backend      | Python, FastAPI, httpx, Pydantic          |
| Frontend     | Next.js, React, Tailwind CSS              |
| Orchestration| n8n webhook (built separately)            |

## Project structure

```
backend/          FastAPI API
frontend/         Next.js dashboard
n8n-spec.md       Exact webhook request/response contract
```

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # already present with safe defaults
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Health: [http://localhost:8000/api/health](http://localhost:8000/api/health)
- Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

By default `USE_MOCK_LEADS=true`, so `/api/search` returns sample leads after a 5-second simulated enrichment delay. Set `USE_MOCK_LEADS=false` and a real `N8N_WEBHOOK_URL` to call n8n.

### 2. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. n8n

See [`n8n-spec.md`](./n8n-spec.md) for the exact JSON payloads the backend sends and expects.

## API

### `GET /api/health`

```json
{ "status": "ok", "service": "lead-generation-api" }
```

### `POST /api/search`

Request:

```json
{ "keyword": "Amazon Seller Central" }
```

Response:

```json
{
  "keyword": "Amazon Seller Central",
  "source": "mock",
  "count": 5,
  "leads": [
    {
      "company_name": "Northwind Commerce",
      "website_domain": "northwindcommerce.com",
      "decision_maker_name": "Ava Chen",
      "decision_maker_title": "CEO",
      "verified_email": "ava.chen@northwindcommerce.com",
      "linkedin_url": "https://www.linkedin.com/in/avachen"
    }
  ]
}
```

## Environment variables

### Backend (`backend/.env`)

| Variable               | Description                                      |
|------------------------|--------------------------------------------------|
| `N8N_WEBHOOK_URL`      | n8n webhook endpoint                             |
| `N8N_TIMEOUT_SECONDS`  | Max wait for n8n (default `60`)                  |
| `USE_MOCK_LEADS`       | `true` = mock data + 5s delay                    |
| `CORS_ORIGINS`         | Comma-separated frontend origins                 |

### Frontend (`frontend/.env.local`)

| Variable                 | Description                |
|--------------------------|----------------------------|
| `NEXT_PUBLIC_API_URL`    | FastAPI base URL           |
