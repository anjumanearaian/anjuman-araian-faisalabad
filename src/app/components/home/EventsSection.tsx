import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { EventItem, fetchPublishedContentAll } from "../../lib/contentStore";
import { contentDetailPath } from "../../lib/contentSeo";

export default function EventsSection() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    fetchPublishedContentAll("event")
      .then((data) => setEvents((data as EventItem[])
        .filter((event) => {
          const date = new Date(`${event.date}T00:00:00`);
          return !Number.isNaN(date.getTime()) && date >= today;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)))
      .catch(() => setEvents([]));
  }, []);

  return <section className="home-section"><div className="home-shell"><div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">Meet and participate</span><h2>Upcoming Meetings & Events</h2></div><Link to="/updates?section=events">All meetings & events <ArrowRight size={17} /></Link></div>
    {events.length ? <div className="home-events">{events.map((event) => { const date = new Date(`${event.date}T00:00:00`); return <Link to={contentDetailPath(event)} key={event.id} data-content-id={event.id} style={{ color: "inherit", textDecoration: "none" }}><article><div className="home-event-date"><strong>{date.getDate()}</strong><span>{date.toLocaleString("en", { month: "short" })}</span></div><div><span>{event.category}</span><h3>{event.title}</h3>{event.location && <p><MapPin size={14} /> {event.location}</p>}</div></article></Link>; })}</div> : <div className="home-empty">Upcoming meetings and community events will appear here after publication.</div>}
  </div></section>;
}
