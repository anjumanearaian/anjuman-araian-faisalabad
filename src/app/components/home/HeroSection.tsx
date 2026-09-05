import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, Users } from "lucide-react";
import image1 from "../../../imports/3.jpg";
import image2 from "../../../imports/1.jpg";
import image3 from "../../../imports/2.jpg";
import { getSiteSettings } from "../../lib/settingsStore";

const copy = [
  { eyebrow: "Unity • Welfare • Progress", title: "Anjuman-e-Araian Faisalabad", body: "Serving families through welfare, education and trusted community connections." },
  { eyebrow: "One community, stronger together", title: "Membership that connects", body: "Join a verified member network, preserve your profile and access community services." },
  { eyebrow: "Safe and confidential", title: "Matrimonial services", body: "A professionally managed proposal service for members and Araian families." },
];

export default function HeroSection() {
  const settings = getSiteSettings();
  const slides = useMemo(() => settings.heroSlides?.length ? settings.heroSlides : [image1, image2, image3], [settings.heroSlides]);
  const [active, setActive] = useState(0); const [paused, setPaused] = useState(false);
  useEffect(() => { if (paused || slides.length < 2) return; const timer = window.setInterval(() => setActive(v => (v + 1) % slides.length), 6000); return () => clearInterval(timer); }, [paused, slides.length]);
  useEffect(() => { if (active >= slides.length) setActive(0); }, [slides.length, active]);
  const move = (direction: number) => setActive(v => (v + direction + slides.length) % slides.length);
  const text = copy[active % copy.length];
  return <section className="home-hero" aria-roledescription="carousel" aria-label="Community highlights" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} style={{ position: "relative", backgroundImage: `linear-gradient(90deg,rgba(9,48,30,.94),rgba(9,48,30,.62),rgba(9,48,30,.28)),url(${slides[active]})`, transition: "background-image .65s ease" }}>
    <div className="home-shell home-hero__content" key={active} style={{ animation: "fadeSlideIn .55s ease" }}>
      <span className="home-eyebrow">{text.eyebrow}</span><h1>{text.title.split(" ").slice(0, 2).join(" ")}<br /><span>{text.title.split(" ").slice(2).join(" ")}</span></h1><p>{text.body}</p>
      <div className="home-actions"><Link className="home-btn home-btn--gold" to="/member/register"><Users size={18} /> Become a Member</Link><Link className="home-btn home-btn--outline" to="/matrimonial">Matrimonial Services <ArrowRight size={18} /></Link></div>
    </div>
    {slides.length > 1 && <><button aria-label="Previous slide" onClick={() => move(-1)} style={{ position: "absolute", left: 20, top: "50%", width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(255,255,255,.6)", background: "rgba(0,0,0,.28)", color: "white", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 3 }}><ArrowLeft size={20} /></button><button aria-label="Next slide" onClick={() => move(1)} style={{ position: "absolute", right: 20, top: "50%", width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(255,255,255,.6)", background: "rgba(0,0,0,.28)", color: "white", display: "grid", placeItems: "center", cursor: "pointer", zIndex: 3 }}><ArrowRight size={20} /></button><div style={{ position: "absolute", bottom: 22, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 8, zIndex: 3 }}>{slides.map((_, i) => <button key={i} aria-label={`Go to slide ${i + 1}`} aria-current={i === active} onClick={() => setActive(i)} style={{ width: i === active ? 28 : 9, height: 9, padding: 0, border: 0, borderRadius: 10, background: i === active ? "#c8a04a" : "rgba(255,255,255,.7)", cursor: "pointer", transition: "width .25s" }} />)}</div></>}
  </section>;
}
