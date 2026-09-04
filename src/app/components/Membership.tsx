import { Star, Users, BookOpen, Heart } from "lucide-react";

const benefits = [
  { icon: Users, title: "Community Network", desc: "Connect with 500,000+ members across 120 district branches nationwide." },
  { icon: BookOpen, title: "Education Support", desc: "Access scholarships, tuition assistance, and vocational training programs." },
  { icon: Heart, title: "Welfare Programs", desc: "Free medical camps, legal aid, and emergency financial assistance." },
  { icon: Star, title: "Voice and Representation", desc: "Participate in democratic governance and elect your local leadership." },
];

const plans = [
  {
    name: "Ordinary Member",
    fee: "Rs. 500",
    period: "/ year",
    features: [
      "Membership card and certificate",
      "Voting rights in elections",
      "Access to welfare programs",
      "Monthly newsletter",
    ],
    highlight: false,
  },
  {
    name: "Life Member",
    fee: "Rs. 5,000",
    period: "one time",
    features: [
      "All ordinary member benefits",
      "Priority scholarship consideration",
      "Lifetime membership card",
      "Invitation to annual convention",
      "Access to legal aid cell",
    ],
    highlight: true,
  },
  {
    name: "Patron Member",
    fee: "Rs. 25,000",
    period: "one time",
    features: [
      "All life member benefits",
      "Recognition in annual report",
      "Seat on welfare advisory board",
      "VIP access to all events",
      "Direct access to central leadership",
    ],
    highlight: false,
  },
];

export function Membership() {
  return (
    <section id="membership" style={{ backgroundColor: "#ffffff" }} className="py-16 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Heading */}
        <div className="text-center mb-12">
          <p style={{ color: "#c8a04a", fontFamily: "'Poppins', sans-serif", fontSize: 13, letterSpacing: "0.12em", fontWeight: 600 }} className="uppercase mb-2">
            Join the Family
          </p>
          <h2 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: "clamp(26px, 3vw, 38px)", fontWeight: 700 }}>
            Become a Member
          </h2>
          <div style={{ backgroundColor: "#c8a04a", height: 3, width: 64 }} className="mx-auto mt-4 rounded" />
          <p style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 15, maxWidth: 560, lineHeight: 1.8 }} className="mx-auto mt-4">
            Joining Anjuman-e-Araian connects you to a proud heritage and a supportive network of hundreds of thousands across Pakistan.
          </p>
        </div>

        {/* Benefits */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-14">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="text-center p-6 rounded-lg hover:shadow-md transition-shadow"
              style={{ backgroundColor: "#f8f5ef", border: "1px solid rgba(26,77,46,0.08)" }}
            >
              <div
                style={{ backgroundColor: "#1a4d2e", width: 56, height: 56, borderRadius: "50%", margin: "0 auto 16px" }}
                className="flex items-center justify-center"
              >
                <Icon size={24} color="#c8a04a" />
              </div>
              <h4 style={{ color: "#1a4d2e", fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 600 }} className="mb-2">
                {title}
              </h4>
              <p style={{ color: "#666", fontFamily: "'Poppins', sans-serif", fontSize: 13, lineHeight: 1.7 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* Membership plans */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className="rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow"
              style={{
                border: plan.highlight ? "2px solid #c8a04a" : "1px solid rgba(26,77,46,0.12)",
                transform: plan.highlight ? "scale(1.02)" : "scale(1)",
              }}
            >
              {plan.highlight && (
                <div style={{ backgroundColor: "#c8a04a", textAlign: "center", padding: "6px 0" }}>
                  <span style={{ color: "#1a1a1a", fontFamily: "'Poppins', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em" }} className="uppercase">
                    Most Popular
                  </span>
                </div>
              )}
              <div style={{ backgroundColor: plan.highlight ? "#1a4d2e" : "#f8f5ef" }} className="p-6 text-center">
                <h3
                  style={{
                    color: plan.highlight ? "#c8a04a" : "#1a4d2e",
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 20,
                    fontWeight: 700,
                  }}
                  className="mb-3"
                >
                  {plan.name}
                </h3>
                <div className="flex items-end justify-center gap-1">
                  <span
                    style={{
                      color: plan.highlight ? "white" : "#1a4d2e",
                      fontFamily: "'Playfair Display', serif",
                      fontSize: 32,
                      fontWeight: 700,
                    }}
                  >
                    {plan.fee}
                  </span>
                  <span style={{ color: plan.highlight ? "rgba(255,255,255,0.6)" : "#888", fontFamily: "'Poppins', sans-serif", fontSize: 13 }} className="mb-1">
                    {plan.period}
                  </span>
                </div>
              </div>
              <div className="p-6 bg-white">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#c8a04a", flexShrink: 0 }} />
                      <span style={{ color: "#444", fontFamily: "'Poppins', sans-serif", fontSize: 14 }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  style={{
                    backgroundColor: plan.highlight ? "#1a4d2e" : "transparent",
                    color: plan.highlight ? "white" : "#1a4d2e",
                    border: `2px solid #1a4d2e`,
                    fontFamily: "'Poppins', sans-serif",
                    fontWeight: 700,
                    fontSize: 13,
                    letterSpacing: "0.08em",
                    width: "100%",
                  }}
                  className="py-2.5 rounded uppercase hover:brightness-110 transition-all"
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
