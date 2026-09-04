import { CheckCircle } from "lucide-react";

const values = [
  "Promoting unity and brotherhood among community members",
  "Providing educational opportunities and scholarships",
  "Offering healthcare and social welfare programs",
  "Preserving cultural heritage and traditions",
  "Advocating for community rights and representation",
  "Supporting youth development and leadership",
];

export function About() {
  return (
    <section id="about" style={{ backgroundColor: "#f8f5ef" }} className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Section heading */}
        <div className="text-center mb-12">
          <p style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.12em", fontWeight: 600 }} className="uppercase mb-2">
            Who We Are
          </p>
          <h2 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 700 }}>
            About Anjuman-e-Araian
          </h2>
          <div style={{ backgroundColor: "#c8a04a", height: 3, width: 64 }} className="mx-auto mt-4 rounded" />
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1608020932658-d0e19a69580b?w=700&h=500&fit=crop&auto=format"
              alt="Anjuman-e-Araian community building"
              className="w-full rounded-lg shadow-xl object-cover"
              style={{ height: 420 }}
            />
            <div
              style={{ backgroundColor: "#1a4d2e", bottom: -20, right: -20 }}
              className="absolute rounded-lg p-5 shadow-xl hidden sm:block"
            >
              <p style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 36, fontWeight: 700, lineHeight: 1 }}>1947</p>
              <p style={{ color: "white", fontFamily: "'Poppins', sans-serif", fontSize: 12 }}>Year Founded</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <h3 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 600, lineHeight: 1.4 }} className="mb-4">
              A Legacy of Service, Unity and Progress
            </h3>
            <p style={{ color: "#444", fontFamily: "'Poppins', sans-serif", fontSize: 15, lineHeight: 1.8 }} className="mb-4">
              Anjuman-e-Araian was established at the time of Pakistan's independence to unite the Araian community and address their social, educational, and economic needs. For over seven decades, we have stood as a pillar of strength for our members across the nation.
            </p>
            <p style={{ color: "#444", fontFamily: "'Poppins', sans-serif", fontSize: 15, lineHeight: 1.8 }} className="mb-6">
              From humble beginnings in Lahore, the organization has grown to encompass over 120 district branches, serving hundreds of thousands of families with dedicated programs in education, healthcare, and community development.
            </p>

            <ul className="space-y-2.5 mb-8">
              {values.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle size={18} style={{ color: "#c8a04a", flexShrink: 0, marginTop: 2 }} />
                  <span style={{ color: "#555", fontFamily: "'Poppins', sans-serif", fontSize: 14, lineHeight: 1.6 }}>{item}</span>
                </li>
              ))}
            </ul>

            <a
              href="#activities"
              style={{
                backgroundColor: "#1a4d2e",
                color: "white",
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: "0.08em",
              }}
              className="inline-block px-7 py-3 rounded uppercase hover:brightness-110 transition-all"
            >
              Our Activities
            </a>
          </div>
        </div>

        {/* Leadership cards */}
        <div className="mt-16">
          <h3
            style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, textAlign: "center" }}
            className="mb-8"
          >
            Central Leadership
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "Ch. Muhammad Rafiq", role: "President", city: "Lahore" },
              { name: "Ch. Tariq Mahmood", role: "General Secretary", city: "Faisalabad" },
              { name: "Ch. Imran Butt", role: "Senior Vice President", city: "Gujranwala" },
              { name: "Ch. Asif Nawaz", role: "Finance Secretary", city: "Sialkot" },
            ].map((person) => (
              <div
                key={person.name}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow text-center"
                style={{ borderTop: "3px solid #c8a04a" }}
              >
                <div style={{ backgroundColor: "#fce8e6", height: 80 }} className="flex items-center justify-center">
                  <div
                    style={{ backgroundColor: "#1a4d2e", width: 56, height: 56, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <span style={{ color: "#c8a04a", fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700 }}>
                      {person.name.split(" ")[1]?.[0] ?? person.name[0]}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 15, fontWeight: 600 }}>{person.name}</p>
                  <p style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 600 }} className="mt-0.5">{person.role}</p>
                  <p style={{ color: "#888", fontFamily: "'Poppins', sans-serif", fontSize: 12 }} className="mt-1">{person.city}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
