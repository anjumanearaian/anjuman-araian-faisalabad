export default function ServicesSection() {
  const services = [
    "Community Welfare",
    "Member Services",
    "Business Network",
    "Social Activities"
  ];

  return (
    <section className="py-12">
      <h2 className="text-3xl font-bold text-center">Services</h2>
      <div className="grid md:grid-cols-4 gap-4 mt-8">
        {services.map((service) => (
          <div className="rounded-xl shadow p-5" key={service}>
            {service}
          </div>
        ))}
      </div>
    </section>
  );
}
