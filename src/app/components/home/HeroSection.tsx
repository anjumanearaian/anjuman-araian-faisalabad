import { Link } from "react-router";
import { ArrowRight, Users } from "lucide-react";
import heroImage from "../../../imports/3.jpg";

export default function HeroSection() {
  return (
    <section className="home-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(9,48,30,.94), rgba(9,48,30,.64), rgba(9,48,30,.25)), url(${heroImage})` }}>
      <div className="home-shell home-hero__content">
        <span className="home-eyebrow">Serving Faisalabad's Araian community</span>
        <h1>Anjuman-e-Araian<br /><span>Faisalabad</span></h1>
        <p>Community welfare, education, family connections and business cooperation through one trusted platform.</p>
        <div className="home-actions">
          <Link className="home-btn home-btn--gold" to="/member/register"><Users size={18} /> Become a Member</Link>
          <Link className="home-btn home-btn--outline" to="/matrimonial">Matrimonial Services <ArrowRight size={18} /></Link>
        </div>
      </div>
    </section>
  );
}
