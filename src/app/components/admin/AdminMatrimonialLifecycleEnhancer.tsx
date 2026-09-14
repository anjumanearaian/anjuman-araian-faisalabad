import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Mail, Plus, Send, Trash2, UserCheck } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import {
  emailMatrimonialProfile,
  fetchAllMatrimonials,
  MatrimonialReference,
  syncMatrimonialProfileLifecycle,
} from "../../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type RefRow = MatrimonialReference;
const blankRef = (): RefRow => ({ name: "", profession: "", phone: "", city: "", address: "" });

function currentProfileId(path: string) {
  const match = path.match(/^\/admin\/matrimonial\/edit\/([^/]+)$/);
  return match?.[1] || "";
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function refsValid(refs: RefRow[]) {
  if (refs.length < 2) return false;
  return refs.every((r) => r.name.trim() && r.profession.trim() && r.phone.replace(/\D/g, "").length >= 10 && (r.city.trim() || r.address.trim()));
}

export function AdminMatrimonialLifecycleEnhancer() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin", "super_admin", "welfare_manager", "matrimonial_manager"].includes(String(role || ""));
  const [path, setPath] = useState(() => (typeof window !== "undefined" ? window.location.pathname : ""));
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [email, setEmail] = useState("");
  const [refs, setRefs] = useState<RefRow[]>([blankRef(), blankRef()]);
  const [profileId, setProfileId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const isFormPath = path === "/admin/matrimonial/new" || /^\/admin\/matrimonial\/edit\/[^/]+$/.test(path);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setPath(window.location.pathname);
    const timer = window.setInterval(update, 400);
    window.addEventListener("popstate", update);
    return () => { window.clearInterval(timer); window.removeEventListener("popstate", update); };
  }, []);

  useEffect(() => {
    if (!isAdmin || !allowed || !isFormPath || typeof document === "undefined") { setHost(null); return; }
    const mount = () => {
      const form = document.querySelector<HTMLFormElement>("form");
      if (!form) return;
      let el = form.querySelector<HTMLElement>("[data-matrimonial-lifecycle-host]");
      if (!el) {
        el = document.createElement("div");
        el.setAttribute("data-matrimonial-lifecycle-host", "true");
        const headings = Array.from(form.querySelectorAll("h3"));
        const privacy = headings.find((h) => (h.textContent || "").toLowerCase().includes("privacy"));
        if (privacy) form.insertBefore(el, privacy);
        else form.appendChild(el);
      }
      setHost(el);
    };
    mount();
    const observer = new MutationObserver(mount);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [isAdmin, allowed, isFormPath, path]);

  useEffect(() => {
    if (!isAdmin || !allowed || !isFormPath) return;
    const id = currentProfileId(path);
    setProfileId(id);
    setMessage(""); setError("");
    if (!id) { setEmail(""); setRefs([blankRef(), blankRef()]); return; }
    (async () => {
      try {
        const all = await fetchAllMatrimonials(1, 100);
        const p = all.data.find((item) => item.id === id);
        if (!p) return;
        setEmail(String(p.email || ""));
        const existing = Array.isArray(p.profileData?.references) ? p.profileData?.references as RefRow[] : [];
        setRefs(existing.length >= 2 ? existing.map((r) => ({ ...blankRef(), ...r })) : [blankRef(), blankRef()]);
      } catch {}
    })();
  }, [isAdmin, allowed, isFormPath, path]);

  useEffect(() => {
    if (!isAdmin || !allowed || !isFormPath || typeof document === "undefined") return;
    const validate = (event: Event) => {
      const target = event.target as HTMLFormElement;
      if (!(target instanceof HTMLFormElement)) return;
      if (!validEmail(email)) {
        event.preventDefault(); event.stopImmediatePropagation();
        setError("Candidate email is required. This email will receive the private A4 PDF and future match notifications.");
        setMessage("");
        window.scrollTo({ top: Math.max(0, (host?.offsetTop || 0) - 80), behavior: "smooth" });
        return;
      }
      if (!refsValid(refs)) {
        event.preventDefault(); event.stopImmediatePropagation();
        setError("At least two complete references are required: name, profession, mobile number and city/address.");
        setMessage("");
        window.scrollTo({ top: Math.max(0, (host?.offsetTop || 0) - 80), behavior: "smooth" });
      }
    };
    document.addEventListener("submit", validate, true);
    return () => document.removeEventListener("submit", validate, true);
  }, [isAdmin, allowed, isFormPath, email, refs, host]);

  useEffect(() => {
    if (!isAdmin || !allowed || !isFormPath || typeof window === "undefined") return;
    const saved = async (event: Event) => {
      const detail = (event as CustomEvent).detail || {};
      if (detail.source !== "admin" || !detail.profile?.id) return;
      if (!validEmail(email) || !refsValid(refs)) return;
      setBusy(true); setError(""); setMessage("Saving communication record, verifying references and preparing private PDF email...");
      try {
        const result = await syncMatrimonialProfileLifecycle(detail.profile.id, email.trim().toLowerCase(), refs, true);
        setProfileId(detail.profile.id);
        setRefs((result.references || refs).map((r) => ({ ...blankRef(), ...r })));
        const emailText = result.email?.sent ? "Private A4 profile PDF emailed successfully." : `Profile saved, but email was not sent${result.email?.reason ? `: ${result.email.reason}` : "."}`;
        const matchText = result.matching?.notifications ? ` ${result.matching.notifications} compatibility notification(s) were also sent.` : "";
        setMessage(emailText + matchText);
      } catch (e: any) {
        setError(e?.message || "Profile saved, but email/reference lifecycle could not be completed.");
      } finally { setBusy(false); }
    };
    window.addEventListener("araian-matrimonial-profile-saved", saved as EventListener);
    return () => window.removeEventListener("araian-matrimonial-profile-saved", saved as EventListener);
  }, [isAdmin, allowed, isFormPath, email, refs]);

  const completeCount = useMemo(() => refs.filter((r) => r.name && r.profession && r.phone && (r.city || r.address)).length, [refs]);

  if (!isAdmin || !allowed || !isFormPath || !host) return null;

  const updateRef = (index: number, key: keyof RefRow, value: any) => setRefs((old) => old.map((r, i) => i === index ? { ...r, [key]: value } : r));
  const sendNow = async () => {
    if (!profileId) return;
    if (!validEmail(email) || !refsValid(refs)) { setError("Complete the candidate email and at least two references first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const sync = await syncMatrimonialProfileLifecycle(profileId, email.trim().toLowerCase(), refs, false);
      setRefs((sync.references || refs).map((r) => ({ ...blankRef(), ...r })));
      const result = await emailMatrimonialProfile(profileId);
      setMessage(result.email?.sent ? "Private A4 profile PDF emailed successfully." : `Email not sent${result.email?.reason ? `: ${result.email.reason}` : "."}`);
    } catch (e: any) { setError(e?.message || "Could not send the profile PDF."); }
    finally { setBusy(false); }
  };

  return createPortal(
    <section style={{ marginTop: 24 }}>
      <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 17, borderBottom: "1px solid #eee", paddingBottom: 8, margin: "25px 0 13px" }}>Candidate Email, Access & References</h3>
      <div style={{ background: "#f5f8f6", border: "1px solid #d9e8de", borderRadius: 9, padding: 11, color: "#53675b", fontSize: 10, lineHeight: 1.65, marginBottom: 12 }}>
        <Mail size={13} style={{ verticalAlign: "-2px", marginRight: 5 }} />The candidate email is used for the confidential A4 PDF, 50%+ compatibility alerts and future candidate access. An admin-created profile can later be claimed automatically when the candidate signs in with the same verified email.
      </div>
      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 10 }}>{error}</div>}
      {message && <div style={{ background: "#dcfce7", color: "#166534", padding: 10, borderRadius: 8, marginBottom: 10, fontSize: 10 }}>{message}</div>}
      <label style={{ display: "block", color: GREEN, fontSize: 10, fontWeight: 800, marginBottom: 4 }}>Candidate Email *</label>
      <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError(""); }} placeholder="candidate@example.com" style={input} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, margin: "16px 0 8px" }}>
        <div><strong style={{ color: GREEN, fontSize: 11 }}>References / Guarantors *</strong><div style={{ color: "#777", fontSize: 9, marginTop: 2 }}>Minimum 2. Add more when useful. Member references are automatically rechecked against the approved member database.</div></div>
        <button type="button" onClick={() => refs.length < 8 && setRefs((r) => [...r, blankRef()])} disabled={refs.length >= 8} style={smallBtn}><Plus size={12}/>Add Reference</button>
      </div>
      <div style={{ display: "grid", gap: 9 }}>
        {refs.map((r, index) => <div key={index} style={{ border: "1px solid #e7e2d8", borderRadius: 9, padding: 10, background: "#fff" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", marginBottom: 7 }}><strong style={{ color: GREEN, fontSize: 10 }}>Reference {index + 1}</strong><div style={{ display: "flex", gap: 6, alignItems: "center" }}>{r.memberVerified && <span style={memberBadge}><BadgeCheck size={11}/>Verified Anjuman Member{r.memberNo ? ` · ${r.memberNo}` : ""}</span>}{refs.length > 2 && <button type="button" onClick={() => setRefs((old) => old.filter((_, i) => i !== index))} style={trashBtn}><Trash2 size={12}/></button>}</div></div>
          <div style={grid}>
            <Field label="Full Name *"><input value={r.name} onChange={(e)=>updateRef(index,"name",e.target.value)} style={input}/></Field>
            <Field label="Profession *"><input value={r.profession} onChange={(e)=>updateRef(index,"profession",e.target.value)} placeholder="Doctor, business, teacher..." style={input}/></Field>
            <Field label="Mobile Number *"><input value={r.phone} onChange={(e)=>updateRef(index,"phone",e.target.value)} style={input}/></Field>
            <Field label="City *"><input value={r.city} onChange={(e)=>updateRef(index,"city",e.target.value)} style={input}/></Field>
            <div style={{ gridColumn: "span 2" }}><Field label="Address"><input value={r.address} onChange={(e)=>updateRef(index,"address",e.target.value)} placeholder="Area / address for verification" style={input}/></Field></div>
          </div>
        </div>)}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ color: completeCount >= 2 ? "#166534" : "#92400e", fontSize: 9, fontWeight: 700 }}><UserCheck size={12} style={{ verticalAlign: "-2px", marginRight: 4 }}/>{completeCount} complete reference(s). Minimum 2 required.</span>
        <button type="button" disabled={busy || !profileId} onClick={sendNow} style={{ ...smallBtn, background: profileId ? GREEN : "#94a39a", color: "white", borderColor: profileId ? GREEN : "#94a39a" }}><Send size={12}/>{busy ? "Working..." : profileId ? "Verify & Email PDF Now" : "Save profile first"}</button>
      </div>
    </section>, host
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span style={{ display: "block", color: GREEN, fontSize: 9, fontWeight: 800, marginBottom: 3 }}>{label}</span>{children}</label>; }
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d8e1da", borderRadius: 7, padding: "9px 10px", fontSize: 11, background: "white" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 };
const smallBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, border: "1px solid #d6dfd8", background: "white", color: GREEN, borderRadius: 7, padding: "7px 9px", fontSize: 9, fontWeight: 800, cursor: "pointer" };
const trashBtn: React.CSSProperties = { display: "grid", placeItems: "center", border: "1px solid #fecaca", background: "white", color: "#b91c1c", borderRadius: 6, padding: 5, cursor: "pointer" };
const memberBadge: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 3, background: "#dcfce7", color: "#166534", borderRadius: 18, padding: "4px 7px", fontSize: 8, fontWeight: 800 };
