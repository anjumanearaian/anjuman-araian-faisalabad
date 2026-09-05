import { Link } from "react-router";
import { ArrowRight, BookOpen, HandHeart, Landmark } from "lucide-react";

export default function OrganizationSection() {
  const cards = [
    { icon: Landmark, title: "Our History", text: "Learn about the community institution, its public service and its development in Faisalabad.", link: "/history" },
    { icon: BookOpen, title: "Constitution", text: "Access the constitution, memorandum and official governance documents from one place.", link: "/constitution" },
    { icon: HandHeart, title: "Vision & Mission", text: "See how welfare, education, unity and opportunity guide the organisation's work.", link: "/vision-mission" },
  ];
  return <section className="home-section"><div className="home-shell"><div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">About the Anjuman</span><h2>A Community Built on Service</h2></div></div><div className="home-info-grid">{cards.map(({ icon: Icon, ...card }) => <Link to={card.link} key={card.title}><Icon size={26} /><h3>{card.title}</h3><p>{card.text}</p><span>Learn more <ArrowRight size={15} /></span></Link>)}</div></div></section>;
}
