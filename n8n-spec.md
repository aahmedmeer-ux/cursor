# n8n Integration Spec — LeadHunt (optional paid path)

> **Current default:** LeadHunt runs the **free route** (`/api/jobs/search` + `/api/jobs/enrich`) using public job APIs. This n8n document is kept for a future paid Upwork/Indeed/enrichment waterfall.

This document defines the contract between the FastAPI backend and an n8n webhook workflow (Apify → Proxycurl → Hunter).

## Overview

```
Frontend  →  POST /api/search  →  FastAPI  →  POST N8N_WEBHOOK_URL  →  n8n workflow
                                                         ↓
Frontend  ←  SearchResponse   ←  FastAPI  ←  JSON leads payload  ←─────┘
```

Configure the webhook URL in `backend/.env`:

```env
N8N_WEBHOOK_URL=https://your-n8n-instance.example.com/webhook/lead-hunt
USE_MOCK_LEADS=false
N8N_TIMEOUT_SECONDS=60
```

---

## 1. Request: FastAPI → n8n

**Method:** `POST`  
**Content-Type:** `application/json`  
**Timeout:** Controlled by `N8N_TIMEOUT_SECONDS` (default `60`)

### Exact JSON payload

```json
{
  "keyword": "Amazon Seller Central"
}
```

| Field     | Type   | Required | Description                                      |
|-----------|--------|----------|--------------------------------------------------|
| `keyword` | string | yes      | Job-related intent keyword from the user search. |

### Example cURL (what the backend effectively sends)

```bash
curl -X POST "$N8N_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{"keyword":"Amazon Seller Central"}'
```

---

## 2. Response: n8n → FastAPI

The backend accepts either of the following shapes.

### Preferred shape (object with `leads` array)

```json
{
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

### Alternate shape (bare array)

```json
[
  {
    "company_name": "Northwind Commerce",
    "website_domain": "northwindcommerce.com",
    "decision_maker_name": "Ava Chen",
    "decision_maker_title": "CEO",
    "verified_email": "ava.chen@northwindcommerce.com",
    "linkedin_url": "https://www.linkedin.com/in/avachen"
  }
]
```

### Lead object schema

| Field                  | Type            | Required | Notes                                                                 |
|------------------------|-----------------|----------|-----------------------------------------------------------------------|
| `company_name`         | string          | yes      | Hiring company name                                                   |
| `website_domain`       | string          | yes      | Domain only (no protocol), e.g. `example.com`                         |
| `decision_maker_name`  | string          | yes      | CEO / Founder full name                                               |
| `decision_maker_title` | string          | no       | Defaults to `"CEO"` if omitted                                        |
| `verified_email`       | string \| null  | no       | Hunter-verified email; use `null` when unverified                     |
| `linkedin_url`         | string \| null  | no       | Full LinkedIn profile URL; use `null` when unavailable                |

### Empty result

Return an empty array when no leads are found:

```json
{
  "leads": []
}
```

---

## 3. Suggested n8n workflow nodes

| Step | Node                         | Responsibility                                                                 |
|------|------------------------------|--------------------------------------------------------------------------------|
| 1    | **Webhook**                  | Trigger on POST; read `{{$json.keyword}}`                                      |
| 2    | **Apify** (or HTTP Request)  | Search job boards / company listings for the keyword                           |
| 3    | **Code / Split**             | Normalize company domains from Apify results                                   |
| 4    | **Proxycurl** (HTTP Request) | Resolve CEO/Founder name + LinkedIn for each company domain                    |
| 5    | **Hunter** (HTTP Request)    | Find/verify decision-maker email                                               |
| 6    | **Code**                     | Map fields into the lead schema above                                          |
| 7    | **Respond to Webhook**       | Return `{ "leads": [ ... ] }` with HTTP 200                                    |

### Mapping tips

- Strip protocols and paths from company URLs before setting `website_domain`.
- Prefer titles matching `/CEO|Founder|Co-Founder/i`.
- If Hunter confidence is low, set `verified_email` to `null` rather than inventing a value.
- Keep the webhook **synchronous** (`Respond to Webhook` at the end) so FastAPI can wait for the final payload.

---

## 4. Error handling expectations

| Situation                         | Recommended n8n HTTP status | FastAPI behavior                          |
|-----------------------------------|-----------------------------|-------------------------------------------|
| Workflow completes successfully   | `200`                       | Returns leads to the frontend             |
| Upstream API failure (5xx)        | `500`                       | Maps to HTTP `502` with error detail      |
| Invalid / empty keyword           | `400`                       | Maps to HTTP `502` (client should validate)|
| Workflow exceeds timeout          | —                           | FastAPI returns HTTP `504`                |

Keep error response bodies short and human-readable if possible; FastAPI surfaces them in `detail`.

---

## 5. What the frontend ultimately receives

After a successful hunt, FastAPI wraps the n8n leads:

```json
{
  "keyword": "Amazon Seller Central",
  "source": "n8n",
  "count": 1,
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

When `USE_MOCK_LEADS=true` (local default), `source` is `"mock"` and sample leads are returned after a 5-second simulated delay.
