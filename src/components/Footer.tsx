import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div className="footer-brand">
          <Link to="/" className="footer-logo">
            digivista<span>US</span>
          </Link>
          <p>
            The replatform and marketplace agency for mid-market ecommerce —
            Adobe Commerce, Magento, Shopify, BigCommerce, and Amazon.
          </p>
        </div>

        <div>
          <h4>Services</h4>
          <ul>
            <li>
              <Link to="/services/amazon">Amazon Services</Link>
            </li>
            <li>
              <Link to="/services/ecommerce">Ecommerce Development</Link>
            </li>
            <li>
              <Link to="/services/marketing">Digital Marketing</Link>
            </li>
            <li>
              <Link to="/services/integrations">Integrations</Link>
            </li>
            <li>
              <Link to="/services/data">Data Management</Link>
            </li>
            <li>
              <Link to="/services/b2b">B2B Portals</Link>
            </li>
            <li>
              <Link to="/services/ai">AI Traction</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Company</h4>
          <ul>
            <li>
              <Link to="/about">About Us</Link>
            </li>
            <li>
              <Link to="/partners">Partners</Link>
            </li>
            <li>
              <Link to="/client-wins">Client Wins</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        <div>
          <h4>Ready to grow?</h4>
          <p className="footer-cta-copy">
            Talk with our digital experts about replatforming, Amazon growth, or
            your next ecommerce initiative.
          </p>
          <Link to="/contact" className="btn btn-primary">
            Get In Touch
          </Link>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {new Date().getFullYear()} digivistaUS. All rights reserved.</p>
        <p>Built for mid-market ecommerce brands across the United States.</p>
      </div>
    </footer>
  );
}
