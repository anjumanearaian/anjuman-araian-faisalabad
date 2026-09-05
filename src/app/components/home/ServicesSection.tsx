import { Link } from "react-router";
import { BriefcaseBusiness, Globe2, HeartHandshake, UserPlus } from "lucide-react";

const services = [
  { icon: UserPlus, title: "Membership", text: "Apply online and manage your approved member profile.", link: "/member/register" },
  { icon: HeartHandshake, title: "Matrimonial Service", text: "Submit a private community matrimonial inquiry for admin review.", link: "/matrimonial" },
  { icon: BriefcaseBusiness, title: "Business Directory", text: "Discover or submit member-owned businesses and offers.", link: "/business" },
  { icon: Globe2, title: "Overseas Network", text: "Connect with Araian community chapters outside Pakistan.", link: "/overseas" },
];
export default function ServicesSection() { return <section className="home-section home-section--soft"><div className="home-shell"><div className="home-heading"><div><span className="home-eyebrow home-eyebrow--green">Member support</span><h2>Community Services</h2></div></div><div className="home-services">{services.map(({ icon: Icon, ...s }) => <Link to={s.link} key={s.title}><Icon size={25} /><div><h3>{s.title}</h3><p>{s.text}</p></div></Link>)}</div></div></section>; }
