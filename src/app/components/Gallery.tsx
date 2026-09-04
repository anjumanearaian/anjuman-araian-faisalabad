import { useState } from "react";
import { X } from "lucide-react";

const photos = [
  {
    src: "https://images.unsplash.com/photo-1652085287594-f51d192445b4?w=600&h=400&fit=crop&auto=format",
    alt: "Community gathering indoors",
    caption: "Annual Convention 2025",
  },
  {
    src: "https://images.unsplash.com/photo-1573939705721-9fa2cdcda901?w=600&h=400&fit=crop&auto=format",
    alt: "Community members gathering",
    caption: "Eid Millan Party 2025",
  },
  {
    src: "https://images.unsplash.com/photo-1577214382660-a347368c7325?w=600&h=400&fit=crop&auto=format",
    alt: "People outside mosque",
    caption: "Friday Prayers Gathering",
  },
  {
    src: "https://images.unsplash.com/photo-1603491656337-3b491147917c?w=600&h=400&fit=crop&auto=format",
    alt: "Community building",
    caption: "Anjuman Central Office",
  },
  {
    src: "https://images.unsplash.com/photo-1531804308561-b6438d25a810?w=600&h=400&fit=crop&auto=format",
    alt: "Minaret architecture",
    caption: "Community Mosque",
  },
  {
    src: "https://images.unsplash.com/photo-1608020932658-d0e19a69580b?w=600&h=400&fit=crop&auto=format",
    alt: "Mosque architecture",
    caption: "Heritage Site Visit 2025",
  },
  {
    src: "https://images.unsplash.com/photo-1673769783206-ccb1f4eaaeb1?w=600&h=400&fit=crop&auto=format",
    alt: "Green domed building",
    caption: "District Branch — Multan",
  },
  {
    src: "https://images.unsplash.com/photo-1600434890250-44df6e4c0d05?w=600&h=400&fit=crop&auto=format",
    alt: "Islamic architecture",
    caption: "Heritage Tour 2024",
  },
];

export function Gallery() {
  const [lightbox, setLightbox] = useState<number | null>(null);

  return (
    <section id="gallery" style={{ backgroundColor: "#f8f5ef" }} className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.12em", fontWeight: 600 }} className="uppercase mb-2">
            Moments and Memories
          </p>
          <h2 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 700 }}>
            Photo Gallery
          </h2>
          <div style={{ backgroundColor: "#c8a04a", height: 3, width: 64 }} className="mx-auto mt-4 rounded" />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {photos.map((photo, i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg cursor-pointer group"
              style={{ height: i % 5 === 0 ? 240 : 180 }}
              onClick={() => setLightbox(i)}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-end">
                <p
                  style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontSize: 13, fontWeight: 600 }}
                  className="p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  {photo.caption}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-8">
          <a
            href="#"
            style={{
              border: "2px solid #1a4d2e",
              color: "#1a4d2e",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              letterSpacing: "0.08em",
            }}
            className="inline-block px-8 py-3 rounded uppercase hover:bg-[#1a4d2e] hover:text-white transition-colors"
          >
            View Full Gallery
          </a>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-yellow-400 transition-colors"
            onClick={() => setLightbox(null)}
            aria-label="Close"
          >
            <X size={32} />
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full">
            <img
              src={photos[lightbox].src.replace("w=600&h=400", "w=1200&h=800")}
              alt={photos[lightbox].alt}
              className="w-full rounded-lg shadow-2xl"
              style={{ maxHeight: "80vh", objectFit: "contain" }}
            />
            <p style={{ color: "rgba(255,255,255,0.8)", fontFamily: "'Poppins', sans-serif", fontSize: 14 }} className="text-center mt-3">
              {photos[lightbox].caption}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
