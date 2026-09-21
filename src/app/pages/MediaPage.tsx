import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { X, Play, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { fetchMediaAlbums, MediaAlbum } from "../lib/mediaStore";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
const PAGE_SIZE = 8;

function videoEmbedUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtu.be")) return `https://www.youtube.com/embed/${parsed.pathname.replace(/^\//, "")}`;
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return url;
    }
    if (parsed.hostname.includes("vimeo.com")) {
      const id = parsed.pathname.split("/").filter(Boolean).pop();
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {}
  return "";
}

function isDirectVideo(url: string) {
  return /\.(mp4|webm|mov)(?:\?|$)/i.test(url);
}

export function MediaPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [albums, setAlbums] = useState<MediaAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchMediaAlbums()
      .then((data) => {
        if (!mounted) return;
        setAlbums(data);
        const requestedAlbum = searchParams.get("album");
        if (requestedAlbum) {
          const index = data.findIndex((album) => album.key === requestedAlbum);
          if (index >= 0) {
            setSelectedKey(requestedAlbum);
            setPage(Math.floor(index / PAGE_SIZE) + 1);
          }
        }
      })
      .catch((err) => console.error("Failed to load media albums", err))
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(albums.length / PAGE_SIZE));
  const pageAlbums = useMemo(() => albums.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [albums, page]);
  const selected = albums.find((album) => album.key === selectedKey) || null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <div>
      <PageHeader title="Media Gallery" subtitle="Event-wise photo albums and videos from Anjuman-e-Araian Faisalabad" breadcrumb={["Home", "News and Events", "Media"]} />
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: 0, fontSize: 25 }}>Event Albums</h2>
          <p style={{ color: "#6b7280", fontSize: 13, margin: "7px 0 0" }}>Each event is kept in its own folder so photos and videos never mix with another event.</p>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>Loading media albums...</div>
        ) : albums.length === 0 ? (
          <div style={{ textAlign: "center", color: "#999", padding: "48px 0" }}>No event albums found.</div>
        ) : (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 18 }} className="media-album-grid">
              {pageAlbums.map((album) => (
                <button key={album.key} type="button" onClick={() => {
                  setSelectedKey(album.key);
                  const next = new URLSearchParams(searchParams);
                  next.set("album", album.key);
                  setSearchParams(next, { replace: true });
                }} style={{ textAlign: "left", border: "1px solid #ece7df", borderRadius: 12, overflow: "hidden", cursor: "pointer", boxShadow: "0 3px 14px rgba(0,0,0,0.06)", background: "white", padding: 0 }}>
                  <div style={{ height: 180, overflow: "hidden", position: "relative", background: "#eef4f0" }}>
                    {album.photos[0]?.url ? (
                      <img src={album.photos[0].url} alt={album.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ height: "100%", display: "grid", placeItems: "center", color: GREEN }}><Images size={44} /></div>
                    )}
                    <div style={{ position: "absolute", left: 10, bottom: 10, display: "flex", gap: 6 }}>
                      <span style={{ background: "rgba(26,77,46,.92)", color: "white", borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800 }}>{album.photos.length} Photos</span>
                      {album.videos.length > 0 && <span style={{ background: "rgba(200,160,74,.95)", color: "#173b27", borderRadius: 20, padding: "4px 9px", fontSize: 10, fontWeight: 800 }}>{album.videos.length} Video</span>}
                    </div>
                  </div>
                  <div style={{ padding: "13px 14px 15px" }}>
                    <div style={{ color: GREEN, fontSize: 13, fontWeight: 800, lineHeight: 1.35 }}>{album.title}</div>
                    <div style={{ color: "#9ca3af", fontSize: 11, marginTop: 5 }}>{new Date(album.date).toLocaleDateString()}</div>
                    {album.caption && <div style={{ color: "#6b7280", fontSize: 11, lineHeight: 1.45, marginTop: 7, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{album.caption}</div>}
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32 }}>
                <span style={{ fontSize: 13, color: "#666" }}>Page {page} of {totalPages}</span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={actionBtn(page === 1)}><ChevronLeft size={16}/> Prev</button>
                  <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} style={actionBtn(page === totalPages)}>Next <ChevronRight size={16}/></button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.72)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 18 }} onClick={() => {
          setSelectedKey(null);
          const next = new URLSearchParams(searchParams);
          next.delete("album");
          setSearchParams(next, { replace: true });
        }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", width: "min(1100px, 100%)", maxHeight: "92vh", overflowY: "auto", borderRadius: 14, position: "relative", boxShadow: "0 24px 70px rgba(0,0,0,.28)" }}>
            <button onClick={() => {
              setSelectedKey(null);
              const next = new URLSearchParams(searchParams);
              next.delete("album");
              setSearchParams(next, { replace: true });
            }} aria-label="Close album" style={{ position: "sticky", float: "right", top: 14, right: 14, margin: 14, zIndex: 2, width: 36, height: 36, borderRadius: "50%", border: "none", background: GREEN, color: "white", display: "grid", placeItems: "center", cursor: "pointer" }}><X size={20}/></button>
            <div style={{ padding: "28px 28px 10px" }}>
              <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", margin: 0, fontSize: 26 }}>{selected.title}</h2>
              <p style={{ color: "#9ca3af", fontSize: 12, margin: "5px 0 0" }}>{new Date(selected.date).toLocaleDateString()} · {selected.photos.length} photos{selected.videos.length ? ` · ${selected.videos.length} video` : ""}</p>
              {selected.caption && <p style={{ color: "#616b65", fontSize: 13, lineHeight: 1.6, maxWidth: 820 }}>{selected.caption}</p>}
            </div>

            {selected.photos.length > 0 && (
              <div style={{ padding: "12px 28px 30px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }} className="media-photo-grid">
                {selected.photos.map((photo) => (
                  <button key={photo.id} onClick={() => setLightbox(photo.url)} type="button" style={{ border: 0, padding: 0, background: "transparent", cursor: "zoom-in", borderRadius: 8, overflow: "hidden" }}>
                    <img src={photo.url} alt={photo.caption || selected.title} loading="lazy" style={{ width: "100%", height: 170, objectFit: "cover", display: "block" }} />
                  </button>
                ))}
              </div>
            )}

            {selected.videos.map((video) => {
              const embed = videoEmbedUrl(video.url);
              return (
                <div key={video.id} style={{ padding: "0 28px 30px" }}>
                  <div style={{ color: GREEN, fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}><Play size={16} fill={GOLD} color={GOLD}/> Event Video</div>
                  {isDirectVideo(video.url) ? (
                    <video src={video.url} controls preload="metadata" style={{ width: "100%", maxHeight: 560, borderRadius: 10, background: "#111" }} />
                  ) : embed ? (
                    <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 10, overflow: "hidden", background: "#111" }}>
                      <iframe src={embed} title={selected.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
                    </div>
                  ) : (
                    <a href={video.url} target="_blank" rel="noreferrer" style={{ color: GREEN, fontWeight: 700 }}>Open event video</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {lightbox && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.94)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setLightbox(null)}>
          <button aria-label="Close image" style={{ position: "absolute", top: 18, right: 18, background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={32}/></button>
          <img src={lightbox} alt="Event photo" style={{ maxWidth: "96vw", maxHeight: "90vh", objectFit: "contain", borderRadius: 8 }} />
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .media-album-grid, .media-photo-grid { grid-template-columns: repeat(3,1fr) !important; }
        }
        @media (max-width: 650px) {
          .media-album-grid, .media-photo-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 420px) {
          .media-album-grid { grid-template-columns: 1fr !important; }
          .media-photo-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
      `}</style>
    </div>
  );
}

function actionBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    backgroundColor: disabled ? "#f3f4f6" : "#eef7f1",
    color: disabled ? "#9ca3af" : GREEN,
    border: `1px solid ${disabled ? "#e5e7eb" : "rgba(26,77,46,.25)"}`,
    borderRadius: 7,
    padding: "7px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: disabled ? "not-allowed" : "pointer",
  };
}
