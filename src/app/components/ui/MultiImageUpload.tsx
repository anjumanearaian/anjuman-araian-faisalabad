import React, { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface MultiImageUploadProps {
  images: string[];
  onChange: (imgs: string[]) => void;
  label?: string;
}

const GREEN = "#1a4d2e";

export function MultiImageUpload({ images = [], onChange, label }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check file sizes
    const oversized = files.find(f => f.size > 4 * 1024 * 1024);
    if (oversized) {
      setError("Each file must be 4MB or smaller");
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
        uploadedUrls.push(url); // relative /uploads/... URL
      }
      onChange([...images, ...uploadedUrls]);
    } catch (err: any) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset input so same file can be re-selected
      e.target.value = "";
    }
  };

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && (
        <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
          {label}
        </label>
      )}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        {images.map((src, i) => (
          <div
            key={i}
            style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid #e5e7eb", flexShrink: 0 }}
          >
            <img src={src} alt={`upload-${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <button
              type="button"
              onClick={() => removeImage(i)}
              style={{
                position: "absolute", top: 4, right: 4,
                backgroundColor: "rgba(0,0,0,0.6)", border: "none",
                borderRadius: "50%", width: 20, height: 20,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "white"
              }}
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Upload button */}
        <label
          style={{
            width: 80, height: 80, borderRadius: 8,
            border: `2px dashed ${uploading ? GREEN : "rgba(26,77,46,0.2)"}`,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            cursor: uploading ? "wait" : "pointer",
            backgroundColor: uploading ? "#f0f7f3" : "#fafaf8",
            opacity: uploading ? 0.8 : 1,
            flexShrink: 0,
            transition: "all 0.2s"
          }}
        >
          {uploading ? (
            <>
              <Loader2 size={18} color={GREEN} style={{ animation: "spin 0.9s linear infinite" }} />
              <span style={{ fontSize: 9, color: GREEN, marginTop: 4, fontWeight: 600 }}>Uploading</span>
            </>
          ) : (
            <>
              <Upload size={18} color="#9ca3af" />
              <span style={{ fontSize: 10, color: "#9ca3af", marginTop: 4 }}>Add Photo</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handleFileChange}
            disabled={uploading}
          />
        </label>
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontSize: 12, marginTop: 6 }}>{error}</p>
      )}
    </div>
  );
}
