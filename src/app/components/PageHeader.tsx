const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: string[];
}

export function PageHeader({ title, subtitle, breadcrumb }: PageHeaderProps) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${GREEN} 0%, #c0392b 100%)`,
        padding: "48px 24px 40px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* decorative circle */}
      <div
        style={{
          position: "absolute", right: -60, top: -60,
          width: 260, height: 260, borderRadius: "50%",
          border: `40px solid rgba(255,255,255,0.05)`,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute", left: -40, bottom: -80,
          width: 200, height: 200, borderRadius: "50%",
          border: `30px solid rgba(255,255,255,0.04)`,
          pointerEvents: "none",
        }}
      />

      {breadcrumb && (
        <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Poppins', sans-serif", fontSize: 13, marginBottom: 8 }}>
          {breadcrumb.join(" › ")}
        </p>
      )}
      <h1 style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, margin: 0 }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ color: "rgba(255,255,255,0.75)", fontFamily: "'Poppins', sans-serif", fontSize: 15, marginTop: 10 }}>
          {subtitle}
        </p>
      )}
      <div style={{ width: 56, height: 3, backgroundColor: GOLD, borderRadius: 2, margin: "16px auto 0" }} />
    </div>
  );
}
