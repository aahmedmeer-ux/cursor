#!/usr/bin/env python3
"""Build digivistaUS as an exact ClassyLlama visual clone with local HTML + remote assets."""

from __future__ import annotations

import re
import shutil
import urllib.request
from pathlib import Path

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
DST = Path("/workspace/site")

PAGES = {
    "": "https://classyllama.com/",
    "services": "https://classyllama.com/services/",
    "ecommerce-development-services": "https://classyllama.com/ecommerce-development-services/",
    "marketing-services": "https://classyllama.com/marketing-services/",
    "software-integrations": "https://classyllama.com/software-integrations/",
    "data-management": "https://classyllama.com/data-management/",
    "b2b-portals": "https://classyllama.com/b2b-portals/",
    "ai-strategy-consulting": "https://classyllama.com/ai-strategy-consulting/",
    "about": "https://classyllama.com/about/",
    "contact": "https://classyllama.com/contact/",
    "partners": "https://classyllama.com/partners/",
    "client-wins": "https://classyllama.com/client-wins/",
    "adobe-commerce": "https://classyllama.com/adobe-commerce/",
    "shopify": "https://classyllama.com/shopify/",
    "bigcommerce": "https://classyllama.com/bigcommerce/",
    "magento": "https://classyllama.com/magento/",
}

LOCAL_ROUTE = {
    "": "/",
    "services": "/services/",
    "ecommerce-development-services": "/ecommerce-development-services/",
    "ecommerce": "/ecommerce-development-services/",
    "marketing-services": "/marketing-services/",
    "marketing": "/marketing-services/",
    "software-integrations": "/software-integrations/",
    "data-management": "/data-management/",
    "b2b-portals": "/b2b-portals/",
    "ai-strategy-consulting": "/ai-strategy-consulting/",
    "ai-traction": "/ai-strategy-consulting/",
    "about": "/about/",
    "contact": "/contact/",
    "partners": "/partners/",
    "client-wins": "/client-wins/",
    "adobe-commerce": "/adobe-commerce/",
    "shopify": "/shopify/",
    "bigcommerce": "/bigcommerce/",
    "magento": "/magento/",
    "amazon-services": "/amazon-services/",
    "careers": "/contact/",
    "celigo-integrations": "/software-integrations/",
    "google-analytics": "/data-management/",
    "adobe-experience-manager": "/adobe-commerce/",
}

AMAZON_NAV = """
<li class="elementor-icon-list-item">
  <a href="/amazon-services/"><span class="elementor-icon-list-text">Amazon Services</span></a>
</li>
"""

AMAZON_SLIDE = """<div class="elementor-repeater-item-amazon01 swiper-slide" role="group" aria-roledescription="slide"><div class="swiper-slide-bg" role="img" aria-label="Amazon Marketplace" style="background:#232f3e;"></div><a class="swiper-slide-inner" href="/amazon-services/"><div class="swiper-slide-contents"><div class="elementor-slide-heading">Amazon</div><div class="elementor-slide-description">Amazon Marketplace Partners</div><div  class="elementor-button elementor-slide-button elementor-size-sm">Click Here</div></div></a></div>"""

AMAZON_CARD = """
<div class="elementor-element elementor-element-amazon01 elementor-view-default elementor-position-block-start elementor-mobile-position-block-start elementor-widget elementor-widget-icon-box" data-id="amazon01" data-element_type="widget" data-e-type="widget" data-widget_type="icon-box.default">
  <div class="elementor-widget-container">
    <div class="elementor-icon-box-wrapper">
      <div class="elementor-icon-box-icon">
        <a href="/amazon-services/" class="elementor-icon" tabindex="-1" aria-label="Amazon Services">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="#ede9e0"/><path d="M22 38h56v8H22zm0 14h40v8H22z" fill="#232f3e"/><path d="M28 68c12 8 32 8 44 0" fill="none" stroke="#ff9900" stroke-width="4" stroke-linecap="round"/></svg>
        </a>
      </div>
      <div class="elementor-icon-box-content">
        <h3 class="elementor-icon-box-title"><a href="/amazon-services/" aria-label="Amazon Services">Amazon Services</a></h3>
        <p class="elementor-icon-box-description">Full-funnel Amazon marketplace growth — account management, advertising, catalog, A+ content, and FBA.</p>
      </div>
    </div>
  </div>
</div>
"""

LOGO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" role="img" aria-label="digivistaUS">
  <rect width="360" height="180" fill="none"/>
  <text x="180" y="88" text-anchor="middle" font-family="aktiv-grotesk, Helvetica, Arial, sans-serif" font-size="42" font-weight="800" fill="#FFFFFF">digivista<tspan fill="#8EB2B6">US</tspan></text>
  <text x="180" y="122" text-anchor="middle" font-family="aktiv-grotesk, Helvetica, Arial, sans-serif" font-size="13" letter-spacing="2.5" fill="#BED2DB">ECOMMERCE &amp; AMAZON</text>
</svg>
"""

MARK_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#576D76"/><text x="32" y="40" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="18" font-weight="800" fill="#fff">dV</text></svg>"""


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", "ignore")


def map_internal_links(html: str) -> str:
    def repl(m: re.Match[str]) -> str:
        full = m.group(0)
        path = m.group(1) or ""
        # Keep wp-content / wp-includes / feeds / api on classyllama CDN
        if path.startswith("wp-content") or path.startswith("wp-includes") or path.startswith("wp-json") or path.startswith("wp-admin"):
            return full
        if path.startswith("xmlrpc") or path.startswith("feed") or path.startswith("comments/feed") or "?s=" in path:
            return full
        # Strip trailing slash for map key
        key = path.strip("/")
        frag = ""
        if "#" in key:
            key, frag = key.split("#", 1)
            frag = "#" + frag
        if key in LOCAL_ROUTE:
            return LOCAL_ROUTE[key] + frag
        # Unknown page -> contact or home
        if not key:
            return "/" + frag
        return full  # leave unknown absolute as-is (CDN etc. already filtered)

    html = re.sub(r"https?://(?:www\.)?classyllama\.com/([^\"'\s<>]*)", repl, html)
    # Protocol-relative asset URLs only — do not match inside https://
    html = re.sub(
        r"(?<!:)//(?:www\.)?classyllama\.com/(wp-content/|wp-includes/)",
        r"https://classyllama.com/\1",
        html,
    )
    return html


def rebrand(html: str, title: str | None = None) -> str:
    pairs = [
        ("Classy Llama", "digivistaUS"),
        ("ClassyLlama", "digivistaUS"),
        ("CLASSY LLAMA", "DIGIVISTAUS"),
        ("classy llama", "digivistaUS"),
        ("the Llama Team", "the digivistaUS Team"),
        ("The Llama Team", "The digivistaUS Team"),
        ("Llama Team", "digivistaUS Team"),
        ("Join the Herd", "Join digivistaUS"),
        ("Leading The Herd", "Leading digivistaUS"),
        ("Ready to Connect with the digivistaUS Team?", "Ready to Connect with the digivistaUS Team?"),
    ]
    for a, b in pairs:
        html = html.replace(a, b)

    if title:
        html = re.sub(r"<title>[^<]*</title>", f"<title>{title}</title>", html, count=1, flags=re.I)
    else:
        html = re.sub(
            r"<title>[^<]*</title>",
            "<title>digivistaUS | Mid-Market Ecommerce &amp; Amazon Services</title>",
            html,
            count=1,
            flags=re.I,
        )

    html = re.sub(r'property="og:site_name" content="[^"]*"', 'property="og:site_name" content="digivistaUS"', html)
    html = re.sub(
        r'property="og:title" content="[^"]*"',
        'property="og:title" content="digivistaUS | Mid-Market Ecommerce &amp; Amazon Services"',
        html,
    )

    # Logo swaps (keep layout classes; point to local brand mark)
    html = re.sub(
        r'src="(https://classyllama\.com)?/wp-content/uploads/[^"]*Classy-Llama-Logos[^"]*"',
        'src="/assets/digivistaus-logo.svg"',
        html,
        flags=re.I,
    )
    html = re.sub(
        r"src='(https://classyllama\.com)?/wp-content/uploads/[^']*Classy-Llama-Logos[^']*'",
        "src='/assets/digivistaus-logo.svg'",
        html,
        flags=re.I,
    )
    html = re.sub(
        r'data-src="(https://classyllama\.com)?/wp-content/uploads/[^"]*Classy-Llama-Logos[^"]*"',
        'data-src="/assets/digivistaus-logo.svg"',
        html,
        flags=re.I,
    )
    html = re.sub(
        r'srcset="[^"]*Classy-Llama-Logos[^"]*"',
        'srcset="/assets/digivistaus-logo.svg"',
        html,
        flags=re.I,
    )
    html = re.sub(
        r'href="(https://classyllama\.com)?/wp-content/uploads/[^"]*cropped-Classy-Llama[^"]*"',
        'href="/assets/digivistaus-mark.svg"',
        html,
        flags=re.I,
    )

    # Socials
    html = html.replace("https://www.instagram.com/classyllama/", "#")
    html = html.replace("https://x.com/classyllama?lang=en", "#")
    html = html.replace("https://www.youtube.com/classyllama", "#")
    return html


def inject_amazon(html: str, is_home: bool = False) -> str:
    # Nav lists: before AI Traction
    html = re.sub(
        r'(<li class="elementor-icon-list-item">\s*<a href="[^"]*(?:ai-traction|ai-strategy-consulting)[^"]*"[\s\S]*?<span class="elementor-icon-list-text">AI Traction</span>)',
        AMAZON_NAV + r"\1",
        html,
        flags=re.I,
    )

    # Homepage service cards
    if is_home:
        m = re.search(
            r'(<div class="elementor-element[^>]*elementor-widget-icon-box"[^>]*>\s*<div class="elementor-widget-container">\s*<div class="elementor-icon-box-wrapper">[\s\S]*?<h3 class="elementor-icon-box-title">\s*<a[^>]*>\s*Ecommerce\s*</a>)',
            html,
            re.I,
        )
        if m and "elementor-element-amazon01" not in html:
            html = html[: m.start()] + AMAZON_CARD + html[m.start() :]

        # Platform swiper: insert Amazon before Adobe slide
        marker = 'elementor-repeater-item-e58bfb5 swiper-slide'
        if "Amazon Marketplace Partners" not in html and marker in html:
            i = html.find(marker)
            start = html.rfind("<div", 0, i)
            html = html[:start] + AMAZON_SLIDE + html[start:]

    return html


def amazonize(html: str) -> str:
    html = rebrand(html, title="Amazon Services | digivistaUS")
    html = map_internal_links(html)
    html = inject_amazon(html)
    subs = [
        ("ECOMMERCE", "AMAZON SERVICES"),
        ("Empowering Your Success in the <strong>Digital</strong> Marketplace", "Grow Your Brand on Amazon with Full-Funnel Expertise"),
        ("Empowering Your Success in the Digital Marketplace", "Grow Your Brand on Amazon with Full-Funnel Expertise"),
        (
            "With over 17 years of experience in ecommerce, we craft tailored solutions that can 2x site speed, increase orders 20%+, and 4x user sessions. Numerous clients have a 38% average revenue gain.",
            "digivistaUS delivers comprehensive Amazon marketplace services — Seller &amp; Vendor Central management, advertising optimization, cataloging, imaging, A+ Content, Brand Stores, FBA prep, compliance, international expansion, and brand protection.",
        ),
        ("Platform Development", "Account Management"),
        (
            "Scalable, user-friendly ecommerce platforms designed for growth. Whether building from scratch or optimizing an existing solution, our team ensures seamless functionality and a powerful customer experience.",
            "End-to-end Seller Central and Vendor Central management — strategy, operations, listing hygiene, inventory planning, and performance reviews.",
        ),
        ("Optimization", "Advertising Optimization"),
        (
            "Enhanced ecommerce platforms to improve performance and efficiency. From optimizing site speed and user flows to integrating advanced features, we help maximize conversions and engagement.",
            "Sponsored Products, Sponsored Brands, Sponsored Display, and Amazon DSP with continuous bid, keyword, and creative optimization for stronger ROAS.",
        ),
        ("Security", "Catalog &amp; Listings"),
        (
            "Security is our priority. We build platforms with robust protections to safeguard your data and provide peace of mind for you and your customers, ensuring compliance and trust.",
            "Listing creation, bulk uploads, backend search terms, attribute completeness, and conversion-focused copy that improves discoverability and Buy Box competitiveness.",
        ),
        ("Talk to our ecommerce experts today.", "Talk to our Amazon experts today."),
        ("Talk to our ecommerce experts today", "Talk to our Amazon experts today"),
        ("Our Preferred Platforms", "Amazon Channels We Support"),
    ]
    for a, b in subs:
        html = html.replace(a, b)

    details = """
<section style="padding:60px 20px;background:#f8f6f3;">
  <div style="max-width:1140px;margin:0 auto;">
    <h2 style="font-family:aktiv-grotesk,Helvetica,sans-serif;font-size:2rem;color:#272525;margin-bottom:1rem;">Complete Amazon Offering — All the Details</h2>
    <p style="color:#576D76;max-width:760px;margin-bottom:2rem;">Alongside ecommerce, marketing, integrations, data, B2B portals, and AI, digivistaUS provides full Amazon marketplace expertise.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">
"""
    for title, body in [
        ("Imaging & Creative", "Product photography, lifestyle imagery, infographics, and videos that meet Amazon requirements and convert."),
        ("A+ Content & Brand Stores", "Enhanced Brand Content modules and Brand Store design that lift conversion and tell your brand story."),
        ("FBA Preparation & Logistics", "FBA prep, labeling, bundling, inbound shipment coordination, and inventory health practices."),
        ("Compliance & Account Health", "Policy compliance monitoring, account health recovery, and reinstatement support."),
        ("International Expansion", "Global selling strategy, marketplace entry, cross-border logistics, and localization."),
        ("Brand Protection & IP", "Brand Registry support, unauthorized seller monitoring, and trademark protection workflows."),
        ("Analytics & Reporting", "Dashboards covering advertising, organic rank, inventory turns, and contribution margin."),
        ("Taxes & Financial Ops", "Marketplace financial reconciliation support and reporting for finance teams."),
        ("Training & Enablement", "Seller education so your internal team operates Amazon with confidence."),
        ("Amazon + Your Stack", "Connect Amazon operations to Adobe Commerce, Magento, Shopify, and BigCommerce."),
        ("PPC & DSP Management", "Hands-on management of Sponsored ads and DSP aligned to margin goals."),
        ("Seller & Vendor Central", "Support for 3P, 1P, and hybrid brands across mature and launch-stage catalogs."),
    ]:
        details += f'<article style="background:#fff;border:1px solid #d1cec6;border-radius:12px;padding:1.25rem;"><h3 style="margin:0 0 .5rem;color:#272525;font-size:1.05rem;">{title}</h3><p style="margin:0;color:#576D76;font-size:.95rem;">{body}</p></article>'
    details += "</div></div></section>"
    insert_at = html.lower().rfind("<footer")
    if insert_at < 0:
        insert_at = html.lower().rfind("</body>")
    html = html[:insert_at] + details + html[insert_at:]

    # Ensure brand assets override stylesheet
    if "digivista-overrides.css" not in html:
        html = html.replace(
            "</head>",
            '<link rel="stylesheet" href="/assets/digivista-overrides.css" /></head>',
            1,
        )
    return html


def process(html: str, is_home: bool = False) -> str:
    html = rebrand(html)
    html = map_internal_links(html)
    html = inject_amazon(html, is_home=is_home)
    if "digivista-overrides.css" not in html:
        html = html.replace(
            "</head>",
            '<link rel="stylesheet" href="/assets/digivista-overrides.css" /></head>',
            1,
        )
    return html


def write_page(slug: str, html: str) -> None:
    if slug:
        dest = DST / slug / "index.html"
    else:
        dest = DST / "index.html"
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html)
    print("wrote", dest.relative_to(DST), "bytes", len(html))


def main() -> None:
    if DST.exists():
        shutil.rmtree(DST)
    DST.mkdir(parents=True)
    assets = DST / "assets"
    assets.mkdir()
    (assets / "digivistaus-logo.svg").write_text(LOGO_SVG)
    (assets / "digivistaus-mark.svg").write_text(MARK_SVG)
    (assets / "digivista-overrides.css").write_text(
        """
img[src*="digivistaus-logo"], .digivista-logo {
  max-height: 72px !important;
  width: auto !important;
  height: auto !important;
  object-fit: contain;
}
"""
    )

    ecommerce_html = None
    for slug, url in PAGES.items():
        print("fetch", url)
        html = fetch(url)
        if slug == "ecommerce-development-services":
            ecommerce_html = html
        html = process(html, is_home=(slug == ""))
        write_page(slug, html)

    if ecommerce_html is None:
        ecommerce_html = fetch(PAGES["ecommerce-development-services"])
    write_page("amazon-services", amazonize(ecommerce_html))

    # Fallbacks
    (DST / "404.html").write_text((DST / "index.html").read_text())
    (DST / "_redirects").write_text("/*    /index.html   200\n")
    print("DONE")


if __name__ == "__main__":
    main()
