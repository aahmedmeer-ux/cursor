#!/usr/bin/env python3
"""Transform mirrored ClassyLlama site into digivistaUS with Amazon services."""

from __future__ import annotations

import re
import shutil
import urllib.request
from pathlib import Path

SRC = Path("/tmp/cl-mirror/classyllama.com")
FONTS_G = Path("/tmp/cl-mirror/fonts.googleapis.com")
TYPEKIT = Path("/tmp/cl-mirror/use.typekit.net")
DST = Path("/workspace/site")
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"

AMAZON_NAV_ITEM = """
								<li class="elementor-icon-list-item">
											<a href="/amazon-services/">

											<span class="elementor-icon-list-text">Amazon Services</span>
											</a>
									</li>
"""

AMAZON_ICON_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true"><defs><style>.a{fill:#ede9e0}.b{fill:#ff9900}.c{fill:#232f3e}</style></defs><rect class="a" width="100" height="100" rx="12"/><path class="c" d="M22 38h56v8H22zm0 14h40v8H22z"/><path class="b" d="M28 68c12 8 32 8 44 0" fill="none" stroke="#ff9900" stroke-width="4" stroke-linecap="round"/></svg>"""

AMAZON_CARD = f"""
				<div class="elementor-element elementor-element-amazon01 elementor-view-default elementor-position-block-start elementor-mobile-position-block-start elementor-widget elementor-widget-icon-box" data-id="amazon01" data-element_type="widget" data-e-type="widget" data-widget_type="icon-box.default">
				<div class="elementor-widget-container">
							<div class="elementor-icon-box-wrapper">
						<div class="elementor-icon-box-icon">
				<a href="/amazon-services/" class="elementor-icon" tabindex="-1" aria-label="Amazon Services">
				{AMAZON_ICON_SVG}
				</a>
			</div>
						<div class="elementor-icon-box-content">
									<h3 class="elementor-icon-box-title">
						<a href="/amazon-services/" aria-label="Amazon Services">
							Amazon Services						</a>
					</h3>
									<p class="elementor-icon-box-description">
						Full-funnel Amazon marketplace growth — account management, advertising, catalog, A+ content, and FBA.					</p>
			</div>
		</div>
						</div>
				</div>
"""

AMAZON_PLATFORM_CARD = """
				<div class="elementor-element elementor-element-amazonplat e-con-full e-flex e-con e-child" data-id="amazonplat" data-element_type="container" data-e-type="container">
					<div class="elementor-element elementor-element-amazonplat2 elementor-widget elementor-widget-heading" data-id="amazonplat2" data-element_type="widget" data-e-type="widget" data-widget_type="heading.default">
				<div class="elementor-widget-container">
					<a href="/amazon-services/"><h2 class="elementor-heading-title elementor-size-default">Amazon</h2></a>				</div>
				</div>
					<div class="elementor-element elementor-element-amazonplat3 elementor-widget elementor-widget-text-editor" data-id="amazonplat3" data-element_type="widget" data-e-type="widget" data-widget_type="text-editor.default">
				<div class="elementor-widget-container">
									<p>Amazon Marketplace Partners</p>								</div>
				</div>
					<div class="elementor-element elementor-element-amazonplat4 elementor-widget elementor-widget-button" data-id="amazonplat4" data-element_type="widget" data-e-type="widget" data-widget_type="button.default">
				<div class="elementor-widget-container">
									<div class="elementor-button-wrapper">
					<a class="elementor-button elementor-button-link elementor-size-sm" href="/amazon-services/">
						<span class="elementor-button-content-wrapper">
									<span class="elementor-button-text">Click Here</span>
					</span>
					</a>
				</div>
								</div>
				</div>
				</div>
"""

DIGIVISTA_LOGO_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" role="img" aria-label="digivistaUS">
  <rect width="360" height="180" fill="none"/>
  <text x="180" y="88" text-anchor="middle" font-family="Aktiv Grotesk, Arial Black, Helvetica, sans-serif" font-size="42" font-weight="800" fill="#FFFFFF">digivista<tspan fill="#8EB2B6">US</tspan></text>
  <text x="180" y="122" text-anchor="middle" font-family="Aktiv Grotesk, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#BED2DB">ECOMMERCE &amp; AMAZON</text>
</svg>
"""

DIGIVISTA_LOGO_DARK_SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 180" role="img" aria-label="digivistaUS">
  <rect width="360" height="180" fill="none"/>
  <text x="180" y="88" text-anchor="middle" font-family="Aktiv Grotesk, Arial Black, Helvetica, sans-serif" font-size="42" font-weight="800" fill="#272525">digivista<tspan fill="#576D76">US</tspan></text>
  <text x="180" y="122" text-anchor="middle" font-family="Aktiv Grotesk, Helvetica, sans-serif" font-size="14" letter-spacing="3" fill="#576D76">ECOMMERCE &amp; AMAZON</text>
</svg>
"""


def fetch(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            dest.write_bytes(resp.read())
        print("fetched", url)
    except Exception as e:
        print("skip", url, e)


def rewrite_urls(html: str, depth: int) -> str:
    prefix = "../" * depth if depth else ""

    def page_map(path: str) -> str:
        path = path.strip("/")
        mapping = {
            "": f"{prefix}index.html",
            "services": f"{prefix}services/index.html",
            "ecommerce-development-services": f"{prefix}ecommerce-development-services/index.html",
            "ecommerce": f"{prefix}ecommerce-development-services/index.html",
            "marketing-services": f"{prefix}marketing-services/index.html",
            "marketing": f"{prefix}marketing-services/index.html",
            "software-integrations": f"{prefix}software-integrations/index.html",
            "data-management": f"{prefix}data-management/index.html",
            "b2b-portals": f"{prefix}b2b-portals/index.html",
            "ai-strategy-consulting": f"{prefix}ai-strategy-consulting/index.html",
            "ai-traction": f"{prefix}ai-strategy-consulting/index.html",
            "about": f"{prefix}about/index.html",
            "contact": f"{prefix}contact/index.html",
            "partners": f"{prefix}partners/index.html",
            "client-wins": f"{prefix}client-wins/index.html",
            "adobe-commerce": f"{prefix}adobe-commerce/index.html",
            "shopify": f"{prefix}shopify/index.html",
            "bigcommerce": f"{prefix}bigcommerce/index.html",
            "magento": f"{prefix}magento/index.html",
            "amazon-services": f"{prefix}amazon-services/index.html",
            "careers": f"{prefix}contact/index.html",
        }
        # anchors
        if "#" in path:
            base, frag = path.split("#", 1)
            return page_map(base) + f"#{frag}"
        return mapping.get(path, f"{prefix}{path}/index.html" if path else f"{prefix}index.html")

    def abs_repl(m: re.Match[str]) -> str:
        url = m.group(0)
        if "/wp-content/" in url or "/wp-includes/" in url:
            path = url.split("classyllama.com/", 1)[-1]
            return f"{prefix}{path}"
        path = url.split("classyllama.com", 1)[-1]
        return page_map(path)

    html = re.sub(r"https?://(?:www\.)?classyllama\.com[^\"'\s<>]*", abs_repl, html)
    # Fix converted wget relative oddities pointing outside
    html = html.replace("https://classyllama.com", "")
    return html


def rebrand(html: str) -> str:
    replacements = [
        ("Classy Llama", "digivistaUS"),
        ("ClassyLlama", "digivistaUS"),
        ("CLASSY LLAMA", "DIGIVISTAUS"),
        ("classy llama", "digivistaUS"),
        ("the Llama Team", "the digivistaUS Team"),
        ("The Llama Team", "The digivistaUS Team"),
        ("Llama Team", "digivistaUS Team"),
        ("Join the Herd", "Join digivistaUS"),
        ("Leading The Herd", "Leading digivistaUS"),
        ("the Herd", "the Team"),
        ("Ready to Connect with the digivistaUS Team?", "Ready to Connect with the digivistaUS Team?"),
    ]
    for old, new in replacements:
        html = html.replace(old, new)

    # Titles / meta
    html = re.sub(
        r"<title>[^<]*</title>",
        "<title>digivistaUS | Mid-Market Ecommerce &amp; Amazon Services</title>",
        html,
        count=1,
        flags=re.I,
    )
    html = re.sub(
        r'property="og:site_name" content="[^"]*"',
        'property="og:site_name" content="digivistaUS"',
        html,
    )
    html = re.sub(
        r'property="og:title" content="[^"]*"',
        'property="og:title" content="digivistaUS | Mid-Market Ecommerce &amp; Amazon Services"',
        html,
    )

    # Replace logo images with digivistaUS SVG
    html = re.sub(
        r'<img([^>]*Classy-Llama-Logos[^>]*)>',
        r'<img\1 src="/assets/digivistaus-logo.svg" onerror="this.src=\'/assets/digivistaus-logo.svg\'" />'.replace(
            r"\1 src=", " width=\"360\" height=\"180\" class=\"attachment-full size-full digivista-logo\" alt=\"digivistaUS\" src="
        ),
        html,
        flags=re.I,
    )
    # Broader logo swap for header/footer logo paths
    html = re.sub(
        r'src="([^"]*Classy-Llama-Logos[^"]*)"',
        'src="/assets/digivistaus-logo.svg"',
        html,
        flags=re.I,
    )
    html = re.sub(
        r"src='([^']*Classy-Llama-Logos[^']*)'",
        "src='/assets/digivistaus-logo.svg'",
        html,
        flags=re.I,
    )
    html = re.sub(
        r'data-src="([^"]*Classy-Llama-Logos[^"]*)"',
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

    # Favicons
    html = re.sub(
        r'href="[^"]*cropped-Classy-Llama[^"]*"',
        'href="/assets/digivistaus-mark.svg"',
        html,
        flags=re.I,
    )
    return html


def inject_amazon_nav(html: str) -> str:
    # Insert Amazon Services as first item in services icon lists
    pattern = r'(<ul class="elementor-icon-list-items">\s*<li class="elementor-icon-list-item">\s*<a href="[^"]*(?:ai-traction|ai-strategy|b2b-portals)[^"]*")'
    # Prefer inserting before AI Traction list item specifically
    html = html.replace(
        '<span class="elementor-icon-list-text">AI Traction</span>',
        '<span class="elementor-icon-list-text">AI Traction</span>',
        1,
    )
    marker = """<li class="elementor-icon-list-item">
											<a href="/ai-strategy-consulting/index.html">

											<span class="elementor-icon-list-text">AI Traction</span>"""
    # After URL rewrite, links vary. Use flexible insert before first AI Traction list text in each list.
    def insert_before_ai(m: re.Match[str]) -> str:
        block = m.group(0)
        if "Amazon Services" in block:
            return block
        return AMAZON_NAV_ITEM + block

    html = re.sub(
        r'<li class="elementor-icon-list-item">\s*<a href="[^"]+">\s*<span class="elementor-icon-list-text">AI Traction</span>',
        insert_before_ai,
        html,
        flags=re.I,
    )

    # Also insert before Ecommerce Development in mega icon-box menus if present as first service style
    # Homepage services grid: insert Amazon card before first Ecommerce icon-box title block
    ecommerce_card_anchor = '<h3 class="elementor-icon-box-title">\n\t\t\t\t\t\t<a href="'
    # Find Ecommerce service card specifically
    m = re.search(
        r'(<div class="elementor-element[^"]*elementor-widget-icon-box"[^>]*>\s*<div class="elementor-widget-container">\s*<div class="elementor-icon-box-wrapper">[\s\S]*?<h3 class="elementor-icon-box-title">\s*<a[^>]*>\s*Ecommerce\s*</a>)',
        html,
        re.I,
    )
    if m and "Amazon Services" not in html[m.start() - 500 : m.start()]:
        html = html[: m.start()] + AMAZON_CARD + html[m.start() :]

    # Services explore page: inject list entry
    html = re.sub(
        r'(<h3[^>]*>\s*Ecommerce\s*</h3>)',
        r'<h3 class="elementor-heading-title elementor-size-default"><a href="/amazon-services/">Amazon Services</a></h3>\n\1',
        html,
        count=1,
        flags=re.I,
    )
    return html


def inject_amazon_platform(html: str) -> str:
    # Insert Amazon platform tile near Adobe/Shopify membership cards if present
    if "Amazon Marketplace Partners" in html:
        return html
    m = re.search(r'(Adobe(?:\s|&nbsp;)*Silver Partner|Adobe</h2>|Adobe Commerce)', html, re.I)
    # Prefer inserting before Adobe container heading on homepage partner strip
    m2 = re.search(
        r'<h2 class="elementor-heading-title elementor-size-default">\s*Adobe\s*</h2>',
        html,
        re.I,
    )
    if m2:
        # Find parent container start roughly
        start = html.rfind('<div class="elementor-element', 0, m2.start())
        if start > 0:
            html = html[:start] + AMAZON_PLATFORM_CARD + html[start:]
            return html
    # Platforms nav list
    html = re.sub(
        r'(<span class="elementor-icon-list-text">Adobe Commerce</span>)',
        r'<span class="elementor-icon-list-text">Amazon</span></a></li><li class="elementor-icon-list-item"><a href="/amazon-services/"><span class="elementor-icon-list-text">Adobe Commerce</span>',
        html,
        count=1,
    )
    return html


def build_amazon_page(template: Path, dest: Path) -> None:
    html = template.read_text(errors="ignore")
    # Heavy content replacement for Amazon details while keeping layout/CSS/JS
    html = re.sub(r"<title>[^<]*</title>", "<title>Amazon Services | digivistaUS</title>", html, count=1, flags=re.I)
    replacements = {
        "Ecommerce Development Services from digivistaUS": "Amazon Services from digivistaUS",
        "Ecommerce Development Services from Classy Llama": "Amazon Services from digivistaUS",
        "ECOMMERCE": "AMAZON SERVICES",
        "Empowering Your Success in the Digital Marketplace": "Grow Your Brand on Amazon with Full-Funnel Expertise",
        "With over 17 years of experience in ecommerce, we craft tailored solutions that can 2x site speed, increase orders 20%+, and 4x user sessions. Numerous clients have a 38% average revenue gain.": "digivistaUS delivers comprehensive Amazon marketplace services — Seller &amp; Vendor Central management, advertising optimization, cataloging, imaging, A+ Content, Brand Stores, FBA prep, compliance, international expansion, and brand protection.",
        "Platform Development": "Account Management",
        "Scalable, user-friendly ecommerce platforms designed for growth. Whether building from scratch or optimizing an existing solution, our team ensures seamless functionality and a powerful customer experience.": "End-to-end Seller Central and Vendor Central management — strategy, operations, listing hygiene, inventory planning, and performance reviews.",
        "Optimization": "Advertising Optimization",
        "Enhanced ecommerce platforms to improve performance and efficiency. From optimizing site speed and user flows to integrating advanced features, we help maximize conversions and engagement.": "Sponsored Products, Sponsored Brands, Sponsored Display, and Amazon DSP with continuous bid, keyword, and creative optimization for stronger ROAS.",
        "Security": "Cataloging &amp; Listing Optimization",
        "Security is our priority. We build platforms with robust protections to safeguard your data and provide peace of mind for you and your customers, ensuring compliance and trust.": "Listing creation, bulk uploads, backend search terms, attribute completeness, and conversion-focused copy that improves discoverability and Buy Box competitiveness.",
        "Talk to our ecommerce experts today.": "Talk to our Amazon experts today.",
        "Talk to our ecommerce experts today": "Talk to our Amazon experts today",
    }
    for old, new in replacements.items():
        html = html.replace(old, new)

    # Append detailed Amazon offerings section before footer CTA if possible
    details = """
<section class="elementor-section elementor-top-section" style="padding:60px 20px;background:#f8f6f3;">
  <div class="elementor-container" style="max-width:1140px;margin:0 auto;">
    <h2 style="font-family:aktiv-grotesk,Helvetica,sans-serif;font-size:2rem;color:#272525;margin-bottom:1rem;">Complete Amazon Offering — All the Details</h2>
    <p style="color:#576D76;max-width:760px;margin-bottom:2rem;">Alongside ecommerce, marketing, integrations, data, B2B portals, and AI, digivistaUS provides full Amazon marketplace expertise.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1rem;">
"""
    offerings = [
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
    ]
    for title, body in offerings:
        details += f'<article style="background:#fff;border:1px solid #d1cec6;border-radius:12px;padding:1.25rem;"><h3 style="margin:0 0 .5rem;color:#272525;font-size:1.05rem;">{title}</h3><p style="margin:0;color:#576D76;font-size:.95rem;">{body}</p></article>'
    details += "</div></div></section>"

    # Insert before common footer connect banner / closing body
    insert_at = html.lower().rfind("<footer")
    if insert_at < 0:
        insert_at = html.lower().rfind("</body>")
    if insert_at > 0:
        html = html[:insert_at] + details + html[insert_at:]
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html)
    print("wrote amazon page", dest)


def process_html_file(path: Path, root: Path) -> None:
    rel = path.relative_to(root)
    depth = len(rel.parts) - 1
    html = path.read_text(errors="ignore")
    html = rewrite_urls(html, depth)
    html = rebrand(html)
    html = inject_amazon_nav(html)
    if path.name == "index.html" and path.parent == root:
        html = inject_amazon_platform(html)
    # Point typekit / google font local copies when present
    html = html.replace("//fonts.googleapis.com", "/vendor/fonts.googleapis.com")
    html = html.replace("https://fonts.googleapis.com", "/vendor/fonts.googleapis.com")
    html = html.replace("https://use.typekit.net", "/vendor/use.typekit.net")
    html = html.replace("//use.typekit.net", "/vendor/use.typekit.net")
    path.write_text(html)


def main() -> None:
    if DST.exists():
        shutil.rmtree(DST)
    print("copying mirror...")
    shutil.copytree(SRC, DST)

    # Vendor fonts
    vendor = DST / "vendor"
    vendor.mkdir(exist_ok=True)
    if FONTS_G.exists():
        shutil.copytree(FONTS_G, vendor / "fonts.googleapis.com", dirs_exist_ok=True)
    if TYPEKIT.exists():
        shutil.copytree(TYPEKIT, vendor / "use.typekit.net", dirs_exist_ok=True)

    # Assets / logos
    assets = DST / "assets"
    assets.mkdir(exist_ok=True)
    (assets / "digivistaus-logo.svg").write_text(DIGIVISTA_LOGO_SVG)
    (assets / "digivistaus-logo-dark.svg").write_text(DIGIVISTA_LOGO_DARK_SVG)
    (assets / "digivistaus-mark.svg").write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#576D76"/><text x="32" y="40" text-anchor="middle" font-family="Arial Black, Helvetica, sans-serif" font-size="18" font-weight="800" fill="#fff">dV</text></svg>"""
    )

    # Download remaining remote lazy assets into wp-content
    html_files = list(DST.rglob("*.html"))
    remote_assets = set()
    for p in html_files:
        text = p.read_text(errors="ignore")
        remote_assets.update(re.findall(r"https://classyllama\.com/(wp-content/[^\"'\s<>]+)", text))
        remote_assets.update(re.findall(r"https://classyllama\.com/(wp-includes/[^\"'\s<>]+)", text))
    for rel in sorted(remote_assets):
        fetch(f"https://classyllama.com/{rel}", DST / rel)

    # Build Amazon page from ecommerce template before global rewrite of that file copy
    template = DST / "ecommerce-development-services" / "index.html"
    amazon_dir = DST / "amazon-services"
    if template.exists():
        shutil.copytree(template.parent, amazon_dir, dirs_exist_ok=True)
        build_amazon_page(amazon_dir / "index.html", amazon_dir / "index.html")

    # Process all HTML
    for p in DST.rglob("*.html"):
        process_html_file(p, DST)
        print("processed", p.relative_to(DST))

    # SPA-ish fallbacks
    (DST / "404.html").write_text((DST / "index.html").read_text(errors="ignore"))
    (DST / "_redirects").write_text("/*    /index.html   200\n")

    # Tiny CSS override to keep logo sizing
    override = DST / "assets" / "digivista-overrides.css"
    override.write_text(
        """
.digivista-logo, img[src*="digivistaus-logo"] { max-height: 64px; width: auto; height: auto; }
img[src*="digivistaus-logo"] { object-fit: contain; }
"""
    )
    # Inject override stylesheet into all pages
    for p in DST.rglob("*.html"):
        html = p.read_text(errors="ignore")
        if "digivista-overrides.css" not in html:
            html = html.replace(
                "</head>",
                '<link rel="stylesheet" href="/assets/digivista-overrides.css" /></head>',
                1,
            )
            p.write_text(html)

    print("DONE site at", DST)
    print("size", sum(f.stat().st_size for f in DST.rglob('*') if f.is_file()) // (1024*1024), "MB")


if __name__ == "__main__":
    main()
