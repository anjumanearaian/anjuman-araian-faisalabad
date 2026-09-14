import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router";
import {
  ArrowLeft, BellRing, CheckCircle2, HeartHandshake, Loader2, MailCheck, MessageCircleMore,
  PhoneCall, RefreshCw, Search, ShieldCheck, Sparkles, UserRoundCheck, UsersRound, XCircle,
} from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { MatchDistribution, MatchScoreGraph, ScoreRing } from "../components/matrimonial/MatrimonialSmartFields";
import { fetchAllMatrimonials, MatrimonialProfile } from "../lib/matrimonialStore";

const GREEN="#1a4d2e", GOLD="#c8a04a", TEAL="#0f766e", BLUE="#2563eb", PURPLE="#7c3aed";
type PreviewMatch=MatrimonialProfile&{mutualScore:number;requesterToTargetScore:number;targetToRequesterScore:number;scoreConfidence:number;eligible:boolean;breakdown?:any};

function adminToken(){return sessionStorage.getItem("araian_admin_token")||"";}
async function manualFlow(method:"GET"|"POST", body?:any){
  const suffix=method==="GET"?"?action=manual_consent_queue":"";
  const res=await fetch(`/api/matrimonial/manual-flow${suffix}`,{method,headers:{Authorization:`Bearer ${adminToken()}`,...(method==="POST"?{"Content-Type":"application/json"}:{})},body:method==="POST"?JSON.stringify(body||{}):undefined,cache:"no-store"});
  const data=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(data?.error||`Request failed (${res.status})`);
  return data;
}

export function AdminMatrimonialManualMatchPage(){
  const {isAdmin,role}=useAdmin();
  const allowed=["admin","super_admin","welfare_manager","matrimonial_manager"].includes(String(role||""));
  const [profiles,setProfiles]=useState<MatrimonialProfile[]>([]);
  const [requesterId,setRequesterId]=useState("");
  const [matches,setMatches]=useState<PreviewMatch[]>([]);
  const [queue,setQueue]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [matching,setMatching]=useState(false);
  const [busy,setBusy]=useState<string|null>(null);
  const [search,setSearch]=useState("");
  const [minScore,setMinScore]=useState(55);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const [consentForm,setConsentForm]=useState<Record<string,{method:string;note:string}>>({});

  const load=async()=>{setLoading(true);setError("");try{const [p,q]=await Promise.all([fetchAllMatrimonials(1,100),manualFlow("GET")]);setProfiles(p.data);setQueue(q.requests||[]);if(!requesterId){const first=p.data.find(x=>x.status==="approved"&&x.showOnPortal&&x.isActive!==false);if(first)setRequesterId(first.id);}}catch(e:any){setError(e?.message||"Matching desk could not be loaded.");}finally{setLoading(false);}};
  useEffect(()=>{if(isAdmin&&allowed)void load();},[isAdmin,allowed]);
  useEffect(()=>{if(requesterId)void preview(requesterId);else setMatches([]);},[requesterId]);

  if(!isAdmin||!allowed)return <Navigate to="/admin" replace/>;
  const eligibleProfiles=profiles.filter(p=>p.status==="approved"&&p.showOnPortal&&p.isActive!==false);
  const requester=profiles.find(p=>p.id===requesterId);
  const visible=useMemo(()=>matches.filter(m=>(m.mutualScore||0)>=minScore&&(!search.trim()||`${m.profileCode||""} ${m.name||""} ${m.city||""} ${m.education||""} ${m.profession||""}`.toLowerCase().includes(search.trim().toLowerCase()))),[matches,minScore,search]);
  const excellent=matches.filter(m=>(m.mutualScore||0)>=80).length;
  const strong=matches.filter(m=>(m.mutualScore||0)>=70).length;

  async function preview(id:string){setMatching(true);setError("");setSuccess("");try{const data=await manualFlow("POST",{action:"preview_batch",requesterProfileId:id});setMatches(data.matches||[]);}catch(e:any){setMatches([]);setError(e?.message||"Compatibility preview failed.");}finally{setMatching(false);}}
  async function createAndForward(target:PreviewMatch){
    if(!requesterId)return;
    if(!confirm(`Send an assisted private interest from ${requester?.profileCode} to ${target.profileCode}? The other side will first see anonymized basics and the compatibility score. No private contact is released before consent.`))return;
    setBusy(target.id);setError("");setSuccess("");
    try{await manualFlow("POST",{action:"create_interest",requesterProfileId:requesterId,targetProfileId:target.id,note:`Office-assisted interest after ${target.mutualScore}% compatibility review.`});setSuccess(`${requester?.profileCode} → ${target.profileCode} sent for consent. Portal candidates can respond from their account; offline candidates appear in the consent queue below.`);await load();}catch(e:any){setError(e?.message||"Interest could not be created.");}finally{setBusy(null);}
  }
  async function recordConsent(item:any,decision:"accept"|"decline"){
    const form=consentForm[item.id]||{method:"office_visit",note:""};
    if(form.note.trim().length<5){setError("Add a short consent note before recording the decision.");return;}
    if(!confirm(`${decision==="accept"?"Accept":"Decline"} this interest on behalf of the offline candidate/guardian based on the recorded consent method?`))return;
    setBusy(item.id);setError("");setSuccess("");
    try{await manualFlow("POST",{action:"record_consent",requestId:item.id,decision,consentMethod:form.method,note:form.note.trim()});setSuccess(decision==="accept"?"Consent accepted. Only privacy-permitted details are released to both sides.":"Interest declined. No private details were released.");await load();}catch(e:any){setError(e?.message||"Consent decision could not be recorded.");}finally{setBusy(null);}
  }

  const steps=[
    {n:"1",title:"Match Score",text:"System compares both profiles",color:BLUE,icon:<Sparkles size={19}/>},
    {n:"2",title:"Interest",text:"Client or office sends request",color:PURPLE,icon:<HeartHandshake size={19}/>},
    {n:"3",title:"Basic Review",text:"Other side sees safe basics + %",color:TEAL,icon:<UsersRound size={19}/>},
    {n:"4",title:"Consent",text:"Accept / decline privately",color:GOLD,icon:<CheckCircle2 size={19}/>},
    {n:"5",title:"Connect",text:"Permitted contact is released",color:GREEN,icon:<MessageCircleMore size={19}/>},
  ];

  return <div style={{minHeight:"100vh",background:"#f5f2eb",fontFamily:"Lato, sans-serif"}}>
    <header style={{background:`linear-gradient(120deg,${GREEN},#236a45)`,color:"white",borderBottom:`5px solid ${GOLD}`,padding:"22px 24px"}}><div style={{maxWidth:1380,margin:"0 auto",display:"flex",justifyContent:"space-between",gap:16,alignItems:"center",flexWrap:"wrap"}}><div><div style={{display:"inline-flex",gap:7,alignItems:"center",background:"rgba(255,255,255,.12)",borderRadius:20,padding:"5px 9px",fontSize:10,fontWeight:800,marginBottom:7}}><ShieldCheck size={13}/> PRIVATE · CONSENT CONTROLLED</div><h1 style={{margin:0,fontFamily:"'Playfair Display', serif",fontSize:31}}>Assisted Matrimonial Matching Desk</h1><p style={{margin:"6px 0 0",opacity:.87,fontSize:13}}>Clear match percentages, client-led interest, admin oversight and documented offline consent</p></div><div style={{display:"flex",gap:8}}><button onClick={()=>void load()} style={ghost}><RefreshCw size={14}/>Refresh</button><Link to="/admin/matrimonial" style={{...ghost,textDecoration:"none"}}><ArrowLeft size={14}/>Control Center</Link></div></div></header>

    <main style={{maxWidth:1380,margin:"0 auto",padding:"24px 20px 64px"}}>
      <section className="flow-grid" style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10,marginBottom:16}}>{steps.map(s=><div key={s.n} style={{background:"white",border:"1px solid #e7e1d7",borderTop:`5px solid ${s.color}`,borderRadius:13,padding:14,boxShadow:"0 4px 16px rgba(0,0,0,.04)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{width:34,height:34,borderRadius:"50%",display:"grid",placeItems:"center",background:s.color,color:"white",fontWeight:900,fontSize:14}}>{s.n}</span><span style={{color:s.color}}>{s.icon}</span></div><strong style={{display:"block",color:"#26382d",fontSize:14,marginTop:10}}>{s.title}</strong><span style={{display:"block",color:"#777",fontSize:11,marginTop:3,lineHeight:1.45}}>{s.text}</span></div>)}</section>

      <section className="mode-grid" style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
        <div style={{...modeCard,borderLeft:`5px solid ${BLUE}`}}><div style={modeIcon(BLUE)}><MailCheck size={20}/></div><div><strong style={{color:BLUE,fontSize:14}}>Client Self-Service</strong><p style={modeText}>The client sees anonymized matches and the percentage, sends interest, and the other verified client accepts or declines in their own portal. Admin receives an email/audit for oversight, not as a routine blocking step.</p></div></div>
        <div style={{...modeCard,borderLeft:`5px solid ${GOLD}`}}><div style={modeIcon(GOLD)}><PhoneCall size={20}/></div><div><strong style={{color:"#946b08",fontSize:14}}>Office-Assisted / Offline</strong><p style={modeText}>Use this desk when a client needs staff help or has no portal account. Staff may send the interest, but the other side's consent must still be recorded before private details are released.</p></div></div>
      </section>

      <div style={{background:"#eef6ff",border:"1px solid #cfe4fb",color:"#315f7d",borderRadius:11,padding:13,marginBottom:15,fontSize:11,lineHeight:1.7,display:"flex",gap:8,alignItems:"flex-start"}}><ShieldCheck size={17} style={{flexShrink:0,marginTop:1}}/><div><strong>Scoring rule:</strong> the percentage is decision support, not a guarantee. Must-have conflicts can restrict eligibility; timeline and lifestyle answers are soft signals; missing answers reduce confidence rather than automatically failing a candidate.</div></div>
      {error&&<Notice bg="#fee2e2" color="#b91c1c">{error}</Notice>}{success&&<Notice bg="#dcfce7" color="#166534">{success}</Notice>}

      <section style={card}>
        <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"end",flexWrap:"wrap"}}><div style={{minWidth:280,flex:"1 1 480px"}}><label style={{...label,fontSize:12}}>Select Candidate for Assisted Matching</label><select value={requesterId} onChange={e=>setRequesterId(e.target.value)} style={{...input,fontSize:12,padding:"11px 12px"}}><option value="">Select approved candidate</option>{eligibleProfiles.map(p=><option key={p.id} value={p.id}>{p.profileCode} · {p.name} · {p.gender} · {p.age} · {p.city}</option>)}</select></div>{requester&&<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}><Metric title="Ready" value={`${requester.profileCompleteness||0}%`} color={GREEN}/><Metric title="Eligible Profiles" value={eligibleProfiles.length} color={BLUE}/><Metric title="80%+" value={excellent} color={TEAL}/><Metric title="70%+" value={strong} color={GOLD}/></div>}</div>
      </section>

      <section style={{...card,marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap",marginBottom:13}}><div><h2 style={sectionTitle}>Compatibility Results</h2><p style={sub}>Large score indicators show the overall match first. Open the graph only when you need the detailed reason behind the score.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><div style={{position:"relative"}}><Search size={15} color="#999" style={{position:"absolute",left:10,top:11}}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search result..." style={{...input,width:220,paddingLeft:31}}/></div><select value={minScore} onChange={e=>setMinScore(Number(e.target.value))} style={input}><option value={0}>All scores</option><option value={40}>40%+</option><option value={55}>55%+</option><option value={70}>70%+</option><option value={80}>80%+</option></select></div></div>
        {!matching&&!loading&&matches.length>0&&<MatchDistribution scores={matches.map(m=>Number(m.mutualScore||0))}/>} 
        {matching||loading?<div style={{padding:46,textAlign:"center",color:"#777"}}><Loader2 className="spin"/> Calculating two-way compatibility...</div>:!requesterId?<Empty text="Select a candidate to calculate matches."/>:visible.length?<div className="match-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:13}}>{visible.map(m=><article key={m.id} style={{border:"1px solid #e3e7e4",borderRadius:14,padding:16,background:"linear-gradient(145deg,#fff,#fbfcfb)",boxShadow:"0 4px 15px rgba(0,0,0,.035)"}}><div style={{display:"grid",gridTemplateColumns:"88px 1fr",gap:13,alignItems:"center"}}><ScoreRing value={m.mutualScore||0} size={84}/><div><strong style={{color:GREEN,fontSize:14}}>{m.profileCode} · {m.name}</strong><small style={{...small,fontSize:10}}>{m.gender} · {m.age} · {m.city}{m.country&&m.country!=="Pakistan"?`, ${m.country}`:""}</small><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}><Pill text={m.education||"Education not specified"}/><Pill text={m.profession||"Profession not specified"}/><Pill text={`Confidence ${m.scoreConfidence||0}%`} strong/></div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}><Mini k="Candidate's fit" v={`${m.requesterToTargetScore}%`}/><Mini k="Other side's fit" v={`${m.targetToRequesterScore}%`}/></div><details style={{marginTop:10,border:"1px solid #e8ece9",borderRadius:9,padding:"0 10px"}}><summary style={{padding:"9px 0",cursor:"pointer",fontSize:10,fontWeight:800,color:GREEN}}>Why this score? Open compatibility graph</summary><MatchScoreGraph mutual={m.mutualScore||0} forward={m.requesterToTargetScore||0} reverse={m.targetToRequesterScore||0} confidence={m.scoreConfidence||0} categories={m.breakdown?.categoryScores}/></details><div style={{display:"flex",justifyContent:"space-between",gap:9,alignItems:"center",marginTop:12,flexWrap:"wrap"}}><span style={{fontSize:10,color:m.eligible===false?"#b91c1c":"#66736b",fontWeight:700}}>{m.eligible===false?"Must-have conflict · cannot forward":"Safe basics only until consent"}</span><button disabled={busy===m.id||m.eligible===false} onClick={()=>void createAndForward(m)} style={{...actionBtn,opacity:m.eligible===false?.45:1}}><HeartHandshake size={14}/>{busy===m.id?"Sending...":"Send Assisted Interest"}</button></div></article>)}</div>:<Empty text="No matches meet the selected score/search filter."/>}
      </section>

      <section style={{...card,marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:12,flexWrap:"wrap"}}><div><div style={{display:"flex",alignItems:"center",gap:8}}><BellRing size={18} color={GOLD}/><h2 style={sectionTitle}>Offline Consent Queue</h2></div><p style={sub}>Only candidates without a verified portal account appear here. Portal users accept or decline themselves. Admin records only documented offline consent.</p></div><Badge text={`${queue.length} waiting`} good={queue.length===0}/></div>
        {queue.length?<div style={{display:"grid",gap:11}}>{queue.map(q=>{const form=consentForm[q.id]||{method:"office_visit",note:""};return <article key={q.id} style={{border:"1px solid #e8e2d8",borderRadius:11,padding:14,background:"#fffdf9"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><strong style={{color:GREEN,fontSize:13}}>{q.requesterCode} → {q.targetCode}</strong><small style={small}>{q.requesterName} → {q.targetName} · {q.mutualScore||0}% mutual compatibility</small></div><Badge text="Awaiting documented consent" good={false}/></div><div className="consent-grid" style={{display:"grid",gridTemplateColumns:"190px 1fr",gap:8,marginTop:11}}><select value={form.method} onChange={e=>setConsentForm(old=>({...old,[q.id]:{...form,method:e.target.value}}))} style={input}><option value="office_visit">Office visit</option><option value="phone">Phone confirmation</option><option value="signed_form">Signed consent form</option><option value="family_meeting">Family meeting</option><option value="other">Other documented method</option></select><input value={form.note} onChange={e=>setConsentForm(old=>({...old,[q.id]:{...form,note:e.target.value}}))} placeholder="Consent note, e.g. candidate/guardian confirmed by phone at 4:30 PM" style={input}/></div><div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}><button disabled={busy===q.id} onClick={()=>void recordConsent(q,"accept")} style={actionBtn}><UserRoundCheck size={13}/>Record Acceptance</button><button disabled={busy===q.id} onClick={()=>void recordConsent(q,"decline")} style={dangerBtn}><XCircle size={13}/>Record Decline</button><span style={{marginLeft:"auto",fontSize:10,color:"#777",display:"inline-flex",alignItems:"center",gap:5}}><PhoneCall size={12}/>{q.targetContact||"Contact on profile"}</span></div></article>})}</div>:<Empty text="No offline consent requests are waiting. Portal-to-portal interests are handled by the clients themselves."/>}
      </section>
    </main>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:980px){.flow-grid{grid-template-columns:repeat(3,1fr)!important}.mode-grid,.match-grid{grid-template-columns:1fr!important}}@media(max-width:680px){.flow-grid{grid-template-columns:1fr 1fr!important}.consent-grid{grid-template-columns:1fr!important}}@media(max-width:460px){.flow-grid{grid-template-columns:1fr!important}}`}</style>
  </div>;
}

function Metric({title,value,color}:{title:string;value:any;color:string}){return <div style={{minWidth:72,background:`${color}10`,border:`1px solid ${color}25`,borderRadius:9,padding:"7px 9px",textAlign:"center"}}><strong style={{display:"block",color,fontSize:18,lineHeight:1.1}}>{value}</strong><span style={{color:"#777",fontSize:8,fontWeight:800,textTransform:"uppercase"}}>{title}</span></div>}
function Pill({text,strong=false}:{text:string;strong?:boolean}){return <span style={{background:strong?"#edf7f1":"#f4f5f4",color:strong?GREEN:"#667069",borderRadius:18,padding:"4px 7px",fontSize:9,fontWeight:strong?800:700}}>{text}</span>}
function Badge({text,good}:{text:string;good:boolean}){return <span style={{background:good?"#dcfce7":"#fff7ed",color:good?"#166534":"#9a6118",borderRadius:18,padding:"5px 9px",fontSize:9,fontWeight:800,whiteSpace:"nowrap"}}>{text}</span>}
function Mini({k,v}:{k:string;v:any}){return <div style={{background:"#f8faf8",borderRadius:8,padding:8}}><div style={{fontSize:8,color:"#929a94",fontWeight:800,textTransform:"uppercase"}}>{k}</div><div style={{fontSize:12,color:"#34483b",marginTop:3,fontWeight:800}}>{v||"Not specified"}</div></div>}
function Empty({text}:{text:string}){return <div style={{minHeight:165,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:9,textAlign:"center",color:"#8a948d",padding:"24px 16px"}}><div style={{width:50,height:50,borderRadius:"50%",display:"grid",placeItems:"center",background:"#fff9ec",border:"1px solid #f0dfb2"}}><Sparkles size={23} color={GOLD}/></div><p style={{fontSize:12,margin:0,lineHeight:1.55,maxWidth:520}}>{text}</p></div>}
function Notice({bg,color,children}:{bg:string;color:string;children:React.ReactNode}){return <div style={{background:bg,color,borderRadius:9,padding:11,marginBottom:12,fontSize:11}}>{children}</div>}
const modeCard:React.CSSProperties={background:"white",border:"1px solid #e4e8e5",borderRadius:12,padding:14,display:"flex",gap:11,alignItems:"flex-start",boxShadow:"0 3px 14px rgba(0,0,0,.03)"};
const modeIcon=(color:string):React.CSSProperties=>({width:40,height:40,borderRadius:10,display:"grid",placeItems:"center",background:`${color}12`,color,flexShrink:0});
const modeText:React.CSSProperties={margin:"5px 0 0",color:"#657168",fontSize:11,lineHeight:1.6};
const card:React.CSSProperties={background:"white",border:"1px solid #e4e0d7",borderRadius:13,padding:17,boxShadow:"0 4px 18px rgba(0,0,0,.035)"};
const sectionTitle:React.CSSProperties={margin:0,color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:21};
const sub:React.CSSProperties={margin:"5px 0 0",color:"#707b74",fontSize:11,lineHeight:1.55};
const input:React.CSSProperties={border:"1px solid #d3dcd5",borderRadius:8,padding:"9px 10px",fontSize:11,background:"white",boxSizing:"border-box",maxWidth:"100%"};
const label:React.CSSProperties={display:"block",color:GREEN,fontSize:11,fontWeight:800,marginBottom:6};
const small:React.CSSProperties={display:"block",fontSize:10,color:"#7c8780",marginTop:4};
const actionBtn:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:5,background:GREEN,color:"white",border:0,borderRadius:8,padding:"9px 11px",fontSize:10,fontWeight:800,cursor:"pointer"};
const dangerBtn:React.CSSProperties={...actionBtn,background:"white",color:"#b91c1c",border:"1px solid #fecaca"};
const ghost:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:5,border:"1px solid rgba(255,255,255,.35)",background:"rgba(255,255,255,.1)",color:"white",borderRadius:8,padding:"8px 10px",fontSize:10,fontWeight:800,cursor:"pointer"};