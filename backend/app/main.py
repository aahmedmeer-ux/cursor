import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import ErrorResponse, HealthResponse, SearchRequest, SearchResponse
from app.services.n8n_client import N8NWebhookError, fetch_leads_from_n8n

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="B2B Lead Generation API",
    description=(
        "Accepts job-related intent keywords, forwards them to an n8n webhook "
        "(Apify → Proxycurl → Hunter), and returns verified decision-maker leads."
    ),
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    """Basic health check confirming the API is running."""
    return HealthResponse(status="ok")


@app.post(
    "/api/search",
    response_model=SearchResponse,
    responses={
        400: {"model": ErrorResponse},
        502: {"model": ErrorResponse},
        504: {"model": ErrorResponse},
    },
    tags=["leads"],
)
async def search_leads(body: SearchRequest) -> SearchResponse:
    """
    Forward a keyword to n8n and return a structured list of leads.

    When `USE_MOCK_LEADS=true` (default for local development), returns
    sample leads after a simulated 5-second enrichment delay.
    """
    keyword = body.keyword.strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="keyword must not be empty.")

    logger.info("Search requested for keyword=%r", keyword)

    try:
        leads, source = await fetch_leads_from_n8n(keyword, settings)
    except N8NWebhookError as exc:
        status = exc.status_code or 502
        logger.error("n8n integration error (%s): %s", status, exc)
        raise HTTPException(status_code=status, detail=str(exc)) from exc
    except Exception as exc:
        logger.exception("Unexpected error during lead search")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred while hunting leads.",
        ) from exc

    return SearchResponse(
        keyword=keyword,
        source=source,
        count=len(leads),
        leads=leads,
    )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "service": "lead-generation-api",
        "docs": "/docs",
        "health": "/api/health",
    }
