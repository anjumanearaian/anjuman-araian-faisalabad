const services = [
"Membership",
"Matrimonial Services",
"Business Directory",
"Welfare Activities",
"Overseas Community"
];

export default function Services() {
 return (
  <section>
   <h2>Our Services</h2>
   {services.map(x => <div key={x}>{x}</div>)}
  </section>
 );
}