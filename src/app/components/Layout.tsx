import { Outlet, useLocation } from "react-router";
import { useEffect } from "react";
import { Navbar } from "./Navbar";
import Footer from "./Footer";
import { WhatsAppButton } from "./WhatsAppButton";
import { fetchSiteSettings } from "../lib/settingsStore";

const DEFAULT_TITLE = "Anjuman-e-Araian Faisalabad | Official Community Platform";
const DEFAULT_DESCRIPTION = "Official platform of Anjuman-e-Araian Faisalabad for membership, community welfare, news, events, leadership, business directory and community services.";

function setMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute(attr, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

function applySeo(pathname: string) {
  const isBusinessDirectory = pathname === "/business";
  const isBusinessForm = pathname === "/business/submit";
  const isMatrimonialLanding = pathname === "/matrimonial";
  const isPrivateMatrimonial = pathname.startsWith("/matrimonial/");

  const title = isBusinessDirectory
    ? "Araian Business Directory Faisalabad | Anjuman-e-Araian"
    : isBusinessForm
      ? "Register Your Business | Anjuman-e-Araian Faisalabad"
      : isMatrimonialLanding
        ? "Private Matrimonial Matching Service | Anjuman-e-Araian Faisalabad"
        : isPrivateMatrimonial
          ? "Secure Matrimonial Portal | Anjuman-e-Araian Faisalabad"
          : DEFAULT_TITLE;

  const description = isBusinessDirectory
    ? "Explore verified Araian-owned and community businesses in Faisalabad and beyond. Search by business name, category and city through the official Anjuman-e-Araian Faisalabad directory."
    : isBusinessForm
      ? "Submit a business profile for review and inclusion in the official Anjuman-e-Araian Faisalabad Business Directory."
      : isMatrimonialLanding
        ? "Privacy-controlled matrimonial matching for Pakistan-based and overseas applicants, with verified profiles, structured preferences, consent-based introductions and protected personal details."
        : isPrivateMatrimonial
          ? "Private matrimonial profile, matching and consent portal. Personal candidate information is not intended for public search indexing."
          : DEFAULT_DESCRIPTION;

  const robots = isBusinessForm || isPrivateMatrimonial ? "noindex, nofollow, noarchive, nosnippet" : "index, follow";
  const canonicalUrl = `${window.location.origin}${pathname}`;

  document.title = title;
  setMeta('meta[name="description"]', "name", "description", description);
  setMeta('meta[name="robots"]', "name", "robots", robots);
  setMeta('meta[name="googlebot"]', "name", "googlebot", robots);
  setMeta('meta[property="og:title"]', "property", "og:title", title);
  setMeta('meta[property="og:description"]', "property", "og:description", description);
  setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
  setMeta('meta[property="og:type"]', "property", "og:type", "website");
  setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
  setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;

  document.getElementById("araian-route-jsonld")?.remove();
  if (isBusinessDirectory || isMatrimonialLanding) {
    const script = document.createElement("script");
    script.id = "araian-route-jsonld";
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Service",
      name: isBusinessDirectory ? "Anjuman-e-Araian Faisalabad Business Directory" : "Anjuman-e-Araian Faisalabad Private Matrimonial Matching Service",
      description,
      url: canonicalUrl,
      provider: { "@type": "Organization", name: "Anjuman-e-Araian Faisalabad", url: window.location.origin },
      areaServed: isMatrimonialLanding ? ["Pakistan", "Worldwide"] : "Pakistan",
    });
    document.head.appendChild(script);
  }
}

export function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    applySeo(pathname);
  }, [pathname]);

  useEffect(() => {
    fetchSiteSettings().catch(console.error);
  }, []);

  return (
    <div style={{ fontFamily: "'Lato', sans-serif", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}><Outlet /></main>
      <Footer />
      <WhatsAppButton />
    </div>
  );
}
