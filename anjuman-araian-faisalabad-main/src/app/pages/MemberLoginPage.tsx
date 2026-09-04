import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { Eye, EyeOff, LogIn } from "lucide-react";
import { useMember } from "../context/MemberContext";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MemberLoginPage() {
  const { login } = useMember();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(email, password);
    if (result.ok) {
      navigate("/member/portal");
    } else {
      setError(result.error ?? "Login failed.");
    }
    setLoading(false);
  };

  return (
    <div>
      <PageHeader title="Member Login" subtitle="Access your Anjuman-e-Araian member portal" breadcrumb={["Home", "Member Portal", "Login"]} />
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "48px 24px", backgroundColor: "#f8f5ef" }}>
        <div style={{ backgroundColor: "white", borderRadius: 16, padding: "40px 40px", width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(0,0,0,0.08)" }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: GREEN, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
              <span style={{ color: GOLD, fontFamily: "'Amiri', serif", fontSize: 28, fontWeight: 700, lineHeight: 1 }}>ع</span>
            </div>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Member Portal</h2>
            <p style={{ color: "#888", fontSize: 14 }}>Sign in to your account</p>
          </div>

          {error && (
            <div style={{ backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 8, padding: "12px 16px", marginBottom: 20 }}>
              <p style={{ color: "#b91c1c", fontSize: 14, margin: 0 }}>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Email Address</label>
              <input type="email" required value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }}
                placeholder="you@example.com"
                style={{ width: "100%", padding: "11px 14px", border: "1px solid rgba(26,77,46,0.2)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
            </div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700 }}>Password</label>
                <Link to="/member/forgot-password" style={{ color: GREEN, fontSize: 13, textDecoration: "none", fontWeight: 700 }}>Forgot password?</Link>
              </div>
              <div style={{ position: "relative" }}>
                <input type={show ? "text" : "password"} required value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }}
                  placeholder="Your password"
                  style={{ width: "100%", padding: "11px 44px 11px 14px", border: "1px solid rgba(26,77,46,0.2)", borderRadius: 8, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
                <button type="button" onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#aaa" }}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{ width: "100%", backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "13px 0", fontWeight: 700, fontSize: 15, cursor: loading ? "wait" : "pointer", fontFamily: "'Lato', sans-serif", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <LogIn size={16} /> {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <div style={{ marginTop: 24, padding: "16px", backgroundColor: "#f8f5ef", borderRadius: 10, fontSize: 13, color: "#666", lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>
              Don't have an account?{" "}
              <Link to="/member/register" style={{ color: GREEN, fontWeight: 700, textDecoration: "none" }}>Register here</Link>
            </p>
            <p style={{ margin: "6px 0 0" }}>
              Registration pending? Your login will work after admin approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
