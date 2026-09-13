import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, CalendarDays, Newspaper } from "lucide-react";
import { EventItem, NewsItem, fetchPublishedContentHub } from "../../lib/contentStore";
import { contentDetailPath, excerptFromHtml } from "../../lib/contentSeo";
import { ResponsiveImage } from "../ui/ResponsiveImage";

type HubItem = NewsItem | EventItem;

function bodyFor(item: HubItem) {
  return item.type === "event" ? (item as EventItem).desc : (item as NewsItem).body;
}

export default function ActivitiesSection() {
  const [items, setItems] = useState<HubItem[]>([]);

  useEffect(() => {
    fetchPublishedContentHub()
      .then((data) => setItems((data as HubItem[]).slice(0, 3)))
      .catch(() => setItems([]));
  }, []);

  return <section className="home-section home-updates-section">
    <div className="home-shell">
      <div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">Community updates</span><h2>Latest Updates</h2></div><Link to="/updates">View all updates <ArrowUpRight size={17} /></Link></div>
      {items.length ? <div className="home-news-grid home-news-grid--landscape">{items.map((item) => {
        const excerpt = excerptFromHtml(bodyFor(item), 135);
        return <article className="home-news-card home-news-card--uniform" key={item.id} data-content-id={item.id}>
          <div className="home-news-media">
            {item.images?.[0] ? <ResponsiveImage src={item.images[0]} alt={`${item.title} featured image`} widthHint={640} sizes="(max-width:820px) 100vw, 33vw" /> : <div className="home-news-fallback"><Newspaper size={28} /><span>Anjuman-e-Araian Faisalabad</span></div>}
          </div>
          <div className="home-news-copy"><span className="home-meta"><CalendarDays size={14} /> {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })} · {item.category}</span><h3>{item.title}</h3><p>{excerpt}</p><Link to={contentDetailPath(item)}>Read full post <ArrowUpRight size={15} /></Link></div>
        </article>;
      })}</div> : <div className="home-empty">Official announcements, activities, news and events will appear here after publication.</div>}
    </div>
  </section>;
}
