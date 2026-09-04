import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipProfiles, LeadershipProfile } from "../lib/leadershipStore";
import { useState, useEffect } from "react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function FoundersPage() {
  const [allFounders, setAllFounders] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadershipProfiles().then(res => {
      setAllFounders(res.filter(p => p.category === "founder"));
      setLoading(false);
    });
  }, []);

  const founders = allFounders.filter(f => !f.role.toLowerCase().includes("patron"));
  const patrons = allFounders.filter(f => f.role.toLowerCase().includes("patron"));

  return (
    <div>
      <PageHeader title="Founders and Patrons" subtitle="Honouring those who built this organization from nothing" breadcrumb={["Home", "Leadership", "Founders and Patrons"]} />

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700 }}>Founding Members (1947)</h2>
          <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "12px auto 0" }} />
          <p style={{ color: "#666", fontSize: 15, marginTop: 16, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            These pioneering individuals came together in the turbulent days of Pakistan's founding to establish a lasting institution for the Araian community.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 28, marginBottom: 64 }} className="founders-grid">
          {founders.map((f) => (
            <div key={f.id} style={{ backgroundColor: "#f8f5ef", borderRadius: 12, padding: 28, border: `1px solid rgba(200,160,74,0.2)`, display: "flex", gap: 20 }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {f.image ? (
                    <img src={f.image} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700 }}>{f.name.split(" ")[1]?.[0] ?? f.name[0]}</span>
                  )}
                </div>
              </div>
              <div>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 3 }}>{f.name}</h3>
                <p style={{ color: GOLD, fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{f.role}</p>
                <p style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>{f.city} {f.period ? `· ${f.period}` : ""}</p>
                <p style={{ color: "#555", fontSize: 13, lineHeight: 1.8 }}>{f.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700 }}>Distinguished Patrons</h2>
          <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "12px auto 0" }} />
          <p style={{ color: "#666", fontSize: 15, marginTop: 16, maxWidth: 600, marginLeft: "auto", marginRight: "auto" }}>
            Our patrons have made extraordinary contributions that have shaped the organization and improved countless lives.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }} className="patrons-grid">
          {patrons.map((p) => (
            <div key={p.id} style={{ backgroundColor: "white", borderRadius: 10, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderTop: `3px solid ${GOLD}`, textAlign: "center" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: "#f0f7f3", border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px", overflow: "hidden" }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>{p.name.split(" ")[1]?.[0] ?? p.name[0]}</span>
                )}
              </div>
              <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{p.name}</h3>
              <p style={{ color: GOLD, fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{p.role}</p>
              <p style={{ color: "#888", fontSize: 12, marginBottom: 10 }}>{p.city}</p>
              <p style={{ color: "#666", fontSize: 13, lineHeight: 1.7 }}>{p.description}</p>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 768px) { .founders-grid { grid-template-columns: 1fr !important; } .patrons-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 500px) { .patrons-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
