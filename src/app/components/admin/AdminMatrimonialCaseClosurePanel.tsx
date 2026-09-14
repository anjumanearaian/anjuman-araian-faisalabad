import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, HeartHandshake, RefreshCw, Star, X } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import {
  completeMatrimonialConnection,
  fetchAdminMatchRequests,
  fetchSuccessfulMatrimonialConnections,
} from "../../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type RatingState = { requester: string; target: string; manager: string; note: string };
const blankRating = (): RatingState => ({ requester: "", target: "", manager: "", note: "" });

export function AdminMatrimonialCaseClosurePanel() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin", "super_admin", "welfare_manager", "matrimonial_manager"].includes(String(role || ""));
  const [path, setPath] = useState(() => typeof window !== "undefined" ? window.location.pathname : "");
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [ratings, setRatings] = useState<Record<string, RatingState>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setPath(window.location.pathname);
    const timer = window.setInterval(update, 500);
    window.addEventListener("popstate", update);
    return () => { window.clearInterval(timer); window.removeEventListener("popstate", update); };
  }, []);

  const load = async () => {
    setError("");
    try {
      const [r, c] = await Promise.all([fetchAdminMatchRequests(), fetchSuccessfulMatrimonialConnections()]);
      setRequests(r || []);
      setConnections(c || []);
    } catch (e: any) { setError(e?.message || "Could not load matrimonial case completion data."); }
  };

  useEffect(() => { if (isAdmin && allowed && path === "/admin/matrimonial") void load(); }, [isAdmin, allowed, path]);

  const accepted = useMemo(() => requests.filter((r) => r.status === "accepted"), [requests]);
  if (!isAdmin || !allowed || path !== "/admin/matrimonial") return null;

  const updateRating = (id: string, key: keyof RatingState, value: string) => setRatings((old) => ({ ...old, [id]: { ...(old[id] || blankRating()), [key]: value } }));
  const complete = async (r: any) => {
    const f = ratings[r.id] || blankRating();
    const managerRating = Number(f.manager || 0);
    if (managerRating < 1 || managerRating > 5) { setError("Manager outcome rating from 1 to 5 is required before closing a successful connection."); return; }
    if (!confirm("Mark this mutually accepted case as a successful connection? Both profiles will be removed from active matching and both candidates will be notified by email where available.")) return;
    setBusy(r.id); setError(""); setMessage("");
    try {
      await completeMatrimonialConnection({
        requestId: r.id,
        requesterRating: f.requester ? Number(f.requester) : null,
        targetRating: f.target ? Number(f.target) : null,
        managerRating,
        successNote: f.note,
      });
      setMessage("Successful connection recorded. Both candidate profiles are now closed from active matching and notification emails were processed.");
      await load();
    } catch (e: any) { setError(e?.message || "Could not close this matrimonial case."); }
    finally { setBusy(null); }
  };

  return <>
    <button onClick={() => setOpen(true)} style={floating}><HeartHandshake size={14}/>Successful Connections ({connections.length})</button>
    {open && <div style={overlay}><div style={modal}>
      <div style={header}><div><h3 style={{ margin: 0, color: GREEN, fontFamily: "'Playfair Display', serif" }}>Case Completion & Successful Connections</h3><p style={{ margin: "4px 0 0", color: "#777", fontSize: 10 }}>Only mutually accepted cases can be marked successful. Closing a case removes both profiles from active matching.</p></div><button onClick={() => setOpen(false)} style={close}><X size={18}/></button></div>
      <div style={{ padding: 16 }}>
        <div style={{ background: "#eef6ff", border: "1px solid #cfe4fb", borderRadius: 9, padding: 10, color: "#315f7d", fontSize: 10, lineHeight: 1.6, marginBottom: 12 }}><CheckCircle2 size={13} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Compatibility percentages are decision-support only. A case is marked successful only after mutual consent and the manager records the real-world outcome.</div>
        {error && <div style={errorBox}>{error}</div>}{message && <div style={successBox}>{message}</div>}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><strong style={{ color: GREEN, fontSize: 12 }}>Accepted Cases Awaiting Closure ({accepted.length})</strong><button onClick={() => void load()} style={ghost}><RefreshCw size={12}/>Refresh</button></div>
        {accepted.length ? <div style={{ display: "grid", gap: 10 }}>{accepted.map((r) => { const f = ratings[r.id] || blankRating(); return <article key={r.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><strong style={{ color: GREEN }}>{r.requester?.profileCode || r.requesterProfileId}</strong> <span style={{ color: "#aaa" }}>↔</span> <strong style={{ color: GREEN }}>{r.target?.profileCode || r.targetProfileId}</strong><div style={{ color: "#777", fontSize: 9, marginTop: 3 }}>{r.requester?.name || "Requester"} · {r.target?.name || "Target"}</div></div><span style={score}>{Number(r.mutualScore || 0)}% match</span></div>
          <div style={ratingGrid}><Rating label="Requester rating (optional)" value={f.requester} onChange={(v)=>updateRating(r.id,"requester",v)}/><Rating label="Target rating (optional)" value={f.target} onChange={(v)=>updateRating(r.id,"target",v)}/><Rating label="Manager outcome rating *" value={f.manager} onChange={(v)=>updateRating(r.id,"manager",v)}/></div>
          <label style={{ display: "block", marginTop: 8 }}><span style={lbl}>Success / Closure Note</span><textarea rows={2} value={f.note} onChange={(e)=>updateRating(r.id,"note",e.target.value)} placeholder="Optional internal note about the completed connection." style={input}/></label>
          <div style={{ textAlign: "right", marginTop: 9 }}><button disabled={busy===r.id} onClick={()=>void complete(r)} style={primary}><CheckCircle2 size={12}/>{busy===r.id?"Closing...":"Mark Successful & Close"}</button></div>
        </article>})}</div> : <div style={empty}>No mutually accepted cases are waiting for successful closure.</div>}
        <div style={{ marginTop: 18, borderTop: "1px solid #eee", paddingTop: 14 }}><strong style={{ color: GREEN, fontSize: 12 }}>Successful Connections ({connections.length})</strong>{connections.length ? <div style={{ display: "grid", gap: 7, marginTop: 9 }}>{connections.map((c) => <div key={c.id} style={{ ...card, padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}><div><b style={{ color: GREEN }}>{c.requesterCode}</b> <span style={{ color: "#aaa" }}>↔</span> <b style={{ color: GREEN }}>{c.targetCode}</b><div style={{ color: "#777", fontSize: 9, marginTop: 2 }}>{c.requesterName} · {c.targetName}</div></div><div style={{ fontSize: 9, color: "#666" }}>{new Date(c.connectedAt || c.createdAt).toLocaleDateString()} · Manager {c.managerRating}/5</div></div>{c.successNote && <div style={{ color: "#777", fontSize: 9, marginTop: 5 }}>{c.successNote}</div>}</div>)}</div> : <div style={empty}>No successful connections have been recorded yet.</div>}</div>
      </div>
    </div></div>}
  </>;
}

function Rating({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span style={lbl}>{label}</span><select value={value} onChange={(e)=>onChange(e.target.value)} style={input}><option value="">Not entered</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label>; }
const floating: React.CSSProperties = { position: "fixed", right: 18, bottom: 18, zIndex: 9998, display: "inline-flex", alignItems: "center", gap: 5, background: GREEN, color: "white", border: `2px solid ${GOLD}`, borderRadius: 10, padding: "11px 14px", fontSize: 10, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 24px rgba(0,0,0,.2)" };
const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 12000, background: "rgba(0,0,0,.58)", display: "grid", placeItems: "center", padding: 14 };
const modal: React.CSSProperties = { width: "min(980px,96vw)", maxHeight: "92vh", overflowY: "auto", background: "#fff", borderRadius: 13 };
const header: React.CSSProperties = { position: "sticky", top: 0, zIndex: 2, background: "white", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", padding: "14px 16px", borderBottom: "1px solid #eee" };
const close: React.CSSProperties = { border: 0, background: "transparent", color: "#555", cursor: "pointer" };
const card: React.CSSProperties = { border: "1px solid #e8e2d8", borderRadius: 9, padding: 12, background: "white" };
const ratingGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8, marginTop: 9 };
const lbl: React.CSSProperties = { display: "block", color: GREEN, fontSize: 9, fontWeight: 800, marginBottom: 3 };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #d8e1da", borderRadius: 7, padding: "8px 9px", fontSize: 10, background: "white" };
const primary: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 4, border: 0, borderRadius: 7, background: GREEN, color: "white", padding: "8px 10px", fontSize: 9, fontWeight: 800, cursor: "pointer" };
const ghost: React.CSSProperties = { ...primary, background: "white", color: GREEN, border: "1px solid #d5ded8" };
const score: React.CSSProperties = { background: "#dcfce7", color: "#166534", borderRadius: 18, padding: "5px 8px", fontSize: 9, fontWeight: 800 };
const empty: React.CSSProperties = { marginTop: 8, border: "1px dashed #ddd", borderRadius: 8, padding: 18, textAlign: "center", color: "#999", fontSize: 10 };
const errorBox: React.CSSProperties = { background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 10 };
const successBox: React.CSSProperties = { background: "#dcfce7", color: "#166534", borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 10 };
