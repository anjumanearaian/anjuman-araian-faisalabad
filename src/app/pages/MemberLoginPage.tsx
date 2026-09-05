import { Link, useNavigate } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { useMember } from "../context/MemberContext";

const GREEN = "#1a4d2e";

export function MemberLoginPage() {
  const navigate = useNavigate();
  const { acceptSession } = useMember();
  return <div>
    <PageHeader title="Passwordless Member Login" subtitle="Continue securely with Google or a one-time email code" breadcrumb={["Home", "Member Portal", "Login"]} />
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", background: "#f8f5ef" }}>
      <div style={{ background: "white", borderRadius: 16, padding: 40, width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,.08)" }}>
        <div style={{ textAlign: "center", marginBottom: 26 }}><div style={{ width: 64, height: 64, borderRadius: "50%", background: GREEN, color: "#c8a04a", display: "grid", placeItems: "center", margin: "0 auto 14px", fontSize: 28, fontWeight: 700 }}>ع</div><h2 style={{ color: GREEN, margin: "0 0 6px", fontSize: 22 }}>Member Portal</h2><p style={{ color: "#777", margin: 0, fontSize: 14 }}>One verified email. No password to remember.</p></div>
        <PasswordlessSignIn onAuthenticated={(session) => { acceptSession(session); navigate(session.member ? "/member/portal" : "/member/register"); }} />
        <div style={{ marginTop: 22, background: "#f8f5ef", borderRadius: 9, padding: 14, fontSize: 13, color: "#666" }}>First time here? <Link to="/member/register" style={{ color: GREEN, fontWeight: 700 }}>Start membership registration</Link>.</div>
      </div>
    </div>
  </div>;
}
