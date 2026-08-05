import { Link } from "react-router-dom";
import "./CTABanner.css";

type Props = {
  title?: string;
  subtitle?: string;
  cta?: string;
};

export default function CTABanner({
  title = "Ready to take the next step for your business?",
  subtitle = "Talk to our digital experts today.",
  cta = "Get In Touch",
}: Props) {
  return (
    <section className="cta-banner">
      <div className="container cta-inner">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <Link to="/contact" className="btn btn-primary">
          {cta}
        </Link>
      </div>
    </section>
  );
}
