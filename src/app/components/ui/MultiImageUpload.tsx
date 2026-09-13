import React, { useMemo, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon, FileText, LockKeyhole } from "lucide-react";
import { optimizeImageFile } from "../../lib/imageOptimization";
import { apiClient } from "../../lib/apiClient";

interface MultiImageUploadProps {
  images: string[];
  onChange: (imgs: string[]) => void;
  label?: string;
  guidance?: string;
  maxFiles?: number;
}

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

function guidanceFor(label = "") {
  const text = label.toLowerCase();
  if (/hero|slider|banner/.test(text)) return "Recommended: 1920 × 1080 px, 16:9 landscape. Keep key people/text away from the extreme edges.";
  if (/event|article|news|announcement/.test(text)) return "Recommended: 1600 × 900 px, 16:9 landscape for clean website cards and social previews.";
  if (/president|secretary|profile|portrait|candidate/.test(text)) return "Recommended: 1000 × 1200 px, 5:6 portrait. Face centered, plain background, no heavy filters.";
  if (/logo/.test(text)) return "Recommended: 1000 × 1000 px, square PNG/WebP with clear margins. Transparent background preferred for logos.";
  if (/certificate|document/.test(text)) return "Upload supporting photos, certificates or relevant documents. JPG, PNG, WebP and PDF are accepted.";
  if (/gallery|media|photo/.test(text)) return "Recommended: 1600 × 1200 px, 4:3 landscape. Use sharp, well-lit originals without text baked into the image.";
  if (/thumbnail/.test(text)) return "Recommended: 1280 × 720 px, 16:9 landscape.";
  return "Recommended: high-resolution JPG, PNG or WebP. Source images up to 12 MB are optimized automatically before upload.";
}

function isPdfUrl(src: string) { return /\.pdf(?:\?|$)/i.test(src); }
function isPrivateMatrimonialUrl(src: string) { return src.startsWith("/api/matrimonial/private-file/"); }

export function MultiImageUpload({ images = [], onChange, label, guidance, maxFiles }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const recommendation = useMemo(() => guidance || guidanceFor(label), [guidance, label]);
  const labelText = String(label || "").toLowerCase();
  const allowDocuments = useMemo(() => /certificate|document/.test(labelText), [labelText]);
  const privateMatrimonial = useMemo(() => /candidate|matrimonial|private supporting/.test(labelText), [labelText]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (maxFiles && images.length + files.length > maxFiles) { setError(`You can upload up to ${maxFiles} file${maxFiles === 1 ? "" : "s"} here.`); e.target.value = ""; return; }
    const oversized = files.find(f => f.size > (f.type.startsWith("image/") ? 12 * 1024 * 1024 : 4 * 1024 * 1024));
    if (oversized) { setError(oversized.type.startsWith("image/") ? "Please use source images 12 MB or smaller. Images are optimized automatically before upload." : "PDF documents must be 4 MB or smaller."); e.target.value = ""; return; }
    const allowed = allowDocuments ? ["image/jpeg", "image/png", "image/webp", "application/pdf"] : ["image/jpeg", "image/png", "image/webp"];
    const invalid = files.find(f => !allowed.includes(f.type));
    if (invalid) { setError(allowDocuments ? "Use JPG, PNG, WebP or PDF files only." : "Use JPG, PNG or WebP image files only."); e.target.value = ""; return; }

    setError(""); setUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const prepared = file.type === "application/pdf" ? file : await optimizeImageFile(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.86 });
        if (prepared.size > 4 * 1024 * 1024) throw new Error(file.type === "application/pdf" ? "PDF documents must be 4 MB or smaller." : "This image is still larger than 4 MB after optimization.");
        const fd = new FormData(); fd.append("file", prepared); fd.append("category", privateMatrimonial ? "matrimonial-document" : allowDocuments ? "member-document" : "content-image");
        const endpoint = privateMatrimonial ? "/matrimonial/private-upload" : "/upload";
        const result = await apiClient<{ url: string }>(endpoint, { method: "POST", body: fd });
        if (!result?.url) throw new Error("Upload completed without a file URL");
        uploadedUrls.push(result.url);
      }
      onChange([...images, ...uploadedUrls]);
    } catch (err: any) { setError(err.message || "Upload failed. Please try again."); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const removeImage = (idx: number) => onChange(images.filter((_, i) => i !== idx));
  const canAdd = !maxFiles || images.length < maxFiles;

  return (
    <div>
      {label && <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, color: "#6b7280", fontSize: 11, lineHeight: 1.45, marginBottom: 9 }}>{privateMatrimonial ? <LockKeyhole size={13} color={GOLD}/> : allowDocuments ? <FileText size={13} color={GOLD}/> : <ImageIcon size={13} color={GOLD}/>}<span>{privateMatrimonial ? "Private authenticated storage. These files are not public website media. " : ""}{recommendation}</span></div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {images.map((src, i) => <div key={`${src}-${i}`} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0, background: "#fff" }}>
          {isPrivateMatrimonialUrl(src) ? <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", textAlign: "center", color: GREEN }}><div><LockKeyhole size={22}/><div style={{fontSize:8,marginTop:3}}>Private File</div></div></div> : isPdfUrl(src) ? <a href={src} target="_blank" rel="noreferrer" style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: GREEN, textDecoration: "none" }}><FileText size={25}/></a> : <img src={src} alt={`Uploaded file ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }}/>} 
          <button type="button" onClick={() => removeImage(i)} aria-label={`Remove file ${i + 1}`} style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.62)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}><X size={12}/></button>
        </div>)}
        {canAdd && <label style={{ width: 80, height: 80, borderRadius: 8, border: `2px dashed ${uploading ? GREEN : "rgba(26,77,46,0.22)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer", backgroundColor: uploading ? "#f0f7f3" : "#fafaf8", opacity: uploading ? 0.8 : 1, flexShrink: 0 }}>{uploading ? <><Loader2 size={18} color={GREEN} style={{ animation: "spin 0.9s linear infinite" }}/><span style={{ fontSize: 9, color: GREEN, marginTop: 4 }}>Uploading</span></> : <><Upload size={18} color="#9ca3af"/><span style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>{allowDocuments ? "Add File" : "Add Photo"}</span></>}<input type="file" accept={allowDocuments ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"} multiple={!maxFiles || maxFiles > 1} style={{ display: "none" }} onChange={handleFileChange} disabled={uploading}/></label>}
      </div>
      {error && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
