import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, BadgeCheck, ChevronDown, Heart, Loader2, LockKeyhole, Send, ShieldCheck, Sparkles, UserCheck, MessageCircleMore } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PasswordlessSignIn } from "../components/PasswordlessSignIn";
import { MatchDistribution, MatchScoreGraph, ScoreRing } from "../components/matrimonial/MatrimonialSmartFields";
import { fetchMatrimonialMatches, fetchMyMatrimonialProfiles, MatrimonialProfile, requestMatrimonialMatch } from "../lib/matrimonialStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const BLUE = "#2563eb";
const TEAL = "#0f766e";
type Band = "excellent" | "strong" | "good" | "broader";
function bandFor(score = 0): Band { return score >= 80 ? "excellent" : score >= 70 ? "strong" : score >= 55 ? "good" : "broader"; }

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
    if (!confirm(`Send a private interest to ${target.profileCode}? They will see your anonymized basics and the compatibility score first. Your photo and contact remain locked until consent.`)) return;
    setBusyId(target.id); setError(""); setSuccess("");
    try {
      await requestMatrimonialMatch(selectedId, target.id, `Interested based on ${target.mutualScore || 0}% compatibility.`);
      setSuccess(`Interest sent to ${target.profileCode}. The other side can review the safe profile basics and accept or decline. Admin is notified for oversight; private contact remains locked until consent.`);
    } catch (e: any) { setError(e?.message || "Interest could not be sent."); }
    finally { setBusyId(null); }
  };

  if (!authenticated) return <div><PageHeader title="Private Match Finder" subtitle="Two-way compatibility matching" breadcrumb={["Home", "Matrimonial", "Matches"]}/><section style={{ maxWidth: 540, margin: "45px auto", padding: "0 20px" }}><div style={card}><LockKeyhole size={36} color={GOLD}/><h2 style={title}>Verified sign-in required</h2><p style={muted}>Match results are private. Verify the same email account used for your candidate profile.</p><PasswordlessSignIn onAuthenticated={() => setAuthenticated(true)} compact/></div></section></div>;

  const flow = [
    ["1","See Match %","Review safe basics",BLUE],
    ["2","Show Interest","Send private request","#7c3aed"],
    ["3","Other Side Reviews","They see basics + %",TEAL],
    ["4","Consent","Accept or decline",GOLD],
    ["5","Connect","Permitted contact opens",GREEN],
  ] as const;

  return <div>
    <PageHeader title="Private Match Finder" subtitle="See the percentage first, then decide whether to send a private interest" breadcrumb={["Home", "Matrimonial", "Matches"]}/>
    <section style={{ maxWidth: 1160, margin: "0 auto", padding: "30px 20px 70px" }}>
      <Link to="/matrimonial" style={backLink}><ArrowLeft size={14}/> Matrimonial Dashboard</Link>

      <div className="match-flow" style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:16}}>{flow.map(([n,t,d,c])=><div key={n} style={{background:"white",border:"1px solid #e5e8e5",borderTop:`4px solid ${c}`,borderRadius:11,padding:11}}><span style={{display:"grid",placeItems:"center",width:27,height:27,borderRadius:"50%",background:c,color:"white",fontWeight:900,fontSize:11}}>{n}</span><strong style={{display:"block",color:"#304238",fontSize:11,marginTop:7}}>{t}</strong><span style={{display:"block",color:"#7a847e",fontSize:9,marginTop:2}}>{d}</span></div>)}</div>

      <div style={{ ...card, padding: 18, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div><strong style={{ color: GREEN, fontSize:14 }}>Your candidate profile</strong><p style={{ ...muted, margin: "4px 0 0" }}>The score compares both sides. You remain in control of whether an interest is sent.</p></div>
          <select value={selectedId} onChange={(e) => { setSelectedId(e.target.value); setParams({ profileId: e.target.value }); }} style={selectStyle}>{profiles.map((p) => <option key={p.id} value={p.id}>{p.profileCode} · {p.name || "Candidate"} · {p.status}</option>)}</select>
        </div>
        {selected && !(selected.status === "approved" && selected.showOnPortal) && <div style={warning}>Matching opens after the candidate profile has been approved and enabled for private matching.</div>}
      </div>

      <div style={privacyBox}><ShieldCheck size={19}/><div><strong>What you can see now:</strong> profile code, age, broad location, education, profession and permitted match factors. <strong>Name, photo and contact remain private.</strong> After the other side accepts, only privacy-permitted details are released.</div></div>
      {error && <Notice bg="#fee2e2" color="#b91c1c">{error}</Notice>}
      {success && <Notice bg="#dcfce7" color="#166534">{success}</Notice>}

      {!loading && matches.length > 0 && <MatchDistribution scores={matches.map((m) => Number(m.mutualScore || 0))}/>} 
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>{(["all","excellent","strong","good","broader"] as const).map((b) => <button key={b} onClick={() => setFilter(b)} style={filterButton(filter===b)}>{b === "all" ? `All (${matches.length})` : `${b} (${matches.filter((m) => bandFor(m.mutualScore || 0) === b).length})`}</button>)}</div>

      {loading ? <div style={{ padding: 55, textAlign: "center", color: "#777" }}><Loader2 className="spin"/> Calculating private matches...</div> : visible.length ? <div className="match-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 15 }}>{visible.map((m) => <MatchCard key={m.id} match={m} busy={busyId === m.id} onRequest={() => void request(m)} onDetails={() => setDetail(m)}/>)}</div> : <div style={{ ...card, textAlign: "center" }}><Sparkles size={34} color={GOLD}/><h3 style={{ color: GREEN }}>No matches in this band yet</h3><p style={muted}>Adding structured partner preferences, marriage timing and optional lifestyle answers can improve confidence.</p></div>}
    </section>

    {detail && <div style={modalBackdrop}><div style={modal}><button onClick={() => setDetail(null)} style={closeBtn}>×</button><div style={{display:"flex",gap:13,alignItems:"center",paddingRight:28}}><ScoreRing value={detail.mutualScore||0} size={82}/><div><h2 style={{ ...title, margin: 0 }}>{detail.profileCode}</h2><p style={{...muted,margin:"4px 0 0"}}>Detailed two-way compatibility</p></div></div><MatchScoreGraph mutual={detail.mutualScore||0} forward={detail.requesterToTargetScore||0} reverse={detail.targetToRequesterScore||0} confidence={detail.scoreConfidence||0} categories={detail.breakdown?.categoryScores}/><div style={explainBox}>This score helps you compare profiles. It is not a guarantee of suitability. Final verification and marriage decisions remain with the candidates/families.</div>{detail.breakdown && <Breakdown data={detail.breakdown}/>}<div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button disabled={busyId === detail.id} onClick={() => void request(detail)} style={primaryBtn}><Send size={14}/> Send Private Interest</button></div></div></div>}
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:800px){.match-grid{grid-template-columns:1fr!important}.match-flow{grid-template-columns:1fr 1fr!important}.break-grid{grid-template-columns:1fr!important}}@media(max-width:480px){.match-flow{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

function MatchCard({ match: m, busy, onRequest, onDetails }: { match: MatrimonialProfile; busy: boolean; onRequest: () => void; onDetails: () => void }) {
  const category = m.breakdown?.categoryScores || {};
  return <article style={{ ...card, padding: 18, background:"linear-gradient(145deg,#fff,#fbfcfb)" }}>
    <div style={{display:"grid",gridTemplateColumns:"92px 1fr",gap:13,alignItems:"center"}}><ScoreRing value={m.mutualScore||0} size={88}/><div><div style={{ color: GREEN, fontWeight: 900, fontSize: 15 }}>{m.profileCode}</div><div style={{ color: "#69766e", fontSize: 11, marginTop: 4, textTransform: "capitalize" }}>{m.gender} · {m.age} years · {m.city || m.province || m.country}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{m.eligible !== false ? <Tag good text="No Must-Have Conflict"/> : <Tag text="Broader Match"/>}<Tag text={`Confidence ${m.scoreConfidence || 0}%`}/></div></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}><Fact label="Education" value={m.education}/><Fact label="Profession" value={m.profession}/><Fact label="Marital Status" value={m.maritalStatus || "Not specified"}/><Fact label="Verification" value={(m.verificationStatus || "unverified").replace(/_/g," ")}/></div>
    <div style={{ marginTop: 11, display: "flex", gap: 7, flexWrap: "wrap" }}>{typeof category.marriageTiming === "number" && <Tag text={`Timing ${category.marriageTiming}%`}/>} {typeof category.behaviorLifestyle === "number" && <Tag text={`Lifestyle ${category.behaviorLifestyle}%`}/>} {m.verificationStatus && m.verificationStatus !== "unverified" && <Tag good text="Verified" icon/>}</div>
    <div style={{ background:"#f4f8f5",borderRadius:8,padding:9,marginTop:12,color:"#587063",fontSize:10,lineHeight:1.5 }}><UserCheck size={12} style={{verticalAlign:"-2px",marginRight:4}}/>If you send interest, the other side sees safe basics and this match score first. Contact is not released at this stage.</div>
    <div style={{ display: "flex", gap: 8, marginTop: 14 }}><button onClick={onDetails} style={secondaryBtn}><ChevronDown size={13}/> Why this score?</button><button disabled={busy||m.eligible===false} onClick={onRequest} style={{...primaryBtn,opacity:m.eligible===false?.5:1}}><Heart size={14}/>{busy ? "Sending..." : "Show Interest"}</button></div>
  </article>;
}
function Fact({ label, value }: { label:string; value?: string }) { return <div style={{ background: "#faf9f6", borderRadius: 8, padding: 9 }}><div style={{ color: "#929a95", fontSize: 9, textTransform: "uppercase", fontWeight: 800 }}>{label}</div><div style={{ color: "#3f4c43", fontSize: 11, marginTop: 3 }}>{value || "Not specified"}</div></div>; }
function Tag({ text, good = false, icon = false }: { text:string; good?:boolean; icon?:boolean }) { return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: good ? "#ecfdf3" : "#f4f4f4", color: good ? "#166534" : "#666", borderRadius: 18, padding: "4px 7px", fontSize: 9, fontWeight: 800 }}>{icon && <BadgeCheck size={10}/>} {text}</span>; }
function Breakdown({ data }: { data: any }) { const left = data.requesterToTarget || []; const right = data.targetToRequester || []; return <details style={{ marginTop: 12, border: "1px solid #e8e3da", borderRadius: 9, padding: "0 11px" }}><summary style={{ padding: "10px 0", cursor: "pointer", color: GREEN, fontSize: 11, fontWeight: 800 }}>Compatibility breakdown</summary><div className="break-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, paddingBottom: 12 }}><BreakColumn title="Your preferences" items={left}/><BreakColumn title="Their preferences" items={right}/></div></details>; }
function BreakColumn({ title, items }: { title:string; items:any[] }) { return <div><strong style={{ color: GREEN, fontSize: 10 }}>{title}</strong><div style={{ display: "grid", gap: 5, marginTop: 6 }}>{items.map((x,i) => <div key={`${x.criterion}-${i}`} style={{ fontSize: 9, color: "#666", borderBottom: "1px solid #f0f0f0", paddingBottom: 4 }}><b>{x.criterion}</b>: {x.result} · {x.score}%</div>)}</div></div>; }
function Notice({ bg, color, children }: { bg:string; color:string; children:React.ReactNode }) { return <div style={{ background: bg, color, borderRadius: 9, padding: 12, marginBottom: 14, fontSize: 12 }}>{children}</div>; }
const card: React.CSSProperties = { background: "white", border: "1px solid #e7e3dc", borderRadius: 14, padding: 26, boxShadow: "0 5px 22px rgba(0,0,0,.045)" };
const title: React.CSSProperties = { color: GREEN, fontFamily: "'Playfair Display', serif", margin: "12px 0 8px" };
const muted: React.CSSProperties = { color: "#68736c", fontSize: 12, lineHeight: 1.65 };
const backLink:React.CSSProperties={color:GREEN,textDecoration:"none",display:"inline-flex",gap:5,alignItems:"center",fontSize:12,fontWeight:800,marginBottom:15};
const selectStyle: React.CSSProperties = { border: "1px solid #d5ddd7", borderRadius: 8, padding: "10px 11px", fontSize: 12, color: "#33433a", background: "white", maxWidth: "100%" };
const warning:React.CSSProperties={background:"#fff7ed",color:"#9a3412",borderRadius:8,padding:10,marginTop:12,fontSize:11};
const privacyBox:React.CSSProperties={background:"#eef6ff",border:"1px solid #cfe4fb",color:"#315f7d",borderRadius:10,padding:13,display:"flex",gap:9,marginBottom:16,fontSize:11,lineHeight:1.65};
const explainBox:React.CSSProperties={background:"#fff8e8",border:"1px solid #eed8a7",borderRadius:9,padding:12,color:"#66562f",fontSize:11,lineHeight:1.6,marginTop:11};
const primaryBtn:React.CSSProperties={flex:1,display:"inline-flex",justifyContent:"center",alignItems:"center",gap:5,background:GREEN,color:"white",border:0,borderRadius:8,padding:"9px 11px",fontSize:11,fontWeight:800,cursor:"pointer"};
const secondaryBtn:React.CSSProperties={...primaryBtn,background:"white",color:GREEN,border:"1px solid #d4ddd7"};
const filterButton=(active:boolean):React.CSSProperties=>({border:`1px solid ${active?GREEN:"#d8ded9"}`,background:active?GREEN:"white",color:active?"white":GREEN,borderRadius:20,padding:"7px 11px",fontSize:11,fontWeight:800,cursor:"pointer",textTransform:"capitalize"});
const modalBackdrop:React.CSSProperties={position:"fixed",inset:0,background:"rgba(15,23,18,.58)",zIndex:1000,display:"grid",placeItems:"center",padding:20};
const modal:React.CSSProperties={width:"min(720px,100%)",maxHeight:"88vh",overflowY:"auto",background:"white",borderRadius:15,padding:22,position:"relative",boxShadow:"0 20px 70px rgba(0,0,0,.25)"};
const closeBtn:React.CSSProperties={position:"absolute",right:12,top:10,border:0,background:"#f3f4f6",width:30,height:30,borderRadius:"50%",cursor:"pointer",fontSize:20,color:"#555"};