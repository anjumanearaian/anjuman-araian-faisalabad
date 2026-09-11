import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Heart, Loader2, LockKeyhole, ShieldCheck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { apiClient } from "../lib/apiClient";
import { MatrimonialProfile } from "../lib/matrimonialStore";
import { MatrimonialExistingProfilePage } from "./MatrimonialExistingProfilePage";
import { MatrimonialPage } from "./MatrimonialPage";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type GateState = "checking" | "login" | "approved" | "pending" | "not_member" | "error";

export function MatrimonialMemberOnlyPage() {
  const [state, setState] = useState<GateState>("checking");
  const [member, setMember] = useState<any>(null);
  const [profile, setProfile] = useState<MatrimonialProfile | null | undefined>(undefined);
  const [error, setError] = useState("");

  const checkMember = async () => {
    const token = localStorage.getItem("araian_member_token");
    if (!token) { setState("login"); setProfile(undefined); return; }
    setState("checking"); setProfile(undefined); setError("");
    try {
      const m = await apiClient<any>("/members/me");
      setMember(m);
      if (m?.status === "approved") {
        setState("approved");
        try {
          const mine = await apiClient<{ profile: MatrimonialProfile | null }>("/matrimonial/mine");
          setProfile(mine?.profile || null);
        } catch (e: any) {
          setError(e?.message || "Your matrimonial profile could not be loaded.");
          setProfile(null);
        }
      } else if (m?.id) {
        setState("pending");
      } else {
        setState("not_member");
      }
    } catch (e: any) {
      if (e?.status === 404 || e?.status === 403) setState("not_member");
      else if (e?.status === 401) { localStorage.removeItem("araian_member_token"); setState("login"); }
      else { setError(e?.message || "Membership status could not be checked."); setState("error"); }
    }
  };

  useEffect(() => { void checkMember(); }, []);

  if (state === "approved") {
    if (profile === undefined) {
      return <div><PageHeader title="Matrimonial Service" subtitle="Private matrimonial service for approved Anjuman members" breadcrumb={["Home", "Matrimonial"]} /><div style={{ minHeight: 320, display: "grid", placeItems: "center", color: "#666" }}><div style={{ textAlign: "center" }}><Loader2 size={28} color={GREEN} className="mat-gate-spin" /><p>Loading your matrimonial record...</p></div></div><style>{`.mat-gate-spin{animation:matGateSpin .9s linear infinite}@keyframes matGateSpin{to{transform:rotate(360deg)}}`}</style></div>;
    }
    if (profile) return <MatrimonialExistingProfilePage profile={profile} onSaved={(updated) => setProfile(updated)} />;
    return <MatrimonialPage />;
  }

  return <div>
    <PageHeader title="Matrimonial Service" subtitle="Private matrimonial service for approved Anjuman members" breadcrumb={["Home", "Matrimonial"]} />
    <section style={{ maxWidth: 680, margin: "48px auto 80px", padding: "0 20px" }}>
      <div style={{ background: "white", borderRadius: 16, padding: "34px 32px", boxShadow: "0 7px 32px rgba(0,0,0,.08)", border: "1px solid #eee7da" }}>
        {state === "checking" && <div style={{ textAlign: "center", color: "#666", padding: 18 }}><ShieldCheck size={36} color={GOLD} style={{ marginBottom: 10 }} /><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Checking Membership</h2><p style={{ margin: 0 }}>Verifying your approved member status before opening the confidential matrimonial service.</p></div>}

        {state === "login" && <><div style={{ textAlign: "center", marginBottom: 24 }}><LockKeyhole size={38} color={GOLD} style={{ marginBottom: 10 }} /><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Member Sign-in Required</h2><p style={{ color: "#666", lineHeight: 1.7, margin: 0 }}>This service is not open to the public. Sign in with the email linked to your Anjuman membership. Only approved members can register or view matrimonial profiles.</p></div><PasswordlessSignIn onAuthenticated={() => void checkMember()} compact /><p style={{ textAlign: "center", margin: "20px 0 0", fontSize: 13, color: "#777" }}>Not a member yet? <Link to="/member/register" style={{ color: GREEN, fontWeight: 800 }}>Apply for membership first</Link>.</p></>}

        {state === "pending" && <div style={{ textAlign: "center" }}><Heart size={40} color={GOLD} style={{ marginBottom: 10 }} /><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Membership Approval Required</h2><p style={{ color: "#666", lineHeight: 1.7 }}>Your membership record is currently <strong style={{ textTransform: "capitalize" }}>{member?.status || "pending"}</strong>. The matrimonial service will open after your membership is approved.</p><Link to="/member/portal" style={primaryLink}>Open Member Portal</Link></div>}

        {state === "not_member" && <div style={{ textAlign: "center" }}><LockKeyhole size={40} color={GOLD} style={{ marginBottom: 10 }} /><h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: "0 0 8px" }}>Become a Member First</h2><p style={{ color: "#666", lineHeight: 1.7 }}>Matrimonial registration, directory access and match requests are available only to approved Anjuman members.</p><Link to="/member/register" style={primaryLink}>Apply for Membership</Link></div>}

        {state === "error" && <div style={{ textAlign: "center" }}><h2 style={{ color: "#b91c1c", marginTop: 0 }}>Could not verify membership</h2><p style={{ color: "#666" }}>{error}</p><button onClick={() => void checkMember()} style={{ ...primaryLink, border: 0, cursor: "pointer" }}>Try Again</button></div>}
      </div>
    </section>
  </div>;
}

const primaryLink: React.CSSProperties = { display: "inline-flex", marginTop: 10, background: GREEN, color: "white", borderRadius: 8, padding: "10px 16px", textDecoration: "none", fontSize: 13, fontWeight: 800 };
