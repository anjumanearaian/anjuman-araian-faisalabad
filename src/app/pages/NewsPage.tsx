import { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { useAdmin } from "../context/AdminContext";
import { Plus, Trash2, X, Edit2, Eye, EyeOff, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { fetchAllContent, createContent, updateContent, deleteContent, NewsItem, statusColors, ContentStatus, paginateData } from "../lib/contentStore";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { LightboxGallery } from "../components/ui/LightboxGallery";
import { RichTextEditor } from "../components/ui/RichTextEditor";

const stripHtml = (html: string) => String(html || "")
  .replace(/<[^>]*>/g, " ")
  .replace(/&nbsp;|&#160;/gi, " ")
  .replace(/&amp;/gi, "&")
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, "<")
  .replace(/&gt;/gi, ">")
  .replace(/\s+/g, " ")
  .trim();

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const categories = ["All", "Announcement", "Education", "Welfare", "Organisation", "Overseas"];
const catColors: Record<string, string> = { Announcement: GREEN, Education: "#1565c0", Welfare: "#2e7d52", Organisation: "#6a1b9a", Overseas: GOLD };

const blank = (): Omit<NewsItem, "id" | "createdAt" | "updatedAt"> => ({
  type: "news", title: "", date: new Date().toISOString().slice(0, 10), category: "Announcement", body: "", status: "draft", images: [],
});

function StatusBadge({ status }: { status: ContentStatus }) {
  const s = statusColors[status];
  return (
    <span style={{ backgroundColor: s.bg, color: s.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, letterSpacing: "0.04em", display: "inline-flex", alignItems: "center", gap: 4 }}>
      {status === "published" && <CheckCircle size={10} />}
      {status === "draft" && <Clock size={10} />}
      {status === "rejected" && <XCircle size={10} />}
      {s.label}
    </span>
  );
}

export function NewsPage() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadError, setLoadError] = useState("");

  const loadNews = () => {
    setLoadError("");
    fetchAllContent("news", 1, isAdmin ? 100 : 50, isAdmin)
      .then((res) => setNews(res.data as NewsItem[]))
      .catch((e: any) => { setNews([]); setLoadError(e?.message || "News could not be loaded."); });
  };

  useEffect(() => {
    loadNews();
  }, [isAdmin]);

  const [filter, setFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | ContentStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NewsItem | null>(null);
  const [form, setForm] = useState(blank());
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [galleryImages, setGalleryImages] = useState<{images: string[], index: number} | null>(null);

  const [page, setPage] = useState(1);
  const limit = 5;

  useEffect(() => {
    setPage(1);
  }, [filter, statusFilter, searchQuery]);

  useEffect(() => {
    if (location.state && (location.state as any).expandNewsId) {
      const targetId = (location.state as any).expandNewsId;
      setFilter("All");
      setSearchQuery("");
      setExpanded(targetId);
      setTimeout(() => {
        const el = document.getElementById(`news-item-${targetId}`);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [location.state]);

  const openAdd = () => { setEditing(null); setForm(blank()); setErr(""); setShowForm(true); };
  const openEdit = (item: NewsItem) => { setEditing(item); setForm({ type: "news", title: item.title, date: item.date, category: item.category, body: item.body, status: item.status, images: item.images || [] }); setErr(""); setShowForm(true); };

  const submit = async () => {
    if (!form.title.trim() || !stripHtml(form.body).trim()) { setErr("Headline and article content are required."); return; }
    setSaving(true); setErr("");
    try {
      if (editing) await updateContent(editing.id, form);
      else await createContent({ ...form, type: "news" });
      setShowForm(false); setEditing(null); setErr("");
      loadNews();
    } catch (e: any) {
      setErr(e?.message || "Article could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (id: string, status: ContentStatus) => {
    try { await updateContent(id, { status }); loadNews(); }
    catch (e: any) { setLoadError(e?.message || "Article status could not be updated."); }
  };

  const del = async (id: string) => {
    if (!confirm("Permanently delete this item?")) return;
    try { await deleteContent(id); loadNews(); }
    catch (e: any) { setLoadError(e?.message || "Article could not be deleted."); }
  };

  const visible = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return news
      .filter((n) => filter === "All" || n.category === filter)
      .filter((n) => isAdmin ? (statusFilter === "all" || n.status === statusFilter) : n.status === "published")
      .filter((n) => !q || `${n.title} ${stripHtml(n.body)} ${n.category}`.toLowerCase().includes(q))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [news, filter, statusFilter, isAdmin, searchQuery]);

  const paginated = useMemo(() => paginateData(visible, page, limit), [visible, page]);

  return (
    <div>
      <PageHeader title="News and Announcements" subtitle="Latest updates, news and official announcements" breadcrumb={["Home", "News and Events", "News"]} />
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>
        {loadError && <div style={{ background: "#fee2e2", border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 13 }}>{loadError}</div>}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter(c)} style={{ padding: "7px 16px", borderRadius: 30, border: `2px solid ${GREEN}`, cursor: "pointer", backgroundColor: filter === c ? GREEN : "transparent", color: filter === c ? "white" : GREEN, fontSize: 13, fontWeight: 700 }}>{c}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: GOLD, color: "#1a1a1a", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              <Plus size={16} /> Add News
            </button>
          )}
        </div>

        <div style={{ position: "relative", maxWidth: 560, marginBottom: 24 }}>
          <Search size={17} color="#8a8a8a" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search headline, article or category..." style={{ width: "100%", boxSizing: "border-box", padding: "10px 14px 10px 40px", borderRadius: 9, border: "1px solid rgba(26,77,46,.2)", background: "white", fontSize: 14 }} />
        </div>

        {isAdmin && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {(["all", "published", "draft", "rejected"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${statusFilter === s ? GREEN : "#ddd"}`, cursor: "pointer", backgroundColor: statusFilter === s ? GREEN : "white", color: statusFilter === s ? "white" : "#555", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                {s === "all" ? "All Statuses" : s}<span style={{ marginLeft: 6, opacity: 0.7 }}>({s === "all" ? news.length : news.filter((n) => n.status === s).length})</span>
              </button>
            ))}
          </div>
        )}

        {showForm && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ backgroundColor: "white", borderRadius: 14, padding: 32, width: "100%", maxWidth: 720, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>{editing ? "Edit Article" : "Add New Article"}</h3>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={22} /></button>
              </div>
              {err && <p style={{ color: "#b91c1c", fontSize: 13, marginBottom: 12, backgroundColor: "#fee2e2", padding: "8px 12px", borderRadius: 6 }}>{err}</p>}

              {[{ key: "title", label: "Headline *", type: "text", placeholder: "Enter news headline..." }, { key: "date", label: "Publication Date", type: "date" }].map(({ key, label, type, placeholder }) => (
                <div key={key} style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={placeholder} value={form[key as keyof typeof form] as string} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
                </div>
              ))}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="news-form-grid">
                <div><label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Category</label><select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14 }}>{categories.filter((c) => c !== "All").map((c) => <option key={c}>{c}</option>)}</select></div>
                <div><label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Status</label><select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))} style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14 }}><option value="draft">Draft</option><option value="published">Published</option><option value="rejected">Rejected</option></select></div>
              </div>

              <div style={{ marginBottom: 24 }}><label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Content *</label><RichTextEditor value={form.body} onChange={(v) => setForm((f) => ({ ...f, body: v }))} placeholder="Write the full news content here..." /></div>
              <div style={{ marginBottom: 24 }}><MultiImageUpload images={form.images || []} onChange={(imgs: string[]) => setForm((f) => ({ ...f, images: imgs }))} label="Article Photos (Optional)" /></div>

              <div style={{ display: "flex", gap: 12 }}>
                <button disabled={saving} onClick={submit} style={{ flex: 1, backgroundColor: saving ? "#8aa091" : GREEN, color: "white", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: saving ? "wait" : "pointer" }}>{saving ? "Saving..." : editing ? "Save Changes" : form.status === "published" ? "Publish Article" : "Save Article"}</button>
                <button disabled={saving} onClick={() => setShowForm(false)} style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 36, alignItems: "start" }} className="news-layout">
          <div>
            {paginated.data.length === 0 && <div style={{ textAlign: "center", color: "#999", padding: "48px 0", fontSize: 15 }}>{searchQuery ? "No news matched your search." : "No items found."}</div>}
            {paginated.data.map((item) => { const excerpt = stripHtml(item.body); return (
              <div id={`news-item-${item.id}`} key={item.id} style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid rgba(26,77,46,0.08)`, marginBottom: 20, overflow: "hidden" }}>
                <div style={{ padding: "20px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                    <span style={{ backgroundColor: catColors[item.category] ?? GREEN, color: "white", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, letterSpacing: "0.05em" }}>{item.category}</span>
                    <span style={{ color: "#999", fontSize: 12 }}>{new Date(item.date).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}</span>
                    {isAdmin && <StatusBadge status={item.status} />}
                  </div>

                  <h3 dir="auto" style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 10, lineHeight: 1.4 }}>{item.title}</h3>
                  <div dir="auto" style={{ color: "#555", fontSize: 14, lineHeight: 1.85, marginBottom: 16 }}>
                    {expanded === item.id ? <div dangerouslySetInnerHTML={{ __html: item.body }} /> : <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{excerpt.slice(0, 250)}{excerpt.length > 250 ? "…" : ""}{excerpt.length > 250 && <button onClick={() => setExpanded(item.id)} style={{ color: GOLD, fontWeight: 700, background: "none", border: "none", cursor: "pointer", marginLeft: 4 }}>Read More</button>}</p>}
                  </div>

                  {item.images && item.images.length > 0 && (
                    <div style={{ display: "grid", gridTemplateColumns: item.images.length === 1 ? "1fr" : item.images.length === 2 ? "1fr 1fr" : "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginBottom: 16, borderRadius: 8, overflow: "hidden" }}>
                      {item.images.slice(0, expanded === item.id ? item.images.length : 4).map((img, idx) => (
                        <div key={idx} style={{ position: "relative", paddingTop: item.images!.length === 1 ? "56.25%" : "100%", cursor: "pointer" }} onClick={() => setGalleryImages({ images: item.images!, index: idx })}>
                          <img src={img} alt={`${item.title} - image ${idx + 1}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          {idx === 3 && item.images!.length > 4 && expanded !== item.id && <div onClick={(e) => { e.stopPropagation(); setExpanded(item.id); }} style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 24, fontWeight: 700, cursor: "pointer" }}>+{item.images!.length - 4}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {expanded === item.id && <button onClick={() => setExpanded(null)} style={{ color: GOLD, fontSize: 13, fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0 }}>Show Less</button>}

                  {isAdmin && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 14, borderTop: "1px solid #f5f5f5" }}>
                      <button onClick={() => openEdit(item)} style={actionBtn("#3b82f6")}><Edit2 size={13} /> Edit</button>
                      {item.status !== "published" && <button onClick={() => setStatus(item.id, "published")} style={actionBtn("#15803d")}><CheckCircle size={13} /> Publish</button>}
                      {item.status === "published" && <button onClick={() => setStatus(item.id, "draft")} style={actionBtn("#854d0e")}><EyeOff size={13} /> Unpublish</button>}
                      {item.status !== "rejected" && <button onClick={() => setStatus(item.id, "rejected")} style={actionBtn("#b91c1c")}><XCircle size={13} /> Reject</button>}
                      {item.status === "rejected" && <button onClick={() => setStatus(item.id, "draft")} style={actionBtn("#854d0e")}><Eye size={13} /> Restore</button>}
                      <button onClick={() => del(item.id)} style={actionBtn("#6b7280", true)}><Trash2 size={13} /> Delete</button>
                    </div>
                  )}
                </div>
              </div>
            )})}

            {paginated.totalPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginTop: 32, marginBottom: 16 }}>
                <button disabled={page === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", backgroundColor: page === 1 ? "#fafafa" : "white", color: page === 1 ? "#aaa" : GREEN, cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}><ChevronLeft size={16} /> Previous</button>
                <span style={{ fontSize: 14, color: "#666", fontWeight: 600 }}>Page {page} of {paginated.totalPages}</span>
                <button disabled={!paginated.hasMore} onClick={() => setPage((p) => Math.min(p + 1, paginated.totalPages))} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 8, border: "1px solid #ddd", backgroundColor: !paginated.hasMore ? "#fafafa" : "white", color: !paginated.hasMore ? "#aaa" : GREEN, cursor: !paginated.hasMore ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}>Next <ChevronRight size={16} /></button>
              </div>
            )}
          </div>

          <div style={{ position: "sticky", top: 90 }}>
            <div style={{ backgroundColor: GREEN, borderRadius: 12, padding: 24, marginBottom: 20 }}>
              <h4 style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Recent Announcements</h4>
              {news.filter((n) => n.status === "published").slice(0, 5).map((n) => (
                <div key={n.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12, marginBottom: 12, cursor: "pointer" }} onClick={() => { setFilter("All"); setSearchQuery(""); setExpanded(n.id); }}>
                  <p dir="auto" style={{ color: "white", fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>{n.title}</p><span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{new Date(n.date).toLocaleDateString("en-PK")}</span>
                </div>
              ))}
            </div>
            <div style={{ backgroundColor: "#f8f5ef", borderRadius: 12, padding: 24, border: `1px solid rgba(200,160,74,0.2)` }}>
              <h4 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Categories</h4>
              {categories.filter((c) => c !== "All").map((c) => (
                <button key={c} onClick={() => setFilter(c)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "8px 0", background: "none", border: "none", borderBottom: "1px solid rgba(0,0,0,0.06)", cursor: "pointer", color: filter === c ? GREEN : "#555", fontWeight: filter === c ? 700 : 400, fontSize: 14 }}><span>{c}</span><span style={{ color: GOLD, fontWeight: 700 }}>{news.filter((n) => n.category === c && (isAdmin || n.status === "published")).length}</span></button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <style>{`@media (max-width: 900px) { .news-layout { grid-template-columns: 1fr !important; } .news-form-grid { grid-template-columns: 1fr !important; } }`}</style>

      {galleryImages && <LightboxGallery images={galleryImages.images} initialIndex={galleryImages.index} onClose={() => setGalleryImages(null)} />}
    </div>
  );
}

function actionBtn(color: string, subtle = false): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    backgroundColor: subtle ? "#f5f5f5" : `${color}15`,
    color: subtle ? "#555" : color,
    border: `1px solid ${subtle ? "#e5e5e5" : `${color}40`}`,
    borderRadius: 6, padding: "5px 12px", fontSize: 12, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Lato', sans-serif",
  };
}
