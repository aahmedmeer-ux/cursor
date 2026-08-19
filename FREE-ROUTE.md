# Free route — how LeadHunt gets real jobs

## Pipeline

```
Browser → POST /api/jobs/search → FastAPI
                                    ├─ Remotive API  (keyword search)
                                    ├─ RemoteOK API  (download + filter)
                                    └─ Arbeitnow API (pages + filter)
                                 ← jobs[]

Browser → POST /api/jobs/enrich → FastAPI
                                    ├─ Clearbit company suggest (domain)
                                    └─ Parse job text (email / LinkedIn / names)
                                 ← company + contacts[]
```

## Why not Upwork / Indeed here?

Those sites do not offer a free public job-search API for third-party apps, and they actively block scrapers. Building a reliable unpaid scraper usually fails after CAPTCHAs / IP bans.

The free route uses boards that **publish open JSON feeds** so results are real and verifiable without API keys.

## How to verify it’s real

1. Search for `python` or `designer` in LeadHunt.
2. Click a job title — you should land on the Remotive / RemoteOK / Arbeitnow page.
3. Confirm the same title/company appears on that site.
4. Click **Find poster** — website/contacts only appear if public signals exist.
