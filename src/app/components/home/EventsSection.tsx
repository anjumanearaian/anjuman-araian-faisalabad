import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ArrowRight, MapPin } from "lucide-react";
import { EventItem, fetchAllContent } from "../../lib/contentStore";

export default function EventsSection() {
  const [events, setEvents] = useState<EventItem[]>([]);
  useEffect(() => { fetchAllContent("event", 1, 3).then((r) => setEvents(r.data as EventItem[])).catch(() => setEvents([])); }, []);
  return <section className="home-section"><div className="home-shell"><div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">Meet and participate</span><h2>Upcoming Events</h2></div><Link to="/events">All events <ArrowRight size={17} /></Link></div>
    {events.length ? <div className="home-events">{events.map((event) => { const date = new Date(event.date); return <article key={event.id}><div className="home-event-date"><strong>{date.getDate()}</strong><span>{date.toLocaleString("en", { month: "short" })}</span></div><div><span>{event.category}</span><h3>{event.title}</h3>{event.location && <p><MapPin size={14} /> {event.location}</p>}</div></article>; })}</div> : <div className="home-empty">Upcoming meetings and community events will appear here after publication.</div>}
  </div></section>;
}
