import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipProfiles, LeadershipProfile } from "../lib/leadershipStore";
import { useState, useEffect } from "react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function ExecutiveMembersPage() {
  const [executives, setExecutives] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadershipProfiles().then(res => {
      setExecutives(res.filter(p => p.category === "executive"));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Executive Members" subtitle="Elected representatives of the Central Executive Committee" breadcrumb={["Home", "Leadership", "Executive Members"]} />
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }} className="exec-grid">
          {executives.map((m) => (
            <div key={m.id} style={{ backgroundColor: "white", borderRadius: 10, padding: "22px 16px", textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)`, transition: "transform 0.2s" }}>
              <div style={{ width: 58, height: 58, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", border: `3px solid ${GOLD}`, overflow: "hidden" }}>
                {m.image ? (
                  <img src={m.image} alt={m.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>{m.name.split(" ")[1]?.[0] ?? m.name[0]}</span>
                )}
              </div>
              <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 14, fontWeight: 700, marginBottom: 3, lineHeight: 1.4 }}>{m.name}</p>
              <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{m.role}</p>
              <p style={{ color: "#888", fontSize: 12 }}>{m.city}</p>
            </div>
          ))}
        </div>
        {executives.length === 0 && <p style={{ textAlign: "center", color: "#999", fontSize: 14 }}>No executive members found.</p>}
      </section>
      <style>{`@media (max-width: 900px) { .exec-grid { grid-template-columns: repeat(3,1fr) !important; } } @media (max-width: 600px) { .exec-grid { grid-template-columns: repeat(2,1fr) !important; } }`}</style>
    </div>
  );
}
