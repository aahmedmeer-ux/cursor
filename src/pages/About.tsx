import CTABanner from "../components/CTABanner";
import PageHero from "../components/PageHero";
import { stats, testimonials } from "../data/content";
import "./About.css";
import "./Home.css";
import "./Services.css";

const values = [
  {
    title: "We Always Deliver",
    detail:
      "Our commitment is simple: exceed expectations every time. Quality, timeliness, and results stay at the heart of every engagement.",
  },
  {
    title: "We Operate with Integrity",
    detail:
      "Transparency, honesty, and accountability guide our partnerships — from discovery through launch and ongoing growth.",
  },
  {
    title: "We Value People",
    detail:
      "From clients to teammates, we foster relationships built on trust, respect, and shared goals.",
  },
];

const leaders = [
  { name: "Alex Rivera", role: "CEO" },
  { name: "Jordan Hale", role: "President" },
  { name: "Sam Ortega", role: "EVP of GTM" },
  { name: "Riley Chen", role: "VP of Operations & IT" },
  { name: "Casey Morgan", role: "VP of Technology" },
  { name: "Taylor Brooks", role: "Chief of Staff & VP of People" },
];

export default function About() {
  return (
    <main>
      <PageHero
        eyebrow="About Us"
        title="Leading Digital Transformation with Grit"
        description="Since 2007, digivistaUS has been driving transformation for businesses that demand more. We deliver bold, custom solutions for ecommerce, Amazon marketplaces, integrations, and beyond — helping clients thrive in an ever-evolving digital world."
      />

      <section className="section">
        <div className="container about-intro">
          <div>
            <p className="eyebrow">Built to Last</p>
            <h2>Over 17 years of digital excellence</h2>
          </div>
          <p>
            We’ve been at the forefront of ecommerce and digital innovation since 2007,
            partnering with businesses to craft solutions that stand the test of time.
            Whether it’s creating robust platforms, scaling Amazon channels, or solving
            complex integration challenges, our approach is rooted in commitment,
            creativity, and results.
          </p>
        </div>
      </section>

      <section className="section" style={{ background: "var(--mist)" }}>
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Values That Drive Us</p>
            <h2>How digivistaUS shows up</h2>
          </div>
          <div className="detail-grid">
            {values.map((v) => (
              <article key={v.title} className="detail-block">
                <h3>{v.title}</h3>
                <p>{v.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <p className="eyebrow">Leadership</p>
            <h2>The team leading digivistaUS</h2>
          </div>
          <div className="leader-grid">
            {leaders.map((person) => (
              <article key={person.name} className="leader-card">
                <div className="leader-avatar" aria-hidden="true">
                  {person.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <h3>{person.name}</h3>
                <p>{person.role}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section results-mini">
        <div className="container">
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

      <section className="section">
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

      <CTABanner title="Ready to work with digivistaUS?" subtitle="Talk to our digital experts today." />
    </main>
  );
}
