import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, BadgeCheck, ChevronDown, Heart, Loader2, LockKeyhole, Send, ShieldCheck, Sparkles } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { MatchDistribution, MatchScoreGraph } from "../components/matrimonial/MatrimonialSmartFields";
import { fetchMatrimonialMatches, fetchMyMatrimonialProfiles, MatrimonialProfile, requestMatrimonialMatch } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type Band = "excellent" | "strong" | "good" | "broader";
function bandFor(score = 0): Band { return score >= 80 ? "excellent" : score >= 70 ? "strong" : score >= 55 ? "good" : "broader"; }
function scoreColor(score = 0) { return score >= 80 ? { bg: "#dcfce7", color: "#166534" } : score >= 70 ? { bg: "#e7f6ec", color: "#1a4d2e" } : score >= 55 ? { bg: "#fef3c7", color: "#92400e" } : { bg: "#f3f4f6", color: "#4b5563" }; }

export function MatrimonialMatchesPage() {
  const [params, setParams] = useSearchParams();
  const [authenticated, setAuthenticated] = useState(() => Boolean(localStorage.getItem("araian_member_token")));
  const [profiles, setProfiles] = useState<MatrimonialProfile[]>([]);
  const [selectedId, setSelectedId] = useState(params.get("profileId") || "");
  const [matches, setMatches] = useState<MatrimonialProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detail, setDetail] = useState<MatrimonialProfile | null>(null);
  const [filter, setFilter] = useState<"all" | Band>("all");

  const loadProfiles = async () => {
    if (!authenticated) { setLoading(false); return; }
    setLoading(true); setError("");
    try {
      const mine = await fetchMyMatrimonialProfiles();
      setProfiles(mine);
      const initial = selectedId || mine.find((p) => p.status === "approved" && p.showOnPortal)?.id || mine[0]?.id || "";
      setSelectedId(initial);
      if (initial) setParams({ profileId: initial }, { replace: true });
    } catch (e: any) {
      if (e?.status === 401) { localStorage.removeItem("araian_member_token"); setAuthenticated(false); }
      else setError(e?.message || "Could not load your candidate profiles.");
    } finally { setLoading(false); }
  };

  const loadMatches = async (profileId: string) => {
    if (!profileId) return;
    setLoading(true); setError(""); setSuccess("");
    try { const res = await fetchMatrimonialMatches(profileId); setMatches(res.matches || []); }
    catch (e: any) { setMatches([]); setError(e?.message || "Matches could not be calculated."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadProfiles(); }, [authenticated]);
  useEffect(() => { if (authenticated && selectedId) void loadMatches(selectedId); }, [authenticated, selectedId]);

  const visible = useMemo(() => matches.filter((m) => filter === "all" || bandFor(m.mutualScore || 0) === filter), [matches, filter]);
  const selected = profiles.find((p) => p.id === selectedId);

  const request = async (target: MatrimonialProfile) => {
    if (!selectedId) return;
    if (!confirm(`Send a private interest request to ${target.profileCode}? Your contact details and photo will not be shared at this stage.`)) return;
    setBusyId(target.id); setError(""); setSuccess("");
    try {
      await requestMatrimonialMatch(selectedId, target.id, `Interested based on ${target.mutualScore || 0}% compatibility.`);
      setSuccess(`Interest sent for ${target.profileCode}. It will pass through the privacy and consent workflow before any private details are released.`);
    } catch (e: any) { setError(e?.message || "Interest could not be sent."); }
    finally { setBusyId(null); }
  };

  if (!authenticated) return <div><PageHeader title="Private Match Finder" subtitle="Two-way compatibility matching" breadcrumb={["Home", "Matrimonial", "Matches"]}/><section style={{ maxWidth: 520, margin: "45px auto", padding: "0 20px" }}><div style={card}><LockKeyhole size={32} color={GOLD}/><h2 style={title}>Verified sign-in required</h2><p style={muted}>Match results are never public. Verify the same email account used for your candidate profile.</p><PasswordlessSignIn onAuthenticated={() => setAuthenticated(true)} compact/></div></section></div>;

  return <div>
    <PageHeader title="Private Match Finder" subtitle="Explainable two-way compatibility without exposing names, photos or contact details" breadcrumb={["Home", "Matrimonial", "Matches"]}/>
    <section style={{ maxWidth: 1120, margin: "0 auto", padding: "30px 20px 70px" }}>
      <Link to="/matrimonial" style={{ color: GREEN, textDecoration: "none", display: "inline-flex", gap: 5, alignItems: "center", fontSize: 12, fontWeight: 800, marginBottom: 15 }}><ArrowLeft size={14}/> Matrimonial Dashboard</Link>
      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div><strong style={{ color: GREEN }}>Candidate profile</strong><p style={{ ...muted, margin: "4px 0 0" }}>Scores compare both sides. Timeline and optional behavior/lifestyle answers are soft signals; must-have partner preferences still remain separate.</p></div>
          <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setParams({ profileId: e.target.value }); }} style={selectStyle}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.profileCode} · {p.name || "Candidate"} · {p.status}</option>)}</select>
        </div>
        {selected && !(selected.status === "approved" && selected.showOnPortal) && <div style={{ background: "#fff7ed", color: "#9a3412", borderRadius: 8, padding: 10, marginTop: 12, fontSize: 11 }}>Matching opens after the candidate profile has been approved and enabled by the matrimonial manager.</div>}
      </div>

      <div style={{ background: "#eef6ff", border: "1px solid #cfe4fb", color: "#315f7d", borderRadius: 10, padding: 13, display: "flex", gap: 9, marginBottom: 16 }}><ShieldCheck size={17}/><div style={{ fontSize: 11, lineHeight: 1.65 }}><strong>Privacy layer:</strong> these cards use anonymous profile codes. Name, photograph, phone number and sensitive family details are not included. Unknown fields lower score confidence rather than automatically counting as a mismatch.</div></div>
      {error && <Notice bg="#fee2e2" color="#b91c1c">{error}</Notice>}
      {success && <Notice bg="#dcfce7" color="#166534">{success}</Notice>}

      {!loading && matches.length > 0 && <MatchDistribution scores={matches.map((m) => Number(m.mutualScore || 0))}/>} 
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>{(["all","excellent","strong","good","broader"] as const).map((b) => <button key={b} onClick={() => setFilter(b)} style={{ border: `1px solid ${filter === b ? GREEN : "#d8ded9"}`, background: filter === b ? GREEN : "white", color: filter === b ? "white" : GREEN, borderRadius: 20, padding: "7px 11px", fontSize: 11, fontWeight: 800, cursor: "pointer", textTransform: "capitalize" }}>{b === "all" ? `All (${matches.length})` : `${b} (${matches.filter((m) => bandFor(m.mutualScore || 0) === b).length})`}</button>)}</div>

      {loading ? <div style={{ padding: 50, textAlign: "center", color: "#777" }}><Loader2 className="spin"/> Calculating private matches...</div> : visible.length ? <div className="match-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 15 }}>{visible.map((m) => <MatchCard key={m.id} match={m} busy={busyId === m.id} onRequest={() => void request(m)} onDetails={() => setDetail(m)}/>)}</div> : <div style={{ ...card, textAlign: "center" }}><Sparkles size={30} color={GOLD}/><h3 style={{ color: GREEN }}>No matches in this band yet</h3><p style={muted}>Adding structured partner preferences, timeline and optional lifestyle answers can improve confidence as more approved profiles become available.</p></div>}
    </section>

    {detail && <div style={modalBackdrop}><div style={modal}><button onClick={() => setDetail(null)} style={closeBtn}>×</button><h2 style={{ ...title, marginTop: 0 }}>{detail.profileCode} · {detail.mutualScore}% mutual compatibility</h2><MatchScoreGraph mutual={detail.mutualScore||0} forward={detail.requesterToTargetScore||0} reverse={detail.targetToRequesterScore||0} confidence={detail.scoreConfidence||0} categories={detail.breakdown?.categoryScores}/><div style={{ background: "#f8f5ef", borderRadius: 9, padding: 12, color: "#555", fontSize: 11, lineHeight: 1.6, marginTop: 11 }}>The graph separates overall compatibility, both directional preference fits, data confidence, and available category signals such as marriage timing and lifestyle/behavior. It is decision support, not a guarantee.</div>{detail.breakdown && <Breakdown data={detail.breakdown}/>}<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button disabled={busyId === detail.id} onClick={() => void request(detail)} style={primaryBtn}><Send size={13}/> Send Private Interest</button></div></div></div>}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:780px){.match-grid{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

function MatchCard({ match: m, busy, onRequest, onDetails }: { match: MatrimonialProfile; busy: boolean; onRequest: () => void; onDetails: () => void }) {
  const color = scoreColor(m.mutualScore || 0);
  const category = m.breakdown?.categoryScores || {};
  return <article style={{ ...card, padding: 19 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}><div><div style={{ color: GREEN, fontWeight: 900, fontSize: 14 }}>{m.profileCode}</div><div style={{ color: "#777", fontSize: 11, marginTop: 3, textTransform: "capitalize" }}>{m.gender} · {m.age} years · {m.city || m.province || m.country}</div></div><span style={{ background: color.bg, color: color.color, borderRadius: 22, padding: "6px 10px", fontWeight: 900, fontSize: 12 }}>{m.mutualScore}% Match</span></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}><Fact label="Education" value={m.education}/><Fact label="Profession" value={m.profession}/><Fact label="Marital Status" value={m.maritalStatus || "Private / not specified"}/><Fact label="Verification" value={(m.verificationStatus || "unverified").replace(/_/g," ")}/></div>
    <div style={{ marginTop: 12, display: "flex", gap: 7, flexWrap: "wrap" }}>{m.eligible !== false ? <Tag good text="No Must-Have Conflict"/> : <Tag text="Broader Match"/>}<Tag text={`Confidence ${m.scoreConfidence || 0}%`}/>{typeof category.marriageTiming === "number" && <Tag text={`Timing ${category.marriageTiming}%`}/>} {typeof category.behaviorLifestyle === "number" && <Tag text={`Lifestyle ${category.behaviorLifestyle}%`}/>} {m.verificationStatus && m.verificationStatus !== "unverified" && <Tag good text="Verified" icon/>}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 15 }}><button onClick={onDetails} style={secondaryBtn}><ChevronDown size={13}/> Score details</button><button disabled={busy} onClick={onRequest} style={primaryBtn}><Heart size={13}/>{busy ? "Sending..." : "Show Interest"}</button></div>
  </article>;
}
function Fact({ label, value }: { label:string; value?: string }) { return <div style={{ background: "#faf9f6", borderRadius: 8, padding: 9 }}><div style={{ color: "#999", fontSize: 9, textTransform: "uppercase", fontWeight: 800 }}>{label}</div><div style={{ color: "#3f4c43", fontSize: 11, marginTop: 3 }}>{value || "Not specified"}</div></div>; }
function Tag({ text, good = false, icon = false }: { text:string; good?:boolean; icon?:boolean }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: good ? "#ecfdf3" : "#f4f4f4", color: good ? "#166534" : "#666", borderRadius: 18, padding: "4px 7px", fontSize: 9, fontWeight: 800 }}>{icon && <BadgeCheck size={10}/>} {text}</span>; }
function Breakdown({ data }: { data: any }) { const left = data.requesterToTarget || []; const right = data.targetToRequester || []; return <details style={{ marginTop: 12, border: "1px solid #e8e3da", borderRadius: 9, padding: "0 11px" }}><summary style={{ padding: "10px 0", cursor: "pointer", color: GREEN, fontSize: 11, fontWeight: 800 }}>Compatibility breakdown</summary><div className="break-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingBottom: 12 }}><BreakColumn title="Your preferences" items={left}/><BreakColumn title="Their preferences" items={right}/></div></details>; }
function BreakColumn({ title, items }: { title:string; items:any[] }) { return <div><strong style={{ color: GREEN, fontSize: 10 }}>{title}</strong><div style={{ display: "grid", gap: 5, marginTop: 6 }}>{items.map((x,i) => <div key={`${x.criterion}-${i}`} style={{ fontSize: 9, color: "#666", borderBottom: "1px solid #f0f0f0", paddingBottom: 4 }}><b>{x.criterion}</b>: {x.result} · {x.score}%</div>)}</div></div>; }
function Notice({ bg, color, children }: { bg:string; color:string; children:React.ReactNode }) { return <div style={{ background: bg, color, borderRadius: 8, padding: 11, marginBottom: 14, fontSize: 12 }}>{children}</div>; }
const card: React.CSSProperties = { background: "white", border: "1px solid #e9e3da", borderRadius: 14, padding: 26, boxShadow: "0 5px 22px rgba(0,0,0,.045)" };
const title: React.CSSProperties = { color: GREEN, fontFamily: "'Playfair Display', serif", margin: "12px 0 8px" };
const muted: React.CSSProperties = { color: "#666", fontSize: 12, lineHeight: 1.7 };
const selectStyle: React.CSSProperties = { minWidth: 280, maxWidth: "100%", border: "1px solid #d5dfd8", borderRadius: 8, padding: "9px 10px", color: "#34453a", background: "white", fontSize: 12 };
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 5, background: GREEN, color: "white", border: 0, borderRadius: 7, padding: "8px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer", flex: 1 };
const secondaryBtn: React.CSSProperties = { ...primaryBtn, background: "white", color: GREEN, border: "1px solid #d5dfd8" };
const modalBackdrop: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.58)", display: "grid", placeItems: "center", padding: 16 };
const modal: React.CSSProperties = { position: "relative", width: "min(760px,96vw)", maxHeight: "90vh", overflowY: "auto", background: "white", borderRadius: 14, padding: 22, boxShadow: "0 24px 70px rgba(0,0,0,.3)" };
const closeBtn: React.CSSProperties = { position: "absolute", right: 12, top: 10, border: 0, background: "transparent", color: "#777", fontSize: 24, cursor: "pointer" };
