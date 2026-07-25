import asyncio
import logging
import re
from html import unescape
from typing import Any, Callable, Awaitable

import httpx

from app.models import JobPosting

logger = logging.getLogger(__name__)

USER_AGENT = "LeadHunt/1.0 (+https://github.com/local; free-job-aggregator)"
DEFAULT_HEADERS = {"User-Agent": USER_AGENT, "Accept": "application/json"}


def _strip_html(value: str | None, max_len: int = 280) -> str | None:
    if not value:
        return None
    text = unescape(re.sub(r"<[^>]+>", " ", value))
    text = re.sub(r"\s+", " ", text).strip()
    if not text:
        return None
    return text if len(text) <= max_len else text[: max_len - 1].rstrip() + "…"


def _matches_keyword(
    keyword: str,
    *fields: str | None,
    tag_field: str | None = None,
) -> bool:
    """
    Match keyword against primary text fields.

    RemoteOK often spam-tags unrelated jobs with popular skills (e.g. "python"),
    so tags alone are never enough — they only boost an already plausible match.
    """
    tokens = [t for t in re.split(r"\s+", keyword.lower()) if t]
    if not tokens:
        return False

    primary = " ".join(f for f in fields if f).lower()
    tags = (tag_field or "").lower()

    if all(token in primary for token in tokens):
        return True

    # Multi-word queries: allow near-complete primary matches.
    if len(tokens) >= 3:
        hits = sum(1 for token in tokens if token in primary)
        if hits >= max(2, len(tokens) - 1):
            return True

    # Tags may help only when at least one token already appears in primary text.
    if tags and any(token in primary for token in tokens):
        return all(token in f"{primary} {tags}" for token in tokens)

    return False


def _salary_from_minmax(min_v: Any, max_v: Any) -> str | None:
    try:
        lo = int(min_v) if min_v not in (None, "", 0) else None
        hi = int(max_v) if max_v not in (None, "", 0) else None
    except (TypeError, ValueError):
        return None
    if lo and hi:
        return f"${lo:,} – ${hi:,}"
    if lo:
        return f"From ${lo:,}"
    if hi:
        return f"Up to ${hi:,}"
    return None


async def fetch_remoteok(client: httpx.AsyncClient, keyword: str, limit: int) -> list[JobPosting]:
    response = await client.get("https://remoteok.com/api", headers=DEFAULT_HEADERS)
    response.raise_for_status()
    payload = response.json()
    jobs: list[JobPosting] = []

    for item in payload:
        if not isinstance(item, dict) or "position" not in item:
            continue
        title = str(item.get("position") or "")
        company = str(item.get("company") or "")
        tags = [str(t) for t in (item.get("tags") or []) if t]
        description = item.get("description")
        if not _matches_keyword(
            keyword,
            title,
            company,
            _strip_html(description, 2000),
            tag_field=" ".join(tags),
        ):
            continue

        job_id = str(item.get("id") or item.get("slug") or title)
        jobs.append(
            JobPosting(
                id=f"remoteok:{job_id}",
                title=title,
                company_name=company or "Unknown",
                source="RemoteOK",
                url=str(item.get("url") or item.get("apply_url") or ""),
                location=item.get("location") or "Remote",
                job_type=None,
                salary=_salary_from_minmax(item.get("salary_min"), item.get("salary_max")),
                tags=tags[:12],
                published_at=item.get("date"),
                description_snippet=_strip_html(description),
                description=_strip_html(description, 4000),
            )
        )
        if len(jobs) >= limit:
            break
    return jobs


async def fetch_remotive(client: httpx.AsyncClient, keyword: str, limit: int) -> list[JobPosting]:
    response = await client.get(
        "https://remotive.com/api/remote-jobs",
        params={"search": keyword, "limit": limit},
        headers=DEFAULT_HEADERS,
    )
    response.raise_for_status()
    payload = response.json()
    jobs: list[JobPosting] = []

    for item in payload.get("jobs") or []:
        title = str(item.get("title") or "")
        company = str(item.get("company_name") or "")
        tags = [str(t) for t in (item.get("tags") or []) if t]
        description = item.get("description")
        # Remotive search can be loose — keep only stronger keyword matches.
        if not _matches_keyword(
            keyword,
            title,
            company,
            item.get("category"),
            _strip_html(description, 2000),
            tag_field=" ".join(tags),
        ):
            continue
        jobs.append(
            JobPosting(
                id=f"remotive:{item.get('id')}",
                title=title,
                company_name=company or "Unknown",
                source="Remotive",
                url=str(item.get("url") or ""),
                location=item.get("candidate_required_location") or "Remote",
                job_type=item.get("job_type"),
                salary=item.get("salary"),
                tags=tags[:12] or ([item["category"]] if item.get("category") else []),
                published_at=item.get("publication_date"),
                description_snippet=_strip_html(description),
                description=_strip_html(description, 4000),
            )
        )
    return jobs


async def fetch_arbeitnow(client: httpx.AsyncClient, keyword: str, limit: int) -> list[JobPosting]:
    jobs: list[JobPosting] = []
    # Free endpoint is paginated; scan a few pages then keyword-filter locally.
    for page in range(1, 4):
        response = await client.get(
            "https://www.arbeitnow.com/api/job-board-api",
            params={"page": page},
            headers=DEFAULT_HEADERS,
        )
        response.raise_for_status()
        payload = response.json()
        for item in payload.get("data") or []:
            title = str(item.get("title") or "")
            company = str(item.get("company_name") or "")
            tags = [str(t) for t in (item.get("tags") or []) if t]
            job_types = [str(t) for t in (item.get("job_types") or []) if t]
            description = item.get("description")
            if not _matches_keyword(
                keyword,
                title,
                company,
                " ".join(job_types),
                _strip_html(description, 2000),
                tag_field=" ".join(tags),
            ):
                continue
            created = item.get("created_at")
            jobs.append(
                JobPosting(
                    id=f"arbeitnow:{item.get('slug')}",
                    title=title,
                    company_name=company or "Unknown",
                    source="Arbeitnow",
                    url=str(item.get("url") or ""),
                    location=("Remote" if item.get("remote") else item.get("location")),
                    job_type=", ".join(job_types) if job_types else None,
                    salary=None,
                    tags=tags[:12],
                    published_at=str(created) if created is not None else None,
                    description_snippet=_strip_html(description),
                    description=_strip_html(description, 4000),
                )
            )
            if len(jobs) >= limit:
                return jobs
    return jobs


SourceFetcher = Callable[[httpx.AsyncClient, str, int], Awaitable[list[JobPosting]]]

SOURCE_FETCHERS: dict[str, SourceFetcher] = {
    "RemoteOK": fetch_remoteok,
    "Remotive": fetch_remotive,
    "Arbeitnow": fetch_arbeitnow,
}


async def search_free_jobs(keyword: str, limit: int = 40) -> tuple[list[JobPosting], list[str], list[str]]:
    """
    Query free public job APIs in parallel and return merged, de-duplicated jobs.

    Returns (jobs, sources_queried, sources_ok).
    """
    sources_queried = list(SOURCE_FETCHERS.keys())
    sources_ok: list[str] = []
    collected: list[JobPosting] = []

    timeout = httpx.Timeout(25.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        tasks = {
            name: asyncio.create_task(fetcher(client, keyword, limit))
            for name, fetcher in SOURCE_FETCHERS.items()
        }
        for name, task in tasks.items():
            try:
                results = await task
                collected.extend(results)
                sources_ok.append(name)
                logger.info("%s returned %s matching jobs", name, len(results))
            except Exception:
                logger.exception("Failed fetching jobs from %s", name)

    # De-dupe by company+title (case-insensitive), keep first occurrence.
    seen: set[str] = set()
    unique: list[JobPosting] = []
    for job in collected:
        key = f"{job.company_name.strip().lower()}::{job.title.strip().lower()}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(job)

    # Prefer newer-looking Remotive dates roughly by keeping source diversity order
    # as collected; trim to limit.
    return unique[:limit], sources_queried, sources_ok
