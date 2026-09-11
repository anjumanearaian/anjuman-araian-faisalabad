import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { CalendarDays, Clock3, MapPin, Search, ArrowUpRight } from "lucide-react";
import { EventItem, NewsItem, fetchPublishedContentHub, paginateData } from "../lib/contentStore";
import { contentDetailPath, excerptFromHtml } from "../lib/contentSeo";
import { ResponsiveImage } from "../components/ui/ResponsiveImage";
import { PageHeader } from "../components/PageHeader";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

type HubItem = NewsItem | EventItem;
type SectionKey = "all" | "announcements" | "news" | "activities" | "events" | "minutes";

const filters: { key: SectionKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "announcements", label: "Announcements" },
  { key: "news", label: "News & Press" },
  { key: "activities", label: "Activities" },
  { key: "events", label: "Meetings & Events" },
  { key: "minutes", label: "Minutes" },
];

function itemBody(item: HubItem) {
  return item.type === "event" ? (item as EventItem).desc : (item as NewsItem).body;
}

function isUpcoming(item: HubItem) {
  if (item.type !== "event") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(`${item.date}T00:00:00`);
  return !Number.isNaN(date.getTime()) && date >= today;
}

function sectionFor(item: HubItem): SectionKey {
  if (item.type === "event") return "events";
  const category = String(item.category || "").toLowerCase();
  if (category.includes("announcement")) return "announcements";
  if (category.includes("activity")) return "activities";
  if (category.includes("minute")) return "minutes";
  return "news";
}

function prettyDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export function UpdatesPage() {
  const [params, setParams] = useSearchParams();
  const initial = (params.get("section") || "all") as SectionKey;
  const [section, setSection] = useState<SectionKey>(filters.some((f) => f.key === initial) ? initial : "all");
  const [items, setItems] = useState<HubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 9;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    fetchPublishedContentHub()
      .then((data) => { if (active) setItems(data as HubItem[]); })
      .catch((error: any) => { if (active) setLoadError(error?.message || "Updates could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const requested = (params.get("section") || "all") as SectionKey;
    const normalized: SectionKey = filters.some((filter) => filter.key === requested) ? requested : "all";
    setSection((current) => current === normalized ? current : normalized);
  }, [params]);

  useEffect(() => setPage(1), [section, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .filter((item) => section === "all" || sectionFor(item) === section)
      .filter((item) => !q || `${item.title} ${item.category} ${excerptFromHtml(itemBody(item), 1000)}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const aTime = new Date(`${a.date}T00:00:00`).getTime();
        const bTime = new Date(`${b.date}T00:00:00`).getTime();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const aUpcoming = a.type === "event" && Number.isFinite(aTime) && aTime >= today.getTime();
        const bUpcoming = b.type === "event" && Number.isFinite(bTime) && bTime >= today.getTime();

        // In the combined feed, upcoming meetings/events stay ahead of completed items.
        // Within the Meetings & Events tab, the nearest upcoming item is shown first;
        // completed events then continue newest-to-oldest.
        if ((section === "all" || section === "events") && aUpcoming !== bUpcoming) return aUpcoming ? -1 : 1;
        if (aUpcoming && bUpcoming) return aTime - bTime;
        if (aTime !== bTime) return bTime - aTime;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
  }, [items, query, section]);

  const paginated = useMemo(() => paginateData(filtered, page, limit), [filtered, page]);

  const chooseSection = (next: SectionKey) => {
    setSection(next);
    const updated = new URLSearchParams(params);
    if (next === "all") updated.delete("section");
    else updated.set("section", next);
    setParams(updated, { replace: true });
  };

  return (
    <div>
      <PageHeader
        title="Updates & Events"
        subtitle="Official announcements, news, activities, meetings, events and minutes in one place"
        breadcrumb={["Home", "Updates & Events"]}
      />

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "52px 24px 72px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginBottom: 18 }}>
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => chooseSection(filter.key)}
              style={{
                border: `1.5px solid ${GREEN}`,
                background: section === filter.key ? GREEN : "white",
                color: section === filter.key ? "white" : GREEN,
                borderRadius: 999,
                padding: "8px 16px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div style={{ position: "relative", maxWidth: 620, marginBottom: 30 }}>
          <Search size={17} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#879089" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search updates, meetings, announcements or categories..."
            aria-label="Search updates"
            style={{ width: "100%", boxSizing: "border-box", border: "1px solid #d9dfda", borderRadius: 9, padding: "11px 14px 11px 42px", fontSize: 14, outline: "none" }}
          />
        </div>

        {loadError && <div style={{ background: "#fff1f2", border: "1px solid #fecdd3", color: "#9f1239", borderRadius: 9, padding: "12px 14px", marginBottom: 24 }}>{loadError}</div>}
        {loading && <div style={{ padding: 48, textAlign: "center", color: "#7a837c" }}>Loading updates…</div>}

        {!loading && !paginated.data.length && (
          <div style={{ border: "1px dashed #bdc8bf", background: "#f8faf8", borderRadius: 12, padding: 44, textAlign: "center", color: "#6f786f" }}>No published items found for this section.</div>
        )}

        {!loading && paginated.data.length > 0 && (
          <div className="updates-hub-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 22 }}>
            {paginated.data.map((item) => {
              const body = itemBody(item);
              const event = item.type === "event" ? (item as EventItem) : null;
              const image = item.images?.[0];
              return (
                <article key={item.id} data-content-id={item.id} style={{ background: "white", border: "1px solid #e3e8e4", borderRadius: 14, overflow: "hidden", boxShadow: "0 8px 30px rgba(26,77,46,.06)", display: "flex", flexDirection: "column", minWidth: 0 }}>
                  {image ? (
                    <Link to={contentDetailPath(item)} aria-label={`Open ${item.title}`}>
                      <ResponsiveImage src={image} alt={`${item.title} featured image`} widthHint={720} sizes="(max-width: 760px) 100vw, 33vw" style={{ width: "100%", aspectRatio: "16 / 9", objectFit: event ? "contain" : "cover", display: "block", background: event ? "#f7f4ec" : "#eef2ef" }} />
                    </Link>
                  ) : (
                    <div style={{ aspectRatio: "16 / 9", background: "linear-gradient(135deg,#edf4ef,#f8f2e5)", display: "grid", placeItems: "center", color: GREEN, fontFamily: "'Playfair Display', serif", fontWeight: 700 }}>Anjuman-e-Araian Faisalabad</div>
                  )}

                  <div style={{ padding: 20, display: "flex", flexDirection: "column", flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                      <span style={{ display: "inline-flex", background: "#f0f7f3", color: GREEN, borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{item.category}</span>
                      {event && <span style={{ display: "inline-flex", background: isUpcoming(item) ? "#ecfdf3" : "#f3f4f6", color: isUpcoming(item) ? "#166534" : "#6b7280", borderRadius: 999, padding: "4px 9px", fontSize: 11, fontWeight: 800 }}>{isUpcoming(item) ? "Upcoming" : "Past event"}</span>}
                    </div>

                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "#7b837d", fontSize: 12, marginBottom: 10 }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={13} color={GOLD} /> {prettyDate(item.date)}</span>
                      {event?.time && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Clock3 size={13} color={GOLD} /> {event.time}</span>}
                    </div>

                    <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 21, lineHeight: 1.3, margin: "0 0 10px" }}>{item.title}</h2>
                    {event?.location && <p style={{ display: "flex", gap: 6, alignItems: "flex-start", color: "#7b837d", fontSize: 12, margin: "0 0 10px" }}><MapPin size={14} color={GOLD} style={{ flexShrink: 0, marginTop: 2 }} /> {event.location}</p>}
                    <p style={{ color: "#5f685f", lineHeight: 1.65, fontSize: 13, margin: "0 0 16px" }}>{excerptFromHtml(body, 155)}</p>
                    <Link to={contentDetailPath(item)} style={{ marginTop: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: GREEN, textDecoration: "none", fontWeight: 800, fontSize: 13 }}>Open full post <ArrowUpRight size={15} /></Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {paginated.totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 34 }}>
            <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ border: "1px solid #d7ddd8", background: "white", color: GREEN, padding: "8px 14px", borderRadius: 8, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? .45 : 1 }}>Previous</button>
            <span style={{ color: "#6b736d", fontSize: 13 }}>Page {paginated.page} of {paginated.totalPages}</span>
            <button disabled={!paginated.hasMore} onClick={() => setPage((p) => Math.min(paginated.totalPages, p + 1))} style={{ border: "1px solid #d7ddd8", background: "white", color: GREEN, padding: "8px 14px", borderRadius: 8, cursor: paginated.hasMore ? "pointer" : "not-allowed", opacity: paginated.hasMore ? 1 : .45 }}>Next</button>
          </div>
        )}
      </section>

      <style>{`@media (max-width: 900px){.updates-hub-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}} @media (max-width: 620px){.updates-hub-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}
