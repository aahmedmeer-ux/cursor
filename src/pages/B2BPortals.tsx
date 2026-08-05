import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const offerings = [
  {
    title: "Customer Ordering Portals",
    detail:
      "Role-based ordering experiences with contract pricing, quick-order pads, and account-specific catalogs.",
  },
  {
    title: "Invoices & Payments",
    detail:
      "Self-serve invoice visibility and payment workflows that reduce AR friction.",
  },
  {
    title: "Order Tracking",
    detail:
      "Shipment status, returns, and order history that keep B2B buyers informed without calling support.",
  },
  {
    title: "Dealer & Distributor Tools",
    detail:
      "Tools built for multi-tier relationships, punchouts, and complex approval chains.",
  },
];

export default function B2BPortals() {
  return (
    <main>
      <PageHero
        eyebrow="B2B Portals"
        title="Custom Portals That Elevate Customer Experience"
        description="Customer portals for ordering, invoices, tracking, and more — purpose-built for manufacturers, distributors, and parts-heavy retailers."
      />
      <section className="section">
        <div className="container">
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
      <CTABanner />
    </main>
  );
}
