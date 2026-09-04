import { Calendar, MapPin, ArrowRight } from "lucide-react";

const news = [
  {
    date: "June 10, 2026",
    category: "Announcement",
    title: "Annual General Meeting 2026 — Date Announced",
    excerpt: "The Annual General Meeting of Anjuman-e-Araian will be held on July 15, 2026 at the Central Office, Lahore. All members are requested to attend.",
    image: "https://images.unsplash.com/photo-1652085287594-f51d192445b4?w=500&h=300&fit=crop&auto=format",
  },
  {
    date: "May 28, 2026",
    category: "Welfare",
    title: "Free Medical Camp at Gujranwala — 2,000 Patients Treated",
    excerpt: "A free medical camp organized in collaboration with district health authorities provided treatment to over 2,000 community members in Gujranwala.",
    image: "https://images.unsplash.com/photo-1531804308561-b6438d25a810?w=500&h=300&fit=crop&auto=format",
  },
  {
    date: "May 15, 2026",
    category: "Education",
    title: "Scholarship Distribution Ceremony 2025-26",
    excerpt: "450 meritorious students from across Pakistan received scholarships at a ceremony presided over by the Central President in Lahore.",
    image: "https://images.unsplash.com/photo-1573939705721-9fa2cdcda901?w=500&h=300&fit=crop&auto=format",
  },
];

const events = [
  {
    date: { day: "15", month: "Jul" },
    title: "Annual General Meeting 2026",
    location: "Central Office, Lahore",
    time: "10:00 AM",
  },
  {
    date: { day: "20", month: "Jun" },
    title: "Free Medical Camp — Lahore",
    location: "DHQ Hospital, Lahore",
    time: "9:00 AM – 3:00 PM",
  },
  {
    date: { day: "05", month: "Jul" },
    title: "Youth Wing Elections 2026",
    location: "All District Branches",
    time: "All Day",
  },
  {
    date: { day: "31", month: "Aug" },
    title: "Scholarship Application Deadline",
    location: "Online / District Offices",
    time: "5:00 PM",
  },
  {
    date: { day: "20", month: "Sep" },
    title: "Grand Annual Convention 2026",
    location: "Expo Centre, Lahore",
    time: "10:00 AM",
  },
];

const categoryColors: Record<string, string> = {
  Announcement: "#1a4d2e",
  Welfare: "#c0392b",
  Education: "#c8a04a",
};

export function NewsEvents() {
  return (
    <section id="news" style={{ backgroundColor: "#ffffff" }} className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.12em", fontWeight: 600 }} className="uppercase mb-2">
            Stay Informed
          </p>
          <h2 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 700 }}>
            News and Upcoming Events
          </h2>
          <div style={{ backgroundColor: "#c8a04a", height: 3, width: 64 }} className="mx-auto mt-4 rounded" />
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* News cards — takes 2 cols */}
          <div className="lg:col-span-2 grid sm:grid-cols-2 gap-6 content-start">
            {news.map((item) => (
              <div
                key={item.title}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer group"
                style={{ border: "1px solid rgba(26,77,46,0.1)" }}
              >
                <div className="overflow-hidden" style={{ height: 180 }}>
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <span
                      style={{ backgroundColor: categoryColors[item.category] ?? "#1a4d2e", color: "white", fontSize: 11, fontFamily: "'Poppins', sans-serif", fontWeight: 700, letterSpacing: "0.06em" }}
                      className="px-2 py-0.5 rounded uppercase"
                    >
                      {item.category}
                    </span>
                    <span style={{ color: "#999", fontFamily: "'Poppins', sans-serif", fontSize: 12 }}>{item.date}</span>
                  </div>
                  <h4 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, lineHeight: 1.4 }} className="mb-2 group-hover:underline">
                    {item.title}
                  </h4>
                  <p style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 13, lineHeight: 1.7 }} className="mb-3">
                    {item.excerpt}
                  </p>
                  <button style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 700 }} className="flex items-center gap-1 hover:gap-2 transition-all">
                    Read More <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Events sidebar */}
          <div>
            <div
              style={{ backgroundColor: "#1a4d2e", borderRadius: 8 }}
              className="p-5 sticky top-4"
            >
              <h3 style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700 }} className="mb-5">
                Upcoming Events
              </h3>
              <ul className="space-y-4">
                {events.map((ev) => (
                  <li
                    key={ev.title}
                    className="flex items-start gap-4 pb-4 cursor-pointer hover:opacity-80 transition-opacity"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
                  >
                    <div
                      style={{ backgroundColor: "#c8a04a", borderRadius: 6, minWidth: 48, textAlign: "center" }}
                      className="py-1.5"
                    >
                      <div style={{ color: "#1a1a1a", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                        {ev.date.day}
                      </div>
                      <div style={{ color: "#1a1a1a", fontFamily: "'Poppins', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }} className="uppercase">
                        {ev.date.month}
                      </div>
                    </div>
                    <div>
                      <p style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontSize: 14, fontWeight: 600, lineHeight: 1.4 }}>
                        {ev.title}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontFamily: "'Poppins', sans-serif", fontSize: 12 }} className="flex items-center gap-1 mt-1">
                        <MapPin size={11} /> {ev.location}
                      </p>
                      <p style={{ color: "rgba(255,255,255,0.5)", fontFamily: "'Poppins', sans-serif", fontSize: 12 }} className="flex items-center gap-1 mt-0.5">
                        <Calendar size={11} /> {ev.time}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <a
                href="#"
                style={{
                  color: "#1a4d2e",
                  backgroundColor: "#c8a04a",
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                }}
                className="mt-4 block text-center py-2.5 rounded uppercase hover:brightness-110 transition-all"
              >
                View All Events
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
