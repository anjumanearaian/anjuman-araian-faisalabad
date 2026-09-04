import { useState } from "react";
import { Link, useLocation } from "react-router";
import { Phone, Mail, Facebook, Twitter, Instagram, Linkedin, Menu, X, ChevronDown, Shield, UserCircle } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { useMember } from "../context/MemberContext";
import { getSiteSettings } from "../lib/settingsStore";
import logoImg from "../../imports/logo.png";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const navLinks = [
  { label: "Home", to: "/" },
  { label: "Recent Updates", to: "/news" },
  {
    label: "About Us",
    to: "/about",
    children: [
      { label: "Introduction", to: "/about" },
      { label: "Vision and Mission", to: "/vision-mission" },
      { label: "History", to: "/history" },
      { label: "Memorandum / Constitution", to: "/constitution" },
    ],
  },
  {
    label: "Members",
    to: "/cabinet",
    children: [
      { label: "Cabinet Members", to: "/cabinet" },
      { label: "Executive Members", to: "/executive-members" },
      { label: "Advisory Board", to: "/advisory-board" },
      { label: "Founders and Patrons", to: "/founders" },
      { label: "Ex-Presidents", to: "/ex-presidents" },
    ],
  },
  {
    label: "Message",
    to: "/president-message",
    children: [
      { label: "President's Message", to: "/president-message" },
      { label: "G. Secretary Message", to: "/secretary-message" },
    ],
  },
  {
    label: "Projects",
    to: "/matrimonial",
    children: [
      { label: "Matrimonial", to: "/matrimonial" },
      { label: "Business Community", to: "/business" },
      { label: "Overseas Members", to: "/overseas" },
      { label: "Events", to: "/events" },
    ],
  },
  { label: "Gallery", to: "/media" },
  { label: "Contact Us", to: "/contact" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const { member } = useMember();
  const settings = getSiteSettings();

  const isActive = (to: string) =>
    to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);

  return (
    <header style={{ fontFamily: "'Poppins', sans-serif", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      {/* Top bar */}
      <div style={{ backgroundColor: GREEN, padding: "8px 0" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {settings.contactPhone && (
              <a href={`tel:${settings.contactPhone}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.9)", textDecoration: "none" }}>
                <Phone size={13} /> {settings.contactPhone}
              </a>
            )}
            {settings.contactEmail && (
              <a href={`mailto:${settings.contactEmail}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.9)", textDecoration: "none" }}>
                <Mail size={13} /> {settings.contactEmail}
              </a>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAdmin && (
              <span style={{ backgroundColor: "white", color: GREEN, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>ADMIN MODE</span>
            )}
            {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Facebook size={14} /></a>}
            {settings.twitterUrl && <a href={settings.twitterUrl} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Twitter size={14} /></a>}
            {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Instagram size={14} /></a>}
            {settings.linkedinUrl && <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Linkedin size={14} /></a>}
          </div>
        </div>
      </div>

      {/* Logo + Nav */}
      <div style={{ backgroundColor: "white", borderBottom: "1px solid #fde6f1" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 80 }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none" }}>
            <img src={logoImg} alt="Anjuman e Araian Logo" style={{ width: 56, height: 56, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>Anjuman e Araian</div>
              <div style={{ color: "#888", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>Faisalabad — Est. 1947</div>
            </div>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 2 }} className="desktop-nav">
            {navLinks.map((link) => (
              <div
                key={link.label}
                style={{ position: "relative" }}
                onMouseEnter={() => link.children && setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <Link
                  to={link.to}
                  style={{
                    display: "flex", alignItems: "center", gap: 3, padding: "8px 11px",
                    borderRadius: 4, fontSize: 13, fontWeight: 600, textDecoration: "none",
                    color: isActive(link.to) ? "white" : "#3a3a3a",
                    backgroundColor: isActive(link.to) ? GREEN : "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {link.label}
                  {link.children && <ChevronDown size={12} />}
                </Link>
                {link.children && openDropdown === link.label && (
                  <div style={{ position: "absolute", top: "100%", left: 0, backgroundColor: "white", borderRadius: "0 0 8px 8px", boxShadow: "0 8px 28px rgba(0,0,0,0.13)", borderTop: `3px solid ${GOLD}`, minWidth: 210, zIndex: 200, padding: "4px 0" }}>
                    {link.children.map((child) => (
                      <Link
                        key={child.to}
                        to={child.to}
                        style={{ display: "block", padding: "10px 20px", fontSize: 13, textDecoration: "none", color: location.pathname === child.to ? GREEN : "#3a3a3a", fontWeight: location.pathname === child.to ? 700 : 400 }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = GREEN; (e.currentTarget as HTMLElement).style.color = "white"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = location.pathname === child.to ? GREEN : "#3a3a3a"; }}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {member ? (
              <Link to="/member/portal" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", backgroundColor: GOLD, color: "#1a1a1a", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                <UserCircle size={15} /> {member.fullName.split(" ")[0]}
              </Link>
            ) : (
              <Link to="/member/login" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", border: `2px solid ${GREEN}`, color: GREEN, borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                <UserCircle size={15} /> Member Login
              </Link>
            )}
            <Link to="/admin" style={{ display: "flex", alignItems: "center", padding: "8px 6px", color: "#ccc", textDecoration: "none" }} title="Admin"><Shield size={14} /></Link>
          </nav>

          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", background: GREEN, border: "none", color: "white", cursor: "pointer", padding: 8, borderRadius: 6 }} className="mobile-menu-btn" aria-label="Toggle menu">
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileOpen && (
          <div style={{ backgroundColor: "white", borderTop: "1px solid #eee" }}>
            {navLinks.map((link) => (
              <div key={link.label} style={{ borderBottom: "1px solid #f5f5f5" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {link.children ? (
                    <button
                      onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)}
                      style={{
                        flex: 1,
                        textAlign: "left",
                        background: "none",
                        border: "none",
                        padding: "12px 24px",
                        fontSize: 14,
                        fontWeight: 600,
                        color: isActive(link.to) ? GREEN : "#222",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        cursor: "pointer",
                        width: "100%",
                        fontFamily: "inherit"
                      }}
                    >
                      <span>{link.label}</span>
                      <ChevronDown size={16} style={{ transform: mobileExpanded === link.label ? "rotate(180deg)" : "none", color: GREEN, transition: "transform 0.2s" }} />
                    </button>
                  ) : (
                    <Link
                      to={link.to}
                      style={{ flex: 1, display: "block", padding: "12px 24px", fontSize: 14, fontWeight: 600, textDecoration: "none", color: isActive(link.to) ? GREEN : "#222" }}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
                {link.children && mobileExpanded === link.label && (
                  <div style={{ borderLeft: `3px solid ${GOLD}`, backgroundColor: "#fafafa" }}>
                    {link.children.map((c) => (
                      <Link key={c.to} to={c.to} style={{ display: "block", padding: "10px 32px", fontSize: 13, textDecoration: "none", color: "#555", borderBottom: "1px solid #f0f0f0" }} onClick={() => setMobileOpen(false)}>{c.label}</Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <style>{`@media (max-width: 1024px) { .desktop-nav { display: none !important; } .mobile-menu-btn { display: flex !important; } }`}</style>
    </header>
  );
}
