import logging
import re
from html import unescape
from typing import Optional
from urllib.parse import urlparse

import httpx

from app.models import ContactHint, EnrichResponse

logger = logging.getLogger(__name__)

USER_AGENT = "LeadHunt/1.0 (+https://github.com/local; free-enrichment)"
EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
LINKEDIN_PERSON_RE = re.compile(
    r"https?://(?:www\.)?linkedin\.com/in/[A-Za-z0-9\-_%]+/?",
    re.I,
)
LINKEDIN_COMPANY_RE = re.compile(
    r"https?://(?:www\.)?linkedin\.com/company/[A-Za-z0-9\-_%]+/?",
    re.I,
)
NAME_NEAR_CONTACT_RE = re.compile(
    r"(?:hiring manager|recruiter|contact|posted by|reach out to)\s*[:\-]?\s*"
    r"([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})",
    re.I,
)
# Captures patterns like "Alexis Soulopoulos [CEO]" or "Jane Doe (Founder)"
TITLE_BRACKET_RE = re.compile(
    r"\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,2})\s*[\[(]"
    r"(CEO|CTO|CFO|CMO|COO|Founder|Co-?Founder|Co-founder|Hiring Manager|Recruiter)"
    r"[\])]",
)


def _clean_text(value: str | None) -> str:
    if not value:
        return ""
    text = unescape(re.sub(r"<[^>]+>", " ", value))
    return re.sub(r"\s+", " ", text).strip()


async def lookup_company_domain(company_name: str) -> tuple[Optional[str], Optional[str], Optional[str]]:
    """
    Best-effort company domain lookup via Clearbit Autocomplete (no API key).

    Returns (domain, website_url, logo_url).
    """
    query = company_name.strip()
    if not query:
        return None, None, None

    url = "https://autocomplete.clearbit.com/v1/companies/suggest"
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(
                url,
                params={"query": query},
                headers={"User-Agent": USER_AGENT},
            )
            response.raise_for_status()
            suggestions = response.json()
    except Exception:
        logger.exception("Clearbit company lookup failed for %r", company_name)
        return None, None, None

    if not isinstance(suggestions, list) or not suggestions:
        return None, None, None

    # Prefer closest name / domain match.
    query_l = query.lower()
    tokens = [t for t in re.split(r"[^a-z0-9]+", query_l) if len(t) > 2]

    def rank(item: dict) -> tuple[int, int]:
        name = str(item.get("name", "")).lower()
        domain = str(item.get("domain", "")).lower()
        if name == query_l:
            return (0, 0)
        if query_l in name or name in query_l:
            return (1, 0)
        token_hits = sum(1 for t in tokens if t in name or t in domain)
        return (2, -token_hits)

    ranked = sorted(suggestions, key=rank)
    top = ranked[0]
    # Reject weak suggestions with zero token overlap.
    name = str(top.get("name", "")).lower()
    domain = str(top.get("domain", "")).lower()
    if tokens and not any(t in name or t in domain for t in tokens):
        return None, None, None
    domain = top.get("domain")
    if not domain:
        return None, None, top.get("logo")
    return str(domain), f"https://{domain}", top.get("logo")


def extract_contacts_from_description(description: str | None) -> list[ContactHint]:
    text = _clean_text(description)
    if not text:
        return []

    contacts: list[ContactHint] = []
    seen: set[str] = set()

    for email in EMAIL_RE.findall(text):
        key = f"email:{email.lower()}"
        if key in seen:
            continue
        seen.add(key)
        contacts.append(ContactHint(kind="email", value=email, context="Found in job description"))

    for link in LINKEDIN_PERSON_RE.findall(description or ""):
        key = f"li:{link.rstrip('/').lower()}"
        if key in seen:
            continue
        seen.add(key)
        contacts.append(
            ContactHint(kind="linkedin_person", value=link, context="LinkedIn profile in job post")
        )

    for link in LINKEDIN_COMPANY_RE.findall(description or ""):
        key = f"lc:{link.rstrip('/').lower()}"
        if key in seen:
            continue
        seen.add(key)
        contacts.append(
            ContactHint(kind="linkedin_company", value=link, context="Company LinkedIn in job post")
        )

    for match in NAME_NEAR_CONTACT_RE.finditer(text):
        name = match.group(1).strip()
        key = f"mention:{name.lower()}"
        if key in seen:
            continue
        seen.add(key)
        contacts.append(
            ContactHint(
                kind="mention",
                value=name,
                context=match.group(0)[:120],
            )
        )

    for match in TITLE_BRACKET_RE.finditer(text):
        name = match.group(1).strip()
        title = match.group(2).strip()
        key = f"mention:{name.lower()}"
        if key in seen:
            continue
        seen.add(key)
        contacts.append(
            ContactHint(
                kind="mention",
                value=f"{name} ({title})",
                context="Found leadership/hiring title in job description",
            )
        )

    return contacts[:12]


async def enrich_company(
    company_name: str,
    description: str | None = None,
    job_url: str | None = None,
) -> EnrichResponse:
    domain, website_url, logo_url = await lookup_company_domain(company_name)
    contacts = extract_contacts_from_description(description)

    notes: list[str] = [
        "Free enrichment only — no paid Hunter/Apollo/Proxycurl lookups.",
        "Poster identity is inferred from the job text + public company domain hints.",
    ]

    if job_url:
        host = urlparse(job_url).netloc
        if host:
            notes.append(f"Original job link host: {host}")

    if not domain:
        notes.append("Could not confidently resolve a company website domain.")
    if not contacts:
        notes.append(
            "No email/LinkedIn/contact name found in the job text. "
            "Many boards hide the poster until you apply on-platform."
        )

    return EnrichResponse(
        company_name=company_name,
        website_domain=domain,
        website_url=website_url,
        logo_url=logo_url,
        contacts=contacts,
        notes=notes,
    )
