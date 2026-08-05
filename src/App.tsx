import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import About from "./pages/About";
import AITraction from "./pages/AITraction";
import AmazonServices from "./pages/AmazonServices";
import B2BPortals from "./pages/B2BPortals";
import ClientWins from "./pages/ClientWins";
import Contact from "./pages/Contact";
import DataManagement from "./pages/DataManagement";
import Ecommerce from "./pages/Ecommerce";
import Home from "./pages/Home";
import Integrations from "./pages/Integrations";
import Marketing from "./pages/Marketing";
import Partners from "./pages/Partners";
import PlatformPage from "./pages/PlatformPage";
import Services from "./pages/Services";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="services" element={<Services />} />
          <Route path="services/amazon" element={<AmazonServices />} />
          <Route path="services/ecommerce" element={<Ecommerce />} />
          <Route path="services/marketing" element={<Marketing />} />
          <Route path="services/integrations" element={<Integrations />} />
          <Route path="services/data" element={<DataManagement />} />
          <Route path="services/b2b" element={<B2BPortals />} />
          <Route path="services/ai" element={<AITraction />} />
          <Route path="about" element={<About />} />
          <Route path="partners" element={<Partners />} />
          <Route path="client-wins" element={<ClientWins />} />
          <Route path="contact" element={<Contact />} />
          <Route
            path="platforms/amazon"
            element={
              <PlatformPage
                name="Amazon"
                title="Amazon Marketplace Expertise"
                description="digivistaUS helps brands win on Amazon with account management, advertising, catalog optimization, A+ Content, FBA operations, compliance, and international expansion — fully detailed and ready to scale."
                points={[
                  {
                    title: "Seller & Vendor Central",
                    detail:
                      "Operational excellence for 3P and 1P models, including hybrid strategies.",
                  },
                  {
                    title: "Advertising & DSP",
                    detail:
                      "Sponsored ads and DSP programs tuned for profitable growth.",
                  },
                  {
                    title: "Content & Brand",
                    detail:
                      "Imaging, A+ Content, and Brand Stores that convert and protect brand equity.",
                  },
                  {
                    title: "Ops & Compliance",
                    detail:
                      "FBA prep, account health, and brand protection to keep selling privileges secure.",
                  },
                ]}
              />
            }
          />
          <Route
            path="platforms/adobe"
            element={
              <PlatformPage
                name="Adobe Commerce"
                title="Adobe Commerce for Complex Catalogs"
                description="We’ve worked with Adobe Commerce (formerly Magento) since the early days — making this highly customizable platform work for complicated catalogs and B2B requirements."
                points={[
                  {
                    title: "Custom Storefronts",
                    detail: "Composable experiences tailored to mid-market complexity.",
                  },
                  {
                    title: "B2B Capabilities",
                    detail: "Company accounts, shared catalogs, and quote workflows.",
                  },
                  {
                    title: "Performance",
                    detail: "Architecture and caching strategies that protect Core Web Vitals.",
                  },
                  {
                    title: "Integrations",
                    detail: "ERP, PIM, Amazon, and marketing stack connectivity.",
                  },
                ]}
              />
            }
          />
          <Route
            path="platforms/shopify"
            element={
              <PlatformPage
                name="Shopify"
                title="Shopify Plus for High-Growth Brands"
                description="User-friendly storefronts with the backend expertise to handle complex catalogs, custom apps, and multi-channel selling including Amazon."
                points={[
                  {
                    title: "Plus Implementations",
                    detail: "Checkout extensibility, markets, and enterprise workflows.",
                  },
                  {
                    title: "Custom Apps",
                    detail: "Purpose-built apps when themes and apps aren’t enough.",
                  },
                  {
                    title: "Migrations",
                    detail: "Clean moves onto Shopify with SEO and data integrity preserved.",
                  },
                  {
                    title: "Channel Ready",
                    detail: "Aligned with Amazon and other marketplaces for coherent growth.",
                  },
                ]}
              />
            }
          />
          <Route
            path="platforms/bigcommerce"
            element={
              <PlatformPage
                name="BigCommerce"
                title="BigCommerce for Scalable Catalogs"
                description="A rich feature set for staking your claim in ecommerce — with digivistaUS developers helping you take full advantage of the platform’s power and B2B strengths."
                points={[
                  {
                    title: "B2B Edition",
                    detail: "Specialized expertise for B2B catalogs and buyer experiences.",
                  },
                  {
                    title: "Headless Options",
                    detail: "Flexible frontends when brand experience demands it.",
                  },
                  {
                    title: "Catalog Power",
                    detail: "Complex products, variants, and merchandising at scale.",
                  },
                  {
                    title: "Partner Ecosystem",
                    detail: "Payments, shipping, and marketplace connections.",
                  },
                ]}
              />
            }
          />
          <Route
            path="platforms/magento"
            element={
              <PlatformPage
                name="Magento"
                title="Magento Heritage, Modern Delivery"
                description="Deep Magento expertise for custom, enterprise-grade commerce — from legacy modernization to Adobe Commerce evolution."
                points={[
                  {
                    title: "Legacy Modernization",
                    detail: "Stabilize and upgrade Magento estates with less risk.",
                  },
                  {
                    title: "Custom Modules",
                    detail: "Extensions that match how your business actually sells.",
                  },
                  {
                    title: "Performance Hardening",
                    detail: "Faster pages, cleaner codepaths, better conversions.",
                  },
                  {
                    title: "Path to Adobe",
                    detail: "Clear upgrade and replatform paths when you’re ready.",
                  },
                ]}
              />
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </>
  );
}
