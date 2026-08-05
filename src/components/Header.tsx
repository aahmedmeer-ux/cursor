import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import "./Header.css";

const services = [
  { to: "/services/amazon", label: "Amazon Services" },
  { to: "/services/ecommerce", label: "Ecommerce Development" },
  { to: "/services/marketing", label: "Digital Marketing" },
  { to: "/services/integrations", label: "Software Integrations" },
  { to: "/services/data", label: "Data Management" },
  { to: "/services/b2b", label: "B2B Portals" },
  { to: "/services/ai", label: "AI Traction" },
];

const platforms = [
  { to: "/platforms/amazon", label: "Amazon" },
  { to: "/platforms/adobe", label: "Adobe Commerce" },
  { to: "/platforms/shopify", label: "Shopify" },
  { to: "/platforms/bigcommerce", label: "BigCommerce" },
  { to: "/platforms/magento", label: "Magento" },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [platformsOpen, setPlatformsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    setServicesOpen(false);
    setPlatformsOpen(false);
  };

  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <div className="container header-inner">
        <Link to="/" className="brand" onClick={close} aria-label="digivistaUS home">
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40" fill="none">
              <rect width="40" height="40" rx="9" fill="currentColor" />
              <path d="M9 26L20 10L31 26H24L20 20L16 26H9Z" fill="#2BB5A0" />
              <circle cx="20" cy="29" r="2.4" fill="#E8F4F2" />
            </svg>
          </span>
          <span className="brand-text">
            digivista<span>US</span>
          </span>
        </Link>

        <nav className={`nav ${open ? "is-open" : ""}`} aria-label="Primary">
          <div
            className={`nav-item has-menu ${servicesOpen ? "is-open" : ""}`}
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button
              type="button"
              className="nav-link"
              onClick={() => setServicesOpen((v) => !v)}
              aria-expanded={servicesOpen}
            >
              Services
              <Chevron />
            </button>
            <div className="mega">
              <Link to="/services" className="mega-all" onClick={close}>
                All Services
              </Link>
              {services.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={close}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div
            className={`nav-item has-menu ${platformsOpen ? "is-open" : ""}`}
            onMouseEnter={() => setPlatformsOpen(true)}
            onMouseLeave={() => setPlatformsOpen(false)}
          >
            <button
              type="button"
              className="nav-link"
              onClick={() => setPlatformsOpen((v) => !v)}
              aria-expanded={platformsOpen}
            >
              Platforms
              <Chevron />
            </button>
            <div className="mega">
              <Link to="/partners" className="mega-all" onClick={close}>
                Platforms & Partners
              </Link>
              {platforms.map((item) => (
                <NavLink key={item.to} to={item.to} onClick={close}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <NavLink to="/client-wins" className="nav-link" onClick={close}>
            Client Wins
          </NavLink>
          <NavLink to="/about" className="nav-link" onClick={close}>
            About Us
          </NavLink>
          <Link to="/contact" className="btn btn-primary nav-cta" onClick={close}>
            Get In Touch
          </Link>
        </nav>

        <button
          type="button"
          className={`burger ${open ? "is-open" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}
