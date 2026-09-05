import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { fetchAllContent, NewsItem } from "../../lib/contentStore";

const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
export default function ActivitiesSection() {
  const [items, setItems] = useState<NewsItem[]>([]);
  useEffect(() => { fetchAllContent("news", 1, 3).then((r) => setItems(r.data as NewsItem[])).catch(() => setItems([])); }, []);
  return <section className="home-section">
    <div className="home-shell">
      <div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">Community updates</span><h2>Latest Activities</h2></div><Link to="/news">View all news <ArrowUpRight size={17} /></Link></div>
      {items.length ? <div className="home-news-grid">{items.map((item, index) => <article className={index === 0 ? "home-news-card home-news-card--featured" : "home-news-card"} key={item.id}>
        {item.images?.[0] && <img src={item.images[0]} alt={item.title} />}
        <div><span className="home-meta"><CalendarDays size={14} /> {new Date(item.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}</span><h3>{item.title}</h3><p>{plain(item.body).slice(0, 150)}{plain(item.body).length > 150 ? "…" : ""}</p><Link to="/news" state={{ expandNewsId: item.id }}>Read update <ArrowUpRight size={15} /></Link></div>
      </article>)}</div> : <div className="home-empty">Official activities and announcements will appear here after publication.</div>}
    </div>
  </section>;
}
