import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const offerings = [
  {
    title: "AI Strategy Consulting",
    detail:
      "Identify high-ROI AI opportunities across merchandising, support, ops, and content — with a realistic adoption plan.",
  },
  {
    title: "Workflow Automation",
    detail:
      "Automate repetitive catalog, support, and reporting tasks while keeping humans in the loop for judgment calls.",
  },
  {
    title: "Commerce Copilots",
    detail:
      "Assistive tools for product content, Amazon listing drafts, and internal knowledge retrieval.",
  },
  {
    title: "Responsible Adoption",
    detail:
      "Governance, evaluation, and training so AI systems improve outcomes without creating new risk.",
  },
];

export default function AITraction() {
  return (
    <main>
      <PageHero
        eyebrow="AI Traction"
        title="Integration and Adoption of AI Systems"
        description="Practical AI for ecommerce and Amazon operations — strategy, automation, and enablement that create traction, not experiments that stall."
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
