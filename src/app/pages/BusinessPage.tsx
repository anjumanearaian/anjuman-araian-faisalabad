import { useState, useEffect } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { fetchAllBusinesses, businessCategories, sponsorshipPackages, Business } from "../lib/businessStore";
import { Search, MapPin, Phone, Globe, Briefcase, Award, ArrowRight, X } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function BusinessPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [viewingBusiness, setViewingBusiness] = useState<Business | null>(null);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllBusinesses(1, 100, false).then(res => {
      setBusinesses(res.data);
      setLoading(false);
    });
  }, []);

  // Get list of unique cities for filters
  const cities = Array.from(new Set(businesses.map((b) => b.city))).filter(Boolean);

  const filtered = businesses.filter((b) => {
    const matchesSearch =
      b.businessName.toLowerCase().includes(search.toLowerCase()) ||
      b.ownerName.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase()) ||
      b.productsServices.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory ? b.category === selectedCategory : true;
    const matchesCity = selectedCity ? b.city === selectedCity : true;

    return matchesSearch && matchesCategory && matchesCity;
  });

  // Sort VIP and Premium to the top
  const sorted = [...filtered].sort((a, b) => {
    const score = { vip: 3, premium: 2, basic: 1 };
    return score[b.sponsorshipPackage] - score[a.sponsorshipPackage];
  });

  const cardStyle = (pkg: string): React.CSSProperties => {
    const isVip = pkg === "vip";
    const isPremium = pkg === "premium";

    return {
      backgroundColor: "white",
      borderRadius: 12,
      padding: 24,
      boxShadow: isVip 
        ? `0 10px 30px rgba(200,160,74,0.15)` 
        : `0 4px 20px rgba(0,0,0,0.05)`,
      border: isVip 
        ? `2px solid ${GOLD}` 
        : isPremium 
        ? `1px solid rgba(26,77,46,0.3)` 
        : `1px solid #e5e7eb`,
      position: "relative",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      height: "100%",
      boxSizing: "border-box",
      cursor: "pointer"
    };
  };

  return (
    <div>
      <PageHeader
        title="Business Community"
        subtitle="Explore and support businesses run by our community members"
        breadcrumb={["Home", "Business Directory"]}
      />

      <section style={{ maxWidth: 1140, margin: "0 auto", padding: "48px 24px" }}>
        {/* Intro Banner */}
        <div 
          style={{ 
            backgroundColor: "#f8f5ef", 
            borderRadius: 12, 
            padding: "32px 40px", 
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 24,
            border: `1px solid rgba(200,160,74,0.2)`
          }}
        >
          <div style={{ maxWidth: 640 }}>
            <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: "0 0 8px 0" }}>
              Promote Your Business with Anjuman
            </h3>
            <p style={{ color: "#555", fontFamily: "'Poppins', sans-serif", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              Are you an Araian business owner? List your business in our official directory, offer exclusive discounts to our registered members, and reach thousands of families nationwide.
            </p>
          </div>
          <Link
            to="/business/submit"
            style={{
              backgroundColor: GREEN,
              color: "white",
              fontFamily: "'Poppins', sans-serif",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "12px 28px",
              borderRadius: 8,
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(26,77,46,0.2)"
            }}
          >
            Register Business <ArrowRight size={16} />
          </Link>
        </div>

        {/* Filters */}
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "2fr 1fr 1fr", 
            gap: 16, 
            marginBottom: 36 
          }} 
          className="filters-grid"
        >
          <div style={{ position: "relative" }}>
            <Search 
              size={18} 
              color="#888" 
              style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }} 
            />
            <input
              type="text"
              placeholder="Search by business name, keywords, owner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "12px 14px 12px 42px",
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                fontSize: 14,
                fontFamily: "'Poppins', sans-serif",
                boxSizing: "border-box"
              }}
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'Poppins', sans-serif"
            }}
          >
            <option value="">All Categories</option>
            {businessCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              fontSize: 14,
              fontFamily: "'Poppins', sans-serif"
            }}
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>

        {/* Directory Listings */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "64px 24px", color: "#888" }}>Loading businesses...</div>
        ) : sorted.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 24px", backgroundColor: "#fafafa", borderRadius: 12 }}>
            <Briefcase size={48} color="#ccc" style={{ marginBottom: 16 }} />
            <h4 style={{ color: "#333", fontSize: 18, fontWeight: 600, margin: "0 0 8px 0" }}>No Businesses Found</h4>
            <p style={{ color: "#666", fontSize: 14, margin: 0 }}>
              Try adjusting your search keywords or selection filters.
            </p>
          </div>
        ) : (
          <div 
            style={{ 
              display: "grid", 
              gridTemplateColumns: "repeat(3, 1fr)", 
              gap: 24 
            }} 
            className="directory-grid"
          >
            {sorted.map((b) => {
              const hasLogo = !!b.logoUrl;
              const isVip = b.sponsorshipPackage === "vip";
              const isPremium = b.sponsorshipPackage === "premium";

              return (
                <div key={b.id} style={cardStyle(b.sponsorshipPackage)} onClick={() => setViewingBusiness(b)} className="hover-lift">
                  <div>
                    {/* Badge */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                      <span 
                        style={{ 
                          fontSize: 11, 
                          fontWeight: 700, 
                          color: GREEN, 
                          backgroundColor: "rgba(26,77,46,0.08)", 
                          padding: "4px 10px", 
                          borderRadius: 6,
                          textTransform: "uppercase"
                        }}
                      >
                        {b.category}
                      </span>
                      {isVip && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "white", backgroundColor: GOLD, padding: "3px 8px", borderRadius: 4, display: "flex", alignItems: "center", gap: 3 }}>
                          <Award size={12} /> VIP SPONSOR
                        </span>
                      )}
                      {!isVip && isPremium && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "white", backgroundColor: GREEN, padding: "3px 8px", borderRadius: 4 }}>
                          FEATURED
                        </span>
                      )}
                    </div>

                    {/* Logo and Name */}
                    <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 14 }}>
                      <div 
                        style={{ 
                          width: 60, 
                          height: 60, 
                          borderRadius: 8, 
                          backgroundColor: "#f5f5f5", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          border: `1px solid #eee`,
                          flexShrink: 0,
                          overflow: "hidden"
                        }}
                      >
                        {hasLogo ? (
                          <img src={b.logoUrl} alt={b.businessName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Briefcase size={24} color="#aaa" />
                        )}
                      </div>
                      <div>
                        <h4 style={{ color: "#1a1a1a", fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, margin: "0 0 4px 0", lineHeight: 1.3 }}>
                          {b.businessName}
                        </h4>
                        <p style={{ color: "#777", fontSize: 12, margin: 0 }}>
                          By: {b.ownerName}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    <p style={{ color: "#555", fontSize: 13, lineHeight: 1.6, margin: "0 0 16px 0" }}>
                      {b.description.slice(0, 100)}{b.description.length > 100 ? "..." : ""}
                    </p>

                    {/* Offer */}
                    {b.discountOffer && (
                      <div 
                        style={{ 
                          backgroundColor: "#fff9ef", 
                          border: `1px dashed ${GOLD}`, 
                          borderRadius: 8, 
                          padding: "10px 14px", 
                          marginBottom: 16 
                        }}
                      >
                        <p style={{ color: "#854d0e", fontSize: 12, fontWeight: 700, margin: "0 0 2px 0", textTransform: "uppercase" }}>
                          Exclusive Member Discount
                        </p>
                        <p style={{ color: "#1a1a1a", fontSize: 13, fontWeight: 600, margin: 0 }}>
                          {b.discountOffer}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Contact Footer */}
                  <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: 16, marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
                      <span style={{ color: "#555", display: "flex", alignItems: "center", gap: 4 }}>
                        <MapPin size={14} color="#888" /> {b.city}
                      </span>
                      <div style={{ display: "flex", gap: 10 }} onClick={(e) => e.stopPropagation()}>
                        {b.website && (
                          <a href={`https://${b.website.replace(/^(https?:\/\/)?(www\.)?/, "")}`} target="_blank" rel="noreferrer" style={{ color: GREEN, display: "flex" }} title="Website">
                            <Globe size={16} />
                          </a>
                        )}
                        <a href={`tel:${b.phone}`} style={{ color: GREEN, display: "flex" }} title="Call">
                          <Phone size={16} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {viewingBusiness && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.55)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, overflowY: "auto" }}>
          <div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 64px rgba(0,0,0,0.22)" }}>
            <div style={{ backgroundColor: GREEN, padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderRadius: "16px 16px 0 0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: "white", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: `2px solid ${GOLD}` }}>
                  {viewingBusiness.logoUrl ? (
                    <img src={viewingBusiness.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <Briefcase size={20} color={GREEN} />
                  )}
                </div>
                <div>
                  <h4 style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: 0 }}>{viewingBusiness.businessName}</h4>
                  <p style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, margin: 0 }}>{viewingBusiness.category} | {viewingBusiness.city}</p>
                </div>
              </div>
              <button onClick={() => setViewingBusiness(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={20} /></button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ marginBottom: 20 }}>
                <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 6px 0" }}>About Business</p>
                <p style={{ color: "#333", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{viewingBusiness.description}</p>
              </div>

              {viewingBusiness.productsServices && (
                <div style={{ marginBottom: 20 }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px 0" }}>Products and Services</p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {viewingBusiness.productsServices.split(",").map((p, i) => (
                      <span key={i} style={{ backgroundColor: "#f3f4f6", color: "#4b5563", fontSize: 12, padding: "4px 12px", borderRadius: 20, fontWeight: 500 }}>
                        {p.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {viewingBusiness.discountOffer && (
                <div style={{ backgroundColor: "#fff9ef", border: `1px dashed ${GOLD}`, borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
                  <p style={{ color: "#854d0e", fontSize: 11, fontWeight: 700, margin: "0 0 2px 0", textTransform: "uppercase" }}>Exclusive Araian Member Offer</p>
                  <p style={{ color: GREEN, fontSize: 14, fontWeight: 700, margin: 0 }}>{viewingBusiness.discountOffer}</p>
                </div>
              )}

              <div style={{ borderTop: "1px solid #eee", paddingTop: 16, marginBottom: 20 }}>
                <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 10px 0" }}>Contact details</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 13 }}>
                  <div><strong>Owner:</strong> {viewingBusiness.ownerName}</div>
                  <div><strong>Phone:</strong> <a href={`tel:${viewingBusiness.phone}`} style={{ color: GREEN, textDecoration: "none", fontWeight: 600 }}>{viewingBusiness.phone}</a></div>
                  {viewingBusiness.whatsapp && <div><strong>WhatsApp:</strong> <a href={`https://wa.me/${viewingBusiness.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" style={{ color: GREEN, textDecoration: "none", fontWeight: 600 }}>{viewingBusiness.whatsapp}</a></div>}
                  {viewingBusiness.email && <div><strong>Email:</strong> {viewingBusiness.email}</div>}
                  {viewingBusiness.website && <div style={{ gridColumn: "span 2" }}><strong>Website:</strong> <a href={`https://${viewingBusiness.website.replace(/^(https?:\/\/)?(www\.)?/, "")}`} target="_blank" rel="noreferrer" style={{ color: GREEN, textDecoration: "none" }}>{viewingBusiness.website}</a></div>}
                  {viewingBusiness.address && <div style={{ gridColumn: "span 2" }}><strong>Address:</strong> {viewingBusiness.address}</div>}
                </div>
              </div>

              {viewingBusiness.additionalPhotos && viewingBusiness.additionalPhotos.length > 0 && (
                <div style={{ borderTop: "1px solid #eee", paddingTop: 16, marginBottom: 20 }}>
                  <p style={{ color: GREEN, fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px 0" }}>Gallery</p>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
                    {viewingBusiness.additionalPhotos.map((src, i) => (
                      <a key={i} href={src} target="_blank" rel="noreferrer" style={{ flexShrink: 0 }}>
                        <img src={src} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
                <button onClick={() => setViewingBusiness(null)} style={{ backgroundColor: "#f3f4f6", color: "#4b5563", border: "none", borderRadius: 8, padding: "10px 24px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
          }
          .directory-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 600px) {
          .directory-grid {
            grid-template-columns: 1fr !important;
          }
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 30px rgba(0,0,0,0.1) !important;
        }
      `}</style>
    </div>
  );
}
