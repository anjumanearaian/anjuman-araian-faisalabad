import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipProfiles, LeadershipProfile } from "../lib/leadershipStore";
import { useState, useEffect } from "react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function AdvisoryBoardPage() {
  const [advisors, setAdvisors] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadershipProfiles().then(res => {
      setAdvisors(res.filter(p => p.category === "advisory"));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Advisory Board" subtitle="Distinguished experts guiding our strategic direction" breadcrumb={["Home", "Leadership", "Advisory Board"]} />
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <p style={{ color: "#666", fontSize: 15, lineHeight: 1.9, textAlign: "center", marginBottom: 48, maxWidth: 660, marginLeft: "auto", marginRight: "auto" }}>
          The Advisory Board comprises eminent personalities from diverse fields who volunteer their expertise to guide the organization's policies, programs, and strategic decisions.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="adv-grid">
          {advisors.map((a) => (
            <div key={a.id} style={{ backgroundColor: "white", borderRadius: 12, padding: "24px 22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)`, display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                {a.image ? (
                  <img src={a.image} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }}>{a.name.split(" ").slice(-2)[0]?.[0] ?? a.name[0]}</span>
                )}
              </div>
              <div>
                <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>{a.name}</p>
                <span style={{ display: "inline-block", backgroundColor: "#f0f7f3", color: GREEN, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 10, marginBottom: 6 }}>Advisory</span>
                <p style={{ color: "#666", fontSize: 12, lineHeight: 1.6, marginBottom: 3 }}>{a.role}</p>
                <p style={{ color: "#aaa", fontSize: 12 }}>{a.city}</p>
              </div>
            </div>
          ))}
        </div>
        {advisors.length === 0 && <p style={{ textAlign: "center", color: "#999", fontSize: 14 }}>No advisory board members found.</p>}
      </section>
      <style>{`@media (max-width: 900px) { .adv-grid { grid-template-columns: 1fr 1fr !important; } } @media (max-width: 560px) { .adv-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
