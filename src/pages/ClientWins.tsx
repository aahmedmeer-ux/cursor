import { Link } from "react-router-dom";
import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const wins = [
  {
    title: "Marketplace Acceleration",
    result: "+62% Amazon revenue in 9 months",
    detail:
      "Rebuilt advertising structure, refreshed A+ Content, and stabilized FBA inventory for a specialty goods brand.",
  },
  {
    title: "Replatform Success",
    result: "+29 Core Web Vitals average",
    detail:
      "Migrated a mid-market catalog to a modern commerce stack with cleaner integrations and faster storefront performance.",
  },
  {
    title: "B2B Portal Launch",
    result: "Self-serve ordering for 1,200+ accounts",
    detail:
      "Custom portal with contract pricing, punchout readiness, and invoice visibility that cut support tickets dramatically.",
  },
  {
    title: "Integrated Growth",
    result: "+80% ecommerce revenue",
    detail:
      "Combined SEO, paid media, and lifecycle email into one operating rhythm for an industrial supplier.",
  },
];

export default function ClientWins() {
  return (
    <main>
      <PageHero
        eyebrow="Client Wins"
        title="The Results Say it All"
        description="Outcomes across owned ecommerce, Amazon marketplaces, B2B portals, and integrated growth programs."
      />
      <section className="section">
        <div className="container">
          <div className="detail-grid">
            {wins.map((win) => (
              <article key={win.title} className="detail-block">
                <h3>{win.title}</h3>
                <p style={{ color: "var(--teal-deep)", fontWeight: 700, marginBottom: "0.55rem" }}>
                  {win.result}
                </p>
                <p>{win.detail}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: "2rem" }}>
            <Link to="/contact" className="btn btn-dark">
              Start Your Success Story
            </Link>
          </div>
        </div>
      </section>
      <CTABanner />
    </main>
  );
}
