import { useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Plus, Upload, X } from "lucide-react";
import { uploadFile } from "../../lib/upload";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type SingleKey = "photoUrl" | "cnicFrontUrl" | "cnicBackUrl" | "paymentProofUrl";

interface Props {
  photoUrl?: string;
  cnicFrontUrl?: string;
  cnicBackUrl?: string;
  paymentProofUrl?: string;
  additionalFiles?: string[];
  context?: "admin" | "applicant";
  required?: boolean;
  onChange: (key: SingleKey | "additionalPhotos", value: string | string[]) => void;
}

function looksLikeImage(url?: string) {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(?:jpe?g|png|webp)(?:\?|$)/i.test(url) || /image/i.test(url);
}

function basename(url: string) {
  try {
    const path = new URL(url, window.location.origin).pathname;
    return decodeURIComponent(path.split("/").filter(Boolean).pop() || "Document");
  } catch {
    return "Document";
  }
}

export function MemberDocumentsUpload({ photoUrl, cnicFrontUrl, cnicBackUrl, paymentProofUrl, additionalFiles = [], context = "admin", required = false, onChange }: Props) {
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");

  const uploadOne = async (key: SingleKey, file?: File) => {
    if (!file) return;
    setError("");
    setBusy((old) => ({ ...old, [key]: true }));
    try {
      const url = await uploadFile(file, `member-${key}`);
      onChange(key, url);
    } catch (e: any) {
      setError(e?.message || "Upload failed. Please try again.");
    } finally {
      setBusy((old) => ({ ...old, [key]: false }));
    }
  };

  const uploadAdditional = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    setBusy((old) => ({ ...old, additionalPhotos: true }));
    try {
      const next = [...additionalFiles];
      for (const file of Array.from(files).slice(0, Math.max(0, 12 - next.length))) {
        next.push(await uploadFile(file, "member-additional-document"));
      }
      onChange("additionalPhotos", next);
    } catch (e: any) {
      setError(e?.message || "One or more documents could not be uploaded.");
    } finally {
      setBusy((old) => ({ ...old, additionalPhotos: false }));
    }
  };

  const mark = required ? " *" : "";
  const cards: Array<{ key: SingleKey; label: string; value?: string; accept: string; imageOnly?: boolean }> = [
    { key: "photoUrl", label: `Passport / Profile Photo${mark}`, value: photoUrl, accept: "image/jpeg,image/png,image/webp", imageOnly: true },
    { key: "cnicFrontUrl", label: `CNIC Front${mark}`, value: cnicFrontUrl, accept: "image/jpeg,image/png,image/webp,application/pdf" },
    { key: "cnicBackUrl", label: `CNIC Back${mark}`, value: cnicBackUrl, accept: "image/jpeg,image/png,image/webp,application/pdf" },
    { key: "paymentProofUrl", label: `Payment Proof / Slip${mark}`, value: paymentProofUrl, accept: "image/jpeg,image/png,image/webp,application/pdf" },
  ];

  return <div>
    <div style={{ background: "#f4f8f5", border: "1px solid #d7e4da", borderRadius: 9, padding: "10px 12px", marginBottom: 12, color: "#58655d", fontSize: 11, lineHeight: 1.55 }}>
      {context === "admin"
        ? "These are the same document fields used by the online membership form. Staff uploads are saved into the same member record, so there is only one photo/CNIC/payment-proof/document structure."
        : "These files are stored in your membership record. The same fields are available to authorized staff if the office needs to complete or replace a document later."}
    </div>
    {error && <div style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: 7, padding: "8px 10px", marginBottom: 10, fontSize: 11 }}>{error}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }} className="member-doc-grid">
      {cards.map((card) => <div key={card.key} style={{ border: "1px solid #e1e7e3", borderRadius: 10, padding: 11, background: "#fff" }}>
        <div style={{ color: GREEN, fontWeight: 800, fontSize: 11, marginBottom: 8 }}>{card.label}</div>
        <div style={{ minHeight: 104, border: `1.5px dashed ${card.value ? GOLD : "#cfd8d2"}`, borderRadius: 8, background: "#fafbf9", display: "grid", placeItems: "center", overflow: "hidden", position: "relative" }}>
          {card.value ? looksLikeImage(card.value) ? <img src={card.value} alt={card.label} style={{ width: "100%", height: 104, objectFit: card.imageOnly ? "cover" : "contain" }} /> : <a href={card.value} target="_blank" rel="noreferrer" style={{ color: GREEN, textDecoration: "none", textAlign: "center", padding: 12 }}><FileText size={28} /><div style={{ fontSize: 10, marginTop: 5 }}>Open saved document</div></a> : <div style={{ textAlign: "center", color: "#8a948e" }}>{card.imageOnly ? <ImageIcon size={27} /> : <FileText size={27} />}<div style={{ fontSize: 10, marginTop: 5 }}>No file uploaded</div></div>}
          {busy[card.key] && <div style={{ position: "absolute", inset: 0, background: "rgba(255,255,255,.85)", display: "grid", placeItems: "center", color: GREEN }}><Loader2 size={22} className="spin" /></div>}
        </div>
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 9px", background: GREEN, color: "white", borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: "pointer" }}><Upload size={12} /> {card.value ? "Replace" : "Upload"}<input type="file" accept={card.accept} style={{ display: "none" }} onChange={(e) => { void uploadOne(card.key, e.target.files?.[0]); e.target.value = ""; }} /></label>
          {card.value && <><a href={card.value} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", padding: "7px 9px", border: "1px solid #ced9d2", borderRadius: 6, color: GREEN, textDecoration: "none", fontSize: 10, fontWeight: 800 }}>View</a><button type="button" onClick={() => onChange(card.key, "")} style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 9px", border: "1px solid #efcaca", borderRadius: 6, color: "#a12a2a", background: "white", fontSize: 10, fontWeight: 800, cursor: "pointer" }}><X size={11} /> Remove</button></>}
        </div>
      </div>)}
    </div>

    <div style={{ marginTop: 12, border: "1px solid #e1e7e3", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}><div><strong style={{ color: GREEN, fontSize: 11 }}>Additional Photos / Certificates / Relevant Documents</strong><div style={{ fontSize: 10, color: "#888", marginTop: 3 }}>Optional. Images or PDF files, up to 12 saved items.</div></div><label style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 10px", background: "#f0f7f3", color: GREEN, border: "1px solid #cdded3", borderRadius: 6, fontSize: 10, fontWeight: 800, cursor: "pointer" }}>{busy.additionalPhotos ? <Loader2 size={12} className="spin" /> : <Plus size={12} />} Add Files<input type="file" multiple accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: "none" }} onChange={(e) => { void uploadAdditional(e.target.files); e.target.value = ""; }} /></label></div>
      {additionalFiles.length > 0 ? <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7, marginTop: 10 }}>{additionalFiles.map((url, index) => <div key={`${url}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center", border: "1px solid #edf0ee", borderRadius: 7, padding: "7px 8px", minWidth: 0 }}><a href={url} target="_blank" rel="noreferrer" title={basename(url)} style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: GREEN, textDecoration: "none", fontSize: 10, fontWeight: 700 }}>{looksLikeImage(url) ? "Photo" : "Document"} {index + 1}</a><button type="button" onClick={() => onChange("additionalPhotos", additionalFiles.filter((_, i) => i !== index))} style={{ border: 0, background: "transparent", color: "#b91c1c", cursor: "pointer", padding: 2 }}><X size={13} /></button></div>)}</div> : <div style={{ marginTop: 9, color: "#999", fontSize: 10 }}>No additional documents uploaded.</div>}
    </div>
    <style>{`.spin{animation:member-doc-spin 1s linear infinite}@keyframes member-doc-spin{to{transform:rotate(360deg)}}@media(max-width:700px){.member-doc-grid{grid-template-columns:1fr!important}}`}</style>
  </div>;
}
