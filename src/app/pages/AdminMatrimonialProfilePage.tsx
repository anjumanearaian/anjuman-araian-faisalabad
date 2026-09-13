import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router";
import { ArrowLeft, CheckCircle, FileCheck2, Loader2, Save, ShieldCheck, Upload } from "lucide-react";
import { useAdmin } from "../context/AdminContext";
import { createMatrimonialAdmin, fetchAllMatrimonials, MatrimonialProfile, updateMatrimonial } from "../lib/matrimonialStore";
import { uploadFile } from "../lib/upload";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { BehaviorQuestionnaire, ReadinessPanel, TimelineField } from "../components/matrimonial/MatrimonialSmartFields";
import { citiesForProvince, pakistanCitiesByProvince } from "../lib/pakistanLocations";
import {
  CONTACT_PRIVACY_OPTIONS, EDUCATION_OPTIONS, EMPLOYMENT_TYPE_OPTIONS, FAMILY_SETUP_OPTIONS, IMPORTANCE_OPTIONS, INCOME_BANDS,
  MARITAL_STATUS_OPTIONS, PHOTO_PRIVACY_OPTIONS, PROFESSION_OPTIONS, RESIDENCE_STATUS_OPTIONS, SECT_OPTIONS,
} from "../lib/matrimonialOptions";
import {
  BehaviorAnswers, BehaviorKey, TimelineFlexibility, TimelineUnit, blankBehaviorAnswers, calculateMatrimonialReadiness,
  normalizeTimelineDays, parseLegacyTimeline, timelineLabel,
} from "../lib/matrimonialCompatibility";

const GREEN = "#1a4d2e", GOLD = "#c8a04a";
const PROVINCES = Object.keys(pakistanCitiesByProvince);
const COUNTRIES = ["Pakistan","United Arab Emirates","Saudi Arabia","Qatar","Oman","Bahrain","Kuwait","United Kingdom","United States","Canada","Australia","Germany","Other"];
const RELATIONS = ["Self","Son","Daughter","Brother","Sister","Other family member"];

type Layer = { primary:string; secondary:string; acceptable:string; importance:string };
type State = {
  name:string; relationToCandidate:string; candidateConsent:boolean; gender:"male"|"female"; age:string; dateOfBirth:string; heightCm:string; maritalStatus:string;
  country:string; province:string; city:string; nationality:string; residenceStatus:string; education:string; profession:string; employmentType:string; employerType:string; incomeBand:string; currency:string;
  contact:string; familySetup:string; sect:string; languages:string; hobbies:string; familyNotes:string; relocation:string;
  timelineValue:string; timelineUnit:TimelineUnit; timelineFlexibility:TimelineFlexibility; behaviorAnswers:BehaviorAnswers;
  photoUrl:string; additionalPhotos:string[]; paymentProofUrl:string; status:"pending"|"approved"|"rejected"; paymentStatus:string; showOnPortal:boolean; isFeatured:boolean; adminNote:string; verificationStatus:string;
  ageMin:string; ageMax:string; ageImportance:string; heightMin:string; heightMax:string; heightImportance:string; educationPref:Layer; professionPref:Layer; countryPref:Layer; cityPref:Layer; maritalPref:Layer; familyPref:Layer; residencePref:Layer; relocationPref:Layer; incomeMinimum:string; incomeImportance:string; partnerNotes:string;
  photoVisibility:string; contactVisibility:string; broadLocation:boolean; showHeight:boolean;
};

const layer = ():Layer => ({ primary:"", secondary:"", acceptable:"", importance:"preferred" });
const blank = ():State => ({
  name:"", relationToCandidate:"Self", candidateConsent:false, gender:"male", age:"", dateOfBirth:"", heightCm:"", maritalStatus:"Never Married",
  country:"Pakistan", province:"Punjab", city:"Faisalabad", nationality:"Pakistani", residenceStatus:"Pakistan Resident", education:"", profession:"", employmentType:"", employerType:"", incomeBand:"Prefer not to say", currency:"PKR",
  contact:"", familySetup:"", sect:"Prefer not to specify", languages:"", hobbies:"", familyNotes:"", relocation:"",
  timelineValue:"", timelineUnit:"months", timelineFlexibility:"flexible", behaviorAnswers:blankBehaviorAnswers(),
  photoUrl:"", additionalPhotos:[], paymentProofUrl:"", status:"pending", paymentStatus:"pending", showOnPortal:false, isFeatured:false, adminNote:"Entered by matrimonial manager/admin.", verificationStatus:"unverified",
  ageMin:"", ageMax:"", ageImportance:"must", heightMin:"", heightMax:"", heightImportance:"nice to have", educationPref:layer(), professionPref:layer(), countryPref:layer(), cityPref:layer(), maritalPref:layer(), familyPref:layer(), residencePref:layer(), relocationPref:layer(), incomeMinimum:"", incomeImportance:"preferred", partnerNotes:"",
  photoVisibility:"mutual_interest", contactVisibility:"mutual_interest", broadLocation:true, showHeight:true,
});

const split = (v:string) => v.split(",").map((x) => x.trim()).filter(Boolean);
const layerObj = (v:Layer) => ({ primary:split(v.primary), secondary:split(v.secondary), acceptable:split(v.acceptable), importance:v.importance });
const fromLayer = (x:any):Layer => ({ primary:Array.isArray(x?.primary)?x.primary.join(", "):"", secondary:Array.isArray(x?.secondary)?x.secondary.join(", "):"", acceptable:Array.isArray(x?.acceptable)?x.acceptable.join(", "):"", importance:x?.importance||"preferred" });

function fromProfile(p:MatrimonialProfile):State {
  const d = p.profileData || {}, q = p.preferenceData || {}, v = p.privacyData || {};
  const legacyTimeline = parseLegacyTimeline(d.marriageTimeline);
  return {
    ...blank(),
    name:p.name||"", relationToCandidate:p.relationToCandidate||"Self", candidateConsent:Boolean(p.candidateConsent), gender:(p.gender as any)||"male", age:p.age||"", dateOfBirth:p.dateOfBirth||"", heightCm:p.heightCm?String(p.heightCm):"", maritalStatus:p.maritalStatus||d.maritalStatus||"Never Married",
    country:p.country||"Pakistan", province:p.province||"", city:p.city||"", nationality:p.nationality||d.nationality||"", residenceStatus:p.residenceStatus||d.residenceStatus||"", education:p.education||"", profession:p.profession||"", employmentType:p.employmentType||d.employmentType||"", employerType:p.employerType||d.employerType||"", incomeBand:p.incomeBand||d.incomeBand||"Prefer not to say", currency:p.currency||"PKR",
    contact:p.contact||"", familySetup:d.familySetup||"", sect:d.sect||"Prefer not to specify", languages:Array.isArray(d.languages)?d.languages.join(", "):"", hobbies:d.hobbies||"", familyNotes:d.familyNotes||p.familyBackground||"", relocation:d.relocation||"",
    timelineValue:d.marriageTimelineValue?String(d.marriageTimelineValue):legacyTimeline.value, timelineUnit:(d.marriageTimelineUnit||legacyTimeline.unit) as TimelineUnit, timelineFlexibility:(d.marriageTimelineFlexibility||legacyTimeline.flexibility) as TimelineFlexibility, behaviorAnswers:{...blankBehaviorAnswers(),...(d.behavior||{})},
    photoUrl:p.photoUrl||"", additionalPhotos:p.additionalPhotos||[], paymentProofUrl:p.paymentProofUrl||"", status:(p.status as any)||"pending", paymentStatus:p.paymentStatus||"pending", showOnPortal:Boolean(p.showOnPortal), isFeatured:Boolean(p.isFeatured), adminNote:p.adminNote||"", verificationStatus:p.verificationStatus||"unverified",
    ageMin:q.age?.min?String(q.age.min):"", ageMax:q.age?.max?String(q.age.max):"", ageImportance:q.age?.importance||"must", heightMin:q.height?.min?String(q.height.min):"", heightMax:q.height?.max?String(q.height.max):"", heightImportance:q.height?.importance||"nice to have",
    educationPref:fromLayer(q.education), professionPref:fromLayer(q.profession), countryPref:fromLayer(q.country), cityPref:fromLayer(q.city), maritalPref:fromLayer(q.maritalStatus), familyPref:fromLayer(q.familySetup), residencePref:fromLayer(q.residenceStatus), relocationPref:fromLayer(q.relocation), incomeMinimum:q.income?.minimum?String(q.income.minimum):"", incomeImportance:q.income?.importance||"preferred", partnerNotes:q.notes||"",
    photoVisibility:v.photoVisibility||"mutual_interest", contactVisibility:v.contactVisibility||"mutual_interest", broadLocation:v.broadLocation!==false, showHeight:v.showHeight!==false,
  };
}

export function AdminMatrimonialProfilePage() {
  const { isAdmin, role } = useAdmin();
  const allowed = ["admin","super_admin","welfare_manager","matrimonial_manager"].includes(String(role||""));
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [form,setForm] = useState<State>(()=>blank());
  const [loading,setLoading] = useState(editing);
  const [saving,setSaving] = useState(false);
  const [uploading,setUploading] = useState<Record<string,boolean>>({});
  const [error,setError] = useState("");
  const [success,setSuccess] = useState("");
  const cities = useMemo(() => form.country === "Pakistan" ? citiesForProvince(form.province) : [], [form.country, form.province]);
  const readiness = useMemo(() => calculateMatrimonialReadiness(form as any), [form]);

  useEffect(() => {
    if (!editing || !id || !isAdmin) return;
    (async () => {
      try {
        const all = await fetchAllMatrimonials(1,100);
        const p = all.data.find((x) => x.id === id);
        if (!p) throw new Error("Candidate profile not found.");
        setForm(fromProfile(p));
      } catch (e:any) { setError(e?.message || "Could not load candidate profile."); }
      finally { setLoading(false); }
    })();
  }, [id,isAdmin,editing]);

  if (!isAdmin || !allowed) return <Navigate to="/admin" replace/>;

  const set = (k:keyof State,v:any) => { setForm((o) => ({...o,[k]:v})); setError(""); };
  const setLayer = (k:keyof Pick<State,"educationPref"|"professionPref"|"countryPref"|"cityPref"|"maritalPref"|"familyPref"|"residencePref"|"relocationPref">,c:keyof Layer,v:string) => setForm((o) => ({...o,[k]:{...(o[k] as Layer),[c]:v}}));
  const setBehavior = (key:BehaviorKey,value:number|undefined) => setForm((o) => ({...o,behaviorAnswers:{...o.behaviorAnswers,[key]:value}}));
  const upload = (k:"photoUrl"|"paymentProofUrl") => async(e:React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading((o)=>({...o,[k]:true}));
    try { set(k, await uploadFile(f,k==="photoUrl"?"matrimonial-photo":"matrimonial-payment-proof")); }
    catch (x:any) { setError(x?.message||"Upload failed."); }
    finally { setUploading((o)=>({...o,[k]:false})); e.target.value=""; }
  };

  const save = async(e:React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.age || !form.city.trim() || !form.education || !form.profession || !form.contact.trim()) { setError("Name, age, city, education, profession and private contact are required."); return; }
    if (form.status === "approved" && !form.candidateConsent) { setError("Record candidate/guardian consent before approval."); return; }
    if (form.status === "approved" && !form.paymentProofUrl) { setError("An approved profile needs a payment receipt/proof so Accounts can verify the fee."); return; }
    if (form.showOnPortal && form.status !== "approved") { setError("Approve the profile before enabling matching visibility."); return; }
    const paymentStatus = form.status === "approved" ? (form.paymentStatus === "verified" ? "verified" : "received") : form.paymentProofUrl ? (form.paymentStatus === "verified" ? "verified" : "submitted") : "pending";
    const timelineDays = normalizeTimelineDays(form.timelineValue,form.timelineUnit);
    const profileData = {
      familySetup:form.familySetup, sect:form.sect, languages:split(form.languages), hobbies:form.hobbies, familyNotes:form.familyNotes, relocation:form.relocation,
      marriageTimeline:timelineLabel(form.timelineValue,form.timelineUnit,form.timelineFlexibility), marriageTimelineValue:Number(form.timelineValue||0)||undefined, marriageTimelineUnit:form.timelineUnit, marriageTimelineDays:timelineDays||undefined, marriageTimelineFlexibility:form.timelineFlexibility,
      behavior:form.behaviorAnswers,
      employmentType:form.employmentType, employerType:form.employerType, incomeBand:form.incomeBand, nationality:form.nationality, residenceStatus:form.residenceStatus,
    };
    const preferenceData = {
      age:{min:Number(form.ageMin||0)||undefined,max:Number(form.ageMax||0)||undefined,importance:form.ageImportance}, height:{min:Number(form.heightMin||0)||undefined,max:Number(form.heightMax||0)||undefined,importance:form.heightImportance},
      education:layerObj(form.educationPref), profession:layerObj(form.professionPref), country:layerObj(form.countryPref), city:layerObj(form.cityPref), maritalStatus:layerObj(form.maritalPref), familySetup:layerObj(form.familyPref), residenceStatus:layerObj(form.residencePref), relocation:layerObj(form.relocationPref),
      income:{minimum:Number(form.incomeMinimum||0)||undefined,importance:form.incomeImportance}, notes:form.partnerNotes,
    };
    const payload:any = {
      name:form.name.trim(), relationToCandidate:form.relationToCandidate, candidateConsent:form.candidateConsent, gender:form.gender, age:form.age, dateOfBirth:form.dateOfBirth||undefined, heightCm:form.heightCm?Number(form.heightCm):null, maritalStatus:form.maritalStatus,
      country:form.country, province:form.province, city:form.city, nationality:form.nationality, residenceStatus:form.residenceStatus, education:form.education, profession:form.profession, employmentType:form.employmentType, employerType:form.employerType, incomeBand:form.incomeBand, currency:form.currency, contact:form.contact.trim(),
      familyBackground:[`Family setup: ${form.familySetup||"Not specified"}`,form.familyNotes].filter(Boolean).join(" | "), requirements:[`Age: ${form.ageMin||"Any"}-${form.ageMax||"Any"}`,form.partnerNotes].filter(Boolean).join(" | "),
      profileData, preferenceData, privacyData:{profileVisibility:"matches_only",photoVisibility:form.photoVisibility,contactVisibility:form.contactVisibility,broadLocation:form.broadLocation,showHeight:form.showHeight},
      photoUrl:form.photoUrl||undefined, paymentProofUrl:form.paymentProofUrl||undefined, additionalPhotos:form.additionalPhotos, status:form.status, paymentStatus, showOnPortal:form.showOnPortal, isFeatured:form.isFeatured, adminNote:form.adminNote, verificationStatus:form.verificationStatus, applicationSource:"admin_manual",
    };
    setSaving(true); setError("");
    try {
      if (editing && id) { await updateMatrimonial(id,payload); setSuccess("Candidate profile updated and audit trail recorded."); }
      else { const created = await createMatrimonialAdmin(payload); setSuccess(`Candidate profile created: ${created.profileCode}`); }
      sessionStorage.removeItem("araian_admin_matrimonial_draft");
      window.scrollTo({top:0,behavior:"smooth"});
    } catch (x:any) { setError(x?.message||"Candidate profile could not be saved."); window.scrollTo({top:0,behavior:"smooth"}); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#f8f5ef",color:"#666"}}><Loader2 className="spin"/> Loading candidate profile...</div>;

  return <div style={{minHeight:"100vh",background:"#f8f5ef",padding:"26px 20px 65px",fontFamily:"Lato, sans-serif"}}><div style={{maxWidth:980,margin:"0 auto"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap",marginBottom:18}}><div><h1 style={{color:GREEN,fontFamily:"'Playfair Display', serif",margin:0}}>{editing?"Edit Candidate Profile":"Add Client / Candidate"}</h1><p style={{margin:"5px 0 0",color:"#666",fontSize:12}}>Private manager form with structured matching, behavior and consent controls.</p></div><Link to="/admin/matrimonial" style={{color:GREEN,textDecoration:"none",fontWeight:800,fontSize:12,display:"inline-flex",gap:5,alignItems:"center"}}><ArrowLeft size={14}/>Matrimonial Control Center</Link></div>
    <ReadinessPanel readiness={readiness} title="Candidate Profile & Match Readiness"/>
    {error&&<div style={errorBox}>{error}</div>}{success&&<div style={successBox}><CheckCircle size={14} style={{verticalAlign:"-2px",marginRight:5}}/>{success}<div style={{marginTop:8}}><button onClick={()=>navigate("/admin/matrimonial")} style={secondary}>Return to Registry</button></div></div>}
    <form onSubmit={save} style={card}>
      <Section title="Candidate & Consent"/><div className="admin-mat-grid" style={grid}>
        <F label="Managed For"><select style={input} value={form.relationToCandidate} onChange={e=>set("relationToCandidate",e.target.value)}>{RELATIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Candidate Name *"><input style={input} value={form.name} onChange={e=>set("name",e.target.value)}/></F>
        <F label="Gender"><select style={input} value={form.gender} onChange={e=>set("gender",e.target.value)}><option value="male">Male</option><option value="female">Female</option></select></F>
        <F label="Age *"><input type="number" min={18} max={80} style={input} value={form.age} onChange={e=>set("age",e.target.value)}/></F>
        <F label="Date of Birth (optional)"><input type="date" style={input} value={form.dateOfBirth} onChange={e=>set("dateOfBirth",e.target.value)}/></F>
        <F label="Height cm"><input type="number" min={120} max={230} style={input} value={form.heightCm} onChange={e=>set("heightCm",e.target.value)}/></F>
        <F label="Marital Status"><select style={input} value={form.maritalStatus} onChange={e=>set("maritalStatus",e.target.value)}>{MARITAL_STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Private Contact *"><input style={input} value={form.contact} onChange={e=>set("contact",e.target.value)}/></F>
        <label style={checkBox}><input type="checkbox" checked={form.candidateConsent} onChange={e=>set("candidateConsent",e.target.checked)}/><span><strong>Candidate/guardian consent recorded</strong><br/><small>Required before approval or matching visibility.</small></span></label>
      </div>

      <Section title="Location, Education & Career"/><div className="admin-mat-grid" style={grid}>
        <F label="Country"><select style={input} value={form.country} onChange={e=>set("country",e.target.value)}>{COUNTRIES.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Province / State">{form.country==="Pakistan"?<select style={input} value={form.province} onChange={e=>set("province",e.target.value)}>{PROVINCES.map(x=><option key={x}>{x}</option>)}</select>:<input style={input} value={form.province} onChange={e=>set("province",e.target.value)}/>}</F>
        <F label="City *">{form.country==="Pakistan"&&cities.length?<select style={input} value={form.city} onChange={e=>set("city",e.target.value)}>{cities.map(x=><option key={x}>{x}</option>)}</select>:<input style={input} value={form.city} onChange={e=>set("city",e.target.value)}/>}</F>
        <F label="Nationality"><input style={input} value={form.nationality} onChange={e=>set("nationality",e.target.value)}/></F>
        <F label="Residence / Visa"><select style={input} value={form.residenceStatus} onChange={e=>set("residenceStatus",e.target.value)}><option value="">Select</option>{RESIDENCE_STATUS_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Education *"><select style={input} value={form.education} onChange={e=>set("education",e.target.value)}><option value="">Select</option>{EDUCATION_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Profession *"><select style={input} value={form.profession} onChange={e=>set("profession",e.target.value)}><option value="">Select</option>{PROFESSION_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Employment Type"><select style={input} value={form.employmentType} onChange={e=>set("employmentType",e.target.value)}><option value="">Select</option>{EMPLOYMENT_TYPE_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Employer Type"><input style={input} placeholder="Government / Private / Own business" value={form.employerType} onChange={e=>set("employerType",e.target.value)}/></F>
        <F label="Income Band"><select style={input} value={form.incomeBand} onChange={e=>set("incomeBand",e.target.value)}>{INCOME_BANDS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Currency"><select style={input} value={form.currency} onChange={e=>set("currency",e.target.value)}>{["PKR","AED","SAR","QAR","OMR","BHD","KWD","GBP","USD","CAD","AUD","EUR"].map(x=><option key={x}>{x}</option>)}</select></F>
      </div>

      <Section title="Family, Lifestyle & Compatibility"/><div className="admin-mat-grid" style={grid}>
        <F label="Family Setup"><select style={input} value={form.familySetup} onChange={e=>set("familySetup",e.target.value)}><option value="">Select</option>{FAMILY_SETUP_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Sect (optional)"><select style={input} value={form.sect} onChange={e=>set("sect",e.target.value)}>{SECT_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Languages"><input style={input} placeholder="Urdu, Punjabi, English" value={form.languages} onChange={e=>set("languages",e.target.value)}/></F>
        <F label="Hobbies"><input style={input} placeholder="Reading, sports, travel..." value={form.hobbies} onChange={e=>set("hobbies",e.target.value)}/></F>
        <TimelineField value={form.timelineValue} unit={form.timelineUnit} flexibility={form.timelineFlexibility} onValue={v=>set("timelineValue",v)} onUnit={v=>set("timelineUnit",v)} onFlexibility={v=>set("timelineFlexibility",v)}/>
        <F label="Relocation"><input style={input} placeholder="Within Pakistan / Gulf / Not open..." value={form.relocation} onChange={e=>set("relocation",e.target.value)}/></F>
        <div style={{gridColumn:"span 2"}}><F label="Family Notes"><textarea rows={3} style={input} value={form.familyNotes} onChange={e=>set("familyNotes",e.target.value)}/></F></div>
      </div>
      <div style={{marginTop:10}}><BehaviorQuestionnaire answers={form.behaviorAnswers} onChange={setBehavior} compact/></div>

      <Section title="Layered Partner Preferences"/><div className="admin-mat-grid" style={grid}>
        <Range title="Age" min={form.ageMin} max={form.ageMax} importance={form.ageImportance} onMin={(v:string)=>set("ageMin",v)} onMax={(v:string)=>set("ageMax",v)} onImp={(v:string)=>set("ageImportance",v)}/>
        <Range title="Height cm" min={form.heightMin} max={form.heightMax} importance={form.heightImportance} onMin={(v:string)=>set("heightMin",v)} onMax={(v:string)=>set("heightMax",v)} onImp={(v:string)=>set("heightImportance",v)}/>
      </div>
      <LayerField title="Education" value={form.educationPref} onChange={(c,v)=>setLayer("educationPref",c,v)}/><LayerField title="Profession" value={form.professionPref} onChange={(c,v)=>setLayer("professionPref",c,v)}/><LayerField title="Country" value={form.countryPref} onChange={(c,v)=>setLayer("countryPref",c,v)}/><LayerField title="City" value={form.cityPref} onChange={(c,v)=>setLayer("cityPref",c,v)}/>
      <details style={details}><summary style={summary}>More match criteria · مزید میچنگ شرائط</summary><LayerField title="Marital Status" value={form.maritalPref} onChange={(c,v)=>setLayer("maritalPref",c,v)}/><LayerField title="Family Setup" value={form.familyPref} onChange={(c,v)=>setLayer("familyPref",c,v)}/><LayerField title="Residence" value={form.residencePref} onChange={(c,v)=>setLayer("residencePref",c,v)}/><LayerField title="Relocation" value={form.relocationPref} onChange={(c,v)=>setLayer("relocationPref",c,v)}/><div className="admin-mat-grid" style={grid}><F label="Minimum Monthly Income"><input style={input} value={form.incomeMinimum} onChange={e=>set("incomeMinimum",e.target.value.replace(/[^0-9]/g,""))}/></F><F label="Income Importance"><select style={input} value={form.incomeImportance} onChange={e=>set("incomeImportance",e.target.value)}>{IMPORTANCE_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></F></div></details>
      <F label="Other Partner Expectations"><textarea rows={3} style={input} value={form.partnerNotes} onChange={e=>set("partnerNotes",e.target.value)}/></F>

      <Section title="Privacy, Media & Approval"/><div className="admin-mat-grid" style={grid}>
        <F label="Photo Privacy"><select style={input} value={form.photoVisibility} onChange={e=>set("photoVisibility",e.target.value)}>{PHOTO_PRIVACY_OPTIONS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></F>
        <F label="Contact Privacy"><select style={input} value={form.contactVisibility} onChange={e=>set("contactVisibility",e.target.value)}>{CONTACT_PRIVACY_OPTIONS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></F>
        <UploadBox title="Candidate Photo" value={form.photoUrl} loading={Boolean(uploading.photoUrl)} accept="image/*" onChange={upload("photoUrl")} image/>
        <UploadBox title="Payment Receipt / Proof" value={form.paymentProofUrl} loading={Boolean(uploading.paymentProofUrl)} accept="image/*,.pdf,application/pdf" onChange={upload("paymentProofUrl")}/>
        <F label="Profile Status"><select style={input} value={form.status} onChange={e=>set("status",e.target.value)}><option value="pending">Pending Review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></F>
        <F label="Verification"><select style={input} value={form.verificationStatus} onChange={e=>set("verificationStatus",e.target.value)}><option value="unverified">Unverified</option><option value="identity_checked">Identity Checked</option><option value="committee_verified">Committee Verified</option></select></F>
        <label style={checkBox}><input type="checkbox" checked={form.showOnPortal} onChange={e=>set("showOnPortal",e.target.checked)}/><span><strong>Enable for private matching</strong><br/><small>Never means public name/photo display.</small></span></label>
        <label style={checkBox}><input type="checkbox" checked={form.isFeatured} onChange={e=>set("isFeatured",e.target.checked)}/><span><strong>Priority / Featured</strong><br/><small>Used only in private ranking.</small></span></label>
        <div style={{gridColumn:"span 2"}}><F label="Admin / Manager Note"><textarea rows={3} style={input} value={form.adminNote} onChange={e=>set("adminNote",e.target.value)}/></F></div>
      </div>
      <MultiImageUpload label="Private Supporting Documents / Additional Photos" images={form.additionalPhotos} onChange={imgs=>set("additionalPhotos",imgs)}/>
      <div style={{background:"#eef6ff",border:"1px solid #cfe4fb",borderRadius:9,padding:11,color:"#315f7d",fontSize:11,lineHeight:1.7,marginTop:16}}><ShieldCheck size={13} style={{verticalAlign:"-2px",marginRight:4}}/>Timeline and behavior answers improve matching but do not replace family judgment, verification or consent. Finance payment verification remains separate.</div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:20}}><Link to="/admin/matrimonial" style={{...secondary,textDecoration:"none"}}>Cancel</Link><button type="submit" disabled={saving||Object.values(uploading).some(Boolean)} style={{...primary,opacity:saving?.6:1}}>{saving?<><Loader2 size={13} className="spin"/>Saving...</>:<><Save size={13}/>Save Candidate Profile</>}</button></div>
    </form>
  </div><style>{`@keyframes spin{to{transform:rotate(360deg)}}.spin{animation:spin .9s linear infinite}@media(max-width:760px){.admin-mat-grid,.layer-grid,.timeline-grid,.readiness-grid{grid-template-columns:1fr!important}.admin-mat-grid>[style*="span 2"]{grid-column:span 1!important}input,select,textarea{font-size:16px!important}}`}</style></div>;
}

function Section({title}:{title:string}) { return <h3 style={{color:GREEN,fontFamily:"'Playfair Display', serif",fontSize:17,borderBottom:"1px solid #eee",paddingBottom:8,margin:"25px 0 13px"}}>{title}</h3>; }
function F({label,children}:{label:string;children:React.ReactNode}) { return <div><label style={lbl}>{label}</label>{children}</div>; }
function Range({title,min,max,importance,onMin,onMax,onImp}:any) { return <div style={box}><strong style={{color:GREEN,fontSize:11}}>{title}</strong><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginTop:6}}><input style={input} placeholder="Min" value={min} onChange={e=>onMin(e.target.value.replace(/[^0-9]/g,""))}/><input style={input} placeholder="Max" value={max} onChange={e=>onMax(e.target.value.replace(/[^0-9]/g,""))}/></div><select style={{...input,marginTop:6}} value={importance} onChange={e=>onImp(e.target.value)}>{IMPORTANCE_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></div>; }
function LayerField({title,value,onChange}:{title:string;value:Layer;onChange:(k:keyof Layer,v:string)=>void}) { return <div style={{...box,marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><strong style={{color:GREEN,fontSize:11}}>{title}</strong><select style={{...input,width:160}} value={value.importance} onChange={e=>onChange("importance",e.target.value)}>{IMPORTANCE_OPTIONS.map(x=><option key={x}>{x}</option>)}</select></div><div className="layer-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,marginTop:7}}><input style={input} placeholder="Primary · پہلی ترجیح" value={value.primary} onChange={e=>onChange("primary",e.target.value)}/><input style={input} placeholder="Secondary · دوسری ترجیح" value={value.secondary} onChange={e=>onChange("secondary",e.target.value)}/><input style={input} placeholder="Acceptable · قابلِ قبول" value={value.acceptable} onChange={e=>onChange("acceptable",e.target.value)}/></div></div>; }
function UploadBox({title,value,loading,accept,onChange,image=false}:any) { return <div><label style={lbl}>{title}</label><label style={{minHeight:100,border:`2px dashed ${value?GOLD:"#ccd8cf"}`,borderRadius:8,display:"grid",placeItems:"center",cursor:"pointer",background:value?"#fff9ef":"#fafbf9",padding:8,textAlign:"center"}}>{loading?<Loader2 className="spin"/>:value?(image?<img src={value} alt="Private candidate" style={{maxHeight:85,maxWidth:"100%",objectFit:"contain"}}/>:<div style={{color:GREEN,fontWeight:800,fontSize:10}}><FileCheck2 size={18}/><div>File uploaded · click to replace</div></div>):<div style={{color:"#888",fontSize:10}}><Upload size={18}/><div>Click to upload</div></div>}<input type="file" accept={accept} style={{display:"none"}} onChange={onChange}/></label></div>; }

const input:React.CSSProperties = {width:"100%",boxSizing:"border-box",border:"1px solid #d8e1da",borderRadius:7,padding:"9px 10px",fontSize:11,background:"white"};
const lbl:React.CSSProperties = {display:"block",color:GREEN,fontSize:10,fontWeight:800,marginBottom:4};
const grid:React.CSSProperties = {display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10};
const card:React.CSSProperties = {background:"white",border:"1px solid #e8e3da",borderRadius:14,padding:25,boxShadow:"0 5px 22px rgba(0,0,0,.05)"};
const box:React.CSSProperties = {border:"1px solid #ece7de",borderRadius:9,padding:10};
const checkBox:React.CSSProperties = {display:"flex",gap:8,alignItems:"flex-start",border:"1px solid #e4e9e5",borderRadius:8,padding:9,color:"#4b5563",fontSize:10};
const primary:React.CSSProperties = {display:"inline-flex",alignItems:"center",gap:5,background:GREEN,color:"white",border:0,borderRadius:7,padding:"9px 13px",fontWeight:800,fontSize:11,cursor:"pointer"};
const secondary:React.CSSProperties = {...primary,background:"white",color:GREEN,border:"1px solid #d5ded8"};
const errorBox:React.CSSProperties = {background:"#fee2e2",color:"#b91c1c",borderRadius:8,padding:11,marginBottom:12,fontSize:11};
const successBox:React.CSSProperties = {background:"#dcfce7",color:"#166534",borderRadius:8,padding:11,marginBottom:12,fontSize:11};
const details:React.CSSProperties = {border:"1px solid #e8e3da",borderRadius:9,padding:"0 10px",marginBottom:9};
const summary:React.CSSProperties = {padding:"10px 0",cursor:"pointer",color:GREEN,fontWeight:800,fontSize:11};
