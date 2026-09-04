import { useState, useEffect } from "react";
import { useLocation } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { useAdmin } from "../context/AdminContext";
import { Plus, Trash2, X, Calendar, MapPin, Clock, Edit2, Eye, EyeOff, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAllContent, createContent, updateContent, deleteContent, EventItem, statusColors, ContentStatus, paginateData } from "../lib/contentStore";
import { MultiImageUpload } from "../components/ui/MultiImageUpload";
import { RichTextEditor } from "../components/ui/RichTextEditor";
import { LightboxGallery } from "../components/ui/LightboxGallery";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const categories = ["All", "Meeting", "Welfare", "Election", "Education", "Convention"];
const categoryColors: Record<string, string> = { Meeting: GREEN, Welfare: "#2e7d52", Election: GOLD, Education: "#1565c0", Convention: "#6a1b9a" };

const blank = (): Omit<EventItem, "id" | "createdAt" | "updatedAt"> => ({
  type: "event", title: "", date: "", time: "", location: "", category: "Meeting", desc: "", status: "draft", images: [] as string[],
});

function StatusBadge({ status }: { status: ContentStatus }) {
  const s = statusColors[status];
  return (
    <span style={{ backgroundColor: s.bg, color: s.text, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, display: "inline-flex", alignItems: "center", gap: 4 }}>
      {status === "published" && <CheckCircle size={10} />}
      {status === "draft" && <Clock size={10} />}
      {status === "rejected" && <XCircle size={10} />}
      {s.label}
    </span>
  );
}

export function EventsPage() {
  const location = useLocation();
  const { isAdmin } = useAdmin();
  const [events, setEvents] = useState<EventItem[]>([]);
  
  const loadEvents = () => {
    fetchAllContent("event", 1, 1000, isAdmin).then(res => setEvents(res.data as EventItem[]));
  };

  useEffect(() => {
    loadEvents();
  }, [isAdmin]);
  const [filter, setFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | ContentStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [form, setForm] = useState(blank());
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const limit = 6;
  const [galleryImages, setGalleryImages] = useState<{images: string[], index: number} | null>(null);

  useEffect(() => {
    setPage(1);
  }, [filter, statusFilter]);

  useEffect(() => {
    if (location.state?.expandEventId) {
      setTimeout(() => {
        const el = document.getElementById(`event-item-${location.state.expandEventId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          el.style.transition = "box-shadow 0.5s ease";
          el.style.boxShadow = "0 0 0 4px #c8a04a, 0 10px 40px rgba(0,0,0,0.15)";
          setTimeout(() => {
            el.style.boxShadow = "0 2px 14px rgba(0,0,0,0.07)";
          }, 2000);
        }
      }, 300);
    }
  }, [location.state, events]);

  const openAdd = () => { setEditing(null); setForm(blank()); setError(""); setShowForm(true); };
  const openEdit = (item: EventItem) => {
    setEditing(item);
    setForm({ type: "event", title: item.title, date: item.date, time: item.time || "", location: item.location || "", category: item.category, desc: item.desc, status: item.status, images: item.images || [] });
    setError(""); setShowForm(true);
  };

  const submit = async () => {
    if (!form.title || !form.date || !form.location) { setError("Title, Date and Location are required."); return; }
    if (editing) {
      await updateContent(editing.id, form);
    } else {
      await createContent({ ...form, type: "event" });
    }
    setShowForm(false); setEditing(null); setError("");
    loadEvents();
  };

  const setStatus = async (id: string, status: ContentStatus) => {
    await updateContent(id, { status });
    loadEvents();
  };

  const del = async (id: string) => { 
    if (confirm("Permanently delete this event?")) {
      await deleteContent(id);
      loadEvents();
    }
  };

  const visible = events
    .filter((e) => filter === "All" || e.category === filter)
    .filter((e) => isAdmin ? (statusFilter === "all" || e.status === statusFilter) : e.status === "published")
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const paginated = paginateData(visible, page, limit);

  return (
    <div>
      <PageHeader title="Events" subtitle="Upcoming and past events of Anjuman-e-Araian" breadcrumb={["Home", "News and Events", "Events"]} />
      <section style={{ maxWidth: 1100, margin: "0 auto", padding: "56px 24px" }}>

        {/* Toolbar */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter(c)} style={{ padding: "7px 16px", borderRadius: 30, border: `2px solid ${GREEN}`, cursor: "pointer", backgroundColor: filter === c ? GREEN : "transparent", color: filter === c ? "white" : GREEN, fontSize: 13, fontWeight: 700 }}>{c}</button>
            ))}
          </div>
          {isAdmin && (
            <button onClick={openAdd} style={{ display: "flex", alignItems: "center", gap: 8, backgroundColor: GOLD, color: "#1a1a1a", border: "none", borderRadius: 8, padding: "10px 20px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              <Plus size={16} /> Add Event
            </button>
          )}
        </div>

        {/* Admin status filter */}
        {isAdmin && (
          <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
            {(["all", "published", "draft", "rejected"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)} style={{ padding: "5px 14px", borderRadius: 20, border: `1px solid ${statusFilter === s ? GREEN : "#ddd"}`, cursor: "pointer", backgroundColor: statusFilter === s ? GREEN : "white", color: statusFilter === s ? "white" : "#555", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>
                {s === "all" ? "All Statuses" : s}
                <span style={{ marginLeft: 6, opacity: 0.7 }}>({s === "all" ? events.length : events.filter((e) => e.status === s).length})</span>
              </button>
            ))}
          </div>
        )}

        {/* Form modal */}
        {showForm && (
          <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
            <div style={{ backgroundColor: "white", borderRadius: 14, padding: 32, width: "100%", maxWidth: 580, maxHeight: "92vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h3 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, margin: 0 }}>
                  {editing ? "Edit Event" : "Add New Event"}
                </h3>
                <button onClick={() => setShowForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#888" }}><X size={22} /></button>
              </div>
              {error && <p style={{ color: "red", fontSize: 13, marginBottom: 12, backgroundColor: "#fee2e2", padding: "8px 12px", borderRadius: 6 }}>{error}</p>}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 0 }}>
                {[
                  { key: "title", label: "Event Title *", type: "text", span: 2 },
                  { key: "date", label: "Date *", type: "date", span: 1 },
                  { key: "time", label: "Time", type: "text", span: 1 },
                  { key: "location", label: "Location *", type: "text", span: 2 },
                ].map(({ key, label, type, span }) => (
                  <div key={key} style={{ gridColumn: `span ${span}`, marginBottom: 16 }}>
                    <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>{label}</label>
                    <input type={type} value={form[key as keyof typeof form] as string} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14, boxSizing: "border-box", fontFamily: "'Lato', sans-serif" }} />
                  </div>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Category</label>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14 }}>
                    {["Meeting", "Welfare", "Election", "Education", "Convention"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Status</label>
                  <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ContentStatus }))}
                    style={{ width: "100%", padding: "10px 14px", border: `1px solid rgba(26,77,46,0.25)`, borderRadius: 7, fontSize: 14 }}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", color: GREEN, fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Description</label>
                <RichTextEditor value={form.desc} onChange={(v) => setForm((f) => ({ ...f, desc: v }))} placeholder="Event details..." />
              </div>

              <div style={{ marginBottom: 24 }}>
                <MultiImageUpload
                  label="Event Images"
                  images={form.images || []}
                  onChange={(imgs) => setForm((f) => ({ ...f, images: imgs }))}
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={submit} style={{ flex: 1, backgroundColor: GREEN, color: "white", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  {editing ? "Save Changes" : "Create Event"}
                </button>
                <button onClick={() => setShowForm(false)} style={{ flex: 1, backgroundColor: "#f0f0f0", color: "#444", border: "none", borderRadius: 8, padding: "12px 0", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {paginated.data.length === 0 && <div style={{ textAlign: "center", padding: "64px 0", color: "#999", fontSize: 15 }}>No events found for this filter.</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24 }} className="events-grid">
          {paginated.data.map((ev) => {
            const d = new Date(ev.date);
            const isPast = d < new Date();
            const bg = isPast ? "#888" : (categoryColors[ev.category] ?? GREEN);
            return (
              <div id={`event-item-${ev.id}`} key={ev.id} style={{ backgroundColor: "white", borderRadius: 12, boxShadow: "0 2px 14px rgba(0,0,0,0.07)", border: `1px solid rgba(26,77,46,0.08)`, overflow: "hidden" }}>
                <div style={{ backgroundColor: bg, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ backgroundColor: GOLD, borderRadius: 8, padding: "6px 14px", textAlign: "center", flexShrink: 0 }}>
                      <div style={{ color: "#1a1a1a", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{d.getDate()}</div>
                      <div style={{ color: "#1a1a1a", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{d.toLocaleString("default", { month: "short" })}</div>
                    </div>
                    <div>
                      <p dir="auto" style={{ color: "white", fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{ev.title}</p>
                      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                        <span style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "white", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 8 }}>{ev.category}</span>
                        {isAdmin && <StatusBadge status={ev.status} />}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: "16px 20px" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10, fontSize: 13, color: "#666" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><Clock size={13} color={GOLD} /> {ev.time || "TBD"}</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 5 }}><MapPin size={13} color={GOLD} /> {ev.location}</span>
                  </div>
                  {ev.images && ev.images.length > 0 && (
                    <div style={{ marginBottom: 14, borderRadius: 8, overflow: "hidden", height: 160, position: "relative", cursor: "pointer" }} onClick={() => setGalleryImages({ images: ev.images!, index: 0 })}>
                      <img src={ev.images[0]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {ev.images.length > 1 && (
                        <div style={{ position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 12, fontWeight: 700 }}>
                          +{ev.images.length - 1} Images
                        </div>
                      )}
                    </div>
                  )}
                  {ev.desc && <div dir="auto" style={{ color: "#555", fontSize: 13, lineHeight: 1.8, margin: 0 }} dangerouslySetInnerHTML={{ __html: ev.desc }} />}
                  {isPast && <span style={{ display: "inline-block", marginTop: 10, backgroundColor: "#f5f5f5", color: "#888", fontSize: 11, padding: "3px 10px", borderRadius: 8, fontWeight: 600 }}>Past Event</span>}

                  {/* Admin actions */}
                  {isAdmin && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16, paddingTop: 12, borderTop: "1px solid #f5f5f5" }}>
                      <button onClick={() => openEdit(ev)} style={actionBtn("#3b82f6")}><Edit2 size={12} /> Edit</button>
                      {ev.status !== "published" && <button onClick={() => setStatus(ev.id, "published")} style={actionBtn("#15803d")}><CheckCircle size={12} /> Publish</button>}
                      {ev.status === "published" && <button onClick={() => setStatus(ev.id, "draft")} style={actionBtn("#854d0e")}><EyeOff size={12} /> Unpublish</button>}
                      {ev.status !== "rejected" && <button onClick={() => setStatus(ev.id, "rejected")} style={actionBtn("#b91c1c")}><XCircle size={12} /> Reject</button>}
                      {ev.status === "rejected" && <button onClick={() => setStatus(ev.id, "draft")} style={actionBtn("#854d0e")}><Eye size={12} /> Restore</button>}
                      <button onClick={() => del(ev.id)} style={actionBtn("#6b7280", true)}><Trash2 size={12} /> Delete</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {paginated.totalPages > 0 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 32, fontFamily: "'Poppins', sans-serif" }}>
            <span style={{ fontSize: 13, color: "#666" }}>Showing page {page} of {paginated.totalPages}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(p - 1, 1))} style={actionBtn(GREEN, page === 1)}>
                <ChevronLeft size={16} /> Prev
              </button>
              <button disabled={!paginated.hasMore} onClick={() => setPage((p) => Math.min(p + 1, paginated.totalPages))} style={actionBtn(GREEN, !paginated.hasMore)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </section>
      <style>{`@media (max-width: 700px) { .events-grid { grid-template-columns: 1fr !important; } }`}</style>
      
      {galleryImages && (
        <LightboxGallery images={galleryImages.images} initialIndex={galleryImages.index} onClose={() => setGalleryImages(null)} />
      )}
    </div>
  );
}

function actionBtn(color: string, subtle = false): React.CSSProperties {
  return {
    display: "inline-flex", alignItems: "center", gap: 4,
    backgroundColor: subtle ? "#f5f5f5" : `${color}15`,
    color: subtle ? "#555" : color,
    border: `1px solid ${subtle ? "#e5e5e5" : `${color}40`}`,
    borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 700,
    cursor: "pointer", fontFamily: "'Lato', sans-serif",
  };
}
