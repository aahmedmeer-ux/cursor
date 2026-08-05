import { Link } from "react-router-dom";
import CTABanner from "../components/CTABanner";
import { featuredLogos, platforms, services, stats, testimonials } from "../data/content";
import "./Home.css";

export default function Home() {
  return (
    <main>
      <section className="home-hero">
        <div className="home-hero-atmosphere" aria-hidden="true">
          <div className="orb orb-a" />
          <div className="orb orb-b" />
          <div className="grid-lines" />
        </div>
        <div className="container home-hero-grid">
          <div className="home-hero-copy fade-up">
            <p className="hero-kicker">The Replatform Agency for Mid-Market Ecommerce</p>
            <h1 className="brand-hero">digivistaUS</h1>
            <p className="hero-headline">
              Mid-Market Ecommerce Replatforming, Migration & Amazon Growth
            </p>
            <p className="hero-support">
              digivistaUS is a mid to upper market ecommerce replatform agency for
              Adobe Commerce, Magento, Shopify, BigCommerce — and full-funnel Amazon
              marketplace services.
            </p>
            <div className="hero-actions">
              <Link to="/contact" className="btn btn-primary">
                Get In Touch
              </Link>
              <Link to="/services" className="btn btn-outline">
                Explore Services
              </Link>
            </div>
          </div>
          <div className="home-hero-visual fade-up" aria-hidden="true">
            <div className="visual-panel">
              <div className="visual-glow" />
              <div className="visual-stack">
                <span>Adobe Commerce</span>
                <span>Shopify Plus</span>
                <span className="is-amazon">Amazon Marketplace</span>
                <span>BigCommerce</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="platform-strip section-tight">
        <div className="container">
          <div className="platform-cards">
            {platforms.map((p) => (
              <Link key={p.slug} to={p.path} className={`platform-card ${p.slug === "amazon" ? "is-amazon" : ""}`}>
                <strong>{p.name}</strong>
                <span>{p.blurb}</span>
                <em>Click Here</em>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section featured-in">
        <div className="container">
          <p className="eyebrow">Featured In</p>
          <div className="logo-row">
            {featuredLogos.map((logo) => (
              <span key={logo}>{logo}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="section services-home">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Ecommerce Services</p>
            <h2>Digital solutions that drive measurable growth</h2>
            <p>
              From storefront builds and Amazon marketplace management to
              integrations, data, and AI — one partner for your digital commerce stack.
            </p>
          </div>
          <div className="service-grid">
            {services.map((service) => (
              <Link
                key={service.slug}
                to={service.path}
                className={`service-tile ${service.slug === "amazon" ? "is-amazon" : ""}`}
              >
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
                <span>Learn more →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section results-band">
        <div className="container">
          <div className="section-head light">
            <p className="eyebrow">The Results Say it All</p>
            <h2>Outcomes mid-market brands can feel</h2>
          </div>
          <div className="stats-row">
            {stats.map((stat) => (
              <div key={stat.label} className="stat">
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section testimonials">
        <div className="container testimonial-wrap">
          <blockquote>
            <p>“{testimonials[0].quote}”</p>
            <footer>
              <strong>{testimonials[0].name}</strong>
              <span>{testimonials[0].role}</span>
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="section partners-teaser">
        <div className="container partners-layout">
          <div>
            <p className="eyebrow">Tech Partners We Trust</p>
            <h2>Platforms tailored for ecommerce & B2B</h2>
            <p>
              The partners we work with offer services specially tailored to ecommerce
              websites and B2B companies — and if you’re looking for certifications,
              we’ve got those too.
            </p>
            <Link to="/partners" className="btn btn-dark">
              View Partners
            </Link>
          </div>
          <div className="partner-pills">
            {["Amazon", "Adobe", "Shopify", "BigCommerce", "Celigo", "Klaviyo", "Google"].map(
              (name) => (
                <span key={name}>{name}</span>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="section values-band">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Industry Experts with Grounded Values</p>
            <h2>Experience you can put to work</h2>
            <p>
              When your digital systems are critical to your business, working with a
              team that understands every aspect of ecommerce, Amazon marketplaces,
              B2B sites, and data is essential. We’ve been in this industry for more
              than 17 years — we’ve learned our lessons, and we want you to benefit
              from our experience.
            </p>
          </div>
        </div>
      </section>

      <CTABanner
        title="Ready to Connect with the digivistaUS Team?"
        subtitle="Let’s talk replatforming, Amazon growth, or your next digital initiative."
      />
    </main>
  );
}
