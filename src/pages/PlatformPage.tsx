import { Link } from "react-router-dom";
import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import "./Services.css";

type Props = {
  name: string;
  eyebrow?: string;
  title: string;
  description: string;
  points: { title: string; detail: string }[];
};

export default function PlatformPage({ name, eyebrow, title, description, points }: Props) {
  return (
    <main>
      <PageHero
        eyebrow={eyebrow ?? name}
        title={title}
        description={description}
        ctaTo="/contact"
        ctaLabel={`Talk ${name}`}
      />
      <section className="section">
        <div className="container">
          <div className="detail-grid">
            {points.map((p) => (
              <article key={p.title} className="detail-block">
                <h3>{p.title}</h3>
                <p>{p.detail}</p>
              </article>
            ))}
          </div>
          <div style={{ marginTop: "2rem", display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link to="/services/amazon" className="btn btn-outline">
              Amazon Services
            </Link>
            <Link to="/partners" className="btn btn-dark">
              All Partners
            </Link>
          </div>
        </div>
      </section>
      <CTABanner />
    </main>
  );
}
