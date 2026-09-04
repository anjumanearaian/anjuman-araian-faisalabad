import { PageHeader } from "../components/PageHeader";

const GREEN = "#1a4d2e";
const GOLD = "#c8a04a";

const timeline = [
  { year: "1947", title: "Foundation", desc: "Anjuman-e-Araian is established in Lahore immediately after Pakistan's independence to unite the Araian community and address their immediate welfare needs in the new state." },
  { year: "1952", title: "First Convention", desc: "The first All-Pakistan Araian Convention is held in Lahore, attended by delegates from all four provinces. A formal constitution is adopted and the first Central Executive Committee elected." },
  { year: "1960", title: "Welfare Fund", desc: "A dedicated community welfare fund is established to provide financial assistance to poor families, widows, and orphans within the community." },
  { year: "1971", title: "Post-War Relief", desc: "The organization plays a key role in rehabilitating displaced Araian families following the 1971 war, setting up relief camps and coordinating aid distribution." },
  { year: "1980", title: "Scholarship Programme", desc: "The formal educational scholarship programme is launched, initially funding 50 students annually. This programme has since awarded over 25,000 scholarships." },
  { year: "1990", title: "Women's Wing", desc: "The Women's Wing of Anjuman-e-Araian is formally established, marking a commitment to gender-inclusive community development." },
  { year: "1998", title: "Legal Aid Cell", desc: "A Legal Aid Cell is launched in Lahore to provide free legal assistance to community members unable to afford legal representation." },
  { year: "2005", title: "Overseas Chapter", desc: "The first overseas chapter of Anjuman-e-Araian is established in the United Kingdom, followed by chapters in Saudi Arabia, UAE, and the USA." },
  { year: "2010", title: "Digital Expansion", desc: "The organization launches its first official website and digital membership system, connecting hundreds of thousands of members across the country." },
  { year: "2018", title: "National Recognition", desc: "Anjuman-e-Araian receives the National Community Service Award from the Government of Punjab in recognition of its decades of welfare and educational work." },
  { year: "2022", title: "Flood Relief", desc: "Following the devastating 2022 floods, the organization mobilizes over Rs. 50 million in relief goods, distributing aid to thousands of affected Araian families across Sindh and Punjab." },
  { year: "2026", title: "Today", desc: "With 120+ district branches, 500,000+ registered members, and active programs in education, health, legal aid, and overseas engagement, Anjuman-e-Araian continues to grow and serve." },
];

export function HistoryPage() {
  return (
    <div>
      <PageHeader title="History" subtitle="Seven Decades of Service, Unity and Progress" breadcrumb={["Home", "About", "History"]} />

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "64px 24px" }}>
        <p style={{ color: "#555", fontSize: 16, lineHeight: 1.9, textAlign: "center", marginBottom: 56 }}>
          The story of Anjuman-e-Araian is the story of a community's resilience, solidarity and determination to build a better future — from the turbulent days of Partition to the challenges of the 21st century.
        </p>

        <div style={{ position: "relative" }}>
          {/* Centre line */}
          <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 3, backgroundColor: `rgba(26,77,46,0.12)`, transform: "translateX(-50%)" }} className="timeline-line" />

          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {timeline.map((item, i) => {
              const isLeft = i % 2 === 0;
              return (
                <div key={item.year} style={{ display: "grid", gridTemplateColumns: "1fr 60px 1fr", alignItems: "start", marginBottom: 32 }} className="timeline-row">
                  {/* Left content */}
                  <div style={{ paddingRight: 32, textAlign: "right", paddingTop: 4, visibility: isLeft ? "visible" : "hidden" }}>
                    {isLeft && <TimelineCard item={item} />}
                  </div>
                  {/* Centre dot */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 6 }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: GOLD, border: `3px solid white`, boxShadow: `0 0 0 3px ${GREEN}`, zIndex: 1 }} />
                  </div>
                  {/* Right content */}
                  <div style={{ paddingLeft: 32, paddingTop: 4, visibility: isLeft ? "hidden" : "visible" }}>
                    {!isLeft && <TimelineCard item={item} />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 700px) {
          .timeline-line { left: 20px !important; }
          .timeline-row { grid-template-columns: 32px 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function TimelineCard({ item }: { item: { year: string; title: string; desc: string } }) {
  return (
    <div style={{ backgroundColor: "white", border: `1px solid rgba(26,77,46,0.1)`, borderRadius: 10, padding: "18px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)", textAlign: "left" }}>
      <div style={{ color: GOLD, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{item.year}</div>
      <div style={{ color: GREEN, fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{item.title}</div>
      <p style={{ color: "#555", fontSize: 13, lineHeight: 1.8, margin: 0 }}>{item.desc}</p>
    </div>
  );
}
