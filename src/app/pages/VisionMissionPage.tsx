import { PageHeader } from "../components/PageHeader";
import { Target, Eye, Star, Zap } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function VisionMissionPage() {
  return (
    <div>
      <PageHeader title="Vision and Mission" subtitle="Our Purpose, Goals and Strategic Direction" breadcrumb={["Home", "About", "Vision and Mission"]} />

      {/* Vision */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "64px 24px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48 }} className="vm-grid">
          <div style={{ backgroundColor: GREEN, borderRadius: 12, padding: "40px 36px", color: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ backgroundColor: GOLD, width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Eye size={24} color={GREEN} />
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, margin: 0 }}>Our Vision</h2>
            </div>
            <p style={{ lineHeight: 1.9, fontSize: 15, color: "rgba(255,255,255,0.85)", marginBottom: 14 }}>
              A prosperous, educated, united, and self-sufficient Araian community that plays a leading role in the social, economic, and political development of Pakistan.
            </p>
            <p style={{ lineHeight: 1.9, fontSize: 15, color: "rgba(255,255,255,0.85)" }}>
              We envision a future where every Araian family has access to quality education, healthcare, legal protection, and economic opportunity — and where the community's rich heritage is preserved and celebrated for generations to come.
            </p>
          </div>

          <div style={{ backgroundColor: "#f8f5ef", borderRadius: 12, padding: "40px 36px", border: `1px solid rgba(200,160,74,0.2)` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
              <div style={{ backgroundColor: GREEN, width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Target size={24} color={GOLD} />
              </div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, color: GREEN, margin: 0 }}>Our Mission</h2>
            </div>
            <p style={{ lineHeight: 1.9, fontSize: 15, color: "#444", marginBottom: 14 }}>
              To unite, organize, and serve the Araian community across Pakistan and overseas through structured welfare programs, democratic governance, educational support, and cultural preservation.
            </p>
            <p style={{ lineHeight: 1.9, fontSize: 15, color: "#444" }}>
              We are committed to being the most credible, transparent, and effective community organization in Pakistan — one that its members can rely upon in times of need and celebrate in times of joy.
            </p>
          </div>
        </div>
      </section>

      {/* Strategic Goals */}
      <section style={{ backgroundColor: "#f8f5ef", padding: "56px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700 }}>Strategic Goals</h2>
            <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "12px auto 0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }} className="goals-grid">
            {[
              { icon: Star, num: "01", title: "Community Unity", desc: "Establish a functional branch in every tehsil of Pakistan and achieve 100% member registration by 2028." },
              { icon: Zap, num: "02", title: "Educational Excellence", desc: "Double the scholarship fund, introduce merit-based awards, and launch a digital learning platform for community students." },
              { icon: Target, num: "03", title: "Health and Welfare", desc: "Set up permanent health desks in 50 districts, provide emergency relief funds, and partner with hospitals for discounted services." },
              { icon: Eye, num: "04", title: "Women Empowerment", desc: "Establish an active women's wing in every province, provide vocational training, and ensure 30% women's representation in all committees." },
              { icon: Star, num: "05", title: "Youth Development", desc: "Launch a youth leadership program, create internship networks, and host annual youth conventions." },
              { icon: Zap, num: "06", title: "Legal Aid", desc: "Create a community legal aid cell with volunteer lawyers in every provincial capital to assist members in legal matters." },
            ].map(({ icon: Icon, num, title, desc }) => (
              <div key={num} style={{ backgroundColor: "white", borderRadius: 10, padding: "28px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 40, fontWeight: 700, lineHeight: 1, marginBottom: 10, opacity: 0.3 }}>{num}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Icon size={18} color={GREEN} />
                  <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 17, fontWeight: 700, margin: 0 }}>{title}</h3>
                </div>
                <p style={{ color: "#666", fontSize: 13, lineHeight: 1.8 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values strip */}
      <section style={{ backgroundColor: GREEN, padding: "40px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, marginBottom: 24 }}>Our Guiding Principles</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
            {["Unity", "Service", "Integrity", "Education", "Justice", "Brotherhood", "Compassion", "Democracy", "Transparency", "Heritage"].map((v) => (
              <span key={v} style={{ backgroundColor: "rgba(255,255,255,0.1)", border: `1px solid rgba(200,160,74,0.4)`, color: "white", padding: "8px 20px", borderRadius: 30, fontSize: 14, fontWeight: 600 }}>{v}</span>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) { .vm-grid, .goals-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 600px) { .goals-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
