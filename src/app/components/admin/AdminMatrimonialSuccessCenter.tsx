import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, RefreshCw, Star } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { completeMatrimonialConnection, fetchAdminMatchRequests, fetchSuccessfulMatrimonialConnections } from "../../lib/matrimonialStore";

const GREEN="#1a4d2e", GOLD="#c8a04a";
type RatingForm={requester:string;target:string;manager:string;note:string};
const blankRating=():RatingForm=>({requester:"",target:"",manager:"5",note:""});

export function AdminMatrimonialSuccessCenter(){
  const {isAdmin,role}=useAdmin();
  const allowed=["admin","super_admin","welfare_manager","matrimonial_manager"].includes(String(role||""));
  const path=typeof window!=="undefined"?window.location.pathname:"";
  const active=isAdmin&&allowed&&path==="/admin/matrimonial";
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [requests,setRequests]=useState<any[]>([]);
  const [connections,setConnections]=useState<any[]>([]);
  const [forms,setForms]=useState<Record<string,RatingForm>>({});
  const [busy,setBusy]=useState<string|null>(null);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const attached=useRef(false);

  const load=async()=>{setError("");try{const [r,c]=await Promise.all([fetchAdminMatchRequests(),fetchSuccessfulMatrimonialConnections()]);setRequests(r);setConnections(c);}catch(e:any){setError(e?.message||"Successful connection records could not be loaded.");}};

  useEffect(()=>{if(!active||typeof document==="undefined")return;const attach=()=>{const main=document.querySelector("main");if(!main)return false;let node=document.getElementById("matrimonial-success-center");if(!node){node=document.createElement("div");node.id="matrimonial-success-center";node.style.marginTop="16px";main.appendChild(node);}setHost(node);attached.current=true;return true;};if(!attach()){const obs=new MutationObserver(()=>{if(attach())obs.disconnect()});obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();}},[active]);
  useEffect(()=>{if(active)void load();},[active]);
  if(!active||!host)return null;
  const successfulIds=new Set(connections.map(c=>c.requestId));
  const ready=requests.filter(r=>r.status==="accepted"&&!successfulIds.has(r.id));

  const setForm=(id:string,key:keyof RatingForm,value:string)=>setForms(old=>({...old,[id]:{...(old[id]||blankRating()),[key]:value}}));
  const finish=async(r:any)=>{const f=forms[r.id]||blankRating();const manager=Number(f.manager);if(!Number.isInteger(manager)||manager<1||manager>5){setError("Manager outcome rating from 1 to 5 is required.");return;}setBusy(r.id);setError("");setMessage("");try{await completeMatrimonialConnection({requestId:r.id,requesterRating:f.requester?Number(f.requester):null,targetRating:f.target?Number(f.target):null,managerRating:manager,successNote:f.note.trim()});setMessage("Successful connection recorded. Both candidate profiles were removed from active matching and the case was closed.");await load();}catch(e:any){setError(e?.message||"Connection could not be completed.");}finally{setBusy(null)}};

  return createPortal(<section style={{background:"white",border:"1px solid #e8e3da",borderRadius:12,padding:17,boxShadow:"0 3px 14px rgba(0,0,0,.04)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",flexWrap:"wrap"}}><div><h2 style={{margin:0,color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:18}}>Successful Connections & Case Closure</h2><p style={{margin:"4px 0 0",fontSize:10,color:"#6f7972",lineHeight:1.5}}>After mutual consent and a real-world successful connection, record ratings here. The system then closes both candidate files and removes them from active matching.</p><p lang="ur" dir="rtl" style={{margin:"3px 0 0",fontSize:9,color:"#6f7972"}}>کامیاب رابطہ مکمل ہونے پر ریٹنگ درج کریں۔ دونوں پروفائل خودکار طور پر ایکٹو میچنگ سے بند ہو جائیں گے۔</p></div><button onClick={()=>void load()} style={button}><RefreshCw size={12}/>Refresh</button></div>
    {error&&<div style={{background:"#fee2e2",color:"#b91c1c",padding:9,borderRadius:7,fontSize:10,marginTop:11}}>{error}</div>}{message&&<div style={{background:"#dcfce7",color:"#166534",padding:9,borderRadius:7,fontSize:10,marginTop:11}}>{message}</div>}

    <div style={{marginTop:15}}><strong style={{color:GREEN,fontSize:11}}>Accepted cases ready for closure ({ready.length})</strong>{ready.length?<div style={{display:"grid",gap:10,marginTop:8}}>{ready.map(r=>{const f=forms[r.id]||blankRating();return <article key={r.id} style={{border:"1px solid #e7e2d8",borderRadius:9,padding:12}}><div style={{display:"flex",justifyContent:"space-between",gap:8,flexWrap:"wrap"}}><div><b style={{color:GREEN}}>{r.requester?.profileCode||r.requesterProfileId} → {r.target?.profileCode||r.targetProfileId}</b><span style={{display:"block",fontSize:9,color:"#777",marginTop:3}}>{r.mutualScore??0}% mutual compatibility · consent accepted</span></div><span style={{background:"#dcfce7",color:"#166534",borderRadius:16,padding:"4px 7px",fontSize:9,fontWeight:800}}>Ready to finalize</span></div><div className="success-rating-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:10}}><Rating label="Requester Rating" value={f.requester} onChange={v=>setForm(r.id,"requester",v)} optional/><Rating label="Target Rating" value={f.target} onChange={v=>setForm(r.id,"target",v)} optional/><Rating label="Manager Outcome *" value={f.manager} onChange={v=>setForm(r.id,"manager",v)}/></div><textarea value={f.note} onChange={e=>setForm(r.id,"note",e.target.value)} placeholder="Success / closure note (optional)" style={{width:"100%",boxSizing:"border-box",marginTop:8,border:"1px solid #d8dfda",borderRadius:7,padding:9,fontSize:11,minHeight:62}}/><button disabled={busy===r.id} onClick={()=>void finish(r)} style={{...primary,marginTop:8}}><BadgeCheck size={13}/>{busy===r.id?"Closing case...":"Mark Successful & Close Both Profiles"}</button></article>})}</div>:<div style={{marginTop:8,background:"#faf9f6",borderRadius:8,padding:12,fontSize:10,color:"#888"}}>No accepted case is waiting for successful-connection closure.</div>}</div>

    <div style={{marginTop:18,borderTop:"1px solid #eee",paddingTop:14}}><strong style={{color:GREEN,fontSize:11}}>Successful Connections ({connections.length})</strong>{connections.length?<div style={{display:"grid",gap:8,marginTop:8}}>{connections.map(c=><div key={c.id} style={{display:"grid",gridTemplateColumns:"1.5fr .8fr .8fr 1.3fr",gap:8,alignItems:"center",border:"1px solid #edf0ee",borderRadius:8,padding:9,fontSize:9}}><div><b style={{color:GREEN}}>{c.requesterCode} ↔ {c.targetCode}</b><span style={{display:"block",color:"#777",marginTop:2}}>{c.requesterName} / {c.targetName}</span></div><div><span style={{color:"#888"}}>Match</span><b style={{display:"block"}}>{c.mutualScore??"-"}%</b></div><div><span style={{color:"#888"}}>Rating</span><b style={{display:"block"}}>{c.managerRating??"-"}/5</b></div><div><span style={{color:"#888"}}>Closed</span><b style={{display:"block"}}>{new Date(c.closedAt||c.connectedAt).toLocaleDateString()}</b></div></div>)}</div>:null}</div>
    <style>{`@media(max-width:720px){.success-rating-grid{grid-template-columns:1fr!important}}`}</style>
  </section>,host);
}

function Rating({label,value,onChange,optional=false}:{label:string;value:string;onChange:(v:string)=>void;optional?:boolean}){return <label style={{fontSize:9,fontWeight:800,color:GREEN}}>{label}{optional&&<span style={{color:"#999",fontWeight:500}}> (optional)</span>}<select value={value} onChange={e=>onChange(e.target.value)} style={{display:"block",width:"100%",marginTop:4,border:"1px solid #d8dfda",borderRadius:7,padding:8,fontSize:11,background:"white"}}><option value="">Not recorded</option>{[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5 {n===5?"Excellent":n===4?"Good":n===3?"Satisfactory":n===2?"Weak":"Poor"}</option>)}</select></label>}
const button:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:4,border:`1px solid ${GOLD}`,background:"white",color:GREEN,borderRadius:7,padding:"7px 9px",fontSize:9,fontWeight:800,cursor:"pointer"};const primary:React.CSSProperties={...button,background:GREEN,color:"white",border:`1px solid ${GREEN}`};
