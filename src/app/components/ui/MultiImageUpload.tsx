import React, { useMemo, useState } from "react";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

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
  if (/gallery|media|photo/.test(text)) return "Recommended: 1600 × 1200 px, 4:3 landscape. Use sharp, well-lit originals without text baked into the image.";
  if (/thumbnail/.test(text)) return "Recommended: 1280 × 720 px, 16:9 landscape.";
  return "Recommended: high-resolution JPG, PNG or WebP, under 4 MB. Use the natural aspect ratio and avoid stretched images.";
}

export function MultiImageUpload({ images = [], onChange, label, guidance, maxFiles }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const recommendation = useMemo(() => guidance || guidanceFor(label), [guidance, label]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (maxFiles && images.length + files.length > maxFiles) {
      setError(`You can upload up to ${maxFiles} image${maxFiles === 1 ? "" : "s"} here.`);
      e.target.value = "";
      return;
    }

    const oversized = files.find(f => f.size > 4 * 1024 * 1024);
    if (oversized) {
      setError("Each file must be 4 MB or smaller.");
      e.target.value = "";
      return;
    }

    const invalid = files.find(f => !["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type));
    if (invalid) {
      setError("Use JPG, PNG, WebP or GIF image files only.");
      e.target.value = "";
      return;
    }

    setError("");
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Upload failed");
        }
        const { url } = await res.json();
        uploadedUrls.push(url);
      }
      onChange([...images, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => onChange(images.filter((_, i) => i !== idx));
  const canAdd = !maxFiles || images.length < maxFiles;

  return (
    <div>
      {label && <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 5 }}>{label}</label>}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 7, color: "#6b7280", fontSize: 11, lineHeight: 1.45, marginBottom: 9 }}>
        <ImageIcon size={13} color={GOLD} style={{ marginTop: 1, flexShrink: 0 }} />
        <span>{recommendation}</span>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {images.map((src, i) => (
          <div key={i} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0, background: "#fff" }}>
            <img src={src} alt={`Uploaded image ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button type="button" onClick={() => removeImage(i)} aria-label={`Remove image ${i + 1}`} style={{ position: "absolute", top: 4, right: 4, backgroundColor: "rgba(0,0,0,0.62)", border: "none", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white" }}><X size={12} /></button>
          </div>
        ))}

        {canAdd && <label style={{ width: 80, height: 80, borderRadius: 8, border: `2px dashed ${uploading ? GREEN : "rgba(26,77,46,0.22)"}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: uploading ? "wait" : "pointer", backgroundColor: uploading ? "#f0f7f3" : "#fafaf8", opacity: uploading ? 0.8 : 1, flexShrink: 0, transition: "all 0.2s" }}>
          {uploading ? <><Loader2 size={18} color={GREEN} style={{ animation: "spin 0.9s linear infinite" }} /><span style={{ fontSize: 9, color: GREEN, marginTop: 4, fontWeight: 600 }}>Uploading</span></> : <><Upload size={18} color="#9ca3af" /><span style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>Add Photo</span></>}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple={!maxFiles || maxFiles > 1} style={{ display: "none" }} onChange={handleFileChange} disabled={uploading} />
        </label>}
      </div>

      {error && <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{error}</p>}
    </div>
  );
}
