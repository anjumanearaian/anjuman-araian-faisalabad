import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgePercent, Building2 } from "lucide-react";
import { Business, fetchAllBusinesses } from "../../lib/businessStore";

function memberBenefit(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/^\d+(?:\.\d+)?%?$/.test(clean)) return `${clean.replace(/%$/, "")}% member discount`;
  return clean;
}

function isPlatinum(business: Business) {
  const packageName = String(business.sponsorshipPackage || "").toLowerCase();
  return packageName === "platinum" || packageName === "vip";
}

export default function BusinessSpotlightSection() {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    fetchAllBusinesses(1, 100, false)
      .then((result) => setBusinesses(result.data || []))
      .catch(() => setBusinesses([]));
  }, []);

  const display = useMemo(() => businesses.filter(isPlatinum).sort((a, b) => a.businessName.localeCompare(b.businessName)), [businesses]);
  const sliderItems = display.length > 1 ? [...display, ...display] : display;

  return <section className="home-section home-business-section home-business-slider-section">
    <div className="home-shell">
      <div className="home-heading">
        <div><span className="home-eyebrow home-eyebrow--green">Platinum business members</span><h2>Our Business Partners</h2><p className="home-business-intro">Platinum partners receive premium homepage visibility. Member discounts and partner benefits are highlighted where available.</p></div>
        <Link to="/business">View Business Community <ArrowRight size={17} /></Link>
      </div>
      {display.length ? <div className="home-partner-slider" aria-label="Platinum business partners">
        <div className={`home-partner-track ${display.length > 1 ? "home-partner-track--moving" : ""}`}>
          {sliderItems.map((business, index) => {
            const benefit = memberBenefit(business.discountOffer);
            return <Link to="/business" className="home-partner-card" key={`${business.id}-${index}`} aria-label={`${business.businessName} business listing`}>
              <div className="home-partner-logo">{business.logoUrl ? <img src={business.logoUrl} alt={`${business.businessName} logo`} /> : <Building2 size={32} />}</div>
              <strong>{business.businessName}</strong>
              {benefit && <span><BadgePercent size={12} /> {benefit}</span>}
            </Link>;
          })}
        </div>
      </div> : <div className="home-partner-empty"><Building2 size={28}/><div><strong>Platinum Partner Showcase</strong><p>Approved Platinum business members will appear here automatically with their logo and member benefits.</p></div></div>}
    </div>
  </section>;
}
