import { Link } from "react-router";
import { Facebook, Twitter, Youtube, Instagram, Linkedin, Phone, Mail, MapPin, ArrowRight } from "lucide-react";
import { getSiteSettings } from "../lib/settingsStore";

const quickLinks = [
  { label: "About Us", to: "/about" },
  { label: "Vision and Mission", to: "/vision-mission" },
  { label: "History", to: "/history" },
  { label: "Constitution", to: "/constitution" },
  { label: "News and Announcements", to: "/news" },
  { label: "Events", to: "/events" },
  { label: "Media Gallery", to: "/media" },
  { label: "Contact Us", to: "/contact" },
];

const leadership = [
  { label: "President's Message", to: "/president-message" },
  { label: "General Secretary", to: "/secretary-message" },
  { label: "Founders and Patrons", to: "/founders" },
  { label: "Ex-Presidents", to: "/ex-presidents" },
  { label: "Cabinet Members", to: "/cabinet" },
  { label: "Executive Members", to: "/executive-members" },
  { label: "Advisory Board", to: "/advisory-board" },
  { label: "Overseas Members", to: "/overseas" },
];

export function Footer() {
  const settings = getSiteSettings();
  return (
    <footer style={{ fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ backgroundColor: "#0d2e1a", padding: "56px 24px 32px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: 40 }} className="footer-grid">
          {/* Brand */}
          <div>
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", marginBottom: 16 }}>
              <div style={{ backgroundColor: "#c8a04a", width: 48, height: 48, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#0d2e1a", fontFamily: "'Amiri', serif", fontSize: 20, fontWeight: 700, lineHeight: 1 }}>ع</span>
              </div>
              <div>
                <div style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, lineHeight: 1.2 }}>Anjuman-e-Araian</div>
                <div style={{ color: "#c8a04a", fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase" }}>Pakistan</div>
              </div>
            </Link>
            <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.85, marginBottom: 20 }}>
              Dedicated to the welfare, unity, and progress of the Araian community since Pakistan's independence in 1947.
            </p>
            <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
              {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}><Facebook size={15} /></a>}
              {settings.twitterUrl && <a href={settings.twitterUrl} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}><Twitter size={15} /></a>}
              {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}><Instagram size={15} /></a>}
              {settings.linkedinUrl && <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" style={{ width: 34, height: 34, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}><Linkedin size={15} /></a>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {settings.address && (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <MapPin size={13} color="#c8a04a" />
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{settings.address}</span>
                </div>
              )}
              {settings.contactPhone && (
                <a href={`tel:${settings.contactPhone}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                  <Phone size={13} color="#c8a04a" />
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{settings.contactPhone}</span>
                </a>
              )}
              {settings.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                  <Mail size={13} color="#c8a04a" />
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{settings.contactEmail}</span>
                </a>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Quick Links</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {quickLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>
                    <ArrowRight size={11} color="#c8a04a" /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Leadership */}
          <div>
            <h4 style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Leadership</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {leadership.map((l) => (
                <li key={l.to}>
                  <Link to={l.to} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>
                    <ArrowRight size={11} color="#c8a04a" /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Services</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Matrimonial", to: "/matrimonial" },
                { label: "Overseas Members", to: "/overseas" },
                { label: "Membership", to: "/contact" },
                { label: "Legal Aid", to: "/contact" },
                { label: "Scholarships", to: "/news" },
                { label: "Medical Camps", to: "/events" },
              ].map((l) => (
                <li key={l.label}>
                  <Link to={l.to} style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.6)", fontSize: 13, textDecoration: "none" }}>
                    <ArrowRight size={11} color="#c8a04a" /> {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            <div style={{ marginTop: 28, padding: "16px 18px", backgroundColor: "rgba(200,160,74,0.1)", borderRadius: 10, border: "1px solid rgba(200,160,74,0.2)" }}>
              <p style={{ color: "#c8a04a", fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Helpline</p>
              <p style={{ color: "white", fontSize: 15, fontWeight: 700 }}>0800-ARAIAN</p>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Mon–Fri · 9am–5pm</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{ backgroundColor: "#071a0e", borderTop: "1px solid rgba(200,160,74,0.15)", padding: "14px 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, margin: 0 }}>
            © 2026 Anjuman-e-Araian Pakistan. All Rights Reserved.
          </p>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <Link to="/contact" style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textDecoration: "none" }}>Privacy Policy</Link>
            <Link to="/contact" style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textDecoration: "none" }}>Terms of Use</Link>
            <Link to="/admin" style={{ color: "rgba(255,255,255,0.2)", fontSize: 11, textDecoration: "none" }}>Admin</Link>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 560px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
