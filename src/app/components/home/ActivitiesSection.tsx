import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, CalendarDays } from "lucide-react";
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

  return <section className="home-section">
    <div className="home-shell">
      <div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">Community updates</span><h2>Latest Updates</h2></div><Link to="/updates">View all updates <ArrowUpRight size={17} /></Link></div>
      {items.length ? <div className="home-news-grid">{items.map((item, index) => {
        const excerpt = excerptFromHtml(bodyFor(item), 150);
        return <article className={index === 0 ? "home-news-card home-news-card--featured" : "home-news-card"} key={item.id} data-content-id={item.id}>
          {item.images?.[0] && <ResponsiveImage src={item.images[0]} alt={`${item.title} featured image`} widthHint={index === 0 ? 900 : 480} sizes={index === 0 ? "(max-width:820px) 100vw, 56vw" : "(max-width:820px) 100vw, 150px"} />}
          <div><span className="home-meta"><CalendarDays size={14} /> {new Date(`${item.date}T00:00:00`).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })} · {item.category}</span><h3>{item.title}</h3><p>{excerpt}</p><Link to={contentDetailPath(item)}>Read full post <ArrowUpRight size={15} /></Link></div>
        </article>;
      })}</div> : <div className="home-empty">Official announcements, activities, news and events will appear here after publication.</div>}
    </div>
  </section>;
}
