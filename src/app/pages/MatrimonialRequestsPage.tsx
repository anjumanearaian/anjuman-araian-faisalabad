import { useEffect, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { SecureMatrimonialImage } from "../components/SecureMatrimonialImage";
import { CheckCircle, Clock, Heart, ShieldCheck, XCircle, ArrowLeft, Phone, BadgeCheck, Image as ImageIcon } from "lucide-react";
import { fetchMyMatchRequests, MatchRequestView, respondToMatchRequest } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

export function MatrimonialRequestsPage() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("araian_member_token")));
  const [requests, setRequests] = useState<MatchRequestView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    if (!authenticated) return;
    setLoading(true); setError("");
    try { setRequests(await fetchMyMatchRequests()); }
    catch (e: any) {
      if (e?.status === 401) { localStorage.removeItem("araian_member_token"); setAuthenticated(false); }
      else setError(e?.message || "Could not load your interest requests.");
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [authenticated]);

  const respond = async (id: string, decision: "accept" | "decline") => {
    if (decision === "accept" && !confirm("Accept this interest? The system will release only the details allowed by both profiles' privacy settings.")) return;
    if (decision === "decline" && !confirm("Decline this interest? No private details will be released.")) return;
    setBusyId(id); setError("");
    try { await respondToMatchRequest(id, decision); await load(); }
    catch (e: any) { setError(e?.message || "Could not update this request."); }
    finally { setBusyId(null); }
  };

  if (!authenticated) return <div><PageHeader title="Matrimonial Interests" subtitle="Private, consent-based introductions" breadcrumb={["Home", "Matrimonial", "Interests"]}/><section style={{ maxWidth: 500, margin: "48px auto", padding: "0 24px" }}><div style={card}><ShieldCheck size={28} color={GREEN}/><h2 style={heading}>Verify your account</h2><p style={muted}>Use the same verified email used for your candidate profile. Requests and released details are visible only to the relevant account and authorized matrimonial managers.</p><PasswordlessSignIn onAuthenticated={() => setAuthenticated(true)} compact/></div></section></div>;

  const incoming = requests.filter((r) => r.direction === "incoming");
  const outgoing = requests.filter((r) => r.direction === "outgoing");

  return <div>
    <PageHeader title="Matrimonial Interests" subtitle="Manager-reviewed and consent-controlled introductions" breadcrumb={["Home", "Matrimonial", "Interests"]}/>
    <section style={{ maxWidth: 1050, margin: "0 auto", padding: "34px 20px 64px" }}>
      <Link to="/matrimonial" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: GREEN, textDecoration: "none", fontSize: 12, fontWeight: 800, marginBottom: 16 }}><ArrowLeft size={14}/> Matrimonial Dashboard</Link>
      <div style={{ background: "#f0f7f3", border: "1px solid rgba(26,77,46,.15)", borderRadius: 11, padding: 14, display: "flex", gap: 9, marginBottom: 20 }}><ShieldCheck size={18} color={GREEN}/><p style={{ margin: 0, color: "#4b5563", fontSize: 11, lineHeight: 1.7 }}><strong style={{ color: GREEN }}>Privacy workflow:</strong> anonymous compatibility first → manager review → target consent → permitted profile/photo/contact release. A payment or uploaded photo never makes a candidate publicly visible.</p></div>
      {error && <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 8, padding: 11, marginBottom: 14, fontSize: 12 }}>{error}</div>}
      {loading ? <div style={{ padding: 30, color: "#777" }}>Loading private requests...</div> : <div className="request-cols" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}><RequestColumn title={`Incoming (${incoming.length})`} requests={incoming} busyId={busyId} onRespond={respond}/><RequestColumn title={`Outgoing (${outgoing.length})`} requests={outgoing} busyId={busyId} onRespond={respond}/></div>}
    </section>
    <style>{`@media(max-width:820px){.request-cols{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

function RequestColumn({ title, requests, busyId, onRespond }: { title:string; requests:MatchRequestView[]; busyId:string|null; onRespond:(id:string, decision:"accept"|"decline")=>void }) {
  return <div><h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, margin: "0 0 12px" }}>{title}</h3><div style={{ display: "grid", gap: 12 }}>{requests.map((r) => <RequestCard key={r.id} r={r} busy={busyId === r.id} onRespond={onRespond}/>)}{!requests.length && <div style={{ ...card, textAlign: "center", color: "#999", padding: 28 }}><Heart size={25} color={GOLD}/><p style={{ marginBottom: 0, fontSize: 12 }}>No requests here yet.</p></div>}</div></div>;
}

function RequestCard({ r, busy, onRespond }: { r:MatchRequestView; busy:boolean; onRespond:(id:string, decision:"accept"|"decline")=>void }) {
  const p = r.counterpart;
  const status = statusMeta(r.status);
  const accepted = r.status === "accepted";
  return <article style={{ ...card, padding: 17 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><strong style={{ color: GREEN, fontSize: 13 }}>{p.profileCode}</strong><div style={{ color: "#777", fontSize: 11, marginTop: 3, textTransform: "capitalize" }}>{p.gender} · {p.age} years · {p.city || p.province || p.country}</div></div><span style={{ background: status.bg, color: status.color, borderRadius: 18, padding: "4px 8px", fontSize: 9, fontWeight: 800 }}>{status.label}</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginTop: 11 }}><Fact label="Education" value={p.education}/><Fact label="Profession" value={p.profession}/></div>
    {r.mutualScore !== undefined && r.mutualScore !== null && <div style={{ background: "#f8f5ef", borderRadius: 8, padding: 9, marginTop: 10, fontSize: 10, color: "#555" }}><BadgeCheck size={11} style={{ verticalAlign: "-2px", marginRight: 4 }}/><strong>{r.mutualScore}% mutual compatibility</strong> · confidence {r.scoreConfidence || 0}%</div>}
    {r.requesterMessage && <div style={{ marginTop: 9, background: "#f8fafc", borderRadius: 7, padding: 9, color: "#555", fontSize: 10 }}><strong>Message:</strong> {r.requesterMessage}</div>}
    {accepted && <div style={{ marginTop: 11, background: "#dcfce7", border: "1px solid #bbf7d0", borderRadius: 8, padding: 10, color: "#166534", fontSize: 10, lineHeight: 1.6 }}><div style={{ fontWeight: 900 }}><CheckCircle size={12} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Mutual consent completed</div>{p.name && <div><strong>Name:</strong> {p.name}</div>}{p.contact && <div><Phone size={11} style={{ verticalAlign: "-2px", marginRight: 4 }}/><strong>Contact:</strong> {p.contact}</div>}{p.photoUrl && <div style={{ marginTop: 7 }}><ImageIcon size={11} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Photo access released under privacy settings.<div style={{ marginTop: 5 }}><SecureMatrimonialImage src={p.photoUrl} alt="Consented candidate" style={{ width: 90, height: 90, objectFit: "cover", borderRadius: 8 }}/></div></div>}</div>}
    {r.direction === "incoming" && r.status === "awaiting_target" && <div style={{ display: "flex", gap: 7, marginTop: 12 }}><button disabled={busy} onClick={() => onRespond(r.id,"accept")} style={{ flex: 1, background: GREEN, color: "white", border: 0, borderRadius: 7, padding: "8px 7px", fontWeight: 800, fontSize: 10, cursor: "pointer" }}><CheckCircle size={12} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Accept</button><button disabled={busy} onClick={() => onRespond(r.id,"decline")} style={{ flex: 1, background: "white", color: "#b91c1c", border: "1px solid #fecaca", borderRadius: 7, padding: "8px 7px", fontWeight: 800, fontSize: 10, cursor: "pointer" }}><XCircle size={12} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Decline</button></div>}
    {r.status === "pending_admin" && <div style={{ marginTop: 10, color: "#8a6118", fontSize: 10 }}><Clock size={11} style={{ verticalAlign: "-2px", marginRight: 4 }}/>Waiting for matrimonial manager review.</div>}
  </article>;
}
function Fact({ label, value }: { label:string; value?:string }) { return <div style={{ background: "#faf9f6", borderRadius: 7, padding: 8 }}><div style={{ color: "#999", fontSize: 8, fontWeight: 800, textTransform: "uppercase" }}>{label}</div><div style={{ color: "#455249", fontSize: 10, marginTop: 2 }}>{value || "Not specified"}</div></div>; }
function statusMeta(status:string) { if(status==="accepted") return {label:"Accepted",bg:"#dcfce7",color:"#166534"}; if(status==="awaiting_target") return {label:"Awaiting Consent",bg:"#dbeafe",color:"#1d4ed8"}; if(status==="declined"||status==="rejected") return {label:status==="declined"?"Declined":"Manager Rejected",bg:"#fee2e2",color:"#b91c1c"}; if(status==="closed") return {label:"Closed",bg:"#f3f4f6",color:"#4b5563"}; return {label:"Manager Review",bg:"#fef9c3",color:"#854d0e"}; }
const card:React.CSSProperties={background:"white",border:"1px solid #e8e3da",borderRadius:12,padding:28,boxShadow:"0 3px 14px rgba(0,0,0,.04)"};
const heading:React.CSSProperties={color:GREEN,fontFamily:"'Playfair Display', serif",margin:"12px 0 8px"};
const muted:React.CSSProperties={color:"#666",fontSize:12,lineHeight:1.7};