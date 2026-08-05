import { Link } from "react-router-dom";
import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import { services } from "../data/content";
import "./Services.css";

export default function Services() {
  return (
    <main>
      <PageHero
        eyebrow="Services"
        title="Providing Digital Solutions for Your Business"
        description="From ecommerce sites and Amazon marketplace management to B2B customer portals and complex data systems, your digital success is our specialty. Need a transactional website? We do that. Need a GA4 integration? We do that too. How about replatforming or Amazon advertising? Also our expertise."
      />

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Explore Our Services</p>
            <h2>Everything mid-market commerce needs</h2>
          </div>
          <div className="services-explore">
            {services.map((service) => (
              <Link
                key={service.slug}
                to={service.path}
                className={`explore-item ${service.slug === "amazon" ? "is-amazon" : ""}`}
              >
                <div>
                  <h3>{service.title}</h3>
                  <p>{service.summary}</p>
                </div>
                <span>View details →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CTABanner />
    </main>
  );
}
