import { PageHeader } from "../components/PageHeader";
import { Globe, Phone, Mail } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchOverseasChapters, OverseasChapter } from "../lib/overseasStore";
import { fetchAllMembers, Member } from "../lib/memberStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function OverseasPage() {
  const [chapters, setChapters] = useState<OverseasChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [overseasMembers, setOverseasMembers] = useState<Member[]>([]);
  
  useEffect(() => {
    let isMounted = true;
    Promise.all([
      fetchOverseasChapters(),
      fetchAllMembers(1, 100)
    ]).then(([chaps, membersRes]) => {
      if (isMounted) {
        setChapters(chaps);
        const overseas = membersRes.data.filter((m: Member) => m.status === "approved" && m.membershipType === "overseas");
        setOverseasMembers(overseas);
        setLoading(false);
      }
    }).catch(err => {
      console.error("Failed to load overseas data", err);
      if (isMounted) setLoading(false);
    });
    
    return () => { isMounted = false; };
  }, []);
  
  const totalOverseas = chapters.reduce((s, c) => s + (Number(c.members) || 0), 0);
  
  return (
    <div>
      <PageHeader title="Overseas Members" subtitle="Araian community chapters around the world" breadcrumb={["Home", "Overseas Members"]} />

      <section style={{ backgroundColor: GREEN, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }} className="overseas-stats">
          {[
            { value: "8", label: "Countries" },
            { value: chapters.length.toString(), label: "Active Chapters" },
            { value: totalOverseas.toLocaleString() + "+", label: "Overseas Members" },
            { value: "2005", label: "First Chapter Founded" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700 }}>Our Global Chapters</h2>
          <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "12px auto 0" }} />
          <p style={{ color: "#666", fontSize: 15, marginTop: 16, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Wherever Araian community members go, they carry their values and their organization with them. Our overseas chapters provide a home away from home.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }} className="chapters-grid">
          {chapters.map((ch) => (
            <div key={ch.country} style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", border: `1px solid rgba(26,77,46,0.08)`, overflow: "hidden" }}>
              <div style={{ backgroundColor: "#f8f5ef", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `3px solid ${GOLD}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ fontSize: 36 }}>{ch.flag}</span>
                  <div>
                    <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, margin: 0 }}>{ch.country}</h3>
                    <p style={{ color: "#888", fontSize: 13, margin: 0 }}>{ch.city}</p>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{ch.members.toLocaleString()}</div>
                  <div style={{ color: "#999", fontSize: 11 }}>members</div>
                </div>
              </div>
              <div style={{ padding: "16px 24px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Chapter Coordinator</p>
                    <p style={{ color: GREEN, fontSize: 14, fontWeight: 600 }}>{ch.coordinator}</p>
                  </div>
                  <div>
                    <p style={{ color: "#aaa", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Established</p>
                    <p style={{ color: "#555", fontSize: 14 }}>{ch.established}</p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <a href={`tel:${ch.phone}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13, textDecoration: "none" }}>
                    <Phone size={13} color={GOLD} /> {ch.phone}
                  </a>
                  <a href={`mailto:${ch.email}`} style={{ display: "flex", alignItems: "center", gap: 8, color: "#555", fontSize: 13, textDecoration: "none" }}>
                    <Mail size={13} color={GOLD} /> {ch.email}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Individual Overseas Members */}
        {overseasMembers.length > 0 && (
          <div style={{ marginTop: 64 }}>
            <div style={{ textAlign: "center", marginBottom: 40 }}>
              <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700 }}>Our Registered Overseas Members</h2>
              <div style={{ width: 40, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "12px auto 0" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
              {overseasMembers.map((m) => (
                <div key={m.id} style={{ backgroundColor: "white", borderRadius: 10, padding: 20, textAlign: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)` }}>
                  <div style={{ width: 70, height: 70, borderRadius: "50%", backgroundColor: "#f5f5f5", margin: "0 auto 12px", border: `2px solid ${GOLD}`, overflow: "hidden" }}>
                    <img src={m.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.fullName)}&background=1a4d2e&color=fff`} alt={m.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, margin: "0 0 4px" }}>{m.fullName}</h4>
                  <p style={{ color: "#666", fontSize: 12, margin: "0 0 8px" }}>{m.occupation}</p>
                  <span style={{ backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, padding: "3px 10px", borderRadius: 12, fontWeight: 700 }}>
                    {m.city}{m.province ? `, ${m.province}` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Join overseas */}
        <div style={{ marginTop: 56, backgroundColor: "#f0f7f3", borderRadius: 14, padding: "36px 40px", border: `1px solid rgba(26,77,46,0.12)`, display: "grid", gridTemplateColumns: "1fr auto", gap: 24, alignItems: "center" }} className="join-overseas">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <Globe size={28} color={GREEN} />
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>Live Overseas? Join Your Local Chapter</h3>
            </div>
            <p style={{ color: "#555", fontSize: 15, lineHeight: 1.8 }}>
              If you are an Araian community member living abroad and don't see your country listed, you can register as an overseas member and help us establish a new chapter. Contact us at <strong>overseas@anjumanearaian.org</strong>.
            </p>
          </div>
          <a href="/contact" style={{ backgroundColor: GREEN, color: "white", padding: "12px 28px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap", textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Register Now
          </a>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .overseas-stats, .chapters-grid { grid-template-columns: 1fr 1fr !important; } .join-overseas { grid-template-columns: 1fr !important; } }
        @media (max-width: 500px) { .overseas-stats, .chapters-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
