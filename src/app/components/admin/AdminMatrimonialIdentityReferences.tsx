import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Mail, Plus, Trash2, UsersRound } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { fetchAllMatrimonials, MatrimonialProfile, MatrimonialReference, syncMatrimonialProfileLifecycle } from "../../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const blankRef = (): MatrimonialReference => ({ name: "", profession: "", phone: "", city: "", address: "" });
const validEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const phoneOk = (value: string) => value.replace(/\D/g, "").length >= 10;

function completeReference(r: MatrimonialReference) {
  return Boolean(r.name.trim() && r.profession.trim() && phoneOk(r.phone) && (r.city.trim() || r.address.trim()));
}

export function AdminMatrimonialIdentityReferences() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin", "super_admin", "welfare_manager", "matrimonial_manager"].includes(String(role || ""));
  const [host, setHost] = useState<HTMLElement | null>(null);
  const [email, setEmail] = useState("");
  const [references, setReferences] = useState<MatrimonialReference[]>([blankRef(), blankRef()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [syncing, setSyncing] = useState(false);
  const loadedPath = useRef("");
  const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
  const active = isAdmin && allowed && (currentPath === "/admin/matrimonial/new" || /^\/admin\/matrimonial\/edit\/[^/]+$/.test(currentPath));
  const valid = useMemo(() => validEmail(email) && references.length >= 2 && references.every(completeReference), [email, references]);

  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const attach = () => {
      const form = document.querySelector<HTMLFormElement>("form");
      if (!form) return false;
      let node = document.getElementById("admin-matrimonial-email-references");
      if (!node) {
        node = document.createElement("div");
        node.id = "admin-matrimonial-email-references";
        form.insertBefore(node, form.firstChild);
      }
      setHost(node);
      return true;
    };
    if (attach()) return;
    const observer = new MutationObserver(() => { if (attach()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [active, currentPath]);

  useEffect(() => {
    if (!active || loadedPath.current === currentPath) return;
    loadedPath.current = currentPath;
    setMessage(""); setError("");
    const match = currentPath.match(/^\/admin\/matrimonial\/edit\/([^/]+)$/);
    if (!match) { setEmail(""); setReferences([blankRef(), blankRef()]); return; }
    (async () => {
      try {
        const all = await fetchAllMatrimonials(1, 100);
        const profile = all.data.find((p) => p.id === match[1]);
        if (!profile) return;
        setEmail(profile.email || "");
        const saved = Array.isArray(profile.profileData?.references) ? profile.profileData!.references as MatrimonialReference[] : [];
        setReferences(saved.length >= 2 ? saved.map((r) => ({ ...blankRef(), ...r })) : [blankRef(), blankRef()]);
      } catch {}
    })();
  }, [active, currentPath]);

  useEffect(() => {
    if (!active) return;
    const form = document.querySelector<HTMLFormElement>("form");
    if (!form) return;
    const guard = (event: Event) => {
      if (valid) { setError(""); return; }
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!validEmail(email)) setError("Candidate email is required and must be valid. امیدوار کا درست ای میل لازمی درج کریں۔");
      else if (references.length < 2) setError("At least two references are required. کم از کم دو حوالہ جات لازمی ہیں۔");
      else setError("Complete name, profession, mobile and city/address for every reference. ہر ریفرنس کا نام، پیشہ، موبائل اور شہر/پتہ مکمل کریں۔");
      document.getElementById("admin-matrimonial-email-references")?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    form.addEventListener("submit", guard, true);
    return () => form.removeEventListener("submit", guard, true);
  }, [active, email, references, valid]);

  useEffect(() => {
    if (!active) return;
    const saved = async (event: Event) => {
      const detail = (event as CustomEvent<{ profile: MatrimonialProfile; source: string }>).detail;
      if (!detail?.profile?.id || detail.source !== "admin") return;
      setSyncing(true); setError(""); setMessage("Saving email, verifying references and preparing confidential PDF...");
      try {
        const result = await syncMatrimonialProfileLifecycle(detail.profile.id, email.trim().toLowerCase(), references, true);
        setReferences(result.references.map((r) => ({ ...blankRef(), ...r })));
        const members = result.references.filter((r) => r.isMember).length;
        const mail = result.email.sent ? "Official A4 PDF emailed to candidate." : `Profile saved; email not sent (${result.email.reason || "mail service unavailable"}).`;
        const matches = result.matching.notifications ? ` ${result.matching.notifications} compatibility notification email(s) sent.` : "";
        setMessage(`${mail} ${members}/${result.references.length} reference(s) matched with approved Anjuman members.${matches}`);
      } catch (e: any) {
        setError(e?.message || "Candidate email/reference verification could not be completed.");
      } finally { setSyncing(false); }
    };
    window.addEventListener("araian-matrimonial-profile-saved", saved as EventListener);
    return () => window.removeEventListener("araian-matrimonial-profile-saved", saved as EventListener);
  }, [active, email, references]);

  if (!active || !host) return null;

  const update = (index: number, key: keyof MatrimonialReference, value: string) => setReferences((old) => old.map((r, i) => i === index ? { ...r, [key]: value, isMember: undefined, memberNo: undefined, memberName: undefined } : r));
  const add = () => { if (references.length < 8) setReferences((old) => [...old, blankRef()]); };
  const remove = (index: number) => { if (references.length > 2) setReferences((old) => old.filter((_, i) => i !== index)); };

  return createPortal(
    <section style={{ marginBottom: 18, border: "1px solid #dce7df", borderRadius: 12, background: "#fbfdfb", padding: 17 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div><h2 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18 }}>Candidate Email & References</h2><p style={{ margin: "5px 0 0", fontSize: 11, lineHeight: 1.6, color: "#66736b" }}>Candidate email and at least two references are mandatory for verification, PDF delivery and future match notifications.</p><p lang="ur" dir="rtl" style={{ margin: "3px 0 0", fontSize: 10, color: "#66736b" }}>امیدوار کا ای میل اور کم از کم دو حوالہ جات لازمی ہیں۔ سسٹم ممبر کے موبائل/نام سے ریفرنس کی تصدیق بھی کرے گا۔</p></div>
        <span style={{ background: valid ? "#dcfce7" : "#fff7ed", color: valid ? "#166534" : "#9a5b12", borderRadius: 20, padding: "5px 9px", fontSize: 10, fontWeight: 800 }}>{valid ? "Verification data complete" : "Verification data incomplete"}</span>
      </div>

      {error && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#fee2e2", color: "#b91c1c", fontSize: 11 }}>{error}</div>}
      {message && <div style={{ marginTop: 12, padding: 10, borderRadius: 8, background: "#eef6ff", color: "#315f7d", fontSize: 11 }}>{syncing ? "Processing: " : ""}{message}</div>}

      <label style={{ display: "block", marginTop: 14, color: GREEN, fontSize: 11, fontWeight: 800 }}>Candidate Email *</label>
      <div style={{ position: "relative", marginTop: 5 }}><Mail size={15} color="#6f8175" style={{ position: "absolute", left: 11, top: 11 }} /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="candidate@example.com" style={inputStyle({ paddingLeft: 34, width: "100%" })} /></div>
      <small style={{ display: "block", marginTop: 4, color: "#76827a", fontSize: 9 }}>Use the email the candidate will use for passwordless sign-in. An admin-created profile can later be claimed automatically by the same verified email.</small>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginTop: 18 }}><div><strong style={{ color: GREEN, fontSize: 12 }}><UsersRound size={15} style={{ verticalAlign: "-3px", marginRight: 5 }} />References / Verification</strong><span style={{ display: "block", color: "#778179", fontSize: 9, marginTop: 3 }}>Minimum 2, maximum 8. Member references are marked after server verification.</span></div><button type="button" onClick={add} disabled={references.length >= 8} style={smallButton}><Plus size={13} />Add Reference</button></div>

      <div style={{ display: "grid", gap: 10, marginTop: 10 }}>{references.map((r, index) => <div key={index} style={{ border: "1px solid #e4e8e5", borderRadius: 10, padding: 12, background: "white" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 9 }}><strong style={{ color: GREEN, fontSize: 11 }}>Reference {index + 1}</strong><div style={{ display: "flex", gap: 7, alignItems: "center" }}>{r.isMember && <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "#dcfce7", color: "#166534", borderRadius: 18, padding: "4px 7px", fontSize: 9, fontWeight: 800 }}><BadgeCheck size={12} />Anjuman Member {r.memberNo || ""}</span>}{references.length > 2 && <button type="button" onClick={() => remove(index)} style={{ ...smallButton, color: "#b91c1c" }}><Trash2 size={12} />Remove</button>}</div></div>
        <div className="mat-reference-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
          <Field label="Full Name *"><input value={r.name} onChange={(e) => update(index, "name", e.target.value)} style={inputStyle()} /></Field>
          <Field label="Profession / Occupation *"><input value={r.profession} onChange={(e) => update(index, "profession", e.target.value)} style={inputStyle()} /></Field>
          <Field label="Mobile Number *"><input value={r.phone} onChange={(e) => update(index, "phone", e.target.value)} placeholder="03xx-xxxxxxx" style={inputStyle()} /></Field>
          <Field label="City *"><input value={r.city} onChange={(e) => update(index, "city", e.target.value)} style={inputStyle()} /></Field>
          <div style={{ gridColumn: "1 / -1" }}><Field label="Address / Area"><input value={r.address} onChange={(e) => update(index, "address", e.target.value)} placeholder="Area, city or full address" style={inputStyle({ width: "100%" })} /></Field></div>
        </div>
        {r.isMember && <div style={{ marginTop: 8, color: "#54705f", fontSize: 9 }}>Verified against approved member record: {r.memberName || r.name}{r.memberCity ? ` · ${r.memberCity}` : ""}.</div>}
      </div>)}</div>
      <style>{`@media(max-width:700px){.mat-reference-grid{grid-template-columns:1fr!important}}`}</style>
    </section>, host,
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label style={{ display: "block", color: GREEN, fontSize: 10, fontWeight: 700 }}>{label}<div style={{ marginTop: 4 }}>{children}</div></label>; }
function inputStyle(extra: React.CSSProperties = {}): React.CSSProperties { return { border: "1px solid #d7dfda", borderRadius: 7, padding: "9px 10px", fontSize: 12, background: "white", boxSizing: "border-box", width: "100%", minHeight: 38, ...extra }; }
const smallButton: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, border: `1px solid ${GOLD}`, background: "white", color: GREEN, borderRadius: 7, padding: "6px 9px", fontSize: 10, fontWeight: 800, cursor: "pointer" };
