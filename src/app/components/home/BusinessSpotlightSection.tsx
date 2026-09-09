import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, BadgePercent, Building2, ExternalLink, MapPin, Phone } from "lucide-react";
import { Business, fetchAllBusinesses } from "../../lib/businessStore";

const priority: Record<string, number> = { vip: 0, premium: 1, basic: 2 };

function memberBenefit(value?: string) {
  const clean = String(value || "").trim();
  if (!clean) return "";
  if (/^\d+(?:\.\d+)?%?$/.test(clean)) return `${clean.replace(/%$/, "")}% member discount`;
  return clean;
}

export default function BusinessSpotlightSection() {
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    fetchAllBusinesses(1, 24, false)
      .then((result) => setBusinesses(result.data || []))
      .catch(() => setBusinesses([]));
  }, []);

  const display = useMemo(() => [...businesses]
    .sort((a, b) => (priority[a.sponsorshipPackage] ?? 9) - (priority[b.sponsorshipPackage] ?? 9) || a.businessName.localeCompare(b.businessName))
    .slice(0, 8), [businesses]);

  if (!display.length) return null;

  return (
    <section className="home-section home-business-section">
      <div className="home-shell">
        <div className="home-heading">
          <div>
            <span className="home-eyebrow home-eyebrow--green">Registered business community</span>
            <h2>Member Business Spotlight</h2>
            <p className="home-business-intro">Approved Araian-owned businesses, with VIP and Premium partners shown first and member benefits clearly highlighted.</p>
          </div>
          <Link to="/business">Business Directory <ArrowRight size={17} /></Link>
        </div>

        <div className="home-business-grid">
          {display.map((business) => {
            const benefit = memberBenefit(business.discountOffer);
            const packageName = business.sponsorshipPackage === "vip" ? "VIP Partner" : business.sponsorshipPackage === "premium" ? "Premium Partner" : "Registered Business";
            return (
              <article key={business.id} className={`home-business-card home-business-card--${business.sponsorshipPackage || "basic"}`}>
                <div className="home-business-logo">
                  {business.logoUrl ? <img src={business.logoUrl} alt={`${business.businessName} logo`} /> : <Building2 size={34} />}
                </div>
                <div className="home-business-copy">
                  <div className="home-business-topline"><span>{packageName}</span>{benefit && <strong><BadgePercent size={14} /> {benefit}</strong>}</div>
                  <h3>{business.businessName}</h3>
                  <p>{business.category}</p>
                  <div className="home-business-meta"><span><MapPin size={13} /> {business.city}</span>{business.phone && <a href={`tel:${business.phone}`}><Phone size={13} /> Contact</a>}{business.website && <a href={business.website} target="_blank" rel="noreferrer"><ExternalLink size={13} /> Website</a>}</div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
