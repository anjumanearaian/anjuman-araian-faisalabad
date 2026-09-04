const items=[
'Membership Registration',
'Matrimonial Services',
'Member Directory',
'Welfare Projects',
'Overseas Community',
'Donations & Support'
];

export default function Services(){
 return (
  <section>
   {items.map(item=><div className="service-card">{item}</div>)}
  </section>
 )
}