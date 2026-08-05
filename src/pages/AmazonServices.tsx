import { Link } from "react-router-dom";
import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import { amazonOfferings } from "../data/content";
import "./Services.css";

const highlights = [
  "Seller Central",
  "Vendor Central",
  "Amazon Ads & DSP",
  "FBA & Brand Registry",
];

const faqs = [
  {
    q: "What Amazon services does digivistaUS provide?",
    a: "We cover the full Amazon growth stack: account management, advertising optimization, cataloging, imaging, A+ Content, Brand Stores, FBA prep, compliance and account health, international expansion, brand protection, analytics, tax/financial ops support, and team training.",
  },
  {
    q: "Do you work with both Seller Central and Vendor Central brands?",
    a: "Yes. We support 1P (Vendor) and 3P (Seller) models, including hybrid brands that sell through both. Engagements are scoped around your catalog complexity, fulfillment model, and growth goals.",
  },
  {
    q: "Can you take over an underperforming Amazon advertising account?",
    a: "Absolutely. We frequently inherit Sponsored Products, Sponsored Brands, Sponsored Display, and DSP programs — clean up structure and tracking, rebuild negative keyword discipline, and align spend to contribution margin.",
  },
  {
    q: "How do Amazon services connect to our ecommerce website?",
    a: "Amazon rarely lives in isolation. We connect marketplace operations to your Shopify, Adobe Commerce, BigCommerce, or Magento stack — syncing catalog data, inventory signals, and brand creative so channels stay consistent.",
  },
  {
    q: "What does an Amazon engagement typically include?",
    a: "Most clients start with a channel audit (listings, ads, account health, inventory), then move into a managed retainer or project roadmap covering catalog fixes, advertising, content, and operational playbooks.",
  },
];

export default function AmazonServices() {
  return (
    <main>
      <PageHero
        dark
        eyebrow="Amazon Services"
        title="Grow Your Brand on Amazon with Full-Funnel Expertise"
        description="digivistaUS delivers comprehensive Amazon marketplace services — from Seller and Vendor Central operations to advertising, A+ Content, FBA logistics, compliance, and international expansion — so your Amazon channel drives durable, profitable growth."
        ctaTo="/contact"
        ctaLabel="Talk Amazon Strategy"
      />

      <section className="section-tight" style={{ background: "var(--ink)", marginTop: "-1px" }}>
        <div className="container amazon-hero-extra">
          {highlights.map((item) => (
            <div key={item} className="amazon-pill">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Complete Amazon Offering</p>
            <h2>All the details — every service Amazon brands need</h2>
            <p>
              Whether you are launching on Amazon, recovering an unhealthy account, or
              scaling a mature brand, digivistaUS provides vetted, end-to-end marketplace
              expertise alongside your broader ecommerce stack.
            </p>
          </div>
          <div className="detail-grid">
            {amazonOfferings.map((item) => (
              <article key={item.title} className="detail-block">
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "linear-gradient(180deg, var(--mist), var(--cloud))" }}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">How We Work</p>
            <h2>A clear path from audit to acceleration</h2>
          </div>
          <div className="process-steps">
            <div className="process-step">
              <strong>01</strong>
              <h3>Channel Audit</h3>
              <p>
                Listings, ads, account health, inventory, content, and competitive
                positioning reviewed against your margin and growth targets.
              </p>
            </div>
            <div className="process-step">
              <strong>02</strong>
              <h3>Priority Roadmap</h3>
              <p>
                A sequenced plan covering quick wins and structural fixes — catalog,
                creative, advertising architecture, and ops.
              </p>
            </div>
            <div className="process-step">
              <strong>03</strong>
              <h3>Execution</h3>
              <p>
                Hands-on management across Seller/Vendor Central, Amazon Ads, A+ Content,
                Brand Store, and FBA workflows.
              </p>
            </div>
            <div className="process-step">
              <strong>04</strong>
              <h3>Measure & Scale</h3>
              <p>
                Transparent reporting on ROAS, organic rank, contribution margin, and
                account health — then expand into new ASINs and marketplaces.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container grid-2" style={{ alignItems: "center" }}>
          <div>
            <p className="eyebrow">Alongside Your Stack</p>
            <h2>Amazon + your ecommerce platforms, together</h2>
            <p style={{ color: "var(--muted)", marginBottom: "1.25rem" }}>
              digivistaUS doesn’t treat Amazon as a silo. We align marketplace operations
              with Adobe Commerce, Magento, Shopify, and BigCommerce — so catalog data,
              brand creative, inventory, and customer experience stay coherent across
              every channel.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              <Link to="/services/ecommerce" className="btn btn-outline">
                Ecommerce Development
              </Link>
              <Link to="/services/marketing" className="btn btn-dark">
                Digital Marketing
              </Link>
            </div>
          </div>
          <div className="detail-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
            {[
              ["Catalog Sync", "Keep ASIN data aligned with your PIM and storefront."],
              ["Ads + Site", "Coordinate Amazon Ads with SEO and paid search."],
              ["Inventory", "Reduce stockouts with FBA and DTC forecasting."],
              ["Brand Story", "Unify A+ Content with your owned-site experience."],
            ].map(([title, copy]) => (
              <article key={title} className="detail-block">
                <h3>{title}</h3>
                <p>{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--mist)" }}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2>Amazon services questions, answered</h2>
          </div>
          <div className="faq-list">
            {faqs.map((item) => (
              <article key={item.q} className="faq-item">
                <h3>{item.q}</h3>
                <p>{item.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <CTABanner
        title="Ready to scale on Amazon?"
        subtitle="Talk with digivistaUS about account management, advertising, content, and marketplace ops."
        cta="Start an Amazon Conversation"
      />
    </main>
  );
}
