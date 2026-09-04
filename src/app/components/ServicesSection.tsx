const services=[
"Membership Registration",
"Matrimonial Services",
"Member Directory",
"Welfare Projects",
"Overseas Community"
];

export default function ServicesSection(){
 return <section className="section-card">
  <h2>Our Services</h2>
  <div className="cards">
  {services.map(s=><div className="card" key={s}>{s}</div>)}
  </div>
 </section>
}