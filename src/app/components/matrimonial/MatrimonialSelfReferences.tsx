import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BadgeCheck, Mail, Plus, Trash2, UsersRound } from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { MatrimonialProfile, MatrimonialReference } from "../../lib/matrimonialStore";

const GREEN="#1a4d2e",GOLD="#c8a04a";
const blankRef=():MatrimonialReference=>({name:"",profession:"",phone:"",city:"",address:""});
const phoneOk=(v:string)=>v.replace(/\D/g,"").length>=10;
const complete=(r:MatrimonialReference)=>Boolean(r.name.trim()&&r.profession.trim()&&phoneOk(r.phone)&&(r.city.trim()||r.address.trim()));

export function MatrimonialSelfReferences(){
  const path=typeof window!=="undefined"?window.location.pathname:"";
  const active=path==="/matrimonial/new";
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [email,setEmail]=useState("");
  const [refs,setRefs]=useState<MatrimonialReference[]>([blankRef(),blankRef()]);
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [syncing,setSyncing]=useState(false);
  const loaded=useRef(false);
  const valid=useMemo(()=>Boolean(email)&&refs.length>=2&&refs.every(complete),[email,refs]);

  useEffect(()=>{if(!active||typeof document==="undefined")return;const attach=()=>{const form=document.querySelector<HTMLFormElement>("form");if(!form)return false;let node=document.getElementById("self-matrimonial-references");if(!node){node=document.createElement("div");node.id="self-matrimonial-references";form.insertBefore(node,form.firstChild);}setHost(node);return true;};if(attach())return;const obs=new MutationObserver(()=>{if(attach())obs.disconnect()});obs.observe(document.body,{childList:true,subtree:true});return()=>obs.disconnect();},[active]);

  useEffect(()=>{if(!active||!host||loaded.current)return;loaded.current=true;const profileId=new URLSearchParams(window.location.search).get("profileId")||"";apiClient<any>(`/matrimonial-lifecycle?action=self_meta${profileId?`&profileId=${encodeURIComponent(profileId)}`:""}`).then(data=>{setEmail(data.email||"");const saved=Array.isArray(data.references)?data.references:[];if(saved.length>=2)setRefs(saved.map((r:any)=>({...blankRef(),...r})));}).catch((e:any)=>{setError(e?.message||"Could not load verified account email.");});},[active,host]);

  useEffect(()=>{if(!active||!host)return;const form=document.querySelector<HTMLFormElement>("form");if(!form)return;const guard=(event:Event)=>{if(valid){setError("");return;}event.preventDefault();event.stopImmediatePropagation();setError(!email?"Verified candidate email is not available. Please sign in again.":"Please complete at least two references: name, profession, mobile and city/address. کم از کم دو مکمل حوالہ جات لازمی ہیں۔");document.getElementById("self-matrimonial-references")?.scrollIntoView({behavior:"smooth",block:"center"});};form.addEventListener("submit",guard,true);return()=>form.removeEventListener("submit",guard,true);},[active,host,valid,email]);

  useEffect(()=>{if(!active)return;const saved=async(event:Event)=>{const detail=(event as CustomEvent<{profile:MatrimonialProfile;source:string}>).detail;if(detail?.source!=="self"||!detail.profile?.id)return;setSyncing(true);setError("");setMessage("Verifying references and preparing your confidential PDF...");try{const result=await apiClient<any>("/matrimonial-lifecycle",{method:"POST",body:JSON.stringify({action:"self_sync_profile",profileId:detail.profile.id,references:refs})});setRefs((result.references||refs).map((r:any)=>({...blankRef(),...r})));const memberCount=(result.references||[]).filter((r:any)=>r.isMember).length;const mail=result.packet?.sent?"Official A4 PDF emailed to your verified email.":`Profile saved; email delivery pending (${result.packet?.reason||"mail service unavailable"}).`;const matches=result.matching?.notifications?` ${result.matching.notifications} compatibility notification email(s) sent.`:"";setMessage(`${mail} ${memberCount}/${(result.references||[]).length} reference(s) matched with approved Anjuman members.${matches}`);}catch(e:any){setError(e?.message||"Reference verification could not be completed.");}finally{setSyncing(false)}};window.addEventListener("araian-matrimonial-profile-saved",saved as EventListener);return()=>window.removeEventListener("araian-matrimonial-profile-saved",saved as EventListener);},[active,refs]);

  if(!active||!host)return null;
  const update=(i:number,k:keyof MatrimonialReference,v:string)=>setRefs(old=>old.map((r,n)=>n===i?{...r,[k]:v,isMember:undefined,memberNo:undefined,memberName:undefined}:r));
  const add=()=>{if(refs.length<8)setRefs(old=>[...old,blankRef()])};
  const remove=(i:number)=>{if(refs.length>2)setRefs(old=>old.filter((_,n)=>n!==i))};

  return createPortal(<section style={{marginBottom:18,border:"1px solid #dce7df",borderRadius:12,background:"#fbfdfb",padding:17}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><div><h2 style={{margin:0,color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:18}}>Verified Email & References</h2><p style={{margin:"5px 0 0",fontSize:11,color:"#66736b"}}>Your verified sign-in email and at least two references are part of the confidential verification record.</p><p lang="ur" dir="rtl" style={{margin:"3px 0 0",fontSize:10,color:"#66736b"}}>کم از کم دو حوالہ جات لازمی ہیں۔ ممبر ریفرنس کی تصدیق نام اور موبائل سے خودکار طور پر کی جائے گی۔</p></div><span style={{background:valid?"#dcfce7":"#fff7ed",color:valid?"#166534":"#9a5b12",padding:"5px 8px",borderRadius:18,fontSize:9,fontWeight:800}}>{valid?"Verification data complete":"Complete references"}</span></div>
    {error&&<div style={{marginTop:10,padding:9,borderRadius:7,background:"#fee2e2",color:"#b91c1c",fontSize:10}}>{error}</div>}{message&&<div style={{marginTop:10,padding:9,borderRadius:7,background:"#eef6ff",color:"#315f7d",fontSize:10}}>{syncing?"Processing: ":""}{message}</div>}
    <label style={{display:"block",marginTop:13,color:GREEN,fontSize:10,fontWeight:800}}>Verified Candidate Email</label><div style={{position:"relative",marginTop:4}}><Mail size={14} color="#718078" style={{position:"absolute",left:10,top:11}}/><input value={email} readOnly style={{...input,paddingLeft:32,background:"#f6f8f7"}}/></div><small style={{display:"block",fontSize:9,color:"#7b857f",marginTop:4}}>This is the email used for secure sign-in, PDF delivery and privacy-safe match notifications.</small>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginTop:16}}><strong style={{color:GREEN,fontSize:11}}><UsersRound size={14} style={{verticalAlign:"-3px",marginRight:4}}/>References</strong><button type="button" onClick={add} disabled={refs.length>=8} style={btn}><Plus size={12}/>Add Reference</button></div>
    <div style={{display:"grid",gap:9,marginTop:9}}>{refs.map((r,i)=><div key={i} style={{background:"white",border:"1px solid #e4e9e6",borderRadius:9,padding:11}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b style={{color:GREEN,fontSize:10}}>Reference {i+1}</b><div style={{display:"flex",gap:6,alignItems:"center"}}>{r.isMember&&<span style={{display:"inline-flex",alignItems:"center",gap:3,background:"#dcfce7",color:"#166534",padding:"3px 6px",borderRadius:14,fontSize:8,fontWeight:800}}><BadgeCheck size={10}/>Anjuman Member {r.memberNo||""}</span>}{refs.length>2&&<button type="button" onClick={()=>remove(i)} style={{...btn,color:"#b91c1c"}}><Trash2 size={11}/>Remove</button>}</div></div><div className="self-ref-grid" style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7,marginTop:8}}><F label="Full Name *"><input value={r.name} onChange={e=>update(i,"name",e.target.value)} style={input}/></F><F label="Profession / Occupation *"><input value={r.profession} onChange={e=>update(i,"profession",e.target.value)} style={input}/></F><F label="Mobile Number *"><input value={r.phone} onChange={e=>update(i,"phone",e.target.value)} style={input}/></F><F label="City *"><input value={r.city} onChange={e=>update(i,"city",e.target.value)} style={input}/></F><div style={{gridColumn:"1 / -1"}}><F label="Address / Area"><input value={r.address} onChange={e=>update(i,"address",e.target.value)} style={input}/></F></div></div></div>)}</div>
    <style>{`@media(max-width:700px){.self-ref-grid{grid-template-columns:1fr!important}}`}</style>
  </section>,host);
}
function F({label,children}:{label:string;children:React.ReactNode}){return <label style={{fontSize:9,color:GREEN,fontWeight:700}}>{label}<div style={{marginTop:3}}>{children}</div></label>}
const input:React.CSSProperties={width:"100%",boxSizing:"border-box",border:"1px solid #d7dfda",borderRadius:7,padding:"9px 10px",fontSize:12,minHeight:38,background:"white"};const btn:React.CSSProperties={display:"inline-flex",alignItems:"center",gap:4,border:`1px solid ${GOLD}`,background:"white",color:GREEN,borderRadius:7,padding:"6px 8px",fontSize:9,fontWeight:800,cursor:"pointer"};
