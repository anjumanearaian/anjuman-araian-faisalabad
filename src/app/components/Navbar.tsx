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
  { label: "Recent Updates", to: "/updates" },
  {
    label: "About Us",
    to: "/about",
    children: [
      { label: "Introduction", to: "/about" },
      { label: "Vision and Mission", to: "/vision-mission" },
      { label: "History", to: "/history" },
      { label: "Memorandum / Constitution", to: "/constitution" },
      { label: "Leadership Messages", to: "/leadership-messages" },
    ],
  },
  {
    label: "Members",
    to: "/members",
    children: [
      { label: "Member Directory", to: "/members" },
      { label: "Men's Wing", to: "/members?cell=male" },
      { label: "Women's Wing", to: "/members?cell=women" },
      { label: "Lifetime Members", to: "/members?type=life" },
      { label: "Executive Council", to: "/cabinet" },
      { label: "Advisory Board", to: "/advisory-board" },
      { label: "Founders and Patrons", to: "/founders" },
      { label: "Ex-Presidents", to: "/ex-presidents" },
    ],
  },
  {
    label: "Projects",
    to: "/matrimonial",
    children: [
      { label: "Matrimonial", to: "/matrimonial" },
      { label: "Business Community", to: "/business" },
      { label: "Overseas Members", to: "/overseas" },
      { label: "Events & Meetings", to: "/updates?section=events" },
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

  const pathOnly = (to: string) => to.split("?")[0].split("#")[0] || "/";
  const isActive = (to: string) => {
    const target = pathOnly(to);
    return target === "/" ? location.pathname === "/" : location.pathname.startsWith(target);
  };

  const closeMobile = () => {
    setMobileOpen(false);
    setMobileExpanded(null);
  };

  return (
    <header className="site-header" style={{ fontFamily: "'Lato', sans-serif", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <div className="site-topbar" style={{ backgroundColor: GREEN, padding: "8px 0" }}>
        <div className="site-topbar__inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
          <div className="site-topbar__contacts" style={{ display: "flex", alignItems: "center", gap: 20 }}>
            {settings.contactPhone && <a href={`tel:${String(settings.contactPhone).replace(/[^+\d]/g, "")}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.9)", textDecoration: "none" }}><Phone size={13} /> {settings.contactPhone}</a>}
            {settings.contactEmail && <a className="site-topbar__email" href={`mailto:${settings.contactEmail}`} style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,0.9)", textDecoration: "none" }}><Mail size={13} /> {settings.contactEmail}</a>}
          </div>
          <div className="site-topbar__social" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isAdmin && <span style={{ backgroundColor: "white", color: GREEN, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10 }}>ADMIN MODE</span>}
            {settings.facebookUrl && <a href={settings.facebookUrl} aria-label="Facebook" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Facebook size={14} /></a>}
            {settings.twitterUrl && <a href={settings.twitterUrl} aria-label="X / Twitter" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Twitter size={14} /></a>}
            {settings.instagramUrl && <a href={settings.instagramUrl} aria-label="Instagram" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Instagram size={14} /></a>}
            {settings.linkedinUrl && <a href={settings.linkedinUrl} aria-label="LinkedIn" target="_blank" rel="noreferrer" style={{ color: "rgba(255,255,255,0.8)", display: "flex" }}><Linkedin size={14} /></a>}
          </div>
        </div>
      </div>

      <div className="site-nav-wrap" style={{ backgroundColor: "white", borderBottom: "1px solid #e7eee9" }}>
        <div className="site-nav-inner" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 80 }}>
          <Link to="/" className="site-brand" onClick={closeMobile} style={{ display: "flex", alignItems: "center", gap: 13, textDecoration: "none", minWidth: 0 }}>
            <span className="site-brand__logo-wrap" style={{ width: 58, height: 58, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", padding: 3, boxSizing: "border-box", border: "1px solid #e5dcc4", boxShadow: "0 4px 14px rgba(26,77,46,.08)", flexShrink: 0 }}>
              <img className="site-brand__logo" src={logoImg} alt="Anjuman-e-Araian Faisalabad logo" width={52} height={52} style={{ width: 52, height: 52, objectFit: "contain", display: "block" }} />
            </span>
            <div className="site-brand__copy" style={{ minWidth: 0 }}><div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 19, fontWeight: 700, lineHeight: 1.15 }}>Anjuman-e-Araian</div><div style={{ color: "#778078", fontSize: 10.5, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>Faisalabad · Est. 1947</div></div>
          </Link>

          <nav aria-label="Primary navigation" style={{ display: "flex", alignItems: "center", gap: 2 }} className="desktop-nav">
            {navLinks.map((link) => <div key={link.label} style={{ position: "relative" }} onMouseEnter={() => link.children && setOpenDropdown(link.label)} onMouseLeave={() => setOpenDropdown(null)}>
              <Link to={link.to} style={{ display: "flex", alignItems: "center", gap: 3, padding: "8px 10px", borderRadius: 6, fontSize: 13, fontWeight: 700, textDecoration: "none", color: isActive(link.to) ? "white" : "#36413a", backgroundColor: isActive(link.to) ? GREEN : "transparent", whiteSpace: "nowrap" }}>{link.label}{link.children && <ChevronDown size={12} />}</Link>
              {link.children && openDropdown === link.label && <div style={{ position: "absolute", top: "100%", left: 0, backgroundColor: "white", borderRadius: "0 0 8px 8px", boxShadow: "0 8px 28px rgba(0,0,0,0.13)", borderTop: `3px solid ${GOLD}`, minWidth: 225, zIndex: 200, padding: "4px 0" }}>{link.children.map((child) => <Link key={child.to} to={child.to} style={{ display: "block", padding: "10px 20px", fontSize: 13, textDecoration: "none", color: location.pathname === pathOnly(child.to) ? GREEN : "#3a3a3a", fontWeight: location.pathname === pathOnly(child.to) ? 700 : 400 }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = GREEN; (e.currentTarget as HTMLElement).style.color = "white"; }} onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; (e.currentTarget as HTMLElement).style.color = location.pathname === pathOnly(child.to) ? GREEN : "#3a3a3a"; }}>{child.label}</Link>)}</div>}
            </div>)}
            {member ? <Link to="/member/portal" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", backgroundColor: GOLD, color: "#1a1a1a", borderRadius: 7, fontSize: 12, fontWeight: 800, textDecoration: "none" }}><UserCircle size={15} /> {member.fullName.split(" ")[0]}</Link> : <Link to="/member/login" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 11px", border: `2px solid ${GREEN}`, color: GREEN, borderRadius: 7, fontSize: 12, fontWeight: 800, textDecoration: "none" }}><UserCircle size={15} /> Member Login</Link>}
            <Link to="/admin" style={{ display: "flex", alignItems: "center", padding: "8px 6px", color: "#c8ceca", textDecoration: "none" }} title="Admin" aria-label="Admin login"><Shield size={14} /></Link>
          </nav>

          <button onClick={() => setMobileOpen(!mobileOpen)} style={{ display: "none", width: 44, height: 44, alignItems: "center", justifyContent: "center", background: GREEN, border: "none", color: "white", cursor: "pointer", padding: 0, borderRadius: 9, flexShrink: 0 }} className="mobile-menu-btn" aria-label="Toggle navigation menu" aria-expanded={mobileOpen}>{mobileOpen ? <X size={23} /> : <Menu size={23} />}</button>
        </div>

        {mobileOpen && <nav aria-label="Mobile navigation" className="mobile-nav-panel" style={{ backgroundColor: "white", borderTop: "1px solid #e9eeeb", maxHeight: "calc(100vh - 110px)", overflowY: "auto", overscrollBehavior: "contain" }}>{navLinks.map((link) => <div key={link.label} style={{ borderBottom: "1px solid #f0f3f1" }}>
          <div style={{ display: "flex", alignItems: "center" }}>{link.children ? <button aria-expanded={mobileExpanded === link.label} onClick={() => setMobileExpanded(mobileExpanded === link.label ? null : link.label)} style={{ flex: 1, textAlign: "left", background: "none", border: "none", padding: "13px 20px", fontSize: 15, fontWeight: 700, color: isActive(link.to) ? GREEN : "#27312b", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", width: "100%", fontFamily: "inherit", minHeight: 48 }}><span>{link.label}</span><ChevronDown size={17} style={{ transform: mobileExpanded === link.label ? "rotate(180deg)" : "none", color: GREEN, transition: "transform .2s" }} /></button> : <Link to={link.to} style={{ flex: 1, display: "flex", alignItems: "center", minHeight: 48, padding: "0 20px", fontSize: 15, fontWeight: 700, textDecoration: "none", color: isActive(link.to) ? GREEN : "#27312b" }} onClick={closeMobile}>{link.label}</Link>}</div>
          {link.children && mobileExpanded === link.label && <div style={{ borderLeft: `3px solid ${GOLD}`, backgroundColor: "#fafbf9" }}>{link.children.map((c) => <Link key={c.to} to={c.to} style={{ display: "flex", alignItems: "center", minHeight: 44, padding: "0 28px", fontSize: 13.5, textDecoration: "none", color: "#4b5850", borderBottom: "1px solid #f0f0f0" }} onClick={closeMobile}>{c.label}</Link>)}</div>}
        </div>)}
          <div style={{ padding: 14, background: "#f6f8f6", display: "grid", gap: 8 }}>
            {member ? <Link to="/member/portal" onClick={closeMobile} style={{ minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 9, background: GOLD, color: "#1c261f", textDecoration: "none", fontSize: 14, fontWeight: 800 }}><UserCircle size={17} /> Open Member Portal</Link> : <Link to="/member/login" onClick={closeMobile} style={{ minHeight: 46, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, borderRadius: 9, background: GREEN, color: "white", textDecoration: "none", fontSize: 14, fontWeight: 800 }}><UserCircle size={17} /> Member Login</Link>}
          </div>
        </nav>}
      </div>
      <style>{`@media (max-width:1024px){.desktop-nav{display:none!important}.mobile-menu-btn{display:flex!important}}`}</style>
    </header>
  );
}
