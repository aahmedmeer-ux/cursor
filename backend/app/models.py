from typing import Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Payload accepted by POST /api/jobs/search."""

    keyword: str = Field(
        ...,
        min_length=1,
        max_length=200,
        examples=["python developer"],
        description="Job search keyword / intent phrase.",
    )
    limit: int = Field(
        default=40,
        ge=1,
        le=100,
        description="Maximum jobs to return after merging sources.",
    )


class JobPosting(BaseModel):
    """A normalized job listing from a free public source."""

    id: str
    title: str
    company_name: str
    source: str
    url: str
    location: Optional[str] = None
    job_type: Optional[str] = None
    salary: Optional[str] = None
    tags: list[str] = Field(default_factory=list)
    published_at: Optional[str] = None
    description_snippet: Optional[str] = None
    description: Optional[str] = None


class JobsSearchResponse(BaseModel):
    keyword: str
    count: int
    sources_queried: list[str]
    sources_ok: list[str]
    jobs: list[JobPosting]


class EnrichRequest(BaseModel):
    """Enrich company / poster details for a job."""

    company_name: str = Field(..., min_length=1, max_length=200)
    job_title: Optional[str] = None
    job_url: Optional[str] = None
    description: Optional[str] = None


class ContactHint(BaseModel):
    """Best-effort contact signal extracted without paid enrichment APIs."""

    kind: str = Field(description="email | linkedin_person | linkedin_company | mention")
    value: str
    context: Optional[str] = None


class EnrichResponse(BaseModel):
    company_name: str
    website_domain: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    contacts: list[ContactHint] = Field(default_factory=list)
    notes: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    service: str = "lead-generation-api"
    mode: str = "free-job-sources"


class ErrorResponse(BaseModel):
    detail: str
