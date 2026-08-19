import asyncio
import logging
from typing import Any

import httpx

from app.config import Settings
from app.models import Lead

logger = logging.getLogger(__name__)


class N8NWebhookError(Exception):
    """Raised when the n8n webhook fails or returns an unexpected payload."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        super().__init__(message)
        self.status_code = status_code


MOCK_LEADS: list[dict[str, Any]] = [
    {
        "company_name": "Northwind Commerce",
        "website_domain": "northwindcommerce.com",
        "decision_maker_name": "Ava Chen",
        "decision_maker_title": "CEO",
        "verified_email": "ava.chen@northwindcommerce.com",
        "linkedin_url": "https://www.linkedin.com/in/avachen",
    },
    {
        "company_name": "ParcelForge",
        "website_domain": "parcelforge.io",
        "decision_maker_name": "Marcus Reid",
        "decision_maker_title": "Founder",
        "verified_email": "marcus@parcelforge.io",
        "linkedin_url": "https://www.linkedin.com/in/marcusreid",
    },
    {
        "company_name": "ShelfStack Labs",
        "website_domain": "shelfstack.com",
        "decision_maker_name": "Priya Nair",
        "decision_maker_title": "Co-Founder & CEO",
        "verified_email": "priya.nair@shelfstack.com",
        "linkedin_url": "https://www.linkedin.com/in/priyanair",
    },
    {
        "company_name": "Atlas Fulfillment",
        "website_domain": "atlasfulfillment.co",
        "decision_maker_name": "Jordan Hale",
        "decision_maker_title": "CEO",
        "verified_email": "jordan.hale@atlasfulfillment.co",
        "linkedin_url": "https://www.linkedin.com/in/jordanhale",
    },
    {
        "company_name": "BrightCart Systems",
        "website_domain": "brightcart.systems",
        "decision_maker_name": "Elena Voss",
        "decision_maker_title": "Founder",
        "verified_email": "elena@brightcart.systems",
        "linkedin_url": "https://www.linkedin.com/in/elenavoss",
    },
]


def _normalize_leads(payload: Any) -> list[Lead]:
    """Accept either `{ "leads": [...] }` or a bare list of lead objects."""
    if isinstance(payload, dict):
        raw_leads = payload.get("leads")
        if raw_leads is None:
            raise N8NWebhookError(
                "n8n response missing required 'leads' array.",
                status_code=502,
            )
    elif isinstance(payload, list):
        raw_leads = payload
    else:
        raise N8NWebhookError(
            "n8n response must be a JSON object or array.",
            status_code=502,
        )

    if not isinstance(raw_leads, list):
        raise N8NWebhookError(
            "n8n 'leads' field must be an array.",
            status_code=502,
        )

    try:
        return [Lead.model_validate(item) for item in raw_leads]
    except Exception as exc:
        raise N8NWebhookError(
            f"n8n lead payload failed validation: {exc}",
            status_code=502,
        ) from exc


async def fetch_mock_leads(keyword: str) -> list[Lead]:
    """Simulate n8n processing latency for local/demo use."""
    logger.info("Using mock leads for keyword=%r (simulated 5s delay)", keyword)
    await asyncio.sleep(5)
    return [Lead.model_validate(item) for item in MOCK_LEADS]


async def fetch_leads_from_n8n(keyword: str, settings: Settings) -> tuple[list[Lead], str]:
    """
    POST the keyword to the n8n webhook and return (leads, source).

    Falls back to mock leads when USE_MOCK_LEADS is true, or when the
    webhook URL looks like a placeholder and mock mode is enabled.
    """
    webhook_url = settings.n8n_webhook_url.strip()
    is_placeholder = "your-n8n-instance.example.com" in webhook_url

    if settings.use_mock_leads or is_placeholder:
        leads = await fetch_mock_leads(keyword)
        return leads, "mock"

    payload = {"keyword": keyword}
    timeout = httpx.Timeout(settings.n8n_timeout_seconds)

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            response = await client.post(webhook_url, json=payload)
    except httpx.TimeoutException as exc:
        raise N8NWebhookError(
            f"n8n webhook timed out after {settings.n8n_timeout_seconds}s.",
            status_code=504,
        ) from exc
    except httpx.RequestError as exc:
        raise N8NWebhookError(
            f"Failed to reach n8n webhook: {exc}",
            status_code=502,
        ) from exc

    if response.status_code >= 500:
        raise N8NWebhookError(
            f"n8n webhook returned server error ({response.status_code}).",
            status_code=502,
        )

    if response.status_code >= 400:
        raise N8NWebhookError(
            f"n8n webhook rejected the request ({response.status_code}): {response.text[:300]}",
            status_code=502,
        )

    try:
        data = response.json()
    except ValueError as exc:
        raise N8NWebhookError(
            "n8n webhook returned non-JSON response.",
            status_code=502,
        ) from exc

    return _normalize_leads(data), "n8n"
