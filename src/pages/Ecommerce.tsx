import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const offerings = [
  {
    title: "Platform Development",
    detail:
      "Scalable, user-friendly ecommerce platforms designed for growth — from scratch builds to major upgrades on Adobe Commerce, Magento, Shopify, and BigCommerce.",
  },
  {
    title: "Optimization",
    detail:
      "Improve performance, UX flows, and conversion. We target Core Web Vitals, checkout friction, and merchandising so revenue compounds.",
  },
  {
    title: "Security",
    detail:
      "Robust protections, compliance posture, and peace of mind for you and your customers — built into the architecture, not bolted on later.",
  },
  {
    title: "Replatforming & Migration",
    detail:
      "Move between platforms without losing SEO equity, catalog integrity, or operational continuity. Discovery-led plans with clear timelines.",
  },
  {
    title: "Rescues & Takeovers",
    detail:
      "Stabilize stalled or under-delivered projects, clean up data and integrations, then ship improvements that actually support growth.",
  },
  {
    title: "Amazon-Connected Commerce",
    detail:
      "Connect your owned storefront to Amazon catalog, inventory, and brand systems so multi-channel selling stays coherent.",
  },
];

const faqs = [
  {
    q: "What kinds of ecommerce projects does digivistaUS handle?",
    a: "Net-new builds, full replatforms, rescues, B2B and B2C storefronts, dealer portals, and complex catalog builds where performance and data accuracy matter as much as design.",
  },
  {
    q: "Which ecommerce platforms do you work with?",
    a: "Adobe Commerce (Magento), BigCommerce, Shopify — plus Amazon marketplace as a growth channel alongside your owned site.",
  },
  {
    q: "Can you integrate ecommerce with ERPs, PIMs, and other systems?",
    a: "Yes. Integrations are core to our work — ERPs, PIMs, CRMs, payment gateways, shipping, tax, Amazon, and custom internal systems.",
  },
];

export default function Ecommerce() {
  return (
    <main>
      <PageHero
        eyebrow="Ecommerce"
        title="Empowering Your Success in the Digital Marketplace"
        description="With over 17 years of experience in ecommerce, digivistaUS crafts tailored solutions that can 2x site speed, increase orders 20%+, and 4x user sessions. Numerous clients see meaningful revenue gains — and we connect your storefront to Amazon when marketplace growth is part of the plan."
        ctaTo="/contact"
        ctaLabel="Talk Ecommerce"
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">What We Deliver</p>
            <h2>Comprehensive ecommerce solutions</h2>
          </div>
          <div className="detail-grid">
            {offerings.map((item) => (
              <article key={item.title} className="detail-block">
                <h3>{item.title}</h3>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="section" style={{ background: "var(--mist)" }}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">FAQ</p>
            <h2>Ecommerce questions</h2>
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
      <CTABanner title="Ready to take the next step?" subtitle="Talk to our ecommerce experts today." />
    </main>
  );
}
