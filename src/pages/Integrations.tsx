import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const offerings = [
  {
    title: "ERP Integrations",
    detail:
      "Connect NetSuite, SAP, Microsoft Dynamics, and custom ERPs so orders, inventory, and customers stay in sync.",
  },
  {
    title: "CRM & Marketing Stack",
    detail:
      "HubSpot, Salesforce, Klaviyo, and related tools wired cleanly into your commerce data model.",
  },
  {
    title: "Payment & Tax",
    detail:
      "Payment gateways, tax engines, and checkout services integrated for accuracy and conversion.",
  },
  {
    title: "iPaaS & Middleware",
    detail:
      "Celigo and similar platforms for maintainable, observable integration architectures.",
  },
  {
    title: "Amazon Channel Sync",
    detail:
      "Marketplace catalog, inventory, and order flows connected to your owned commerce systems.",
  },
  {
    title: "Custom APIs",
    detail:
      "Purpose-built connectors when off-the-shelf tools can’t meet complex B2B or catalog needs.",
  },
];

export default function Integrations() {
  return (
    <main>
      <PageHero
        eyebrow="Software Integrations"
        title="Connected Platforms for a Streamlined Ecosystem"
        description="Integration of ERPs, CRMs, payment gateways, Amazon channels, and more — so your teams stop fighting spreadsheets and start operating from a single source of truth."
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
