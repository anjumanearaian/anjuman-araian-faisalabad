import { PageHeader } from "../components/PageHeader";
import { fetchLeadershipProfiles, LeadershipProfile } from "../lib/leadershipStore";
import { useState, useEffect } from "react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function MemberCard({ name, role, city, tier = 0, image }: { name: string; role: string; city: string; tier?: number; image?: string }) {
  const sizes = [{ w: 80, h: 80, nameSize: 16, border: 4 }, { w: 64, h: 64, nameSize: 14, border: 3 }, { w: 56, h: 56, nameSize: 13, border: 2 }];
  const s = sizes[Math.min(tier, 2)];
  return (
    <div style={{ textAlign: "center", padding: "16px 12px", backgroundColor: "white", borderRadius: 10, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", border: `1px solid rgba(26,77,46,0.08)` }}>
      <div style={{ width: s.w, height: s.h, borderRadius: "50%", backgroundColor: GREEN, border: `${s.border}px solid ${GOLD}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px", overflow: "hidden" }}>
        {image ? (
          <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: s.nameSize + 4, fontWeight: 700 }}>{name.split(" ")[1]?.[0] ?? name[0]}</span>
        )}
      </div>
      <p style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: s.nameSize, fontWeight: 700, lineHeight: 1.3, marginBottom: 3 }}>{name}</p>
      <p style={{ color: GOLD, fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 2 }}>{role}</p>
      <p style={{ color: "#999", fontSize: 11 }}>{city}</p>
    </div>
  );
}

function Connector() {
  return <div style={{ width: 2, height: 32, backgroundColor: `rgba(26,77,46,0.2)`, margin: "0 auto" }} />;
}

function HLine({ count }: { count: number }) {
  if (count <= 1) return null;
  return <div style={{ height: 2, backgroundColor: `rgba(26,77,46,0.15)`, margin: "0 auto", width: `${(count - 1) * 100}%`, maxWidth: "90%" }} />;
}

export function CabinetPage() {
  const [cabinet, setCabinet] = useState<LeadershipProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeadershipProfiles().then((res: LeadershipProfile[]) => {
      setCabinet(res.filter((p: LeadershipProfile) => p.category === "cabinet"));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);
  const t0 = cabinet.filter((p: LeadershipProfile) => p.tier === 0);
  const t1 = cabinet.filter((p: LeadershipProfile) => p.tier === 1);
  const t2 = cabinet.filter((p: LeadershipProfile) => p.tier === 2);
  const t3 = cabinet.filter((p: LeadershipProfile) => p.tier === 3);

  return (
    <div>
      <PageHeader title="Executive Council" subtitle="President, General Secretary, office bearers and executive leadership" breadcrumb={["Home", "Leadership", "Executive Council"]} />

      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <p style={{ color: "#666", fontSize: 15, lineHeight: 1.9, textAlign: "center", marginBottom: 48 }}>
          Anjuman-e-Araian Faisalabad is led by its President and General Secretary, supported by office bearers and the Executive Committee. This structure reflects the terminology used in the organization's meetings and records.
        </p>

        {t0.length > 0 && (
          <>
            <div style={{ maxWidth: 280, margin: "0 auto" }}>
              {t0.map((m: any) => <MemberCard key={m.id} name={m.name} role={m.role} city={m.city} tier={0} image={m.image} />)}
            </div>
            <Connector />
          </>
        )}

        {t1.length > 0 && (
          <>
            <div style={{ display: "flex", justifyContent: "center", gap: 32, flexWrap: "wrap", marginBottom: 0 }}>
              {t1.map((m: any) => (
                <div key={m.id} style={{ width: 200 }}>
                  <MemberCard name={m.name} role={m.role} city={m.city} tier={1} image={m.image} />
                </div>
              ))}
            </div>
            <Connector />
          </>
        )}

        {t2.length > 0 && (
          <>
            <div style={{ marginBottom: 8 }}>
              <p style={{ textAlign: "center", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Vice Presidents / Executives</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }} className="vp-grid">
                {t2.map((m: any) => <MemberCard key={m.id} name={m.name} role={m.role} city={m.city} tier={2} image={m.image} />)}
              </div>
            </div>
            {t3.length > 0 && <Connector />}
          </>
        )}

        {t3.length > 0 && (
          <div>
            <p style={{ textAlign: "center", color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Secretaries and Members</p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }} className="sec-grid">
              {t3.map((m: any) => <MemberCard key={m.id} name={m.name} role={m.role} city={m.city} tier={2} image={m.image} />)}
            </div>
          </div>
        )}
      </section>

      <style>{`
        @media (max-width: 900px) { .vp-grid { grid-template-columns: repeat(3, 1fr) !important; } .sec-grid { grid-template-columns: repeat(3, 1fr) !important; } }
        @media (max-width: 600px) { .vp-grid, .sec-grid { grid-template-columns: repeat(2, 1fr) !important; } }
      `}</style>
    </div>
  );
}
