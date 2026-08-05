import { Link } from "react-router-dom";
import "./PageHero.css";

type Props = {
  eyebrow?: string;
  title: string;
  description?: string;
  ctaTo?: string;
  ctaLabel?: string;
  dark?: boolean;
};

export default function PageHero({
  eyebrow,
  title,
  description,
  ctaTo,
  ctaLabel,
  dark = false,
}: Props) {
  return (
    <section className={`page-hero ${dark ? "is-dark" : ""}`}>
      <div className="page-hero-bg" aria-hidden="true" />
      <div className="container page-hero-content fade-up">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {description ? <p className="page-hero-desc">{description}</p> : null}
        {ctaTo && ctaLabel ? (
          <Link to={ctaTo} className={`btn ${dark ? "btn-primary" : "btn-dark"}`}>
            {ctaLabel}
          </Link>
        ) : null}
      </div>
    </section>
  );
}
