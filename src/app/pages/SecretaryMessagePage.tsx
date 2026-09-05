import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipMessages, LeadershipMessageData } from "../lib/leadershipStore";
import { useState, useEffect } from "react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function SecretaryMessagePage() {
  const [msg, setMsg] = useState<LeadershipMessageData>({ name: "Dr Mian Saqib Rahman", body: "We welcome members to participate in Anjuman-e-Araian Faisalabad's welfare, educational and community programmes.", attributes: [] });

  useEffect(() => {
    fetchLeadershipMessages().then(msgs => {
      const sMsg = msgs.find(m => m.type === "secretary");
      if (sMsg) setMsg(sMsg);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <PageHeader title="General Secretary" subtitle="Profile and Message from the General Secretary" breadcrumb={["Home", "Leadership", "General Secretary"]} />
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 48, alignItems: "start" }} className="sec-grid">
          <div style={{ textAlign: "center" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                src={msg.photo || "https://images.unsplash.com/photo-1723051963745-d10d43248655?w=260&h=300&fit=crop&auto=format"}
                alt={`General Secretary ${msg.name}`}
                style={{ width: 220, height: 265, objectFit: "cover", objectPosition: "top", borderRadius: 12, border: `4px solid ${GOLD}`, display: "block", margin: "0 auto" }}
              />
              <div style={{ position: "absolute", bottom: -1, left: 0, right: 0, backgroundColor: GREEN, borderRadius: "0 0 10px 10px", padding: "10px 0" }}>
                <p style={{ color: GOLD, fontSize: 13, fontWeight: 700, margin: 0 }}>General Secretary</p>
              </div>
            </div>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, marginTop: 20, marginBottom: 4 }}>{msg.name || "General Secretary"}</h2>
            <p style={{ color: "#888", fontSize: 13 }}>Anjuman-e-Araian Pakistan</p>
            {msg.attributes && msg.attributes.length > 0 && (
              <div style={{ marginTop: 20, backgroundColor: "#f8f5ef", borderRadius: 10, padding: 20, textAlign: "left", border: `1px solid rgba(200,160,74,0.2)` }}>
                {msg.attributes.map((attr, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(0,0,0,0.06)", fontSize: 13 }}>
                    <span style={{ color: "#888" }}>{attr.label}</span>
                    <span style={{ color: GREEN, fontWeight: 600 }}>{attr.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 16, marginBottom: 24 }}>
              <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 700, margin: 0 }}>{msg.name}</p>
              <p style={{ color: "#888", fontSize: 14, margin: "4px 0 0 0" }}>General Secretary, Anjuman-e-Araian Pakistan</p>
            </div>
            <div style={{ fontSize: 60, color: GOLD, lineHeight: 1, fontFamily: "Georgia, serif", marginBottom: -10, opacity: 0.4 }}>"</div>
            <div dir="auto"
              style={{ color: "#444", lineHeight: 1.95, fontSize: 15, marginBottom: 24 }}
              dangerouslySetInnerHTML={{ __html: msg.body }}
            />
          </div>
        </div>
      </section>
      <style>{`@media (max-width: 768px) { .sec-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
