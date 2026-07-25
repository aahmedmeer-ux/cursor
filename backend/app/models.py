from typing import Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    """Payload accepted by POST /api/search."""

    keyword: str = Field(
        ...,
        min_length=1,
        max_length=200,
        examples=["Amazon Seller Central"],
        description="Job-related intent keyword used to find hiring companies.",
    )


class Lead(BaseModel):
    """A single verified decision-maker lead."""

    company_name: str
    website_domain: str
    decision_maker_name: str
    decision_maker_title: str = "CEO"
    verified_email: Optional[str] = None
    linkedin_url: Optional[str] = None


class SearchResponse(BaseModel):
    """Structured response returned to the frontend."""

    keyword: str
    source: str = Field(
        description="Where leads came from: 'n8n' or 'mock'.",
    )
    count: int
    leads: list[Lead]


class HealthResponse(BaseModel):
    status: str
    service: str = "lead-generation-api"


class ErrorResponse(BaseModel):
    detail: str
