import { PageHeader } from "../components/PageHeader";
import { CheckCircle, Users, Heart, BookOpen, Globe } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const pillars = [
  { icon: Users, title: "Unity", desc: "Bringing together the Araian community across every province and district of Pakistan." },
  { icon: Heart, title: "Welfare", desc: "Providing healthcare, financial aid, and emergency assistance to members in need." },
  { icon: BookOpen, title: "Education", desc: "Scholarships, tuition support, and vocational training for deserving students." },
  { icon: Globe, title: "Representation", desc: "Advocating for the rights and interests of the Araian community at every level of governance." },
];

export function AboutPage() {
  return (
    <div>
      <PageHeader title="About Us" subtitle="Serving the Araian Community Since 1947" breadcrumb={["Home", "About Us"]} />

      {/* Intro */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, alignItems: "center" }} className="about-grid">
          <div>
            <p style={{ color: GOLD, fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.1em", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>
              Our Identity
            </p>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, lineHeight: 1.3, marginBottom: 20 }}>
              Anjuman-e-Araian Pakistan
            </h2>
            <p style={{ color: "#444", lineHeight: 1.9, fontSize: 15, marginBottom: 16 }}>
              Anjuman-e-Araian Pakistan is a registered community organization established in 1947, at the time of the founding of Pakistan. It was created to unite the Araian community — one of the largest and most historically significant communities of the Punjab — under a single platform for their collective welfare, development, and representation.
            </p>
            <p style={{ color: "#444", lineHeight: 1.9, fontSize: 15, marginBottom: 16 }}>
              The Araian community has a proud agricultural heritage and has made immense contributions to Pakistan's social, political, and economic landscape. From farmers and soldiers to doctors, judges, and parliamentarians — the Araian community has distinguished itself in every field of national life.
            </p>
            <p style={{ color: "#444", lineHeight: 1.9, fontSize: 15 }}>
              Anjuman-e-Araian today has a presence in all four provinces of Pakistan, Azad Kashmir, and among overseas Pakistanis. With over 120 district branches and hundreds of thousands of registered members, it remains one of the largest community organizations in the country.
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <img
              src="https://images.unsplash.com/photo-1608020932658-d0e19a69580b?w=600&h=500&fit=crop&auto=format"
              alt="Anjuman community building"
              style={{ width: "100%", borderRadius: 10, objectFit: "cover", height: 420, display: "block" }}
            />
            <div style={{
              position: "absolute", bottom: -20, left: -20,
              backgroundColor: GREEN, borderRadius: 10, padding: "20px 28px",
              boxShadow: "0 8px 30px rgba(0,0,0,0.2)"
            }}>
              <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, lineHeight: 1 }}>75+</div>
              <div style={{ color: "white", fontSize: 13, fontFamily: "'Poppins', sans-serif" }}>Years of Service</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pillars */}
      <section style={{ backgroundColor: "#f8f5ef", padding: "56px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 30, fontWeight: 700 }}>Our Four Pillars</h2>
            <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "12px auto 0" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }} className="pillars-grid">
            {pillars.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{ backgroundColor: "white", borderRadius: 10, padding: 28, textAlign: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", borderTop: `4px solid ${GOLD}` }}>
                <div style={{ backgroundColor: GREEN, width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Icon size={24} color={GOLD} />
                </div>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{title}</h3>
                <p style={{ color: "#666", fontSize: 13, lineHeight: 1.8 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ backgroundColor: GREEN, padding: "48px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, textAlign: "center" }} className="stats-grid">
          {[
            { value: "1947", label: "Year Founded" },
            { value: "500K+", label: "Registered Members" },
            { value: "120+", label: "District Branches" },
            { value: "25K+", label: "Scholarships Awarded" },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700 }}>{s.value}</div>
              <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700, marginBottom: 28 }}>Our Core Values</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="values-grid">
          {[
            "Brotherhood and unity among all community members",
            "Transparency and accountability in organizational affairs",
            "Serving the poor and vulnerable without discrimination",
            "Promotion of education as the foundation of progress",
            "Preservation of cultural heritage and traditions",
            "Democratic governance and free and fair elections",
            "Respect for the law and the Constitution of Pakistan",
            "Inclusion of women and youth in all walks of community life",
          ].map((v) => (
            <div key={v} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <CheckCircle size={18} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }} />
              <span style={{ color: "#444", fontSize: 15, lineHeight: 1.7 }}>{v}</span>
            </div>
          ))}
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .about-grid, .pillars-grid, .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .about-grid, .values-grid, .pillars-grid, .stats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
