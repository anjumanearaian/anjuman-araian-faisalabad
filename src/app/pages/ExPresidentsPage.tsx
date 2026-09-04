import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipProfiles, LeadershipProfile } from "../lib/leadershipStore";
import { useState, useEffect } from "react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function ExPresidentsPage() {
  const [exPresidents, setExPresidents] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadershipProfiles().then(res => {
      setExPresidents(res.filter(p => p.category === "expresident"));
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <PageHeader title="Ex-Presidents" subtitle="Honouring the leaders who served before us" breadcrumb={["Home", "Leadership", "Ex-Presidents"]} />

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px" }}>
        <p style={{ color: "#666", fontSize: 15, lineHeight: 1.9, textAlign: "center", marginBottom: 48, maxWidth: 640, marginLeft: "auto", marginRight: "auto" }}>
          Anjuman-e-Araian Pakistan has been led by eleven distinguished presidents since its founding in 1947. Each one has left an indelible mark on the organization and the community it serves.
        </p>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Poppins', sans-serif" }}>
            <thead>
              <tr style={{ backgroundColor: GREEN }}>
                {["#", "Name", "Tenure", "Home City", "Key Achievement"].map((h) => (
                  <th key={h} style={{ color: "white", padding: "14px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {exPresidents.map((p, i) => (
                <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#f8f5ef" : "white", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "14px 16px", color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>{p.name.split(" ")[1]?.[0] ?? p.name[0]}</span>
                        )}
                      </div>
                      <span style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600 }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "14px 16px", color: "#444", fontSize: 13, fontWeight: 600 }}>{p.period}</td>
                  <td style={{ padding: "14px 16px", color: "#666", fontSize: 13 }}>{p.city}</td>
                  <td style={{ padding: "14px 16px", color: "#555", fontSize: 13, lineHeight: 1.6 }}>{p.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 48, backgroundColor: "#f0f7f3", borderRadius: 12, padding: "28px 32px", border: `1px solid rgba(26,77,46,0.1)`, textAlign: "center" }}>
          <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, margin: 0 }}>
            "Every president who served before us laid another brick in the foundation of this great organization. We honour their memory by continuing their work."
          </p>
          <p style={{ color: GOLD, fontSize: 13, fontWeight: 700, marginTop: 10 }}>— Ch. Muhammad Rafiq, Central President</p>
        </div>
      </section>
    </div>
  );
}
