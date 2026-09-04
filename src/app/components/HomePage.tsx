import { useState, useEffect } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight, Heart, Briefcase, Globe, ArrowRight, UserPlus, Eye, X } from "lucide-react";
import slide1 from "../../imports/1.jpg";
import slide2 from "../../imports/2.jpg";
import slide3 from "../../imports/3.jpg";
import announcementImg from "../../imports/announcement.jpg";
import presidentFallbackImg from "../../imports/Presedint.jpg";
import { getSiteSettings, fetchSiteSettings } from "../lib/settingsStore";
import { fetchAllContent } from "../lib/contentStore";
import type { NewsItem, EventItem } from "../lib/contentStore";
import { getPresidentMessage, getSecretaryMessage, getLeadershipProfiles, fetchLeadershipMessages, fetchLeadershipProfiles } from "../lib/leadershipStore";
import { fetchMediaGallery, MediaItem } from "../lib/mediaStore";
import { fetchAllMembers, Member } from "../lib/memberStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      {subtitle && (
        <p style={{ color: GOLD, fontFamily: "'Poppins', sans-serif", fontSize: 12, letterSpacing: "0.12em", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
          {subtitle}
        </p>
      )}
      <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, lineHeight: 1.3 }}>
        {title}
      </h2>
      <div style={{ backgroundColor: GREEN, height: 3, width: 56, margin: "12px auto 0", borderRadius: 2 }} />
    </div>
  );
}

function ReadMoreBtn({ to = "/", state }: { to?: string; state?: any }) {
  return (
    <Link
      to={to}
      state={state}
      style={{
        display: "inline-block",
        backgroundColor: GREEN,
        color: "white",
        fontFamily: "'Poppins', sans-serif",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        padding: "7px 20px",
        borderRadius: 3,
        marginTop: 12,
        textDecoration: "none",
      }}
    >
      Read More
    </Link>
  );
}

const fallbackSlides = [
  { src: slide1, alt: "Anjuman-e-Araian leadership group photo" },
  { src: slide2, alt: "Anjuman-e-Araian community event" },
  { src: slide3, alt: "Anjuman-e-Araian official gathering" },
];

const stripHtml = (html: string) => {
  if (!html) return "";
  return html.replace(/<\/?[^>]+(>|$)/g, "");
};

const extractFirstImage = (html: string) => {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

export function HomePage() {
  const [current, setCurrent] = useState(0);
  const [selectedFeatured, setSelectedFeatured] = useState<Member | null>(null);
  const [featuredMembers, setFeaturedMembers] = useState<Member[]>([]);

  const [settings, setSettings] = useState(getSiteSettings());
  const slides = settings.heroSlides && settings.heroSlides.length > 0
    ? settings.heroSlides.map((src, i) => ({ src, alt: `Slide ${i + 1}` }))
    : fallbackSlides;

  const [allNews, setAllNews] = useState<NewsItem[]>([]);
  const [allEvents, setAllEvents] = useState<EventItem[]>([]);

  const previousUpdates = allNews.slice(1, 5);
  const recentMeeting = allEvents[0];

  const [galleryPhotos, setGalleryPhotos] = useState<MediaItem[]>([]);

  const [presMsg, setPresMsg] = useState({ name: "President", body: "", attributes: [] as any[], photo: "" });
  const [secMsg, setSecMsg] = useState({ name: "Secretary", body: "", attributes: [] as any[], photo: "" });
  const [presProfile, setPresProfile] = useState<any>(null);
  const [secProfile, setSecProfile] = useState<any>(null);

  const presImage = presMsg.photo || presProfile?.image || presidentFallbackImg;
  const secImage = secMsg.photo || secProfile?.image || presidentFallbackImg;

  useEffect(() => {
    const t = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 5000);
    
    // Fetch live settings
    fetchSiteSettings().then(setSettings).catch(console.error);

    // Fetch featured members
    fetchAllMembers(1, 100).then(res => {
      const featured = res.data.filter((m: Member) => m.status === "approved" && m.isFeatured);
      setFeaturedMembers(featured);
    });

    // Fetch public content
    fetchAllContent("news", 1, 10, false).then(res => setAllNews(res.data as NewsItem[]));
    fetchAllContent("event", 1, 10, false).then(res => setAllEvents(res.data as EventItem[]));
    
    // Fetch Media Gallery
    fetchMediaGallery(1, 10, "photo").then(res => setGalleryPhotos(res.data));

    // Fetch leadership data
    fetchLeadershipProfiles().then(res => {
      setPresProfile(res.find((p: any) => p.tier === 0 && p.category === "cabinet"));
      setSecProfile(res.find((p: any) => p.tier === 1 && p.category === "cabinet"));
    });
    
    // Fetch leadership messages dynamically
    fetchLeadershipMessages().then(msgs => {
      const parseAttrs = (m: any) => typeof m?.attributes === 'string' ? JSON.parse(m.attributes) : (Array.isArray(m?.attributes) ? m.attributes : []);
      const pMsg = msgs.find((m: any) => m.type === "president") as any;
      const sMsg = msgs.find((m: any) => m.type === "secretary") as any;
      if (pMsg) setPresMsg({ name: pMsg.name, body: pMsg.body, attributes: parseAttrs(pMsg), photo: pMsg.photo });
      if (sMsg) setSecMsg({ name: sMsg.name, body: sMsg.body, attributes: parseAttrs(sMsg), photo: sMsg.photo });
    });

    return () => clearInterval(t);
  }, [slides.length]);

  return (
    <div style={{ backgroundColor: "#fff" }}>

      {/* ── Hero Slider ── */}
      <section style={{ position: "relative", width: "100%", overflow: "hidden", lineHeight: 0 }}>
        {slides.map((slide, i) => (
          <img
            key={i}
            src={slide.src}
            alt={slide.alt}
            style={{
              position: i === 0 ? "relative" : "absolute",
              inset: 0,
              width: "100%",
              height: i === 0 ? "auto" : "100%",
              opacity: i === current ? 1 : 0,
              transition: "opacity 0.9s ease",
              display: "block",
            }}
          />
        ))}

        {/* Prev / Next */}
        <button
          onClick={() => setCurrent((c) => (c - 1 + slides.length) % slides.length)}
          aria-label="Previous"
          style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "rgba(0,0,0,0.35)", border: "none", borderRadius: "50%",
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white",
          }}
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={() => setCurrent((c) => (c + 1) % slides.length)}
          aria-label="Next"
          style={{
            position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)",
            zIndex: 10, background: "rgba(0,0,0,0.35)", border: "none", borderRadius: "50%",
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: "white",
          }}
        >
          <ChevronRight size={22} />
        </button>

        {/* Dots */}
        <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", zIndex: 10, display: "flex", gap: 8 }}>
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Slide ${i + 1}`}
              style={{
                width: i === current ? 24 : 8, height: 8, borderRadius: 4,
                border: "none", cursor: "pointer", transition: "width 0.3s ease",
                backgroundColor: i === current ? "#c8a04a" : "rgba(255,255,255,0.6)",
              }}
            />
          ))}
        </div>
      </section>

      {/* ── About Us Snippet ── */}
      <section style={{ backgroundColor: "#f8f5ef", padding: "64px 0 48px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <SectionTitle title="Welcome to Anjuman-e-Araian Faisalabad" subtitle="Our Legacy and Vision" />
          <p style={{ color: "#444", fontFamily: "'Poppins', sans-serif", fontSize: 16, lineHeight: 1.85, marginBottom: 24, maxWidth: 800, margin: "0 auto 24px" }}>
            Anjuman-e-Araian Faisalabad is dedicated to the social, educational, and economic upliftment of our community members. Through unity, welfare programs, matrimonial facilitation, and a thriving business network, we strive to build a stronger and more connected future.
          </p>
          <Link to="/about" style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: GREEN, color: "white", padding: "12px 28px", borderRadius: 6, fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 700, textDecoration: "none", transition: "transform 0.2s", boxShadow: "0 4px 12px rgba(26,77,46,0.2)" }} className="hover-lift">
            Learn More About Us <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── Leadership Messages ── */}
      <section style={{ backgroundColor: "#fff", padding: "64px 0 48px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Message from our Leadership" subtitle="Words of Wisdom" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="grid-responsive-2col">
            {/* President Card */}
            <div style={{ backgroundColor: "#f9fafb", border: "1px solid #eee", borderRadius: 12, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
                <img
                  src={presImage}
                  alt={presMsg.name}
                  style={{ width: 110, height: 135, objectFit: "cover", objectPosition: "top", borderRadius: 8, flexShrink: 0, border: `2px solid ${GOLD}` }}
                />
                <div>
                  <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" }}>{presMsg.name}</h4>
                  <p style={{ color: "#888", fontFamily: "'Poppins', sans-serif", fontSize: 12, margin: 0, fontWeight: 500 }}>Central President</p>
                  <p style={{ color: "#aaa", fontFamily: "'Poppins', sans-serif", fontSize: 11, margin: "2px 0 0 0" }}>Anjuman-e-Araian Pakistan</p>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div dir="auto"
                  style={{ 
                    color: "#555", 
                    fontFamily: "'Poppins', sans-serif", 
                    fontSize: 14, 
                    lineHeight: 1.8,
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  dangerouslySetInnerHTML={{ __html: presMsg.body }}
                />
              </div>
              <div style={{ marginTop: 20 }}>
                <ReadMoreBtn to="/president-message" />
              </div>
            </div>

            {/* General Secretary Card */}
            <div style={{ backgroundColor: "#f9fafb", border: "1px solid #eee", borderRadius: 12, padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 20 }}>
                <img
                  src={secImage}
                  alt={secMsg.name}
                  style={{ width: 110, height: 135, objectFit: "cover", objectPosition: "top", borderRadius: 8, flexShrink: 0, border: `2px solid ${GOLD}` }}
                />
                <div>
                  <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: "0 0 4px 0" }}>{secMsg.name}</h4>
                  <p style={{ color: "#888", fontFamily: "'Poppins', sans-serif", fontSize: 12, margin: 0, fontWeight: 500 }}>General Secretary</p>
                  <p style={{ color: "#aaa", fontFamily: "'Poppins', sans-serif", fontSize: 11, margin: "2px 0 0 0" }}>Anjuman-e-Araian Pakistan</p>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div dir="auto"
                  style={{ 
                    color: "#555", 
                    fontFamily: "'Poppins', sans-serif", 
                    fontSize: 14, 
                    lineHeight: 1.8,
                    display: "-webkit-box",
                    WebkitLineClamp: 5,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    textOverflow: "ellipsis"
                  }}
                  dangerouslySetInnerHTML={{ __html: secMsg.body }}
                />
              </div>
              <div style={{ marginTop: 20 }}>
                <ReadMoreBtn to="/secretary-message" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Quick Access Gateways ── */}
      <section style={{ backgroundColor: "#f0f7f3", padding: "56px 0" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Community Services and Portals" subtitle="Get Involved" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="grid-responsive-3col">
            <Link to="/member/register" style={{ backgroundColor: "#ffffff", border: `1px solid rgba(26,77,46,0.08)`, borderBottom: `4px solid ${GREEN}`, borderRadius: 20, padding: "40px 32px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 12px 32px rgba(26,77,46,0.06)", transition: "all 0.3s ease-in-out" }} className="hover-lift gateway-card">
              <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#e8f0eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 4px 12px rgba(26,77,46,0.1)" }}>
                <UserPlus size={32} color={GREEN} />
              </div>
              <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Join Membership</h4>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>Become a registered member of the Anjuman, build your profile, and connect with the community.</p>
              <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Register Now <ArrowRight size={16} /></span>
            </Link>

            <Link to="/matrimonial" style={{ backgroundColor: "#ffffff", border: `1px solid rgba(26,77,46,0.08)`, borderBottom: `4px solid ${GOLD}`, borderRadius: 20, padding: "40px 32px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 12px 32px rgba(26,77,46,0.06)", transition: "all 0.3s ease-in-out" }} className="hover-lift gateway-card">
              <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#fef8ee", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 4px 12px rgba(200,160,74,0.15)" }}>
                <Heart size={32} color={GOLD} />
              </div>
              <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Matrimonial Service</h4>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>Submit private inquiries or search for matrimonial proposals securely overseen by administration.</p>
              <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Explore Proposals <ArrowRight size={16} /></span>
            </Link>

            <Link to="/business" style={{ backgroundColor: "#ffffff", border: `1px solid rgba(26,77,46,0.08)`, borderBottom: `4px solid ${GREEN}`, borderRadius: 20, padding: "40px 32px", textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", boxShadow: "0 12px 32px rgba(26,77,46,0.06)", transition: "all 0.3s ease-in-out" }} className="hover-lift gateway-card">
              <div style={{ width: 80, height: 80, borderRadius: "50%", backgroundColor: "#e8f0eb", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, boxShadow: "0 4px 12px rgba(26,77,46,0.1)" }}>
                <Briefcase size={32} color={GREEN} />
              </div>
              <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Business Directory</h4>
              <p style={{ color: "#555", fontSize: 14, lineHeight: 1.7, marginBottom: 20 }}>Submit your business to the community listing or browse verified profiles and discount offers.</p>
              <span style={{ color: GOLD, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>View Directory <ArrowRight size={16} /></span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Member Benefits and Discount Offers ── */}
      <section style={{ backgroundColor: "#fff", padding: "64px 0" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Membership Benefits and Offers" subtitle="Why Join Us?" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }} className="grid-responsive-2col">
            <div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 20 }}>Key Benefits</h3>
              <ul style={{ listStyleType: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  "Access to our private, secure Matrimonial database.",
                  "Listing in our Business Directory to promote your services/products.",
                  "Exclusive discount offers at partner hospitals, schools, and retailers.",
                  "Invitations to community networking events and seminars.",
                  "Access to student scholarship programs and family support funds.",
                ].map((benefit, i) => (
                  <li key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontFamily: "'Poppins', sans-serif", fontSize: 14, color: "#444" }}>
                    <span style={{ color: GOLD, fontWeight: "bold" }}>✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{ backgroundColor: "#fdfcf9", border: `2px dashed ${GOLD}`, borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Special Discounts</h3>
              <p style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
                Anjuman members enjoy discounts from 10% up to 30% at select clinics, labs, academic institutions, and businesses in Faisalabad.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 12, padding: "8px 16px", borderRadius: 8, fontWeight: 600 }}>Medical and Labs: 15-20% Off</span>
                <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 12, padding: "8px 16px", borderRadius: 8, fontWeight: 600 }}>Schools and Colleges: 10% Off</span>
                <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 12, padding: "8px 16px", borderRadius: 8, fontWeight: 600 }}>Selected Outlets: 10-30% Off</span>
              </div>
              <div style={{ marginTop: 24 }}>
                <Link to="/business" style={{ color: GREEN, fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 700, textDecoration: "none", borderBottom: `2px solid ${GREEN}`, paddingBottom: 4 }}>
                  Browse Discount Directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured Members Section ── */}
      {featuredMembers.length > 0 && (
        <section style={{ backgroundColor: "#11321e", padding: "48px 0", borderTop: `4px solid ${GOLD}`, borderBottom: `4px solid ${GOLD}` }}>
          <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <h3 style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, margin: 0 }}>
                Featured <span style={{ color: GOLD }}>Members</span>
              </h3>
              <p style={{ color: "rgba(255,255,255,0.7)", fontFamily: "'Poppins', sans-serif", fontSize: 14, marginTop: 8 }}>
                Recognizing the outstanding contributions to our community
              </p>
            </div>
            
            <div style={{ display: "flex", overflowX: "auto", gap: 24, paddingBottom: 16, scrollbarWidth: "thin" }} className="custom-scrollbar">
              {featuredMembers.map(m => (
                <div key={m.id} style={{ flex: "0 0 280px", backgroundColor: "white", padding: "24px 20px", borderRadius: 16, textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.15)", transition: "transform 0.3s, box-shadow 0.3s", position: "relative", borderBottom: `4px solid ${GOLD}` }} className="hover-lift">
                  <div style={{ width: 90, height: 90, borderRadius: "50%", backgroundColor: "#f5f5f5", margin: "0 auto 16px", border: `3px solid ${GREEN}`, padding: 3, overflow: "hidden" }}>
                    <img src={m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=1a4d2e&color=fff`} alt={m.fullName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" }} />
                  </div>
                  <h4 style={{ color: "#111", fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, margin: "0 0 4px" }}>{m.fullName}</h4>
                  {m.occupation && <p style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 13, margin: "0 0 16px" }}>{m.occupation}</p>}
                  
                  <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {m.city && (
                      <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <Globe size={12} /> {m.city}
                      </span>
                    )}
                    {m.membershipType === "overseas" && (
                      <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700 }}>
                        Overseas
                      </span>
                    )}
                    {m.occupation && m.occupation.toLowerCase().includes("business") && (
                      <span style={{ backgroundColor: "#fef9c3", color: "#a16207", fontSize: 11, padding: "4px 12px", borderRadius: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <Briefcase size={12} /> Business
                      </span>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setSelectedFeatured(m)}
                    style={{ width: "100%", padding: "10px 0", backgroundColor: "transparent", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, transition: "background-color 0.2s" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = GOLD; e.currentTarget.style.color = "white"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = GOLD; }}
                  >
                    <Eye size={16} /> View Profile
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Latest Update (Moved Below) ── */}
      <section style={{ backgroundColor: "#fafafa", padding: "56px 0" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Latest Highlight" />

          {allNews.length > 0 && (() => {
            const update = allNews[0];
            return (
              <div style={{ backgroundColor: "white", borderRadius: 16, overflow: "hidden", boxShadow: "0 10px 40px rgba(0,0,0,0.06)", display: "flex", flexWrap: "wrap" }}>
                {/* Left Side: Image */}
                <div style={{ flex: "1 1 400px", minHeight: 300 }}>
                  <img
                    src={(update.images && update.images.length > 0) ? update.images[0] : announcementImg}
                    alt={update.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  />
                </div>

                {/* Right Side: Content */}
                <div style={{ flex: "1 1 400px", padding: "48px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <div style={{ display: "inline-block", backgroundColor: "#f0f7f3", color: GREEN, padding: "6px 14px", borderRadius: 20, fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 16, alignSelf: "flex-start" }}>
                    {new Date(update.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>

                  <h4 dir="auto" style={{ color: "#1a1a1a", fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, lineHeight: 1.3, marginBottom: 16 }}>
                    {update.title}
                  </h4>

                  <p dir="auto" style={{ color: "#555", fontFamily: "'Poppins', sans-serif", fontSize: 15, lineHeight: 1.8, marginBottom: 28, whiteSpace: "pre-wrap" }}>
                    {stripHtml(update.body).length > 250 ? stripHtml(update.body).substring(0, 250) + "..." : stripHtml(update.body)}
                  </p>

                  <div>
                    <Link to="/news" style={{ display: "inline-flex", alignItems: "center", gap: 8, backgroundColor: GREEN, color: "white", padding: "12px 28px", borderRadius: 6, fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 700, textDecoration: "none", transition: "transform 0.2s", boxShadow: "0 4px 12px rgba(26,77,46,0.2)" }} className="hover-lift">
                      Read Full Story <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()}

          {allNews.length > 1 && (
            <div style={{ marginTop: 40, textAlign: "center" }}>
              <Link to="/news" style={{ display: "inline-block", color: GREEN, fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 700, textDecoration: "none", borderBottom: `2px solid ${GREEN}`, paddingBottom: 4 }}>
                View All Previous Updates
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Previous Updates ── */}
      <section style={{ backgroundColor: "#f8f5ef", padding: "48px 0" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Previous Updates" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="grid-4col">
            {previousUpdates.map((item) => (
              <Link
                key={item.id}
                to="/news"
                state={{ expandNewsId: item.id }}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{ backgroundColor: "#fff", borderRadius: 6, overflow: "hidden", boxShadow: "0 2px 10px rgba(0,0,0,0.07)", cursor: "pointer", height: "100%" }}
                  className="hover-lift"
                >
                  <div style={{ overflow: "hidden", height: 160 }}>
                    <img
                      src={item.images?.[0] || "https://images.unsplash.com/photo-1608020932658-d0e19a69580b?w=400&h=260&fit=crop&auto=format"}
                      alt={item.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
                      className="img-zoom"
                    />
                  </div>
                  <div style={{ padding: "10px 12px" }}>
                    <p dir="auto" style={{ color: GREEN, fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 600, lineHeight: 1.5 }}>
                      {item.title}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link to="/news" style={{ display: "inline-block", border: `2px solid ${GREEN}`, color: GREEN, fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "8px 28px", borderRadius: 3, textDecoration: "none" }}>
              View All Updates
            </Link>
          </div>
        </div>
      </section>

      {/* ── Recent Meeting Section ── */}
      <section style={{ padding: "56px 0", backgroundColor: "#fff" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Recent Meeting Anjuman e Arabian" subtitle="Community Affairs" />

          {recentMeeting && (
            <div
              style={{
                backgroundColor: "#f5ede0",
                borderRadius: 8,
                padding: "36px 40px",
                position: "relative",
                overflow: "hidden",
                border: `1px solid rgba(200,160,74,0.25)`,
              }}
            >
              {/* Watermark emblem */}
              <div style={{
                position: "absolute",
                right: 40,
                top: "50%",
                transform: "translateY(-50%)",
                width: 220,
                height: 220,
                borderRadius: "50%",
                border: `6px solid rgba(26,77,46,0.07)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}>
                <span style={{ color: "rgba(26,77,46,0.06)", fontFamily: "'Amiri', serif", fontSize: 110, fontWeight: 700, lineHeight: 1 }}>ع</span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 36, alignItems: "start", position: "relative", zIndex: 1 }} className="meeting-grid">
                {/* Text content */}
                <div>
                  <h3 dir="auto" style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                    {recentMeeting.title}
                  </h3>
                  <p dir="auto" style={{ color: "#333", fontFamily: "'Poppins', sans-serif", fontSize: 14, lineHeight: 1.95, marginBottom: 16, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {stripHtml(recentMeeting.desc)}
                  </p>
                  <ReadMoreBtn to="/events" state={{ expandEventId: recentMeeting.id }} />
                </div>

                {/* Meeting image */}
                <div style={{ flexShrink: 0 }}>
                  <img
                    src={recentMeeting.images?.[0] || extractFirstImage(recentMeeting.desc) || "https://images.unsplash.com/photo-1778864874442-d5ab28793824?w=320&h=240&fit=crop&auto=format"}
                    alt={recentMeeting.title}
                    style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 6, display: "block", border: `3px solid rgba(200,160,74,0.4)` }}
                  />
                  <p style={{ color: "#888", fontFamily: "'Poppins', sans-serif", fontSize: 11, textAlign: "center", marginTop: 8, fontStyle: "italic" }}>
                    {recentMeeting.location} — {new Date(recentMeeting.date).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Events Gallery ── */}
      <section style={{ backgroundColor: "#f8f5ef", padding: "48px 0 64px" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", padding: "0 24px" }}>
          <SectionTitle title="Events Gallery" subtitle="Moments and Memories" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="grid-4col">
            {galleryPhotos.map((photo) => (
              <div
                key={photo.id}
                style={{ borderRadius: 6, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.09)", cursor: "pointer", position: "relative" }}
                className="hover-lift"
              >
                <div style={{ overflow: "hidden", height: 180 }}>
                  <img
                    src={photo.url}
                    alt={photo.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }}
                    className="img-zoom"
                  />
                </div>
                <div style={{ padding: "10px 12px", backgroundColor: "#fff" }}>
                  <p style={{ color: GREEN, fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 600 }}>
                    {photo.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 28 }}>
            <Link to="/media" style={{ display: "inline-block", backgroundColor: GREEN, color: "white", fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "9px 28px", borderRadius: 3, textDecoration: "none" }}>
              View Full Gallery
            </Link>
          </div>
        </div>
      </section>
      {/* ── Featured Member Modal ── */}
      {selectedFeatured && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div style={{ backgroundColor: "white", borderRadius: 16, width: "100%", maxWidth: 500, overflow: "hidden", boxShadow: "0 24px 60px rgba(0,0,0,0.2)", position: "relative" }}>
            <button 
              onClick={() => setSelectedFeatured(null)} 
              style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10, transition: "background 0.2s" }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.35)"}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"}
            >
              <X size={20} color="white" />
            </button>
            
            <div style={{ backgroundColor: GREEN, height: 120, position: "relative" }}>
              {/* Cover background */}
              <div style={{ position: "absolute", inset: 0, opacity: 0.1, backgroundImage: "radial-gradient(circle at 20px 20px, #ffffff 2px, transparent 0)", backgroundSize: "40px 40px" }} />
            </div>
            
            <div style={{ padding: "0 32px 32px", position: "relative" }}>
              <div style={{ width: 110, height: 110, borderRadius: "50%", backgroundColor: "white", padding: 4, margin: "-55px auto 16px", position: "relative", zIndex: 2 }}>
                <img src={selectedFeatured.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedFeatured.fullName)}&background=1a4d2e&color=fff`} alt={selectedFeatured.fullName} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", border: `2px solid ${GOLD}` }} />
              </div>
              
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <h3 style={{ color: "#111", fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>{selectedFeatured.fullName}</h3>
                
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                  {selectedFeatured.membershipType === "overseas" && (
                    <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 10, padding: "2px 10px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Overseas Member</span>
                  )}
                  {selectedFeatured.occupation && selectedFeatured.occupation.toLowerCase().includes("business") && (
                    <span style={{ backgroundColor: "#fef9c3", color: "#a16207", fontSize: 10, padding: "2px 10px", borderRadius: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>Business Leader</span>
                  )}
                </div>

                {selectedFeatured.occupation && <p style={{ color: GOLD, fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600, margin: 0 }}>{selectedFeatured.occupation}</p>}
              </div>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, backgroundColor: "#f9fafb", padding: 20, borderRadius: 12, border: "1px solid #f3f4f6" }}>
                {selectedFeatured.fatherName && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#666", fontSize: 13 }}>Father's Name</span>
                    <span style={{ color: "#111", fontSize: 13, fontWeight: 600 }}>{selectedFeatured.fatherName}</span>
                  </div>
                )}
                {selectedFeatured.city && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#666", fontSize: 13 }}>City</span>
                    <span style={{ color: "#111", fontSize: 13, fontWeight: 600 }}>{selectedFeatured.city}</span>
                  </div>
                )}
                {selectedFeatured.education && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#666", fontSize: 13 }}>Education</span>
                    <span style={{ color: "#111", fontSize: 13, fontWeight: 600 }}>{selectedFeatured.education}</span>
                  </div>
                )}
                {selectedFeatured.bloodGroup && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: 8, borderBottom: "1px solid #eee" }}>
                    <span style={{ color: "#666", fontSize: 13 }}>Blood Group</span>
                    <span style={{ color: "white", backgroundColor: "#ef4444", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700 }}>{selectedFeatured.bloodGroup}</span>
                  </div>
                )}
                {selectedFeatured.membershipType && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4 }}>
                    <span style={{ color: "#666", fontSize: 13 }}>Membership</span>
                    <span style={{ color: GREEN, backgroundColor: "#dcfce7", padding: "2px 8px", borderRadius: 10, fontSize: 11, fontWeight: 700, textTransform: "capitalize" }}>{selectedFeatured.membershipType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .grid-responsive-2col {
            grid-template-columns: 1fr !important;
          }
          .grid-responsive-3col {
            grid-template-columns: 1fr !important;
          }
          .grid-4col {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .meeting-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 500px) {
          .grid-4col {
            grid-template-columns: 1fr !important;
          }
        }
        .gateway-card {
          background-color: white !important;
        }
        .hover-lift:hover {
          transform: translateY(-3px);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          box-shadow: 0 8px 24px rgba(0,0,0,0.13) !important;
        }
        .img-zoom:hover {
          transform: scale(1.06);
        }
        .custom-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
