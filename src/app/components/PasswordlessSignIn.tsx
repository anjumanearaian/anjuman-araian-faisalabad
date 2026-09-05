import { useEffect, useRef, useState } from "react";
import { Mail, ShieldCheck } from "lucide-react";
import { apiClient } from "../lib/apiClient";

const GREEN = "#1a4d2e";
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
type Session = { token: string; user: { id: string; email: string; name?: string }; member?: any };

export function PasswordlessSignIn({ onAuthenticated, compact = false }: { onAuthenticated: (session: Session) => void; compact?: boolean }) {
  const [email, setEmail] = useState(""); const [code, setCode] = useState(""); const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const googleRef = useRef<HTMLDivElement>(null);
  const finish = (session: Session) => { localStorage.setItem("araian_member_token", session.token); localStorage.setItem("araian_verified_email", session.user.email); onAuthenticated(session); };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    const render = () => {
      if (!window.google?.accounts?.id || !googleRef.current) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: async ({ credential }: { credential: string }) => {
        try { setBusy(true); setError(""); finish(await apiClient<Session>("/auth/google", { method: "POST", body: JSON.stringify({ credential }) })); }
        catch (e: any) { setError(e.message || "Google sign-in failed"); } finally { setBusy(false); }
      }});
      window.google.accounts.id.renderButton(googleRef.current, { theme: "outline", size: "large", width: compact ? 320 : 360, text: "continue_with" });
    };
    if (window.google?.accounts?.id) { render(); return; }
    const script = document.createElement("script"); script.src = "https://accounts.google.com/gsi/client"; script.async = true; script.defer = true; script.onload = render; document.head.appendChild(script);
    return () => { script.onload = null; };
  }, [compact]);

  const requestCode = async () => { setBusy(true); setError(""); setNotice(""); try { const data = await apiClient<{ message: string; devOtp?: string }>("/auth/email/request-otp", { method: "POST", body: JSON.stringify({ email }) }); setSent(true); setNotice(data.devOtp ? `Development code: ${data.devOtp}` : "A 6-digit code has been sent. It expires in 10 minutes."); } catch (e: any) { setError(e.message || "Could not send code"); } finally { setBusy(false); } };
  const verify = async () => { setBusy(true); setError(""); try { finish(await apiClient<Session>("/auth/email/verify-otp", { method: "POST", body: JSON.stringify({ email, code }) })); } catch (e: any) { setError(e.message || "Code verification failed"); } finally { setBusy(false); } };
  const input: React.CSSProperties = { width: "100%", padding: "12px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
  return <div>
    {GOOGLE_CLIENT_ID && <><div ref={googleRef} style={{ display: "flex", justifyContent: "center", minHeight: 44 }} /><div style={{ display: "flex", alignItems: "center", gap: 10, color: "#9ca3af", fontSize: 12, margin: "18px 0" }}><span style={{ height: 1, background: "#e5e7eb", flex: 1 }} />OR USE EMAIL OTP<span style={{ height: 1, background: "#e5e7eb", flex: 1 }} /></div></>}
    {error && <p role="alert" style={{ background: "#fef2f2", color: "#b91c1c", padding: 10, borderRadius: 7, fontSize: 13 }}>{error}</p>}
    {notice && <p style={{ background: "#f0fdf4", color: "#166534", padding: 10, borderRadius: 7, fontSize: 13 }}>{notice}</p>}
    <label style={{ color: GREEN, display: "block", fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Email address</label>
    <div style={{ position: "relative" }}><Mail size={17} color="#9ca3af" style={{ position: "absolute", left: 13, top: 13 }} /><input style={{ ...input, paddingLeft: 40 }} type="email" value={email} disabled={sent || busy} onChange={e => setEmail(e.target.value)} placeholder="Gmail, Hotmail, Yahoo or any email" /></div>
    {sent && <><label style={{ color: GREEN, display: "block", fontWeight: 700, fontSize: 13, margin: "14px 0 6px" }}>6-digit verification code</label><input style={{ ...input, letterSpacing: 8, textAlign: "center", fontSize: 20 }} inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" /></>}
    <button type="button" disabled={busy || !email || (sent && code.length !== 6)} onClick={sent ? verify : requestCode} style={{ width: "100%", marginTop: 16, padding: 13, border: 0, borderRadius: 8, background: GREEN, color: "white", fontWeight: 700, cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><ShieldCheck size={17} />{busy ? "Please wait…" : sent ? "Verify and Continue" : "Send Login Code"}</button>
    {sent && <button type="button" onClick={() => { setSent(false); setCode(""); setNotice(""); }} style={{ width: "100%", marginTop: 10, border: 0, background: "transparent", color: GREEN, cursor: "pointer" }}>Use another email</button>}
    <p style={{ color: "#6b7280", fontSize: 12, lineHeight: 1.6, marginBottom: 0 }}>No password required. Your verified email securely restores saved forms on any device.</p>
  </div>;
}
