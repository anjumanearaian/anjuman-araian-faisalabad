import { Link } from "react-router";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function NotFoundPage() {
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
      <div>
        <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 120, fontWeight: 700, lineHeight: 1, opacity: 0.15 }}>404</div>
        <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 32, fontWeight: 700, marginTop: -20, marginBottom: 12 }}>Page Not Found</h2>
        <p style={{ color: "#666", fontSize: 16, lineHeight: 1.8, maxWidth: 420, margin: "0 auto 32px" }}>
          The page you are looking for does not exist or has been moved. Please return to the homepage.
        </p>
        <Link to="/" style={{ display: "inline-block", backgroundColor: GREEN, color: "white", padding: "12px 32px", borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
