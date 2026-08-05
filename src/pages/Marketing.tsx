import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

const offerings = [
  {
    title: "Strategy Development",
    detail:
      "Clear roadmaps aligned to brand awareness, sales, and loyalty — cohesive plans instead of disconnected tactics.",
  },
  {
    title: "SEO",
    detail:
      "Technical, content, and structural optimization that improves visibility, attracts qualified visitors, and drives conversions.",
  },
  {
    title: "Paid Media",
    detail:
      "Google Ads, Meta, LinkedIn, YouTube, and Amazon Advertising — structured for measurable ROAS and efficient acquisition.",
  },
  {
    title: "Email & SMS",
    detail:
      "Lifecycle campaigns, flows, and personalization that keep customers engaged between purchases.",
  },
  {
    title: "Content Marketing",
    detail:
      "Blog posts, articles, videos, and assets that nurture relationships and support organic and paid channels.",
  },
  {
    title: "Digital Analytics",
    detail:
      "GA4 and channel analytics that surface inefficiencies, opportunities, and decision-ready insights.",
  },
];

export default function Marketing() {
  return (
    <main>
      <PageHero
        eyebrow="Digital Marketing"
        title="Full-Service Marketing for Ecommerce Growth"
        description="Marketing isn’t just about getting seen — it’s about getting results. digivistaUS helps ecommerce businesses grow revenue and traffic with strategy, SEO, paid media, Amazon ads, email, and content working as one system."
        ctaTo="/contact"
        ctaLabel="Elevate Your Marketing"
      />
      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Core Marketing Services</p>
            <h2>Growth engines for ecommerce & Amazon</h2>
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
      <CTABanner subtitle="Let's elevate your marketing strategy today." />
    </main>
  );
}
