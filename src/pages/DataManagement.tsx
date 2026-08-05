import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const offerings = [
  {
    title: "Data Ingestion",
    detail:
      "Reliable pipelines that bring product, order, customer, and marketplace data into usable systems.",
  },
  {
    title: "Analysis & Insights",
    detail:
      "Dashboards and models that turn raw commerce data into decisions for merchandising, ads, and ops.",
  },
  {
    title: "Infrastructure",
    detail:
      "Warehouses, lakes, and governance patterns sized for mid-market complexity without enterprise bloat.",
  },
  {
    title: "Amazon & Channel Data",
    detail:
      "Unify Seller/Vendor reports with owned-site analytics so contribution margin is visible by channel.",
  },
];

export default function DataManagement() {
  return (
    <main>
      <PageHero
        eyebrow="Data Management"
        title="Actionable Insights Through Seamless Data"
        description="Data ingestion, analysis, and infrastructure management designed for ecommerce and Amazon-heavy brands that need clarity — not more noise."
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
