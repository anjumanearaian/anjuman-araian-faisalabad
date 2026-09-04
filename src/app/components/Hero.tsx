import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const slides = [
  {
    image: "https://images.unsplash.com/photo-1603491656337-3b491147917c?w=1400&h=600&fit=crop&auto=format",
    title: "Anjuman-e-Araian Pakistan",
    subtitle: "Serving the Araian Community Since 1947",
    description: "United in heritage, committed to progress, dedicated to the welfare of our community across generations.",
    cta: "Learn More",
    ctaHref: "#about",
  },
  {
    image: "https://images.unsplash.com/photo-1577214382660-a347368c7325?w=1400&h=600&fit=crop&auto=format",
    title: "Community Welfare and Development",
    subtitle: "Empowering Families, Strengthening Bonds",
    description: "Providing educational scholarships, healthcare support, and social assistance to members across Pakistan.",
    cta: "Our Programs",
    ctaHref: "#activities",
  },
  {
    image: "https://images.unsplash.com/photo-1573939705721-9fa2cdcda901?w=1400&h=600&fit=crop&auto=format",
    title: "Annual Gathering 2025",
    subtitle: "Join Us in Celebration of Our Heritage",
    description: "The grand annual convention brings together thousands of members from across the country every year.",
    cta: "Register Now",
    ctaHref: "#membership",
  },
];

const announcements = [
  "Annual General Meeting scheduled for July 15, 2026 — All members are requested to attend",
  "Scholarship applications for 2026-27 are now open — Last date: August 31, 2026",
  "Free medical camp at District Headquarters Lahore on June 20, 2026",
  "Youth Wing elections to be held on July 5, 2026 — Nominations invited",
];

export function Hero() {
  const [current, setCurrent] = useState(0);
  const [announcementIdx, setAnnouncementIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnnouncementIdx((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + slides.length) % slides.length);
  const next = () => setCurrent((c) => (c + 1) % slides.length);

  return (
    <section id="home">
      {/* Announcement ticker */}
      <div style={{ backgroundColor: "#c8a04a" }} className="py-2 px-4 overflow-hidden">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span
            style={{ backgroundColor: "#1a4d2e", color: "white", fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em" }}
            className="px-3 py-1 rounded flex-shrink-0 uppercase"
          >
            Announcements
          </span>
          <p style={{ color: "#1a1a1a", fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 500 }} className="truncate">
            {announcements[announcementIdx]}
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="relative overflow-hidden" style={{ height: "520px" }}>
        {slides.map((slide, i) => (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-1000"
            style={{ opacity: i === current ? 1 : 0, zIndex: i === current ? 1 : 0 }}
          >
            <img
              src={slide.image}
              alt={slide.title}
              className="w-full h-full object-cover"
            />
            <div
              className="absolute inset-0"
              style={{ background: "linear-gradient(to right, rgba(26,77,46,0.85) 0%, rgba(26,77,46,0.5) 60%, rgba(0,0,0,0.1) 100%)" }}
            />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-8 w-full">
                <div className="max-w-xl">
                  <p
                    style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.12em", fontWeight: 600 }}
                    className="uppercase mb-2"
                  >
                    {slide.subtitle}
                  </p>
                  <h1
                    style={{ color: "white", fontFamily: "'Playfair Display', serif", fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 700, lineHeight: 1.2 }}
                    className="mb-4"
                  >
                    {slide.title}
                  </h1>
                  <p
                    style={{ color: "rgba(255,255,255,0.88)", fontFamily: "'Poppins', sans-serif", fontSize: 16, lineHeight: 1.7 }}
                    className="mb-6"
                  >
                    {slide.description}
                  </p>
                  <a
                    href={slide.ctaHref}
                    style={{
                      backgroundColor: "#c8a04a",
                      color: "#1a1a1a",
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 700,
                      fontSize: 14,
                      letterSpacing: "0.08em",
                    }}
                    className="inline-block px-7 py-3 rounded uppercase hover:brightness-110 transition-all"
                  >
                    {slide.cta}
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Controls */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
          aria-label="Previous slide"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transition-colors"
          aria-label="Next slide"
        >
          <ChevronRight size={22} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all"
              style={{
                width: i === current ? 24 : 8,
                height: 8,
                backgroundColor: i === current ? "#c8a04a" : "rgba(255,255,255,0.5)",
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ backgroundColor: "#1a4d2e" }} className="py-5 px-4">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center text-white">
          {[
            { value: "75+", label: "Years of Service" },
            { value: "500K+", label: "Members Nationwide" },
            { value: "120+", label: "District Branches" },
            { value: "25K+", label: "Scholarships Awarded" },
          ].map((stat) => (
            <div key={stat.label}>
              <div style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 28, fontWeight: 700 }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 13, color: "rgba(255,255,255,0.75)" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
