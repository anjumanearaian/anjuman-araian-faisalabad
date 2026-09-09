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
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Ex-Presidents" subtitle="Honouring the leaders who served before us" breadcrumb={["Home", "Leadership", "Ex-Presidents"]} />

      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 24px" }}>
        <p style={{ color: "#666", fontSize: 15, lineHeight: 1.9, textAlign: "center", marginBottom: 40, maxWidth: 680, marginLeft: "auto", marginRight: "auto" }}>
          This record honours the presidents who have served the organisation. Profiles, tenure and achievements shown here are maintained through the official Leadership section in the Admin Panel.
        </p>

        {loading ? <div style={{ textAlign: "center", color: "#888", padding: 30 }}>Loading leadership record…</div> : exPresidents.length === 0 ? (
          <div style={{ background: "#f8f5ef", border: "1px dashed #cbd5cf", borderRadius: 12, padding: 30, color: "#66736b", textAlign: "center" }}>No ex-president profiles have been published yet.</div>
        ) : <>
          <div className="ex-presidents-table" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Poppins', sans-serif" }}>
              <thead><tr style={{ backgroundColor: GREEN }}>{["#", "Name", "Tenure", "Home City", "Key Achievement"].map((h) => <th key={h} style={{ color: "white", padding: "14px 16px", textAlign: "left", fontSize: 13, fontWeight: 700, letterSpacing: "0.05em" }}>{h}</th>)}</tr></thead>
              <tbody>{exPresidents.map((p, i) => <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#f8f5ef" : "white", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <td style={{ padding: "14px 16px", color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700 }}>{String(i + 1).padStart(2, "0")}</td>
                <td style={{ padding: "14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><Portrait profile={p} /><span style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600 }}>{p.name}</span></div></td>
                <td style={{ padding: "14px 16px", color: "#444", fontSize: 13, fontWeight: 600 }}>{p.period || "—"}</td>
                <td style={{ padding: "14px 16px", color: "#666", fontSize: 13 }}>{p.city || "—"}</td>
                <td style={{ padding: "14px 16px", color: "#555", fontSize: 13, lineHeight: 1.6 }}>{p.description || "—"}</td>
              </tr>)}</tbody>
            </table>
          </div>

          <div className="ex-presidents-cards">{exPresidents.map((p, i) => <article key={p.id}><div className="ex-president-head"><Portrait profile={p} /><div><span>{String(i + 1).padStart(2, "0")}</span><h3>{p.name}</h3><p>{p.period || "Tenure not specified"}</p></div></div><dl><div><dt>Home City</dt><dd>{p.city || "—"}</dd></div><div><dt>Key Achievement</dt><dd>{p.description || "—"}</dd></div></dl></article>)}</div>
        </>}

        {exPresidents.length > 0 && <div style={{ marginTop: 42, backgroundColor: "#f0f7f3", borderRadius: 12, padding: "24px 28px", border: `1px solid rgba(26,77,46,0.1)`, textAlign: "center" }}><p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 600, margin: 0 }}>We honour the service of past leadership by preserving an accurate institutional record and continuing community work.</p></div>}
      </section>
      <style>{`.ex-presidents-cards{display:none}@media(max-width:700px){.ex-presidents-table{display:none}.ex-presidents-cards{display:grid;gap:14px}.ex-presidents-cards article{border:1px solid #dfe7e1;border-radius:12px;padding:18px;background:#fff}.ex-president-head{display:flex;gap:13px;align-items:center}.ex-president-head span{color:${GOLD};font-size:11px;font-weight:800}.ex-president-head h3{font-family:'Playfair Display',serif;color:${GREEN};font-size:19px;margin:2px 0}.ex-president-head p{color:#777;margin:0;font-size:13px}.ex-presidents-cards dl{margin:15px 0 0}.ex-presidents-cards dl>div{padding:9px 0;border-top:1px solid #eef1ef}.ex-presidents-cards dt{color:#849087;font-size:11px;text-transform:uppercase;font-weight:800}.ex-presidents-cards dd{margin:4px 0 0;color:#465149;font-size:14px;line-height:1.55}}`}</style>
    </div>
  );
}

function Portrait({ profile }: { profile: LeadershipProfile }) {
  return <div style={{ width: 44, height: 44, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>{profile.image ? <img src={profile.image} alt={profile.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700 }}>{profile.name.split(" ")[1]?.[0] ?? profile.name[0]}</span>}</div>;
}
