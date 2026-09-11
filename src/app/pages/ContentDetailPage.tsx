import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, CalendarDays, Clock3, MapPin, Tag } from "lucide-react";
import { EventItem, NewsItem, fetchPublishedContentHub } from "../lib/contentStore";
import { excerptFromHtml, stripHtml } from "../lib/contentSeo";
import { ResponsiveImage } from "../components/ui/ResponsiveImage";
import { LightboxGallery } from "../components/ui/LightboxGallery";
import { PageHeader } from "../components/PageHeader";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";
type HubItem = NewsItem | EventItem;

function bodyFor(item: HubItem) {
  return item.type === "event" ? (item as EventItem).desc : (item as NewsItem).body;
}

function upsertMeta(selector: string, attrs: Record<string, string>) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element!.setAttribute(key, value));
  return element;
}

function setCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "canonical";
    document.head.appendChild(link);
  }
  link.href = url;
}

function prettyDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" });
}

function schemaEventStartDate(date: string, time?: string) {
  if (!time) return date;
  const value = time.trim();
  const twelveHour = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]);
    const minute = Number(twelveHour[2] || "0");
    const meridiem = twelveHour[3].toUpperCase();
    if (hour >= 1 && hour <= 12 && minute >= 0 && minute <= 59) {
      if (meridiem === "AM" && hour === 12) hour = 0;
      if (meridiem === "PM" && hour !== 12) hour += 12;
      return `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+05:00`;
    }
  }
  const twentyFourHour = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (twentyFourHour) return `${date}T${twentyFourHour[1].padStart(2, "0")}:${twentyFourHour[2]}:00+05:00`;
  return date;
}

export function ContentDetailPage() {
  const { id = "" } = useParams();
  const [item, setItem] = useState<HubItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [gallery, setGallery] = useState<{ images: string[]; index: number } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchPublishedContentHub()
      .then((items) => {
        if (!active) return;
        const found = (items as HubItem[]).find((entry) => entry.id === id) || null;
        setItem(found);
        if (!found) setError("This post could not be found or is no longer published.");
      })
      .catch((e: any) => { if (active) setError(e?.message || "The post could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);

  const body = useMemo(() => item ? bodyFor(item) : "", [item]);

  useEffect(() => {
    if (!item) return;
    const description = excerptFromHtml(body, 155) || `${item.title} - Anjuman-e-Araian Faisalabad`;
    const canonical = window.location.href.split("?")[0].split("#")[0];
    const image = item.images?.[0];
    const absoluteImage = image ? new URL(image, window.location.origin).href : "";
    const oldTitle = document.title;

    document.title = `${item.title} | Anjuman-e-Araian Faisalabad`;
    upsertMeta('meta[name="description"]', { name: "description", content: description });
    upsertMeta('meta[property="og:title"]', { property: "og:title", content: item.title });
    upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
    upsertMeta('meta[property="og:type"]', { property: "og:type", content: item.type === "event" ? "website" : "article" });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonical });
    upsertMeta('meta[name="twitter:card"]', { name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    if (absoluteImage) upsertMeta('meta[property="og:image"]', { property: "og:image", content: absoluteImage });
    else document.head.querySelector('meta[property="og:image"]')?.remove();
    setCanonical(canonical);

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.dynamicContentSchema = item.id;
    const event = item.type === "event" ? (item as EventItem) : null;
    schema.text = JSON.stringify(event ? {
      "@context": "https://schema.org",
      "@type": "Event",
      name: item.title,
      startDate: schemaEventStartDate(item.date, event.time),
      eventStatus: "https://schema.org/EventScheduled",
      location: event.location ? { "@type": "Place", name: event.location, address: event.location } : undefined,
      image: item.images?.length ? item.images.map((src) => new URL(src, window.location.origin).href) : undefined,
      description: stripHtml(body),
      organizer: { "@type": "Organization", name: "Anjuman-e-Araian Faisalabad" },
      url: canonical,
    } : {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: item.title,
      datePublished: item.date,
      dateModified: item.updatedAt,
      image: item.images?.length ? item.images.map((src) => new URL(src, window.location.origin).href) : undefined,
      description,
      author: { "@type": "Organization", name: "Anjuman-e-Araian Faisalabad" },
      publisher: { "@type": "Organization", name: "Anjuman-e-Araian Faisalabad" },
      mainEntityOfPage: canonical,
    });
    document.head.appendChild(schema);

    return () => {
      document.title = oldTitle;
      schema.remove();
    };
  }, [item, body]);

  if (loading) return <div><PageHeader title="Loading Update" subtitle="Please wait" breadcrumb={["Home", "Updates & Events"]} /><div style={{ padding: 70, textAlign: "center", color: "#707870" }}>Loading post…</div></div>;

  if (!item || error) {
    return (
      <div>
        <PageHeader title="Post Not Found" subtitle="This update is unavailable" breadcrumb={["Home", "Updates & Events"]} />
        <section style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
          <p style={{ color: "#686f69", marginBottom: 22 }}>{error || "This post is unavailable."}</p>
          <Link to="/updates" style={{ color: GREEN, fontWeight: 800, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 7 }}><ArrowLeft size={16} /> Back to Updates & Events</Link>
        </section>
      </div>
    );
  }

  const event = item.type === "event" ? (item as EventItem) : null;
  const images = item.images || [];

  return (
    <div>
      <PageHeader title={event ? (event.category || "Event") : "Official Update"} subtitle={event ? "Meeting / Event Details" : item.category} breadcrumb={["Home", "Updates & Events", item.title]} />
      <article id={`content-${item.id}`} data-content-id={item.id} style={{ maxWidth: 1040, margin: "0 auto", padding: "48px 24px 76px" }}>
        <Link to={item.type === "event" ? "/updates?section=events" : "/updates"} style={{ color: GREEN, textDecoration: "none", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 7, fontSize: 13, marginBottom: 22 }}><ArrowLeft size={15} /> Back to all updates</Link>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 15 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#eff6f1", color: GREEN, borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800 }}><Tag size={12} /> {item.category}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#faf7ef", color: "#80620d", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800 }}><CalendarDays size={12} /> {prettyDate(item.date)}</span>
          {event?.time && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#f5f5f4", color: "#5f5f5a", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 800 }}><Clock3 size={12} /> {event.time}</span>}
        </div>

        <h1 style={{ fontFamily: "'Playfair Display', serif", color: GREEN, fontSize: "clamp(2rem,5vw,3.45rem)", lineHeight: 1.12, margin: "0 0 18px" }}>{item.title}</h1>
        {event?.location && <p style={{ color: "#687069", display: "flex", alignItems: "flex-start", gap: 7, lineHeight: 1.5, margin: "0 0 24px" }}><MapPin size={17} color={GOLD} style={{ flexShrink: 0, marginTop: 3 }} /> {event.location}</p>}

        {images[0] && (
          <button type="button" onClick={() => setGallery({ images, index: 0 })} style={{ display: "block", width: "100%", padding: 0, border: 0, background: "none", cursor: "zoom-in", marginBottom: 30 }} aria-label="Open featured image">
            <ResponsiveImage src={images[0]} alt={`${item.title} featured image`} widthHint={1600} sizes="(max-width: 1040px) 100vw, 1040px" fetchPriority="high" loading="eager" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: event ? "contain" : "cover", borderRadius: 14, background: event ? "#f7f4ec" : "#eef2ef", boxShadow: "0 12px 34px rgba(26,77,46,.09)" }} />
          </button>
        )}

        <div className="content-detail-body" dir="auto" style={{ color: "#3f4741", fontSize: 16, lineHeight: 1.9 }} dangerouslySetInnerHTML={{ __html: body }} />

        {images.length > 1 && (
          <div style={{ marginTop: 34 }}>
            <h2 style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 24, marginBottom: 15 }}>Photo Gallery</h2>
            <div className="detail-gallery-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 12 }}>
              {images.map((src, index) => (
                <button key={`${src}-${index}`} onClick={() => setGallery({ images, index })} style={{ border: 0, padding: 0, background: "none", cursor: "zoom-in", borderRadius: 10, overflow: "hidden" }} aria-label={`Open photo ${index + 1}`}>
                  <ResponsiveImage src={src} alt={`${item.title} photo ${index + 1}`} widthHint={520} sizes="(max-width: 650px) 50vw, 33vw" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 38, paddingTop: 18, borderTop: "1px solid #e5e9e6", color: "#879088", fontSize: 11 }}>Post ID: {item.id}</div>
      </article>

      <style>{`.content-detail-body img{max-width:100%;height:auto;border-radius:10px}.content-detail-body a{color:${GREEN}} @media(max-width:650px){.detail-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}`}</style>
      {gallery && <LightboxGallery images={gallery.images} initialIndex={gallery.index} onClose={() => setGallery(null)} />}
    </div>
  );
}
