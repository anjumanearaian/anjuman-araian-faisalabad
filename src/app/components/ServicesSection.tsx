export default function ServicesSection() {
  const services = [
    "Community Welfare",
    "Member Services",
    "Business Network",
    "Social Activities"
  ];

  return (
    <section>
      <h2>Services</h2>
      {services.map((service) => (
        <div key={service}>{service}</div>
      ))}
    </section>
  );
}
