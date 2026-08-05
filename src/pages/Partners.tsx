import { Link } from "react-router-dom";
import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import { platforms } from "../data/content";
import "./Services.css";

export default function Partners() {
  return (
    <main>
      <PageHero
        eyebrow="Platforms & Partners"
        title="Tech Partners We Trust"
        description="The partners we work with offer services specially tailored to ecommerce websites and B2B companies — and their products help us achieve outstanding results. Amazon, Adobe, Shopify, BigCommerce, and more."
      />
      <section className="section">
        <div className="container">
          <div className="detail-grid">
            {platforms.map((p) => (
              <Link key={p.slug} to={p.path} className="detail-block" style={{ display: "block" }}>
                <h3>{p.name}</h3>
                <p>{p.blurb}</p>
              </Link>
            ))}
            {[
              ["Celigo", "iPaaS integrations for complex commerce ecosystems."],
              ["Klaviyo", "Lifecycle email and SMS for ecommerce growth."],
              ["Google", "Analytics and paid search expertise for measurable acquisition."],
            ].map(([name, blurb]) => (
              <article key={name} className="detail-block">
                <h3>{name}</h3>
                <p>{blurb}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <CTABanner />
    </main>
  );
}
