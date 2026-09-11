import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Twitter } from "lucide-react";
import { fetchSiteSettings, getSiteSettings, SiteSettings } from "../lib/settingsStore";
import logoImg from "../../imports/logo.png";

const GREEN = "#123d28";
const GOLD = "#c8a04a";

export default function Footer() {
  const [settings, setSettings] = useState<SiteSettings>(getSiteSettings());

  useEffect(() => {
    fetchSiteSettings().then(setSettings).catch(() => {});
  }, []);

  return (
    <footer style={{ background: GREEN, color: "white", fontFamily: "'Poppins', sans-serif", marginTop: 24 }}>
      <div style={{ height: 4, background: GOLD }} />

      <div className="site-footer-grid" style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 34px", display: "grid", gridTemplateColumns: "1.3fr 0.8fr 0.9fr", gap: 44 }}>
        <div>
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 14, color: "white", textDecoration: "none", marginBottom: 18 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "white", padding: 5, display: "grid", placeItems: "center", flexShrink: 0 }}>
              <img src={logoImg} alt="Anjuman-e-Araian Faisalabad" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 21, fontWeight: 700, lineHeight: 1.25 }}>Anjuman-e-Araian Faisalabad</div>
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 4 }}>Unity • Welfare • Progress</div>
            </div>
          </Link>
          <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 1.8, maxWidth: 430, margin: 0 }}>
            Serving the Araian community through welfare, education, social support and trusted community connections in Faisalabad.
          </p>

          <div style={{ display: "flex", gap: 9, marginTop: 20 }}>
            {settings.facebookUrl && <a href={settings.facebookUrl} target="_blank" rel="noreferrer" aria-label="Facebook" className="footer-social"><Facebook size={16} /></a>}
            {settings.twitterUrl && <a href={settings.twitterUrl} target="_blank" rel="noreferrer" aria-label="Twitter" className="footer-social"><Twitter size={16} /></a>}
            {settings.instagramUrl && <a href={settings.instagramUrl} target="_blank" rel="noreferrer" aria-label="Instagram" className="footer-social"><Instagram size={16} /></a>}
            {settings.linkedinUrl && <a href={settings.linkedinUrl} target="_blank" rel="noreferrer" aria-label="LinkedIn" className="footer-social"><Linkedin size={16} /></a>}
          </div>
        </div>

        <div>
          <h3 style={{ color: GOLD, fontSize: 14, fontWeight: 700, margin: "4px 0 18px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Quick Links</h3>
          <div style={{ display: "grid", gap: 10 }}>
            <Link className="footer-link" to="/about">About Us</Link>
            <Link className="footer-link" to="/members-directory">Members Directory</Link>
            <Link className="footer-link" to="/president-message">President&apos;s Message</Link>
            <Link className="footer-link" to="/secretary-message">General Secretary&apos;s Message</Link>
            <Link className="footer-link" to="/matrimonial">Matrimonial Project</Link>
            <Link className="footer-link" to="/contact">Contact Us</Link>
          </div>
        </div>

        <div>
          <h3 style={{ color: GOLD, fontSize: 14, fontWeight: 700, margin: "4px 0 18px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Contact</h3>
          <div style={{ display: "grid", gap: 14, color: "rgba(255,255,255,0.76)", fontSize: 13, lineHeight: 1.6 }}>
            {settings.address && <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}><MapPin size={17} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }} /><span>{settings.address}</span></div>}
            {settings.contactPhone && <a href={`tel:${settings.contactPhone}`} className="footer-contact"><Phone size={16} color={GOLD} /><span>{settings.contactPhone}</span></a>}
            {settings.contactEmail && <a href={`mailto:${settings.contactEmail}`} className="footer-contact"><Mail size={16} color={GOLD} /><span>{settings.contactEmail}</span></a>}
          </div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="footer-bottom" style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
          <span>© {new Date().getFullYear()} Anjuman-e-Araian Faisalabad. All rights reserved.</span>
          <span>Official Community Platform</span>
        </div>
      </div>

      <style>{`
        .footer-link { color: rgba(255,255,255,0.72); text-decoration: none; font-size: 13px; width: fit-content; transition: color .18s ease, transform .18s ease; }
        .footer-link:hover { color: #ffffff; transform: translateX(3px); }
        .footer-social { width: 34px; height: 34px; border: 1px solid rgba(255,255,255,.18); border-radius: 50%; display: grid; place-items: center; color: rgba(255,255,255,.82); text-decoration: none; transition: background .18s ease, color .18s ease, border-color .18s ease; }
        .footer-social:hover { background: ${GOLD}; color: ${GREEN}; border-color: ${GOLD}; }
        .footer-contact { display: flex; align-items: flex-start; gap: 10px; color: rgba(255,255,255,.76); text-decoration: none; }
        .footer-contact:hover { color: #ffffff; }
        @media (max-width: 820px) {
          .site-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
          .site-footer-grid > div:first-child { grid-column: 1 / -1; }
        }
        @media (max-width: 560px) {
          .site-footer-grid { grid-template-columns: 1fr !important; padding-top: 36px !important; }
          .site-footer-grid > div:first-child { grid-column: auto; }
          .footer-bottom { flex-direction: column; align-items: flex-start !important; }
        }
      `}</style>
    </footer>
  );
}
