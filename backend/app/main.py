import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.models import (
    EnrichRequest,
    EnrichResponse,
    ErrorResponse,
    HealthResponse,
    JobsSearchResponse,
    SearchRequest,
)
from app.services.enrichment import enrich_company
from app.services.job_sources import search_free_jobs

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="LeadHunt API",
    description=(
        "Free-route job hunter: aggregates public job APIs (RemoteOK, Remotive, Arbeitnow), "
        "then best-effort company/poster enrichment without paid scrapers."
    ),
    version="2.0.0",
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
    return HealthResponse(status="ok", mode="free-job-sources")


@app.post(
    "/api/jobs/search",
    response_model=JobsSearchResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
    tags=["jobs"],
)
async def search_jobs(body: SearchRequest) -> JobsSearchResponse:
    """Search free public job boards and return normalized job listings."""
    keyword = body.keyword.strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="keyword must not be empty.")

    logger.info("Free job search keyword=%r limit=%s", keyword, body.limit)

    try:
        jobs, sources_queried, sources_ok = await search_free_jobs(keyword, body.limit)
    except Exception as exc:
        logger.exception("Job search failed")
        raise HTTPException(
            status_code=502,
            detail=f"Failed to query free job sources: {exc}",
        ) from exc

    if not sources_ok:
        raise HTTPException(
            status_code=502,
            detail="All free job sources failed. Try again in a moment.",
        )

    return JobsSearchResponse(
        keyword=keyword,
        count=len(jobs),
        sources_queried=sources_queried,
        sources_ok=sources_ok,
        jobs=jobs,
    )


@app.post(
    "/api/search",
    response_model=JobsSearchResponse,
    responses={400: {"model": ErrorResponse}, 502: {"model": ErrorResponse}},
    tags=["jobs"],
    summary="Alias for /api/jobs/search",
)
async def search_jobs_alias(body: SearchRequest) -> JobsSearchResponse:
    return await search_jobs(body)


@app.post(
    "/api/jobs/enrich",
    response_model=EnrichResponse,
    responses={400: {"model": ErrorResponse}},
    tags=["enrichment"],
)
async def enrich_job_poster(body: EnrichRequest) -> EnrichResponse:
    """
    Best-effort free enrichment for the company / poster behind a job.

    Uses Clearbit autocomplete for company domain + regex extraction of emails /
    LinkedIn links / contact mentions from the job description.
    """
    company = body.company_name.strip()
    if not company:
        raise HTTPException(status_code=400, detail="company_name must not be empty.")

    logger.info("Enriching company=%r", company)
    return await enrich_company(
        company_name=company,
        description=body.description,
        job_url=body.job_url,
    )


@app.get("/", include_in_schema=False)
async def root() -> dict[str, str]:
    return {
        "service": "lead-generation-api",
        "mode": "free-job-sources",
        "docs": "/docs",
        "health": "/api/health",
        "search": "/api/jobs/search",
        "enrich": "/api/jobs/enrich",
    }
