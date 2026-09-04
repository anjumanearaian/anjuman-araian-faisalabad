import { useState, useEffect } from "react";
import { PageHeader } from "../components/PageHeader";
import { useAdmin } from "../context/AdminContext";
import { Plus, Trash2, X, Image, Play, ChevronLeft, ChevronRight } from "lucide-react";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

import { fetchMediaGallery, MediaItem } from "../lib/mediaStore";

export function MediaPage() {
  const { isAdmin } = useAdmin();
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "photo" | "video">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const limit = 8;

  useEffect(() => {
    setPage(1);
  }, [filterType]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    fetchMediaGallery(page, limit, filterType === "all" ? undefined : filterType)
      .then(res => {
        if (isMounted) {
          setItems(res.data);
          setTotalPages(res.totalPages);
          setHasMore(res.hasMore);
        }
      })
      .catch(err => console.error("Failed to load media", err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => { isMounted = false; };
  }, [page, filterType]);

  const lightboxItem = items.find((i) => i.id === lightbox);

  return (
    <div>
      <PageHeader title="Media Gallery" subtitle="Photos and videos from Anjuman-e-Araian events and activities" breadcrumb={["Home", "News and Events", "Media"]} />
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "photo", "video"] as const).map((t) => (
              <button key={t} onClick={() => setFilterType(t)} style={{ padding: "7px 20px", borderRadius: 30, border: `2px solid ${GREEN}`, cursor: "pointer", backgroundColor: filterType === t ? GREEN : "transparent", color: filterType === t ? "white" : GREEN, fontSize: 13, fontWeight: 700, textTransform: "capitalize" }}>{t === "all" ? "All" : t + "s"}</button>
            ))}
          </div>
        </div>


        {/* Lightbox */}
        {lightbox && lightboxItem && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.92)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setLightbox(null)}>
            <button style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={32} /></button>
            <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: 900, width: "100%" }}>
              <img src={lightboxItem.url} alt={lightboxItem.caption} style={{ width: "100%", maxHeight: "80vh", objectFit: "contain", borderRadius: 8 }} />
              <p style={{ color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 12, fontSize: 14 }}>{lightboxItem.caption}</p>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }} className="media-grid">
          {loading ? (
            <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "48px 0", color: "#666" }}>Loading media...</div>
          ) : (
            items.map((item) => (
              <div key={item.id} style={{ borderRadius: 10, overflow: "hidden", cursor: "pointer", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "relative" }} className="media-card" onClick={() => setLightbox(item.id)}>
                <div style={{ height: 180, overflow: "hidden", position: "relative" }}>
                  <img src={item.url} alt={item.caption} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.4s ease" }} className="media-img" />
                  {item.type === "video" && (
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)" }}>
                      <Play size={36} color="white" fill="white" />
                    </div>
                  )}
                </div>
                <div style={{ padding: "10px 12px", backgroundColor: "white" }}>
                  <p style={{ color: GREEN, fontSize: 12, fontWeight: 600, lineHeight: 1.4 }}>{item.title}</p>
                  <p style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>{new Date(item.date).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
        {!loading && items.length === 0 && <div style={{ textAlign: "center", color: "#999", padding: "48px 0" }}>No media items found.</div>}

        {totalPages > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, fontFamily: "'Poppins', sans-serif" }}>
            <span style={{ fontSize: 13, color: "#666" }}>Showing page {page} of {totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} style={actionBtn(GREEN, page === 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <button disabled={!hasMore} onClick={() => setPage((p) => Math.min(p + 1, totalPages))} style={actionBtn(GREEN, !hasMore)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
      <style>{`
        .media-card:hover .media-img { transform: scale(1.06); }
        @media (max-width: 900px) { .media-grid { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 600px) { .media-grid { grid-template-columns: repeat(2,1fr) !important; } }
      `}</style>
    </div>
  );
}

function actionBtn(color: string, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    backgroundColor: disabled ? "#f3f4f6" : `${color}15`,
    color: disabled ? "#9ca3af" : color,
    border: `1px solid ${disabled ? "#e5e7eb" : `${color}40`}`,
    borderRadius: 6,
    padding: "6px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "'Poppins', sans-serif",
  };
}
