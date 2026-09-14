import { Link } from "react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { getSiteSettings } from "../lib/settingsStore";
import logoImg from "../../imports/logo.png";

const GREEN = "#123f29";
const GOLD = "#c8a04a";

const linkStyle: React.CSSProperties = {
  color: "rgba(255,255,255,.78)",
  textDecoration: "none",
  fontSize: 13,
  lineHeight: 1.55,
};

export default function Footer() {
  const settings = getSiteSettings();
  const year = new Date().getFullYear();
  const phoneHref = String(settings.contactPhone || "").replace(/[^+\d]/g, "");

  const socialLinks = [
    { href: settings.facebookUrl, label: "Facebook", Icon: Facebook },
    { href: settings.twitterUrl, label: "X / Twitter", Icon: Twitter },
    { href: settings.instagramUrl, label: "Instagram", Icon: Instagram },
    { href: settings.linkedinUrl, label: "LinkedIn", Icon: Linkedin },
  ].filter((item) => Boolean(item.href));

  return (
    <footer className="site-footer" style={{ background: GREEN, color: "white", borderTop: `4px solid ${GOLD}` }}>
      <div className="site-footer__shell" style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 24px 24px" }}>
        <div className="site-footer__grid" style={{ display: "grid", gridTemplateColumns: "1.35fr .85fr .95fr 1.2fr", gap: 34 }}>
          <section aria-label="About Anjuman-e-Araian Faisalabad">
            <Link to="/" className="site-footer__brand" style={{ display: "inline-flex", alignItems: "center", gap: 13, textDecoration: "none", color: "white" }}>
              <span style={{ width: 66, height: 66, borderRadius: 16, background: "white", display: "grid", placeItems: "center", padding: 5, boxSizing: "border-box", border: "1px solid rgba(200,160,74,.7)", boxShadow: "0 8px 26px rgba(0,0,0,.14)" }}>
                <img src={logoImg} alt="Anjuman-e-Araian Faisalabad logo" width={56} height={56} style={{ width: 56, height: 56, objectFit: "contain", display: "block" }} />
              </span>
              <span>
                <strong style={{ display: "block", fontFamily: "'Playfair Display', serif", fontSize: 20, lineHeight: 1.2 }}>Anjuman-e-Araian</strong>
                <span style={{ display: "block", marginTop: 4, color: "rgba(255,255,255,.68)", fontSize: 11, letterSpacing: ".09em", textTransform: "uppercase" }}>Faisalabad · Est. 1947</span>
              </span>
            </Link>
            <p style={{ margin: "18px 0 0", maxWidth: 330, color: "rgba(255,255,255,.72)", fontSize: 13, lineHeight: 1.75 }}>
              Official community platform for membership, welfare, leadership, business networking, events and community services.
            </p>
            {socialLinks.length > 0 && <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
              {socialLinks.map(({ href, label, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} title={label} style={{ width: 36, height: 36, display: "grid", placeItems: "center", borderRadius: 9, border: "1px solid rgba(255,255,255,.16)", color: "white", background: "rgba(255,255,255,.06)" }}><Icon size={16} /></a>)}
            </div>}
          </section>

          <nav aria-label="Footer quick links">
            <h2 className="site-footer__heading">Quick Links</h2>
            <div className="site-footer__links">
              <Link to="/about" style={linkStyle}>About Us</Link>
              <Link to="/members" style={linkStyle}>Member Directory</Link>
              <Link to="/updates" style={linkStyle}>Recent Updates</Link>
              <Link to="/business" style={linkStyle}>Business Community</Link>
              <Link to="/media" style={linkStyle}>Gallery</Link>
              <Link to="/contact" style={linkStyle}>Contact Us</Link>
            </div>
          </nav>

          <nav aria-label="Member services">
            <h2 className="site-footer__heading">Member Services</h2>
            <div className="site-footer__links">
              <Link to="/member/login" style={linkStyle}>Member Login</Link>
              <Link to="/member/register" style={linkStyle}>Membership Registration</Link>
              <Link to="/matrimonial" style={linkStyle}>Matrimonial Service</Link>
              <Link to="/overseas" style={linkStyle}>Overseas Members</Link>
              <Link to="/constitution" style={linkStyle}>Constitution & Memorandum</Link>
              <Link to="/leadership-messages" style={linkStyle}>Leadership Messages</Link>
            </div>
          </nav>

          <section aria-label="Contact information">
            <h2 className="site-footer__heading">Contact</h2>
            <div style={{ display: "grid", gap: 12 }}>
              {settings.address && <div style={{ display: "flex", gap: 10, alignItems: "flex-start", color: "rgba(255,255,255,.78)", fontSize: 13, lineHeight: 1.6 }}><MapPin size={17} style={{ marginTop: 2, flex: "0 0 auto", color: GOLD }} /><span>{settings.address}</span></div>}
              {settings.contactPhone && <a href={`tel:${phoneHref}`} style={{ ...linkStyle, display: "flex", gap: 10, alignItems: "center" }}><Phone size={16} style={{ flex: "0 0 auto", color: GOLD }} /><span>{settings.contactPhone}</span></a>}
              {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} style={{ ...linkStyle, display: "flex", gap: 10, alignItems: "flex-start", wordBreak: "break-word" }}><Mail size={16} style={{ marginTop: 2, flex: "0 0 auto", color: GOLD }} /><span>{settings.contactEmail}</span></a>}
            </div>
          </section>
        </div>

        <div className="site-footer__bottom" style={{ marginTop: 34, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,.12)", display: "flex", justifyContent: "space-between", gap: 18, alignItems: "center", color: "rgba(255,255,255,.58)", fontSize: 12 }}>
          <span>© {year} Anjuman-e-Araian Faisalabad. All rights reserved.</span>
          <span>Official Digital Community Platform</span>
        </div>
      </div>
      <style>{`
        .site-footer__heading{margin:2px 0 15px;font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#fff}
        .site-footer__links{display:grid;gap:9px}
        .site-footer__links a{transition:color .18s ease,transform .18s ease}
        .site-footer__links a:hover{color:#fff!important;transform:translateX(2px)}
        @media(max-width:900px){.site-footer__grid{grid-template-columns:1.25fr 1fr!important}.site-footer__grid>section:first-child{grid-column:1/-1}}
        @media(max-width:600px){.site-footer__shell{padding:34px 18px 20px!important}.site-footer__grid{grid-template-columns:1fr!important;gap:28px!important}.site-footer__grid>section:first-child{grid-column:auto}.site-footer__brand{align-items:flex-start!important}.site-footer__bottom{align-items:flex-start!important;flex-direction:column!important;gap:6px!important;margin-top:28px!important}.site-footer__links a{min-height:34px;display:flex;align-items:center}.site-footer__heading{font-size:17px}}
      `}</style>
    </footer>
  );
}
