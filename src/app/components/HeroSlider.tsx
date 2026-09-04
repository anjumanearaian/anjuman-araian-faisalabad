import React from "react";

export default function HeroSlider() {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-[url('/images/faisalabad-clock-tower-sunrise.jpg')]" />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 text-center text-white px-6">
        <h1 className="text-4xl md:text-6xl font-bold">
          Anjuman-e-Araian Faisalabad
        </h1>
        <p className="mt-4 text-lg">
          Community, Heritage and Welfare Services
        </p>

        <div className="mt-6 flex gap-4 justify-center">
          <button className="px-6 py-3 rounded-lg bg-white text-black">
            Join Membership
          </button>
          <button className="px-6 py-3 rounded-lg border border-white">
            Learn More
          </button>
        </div>
      </div>
    </section>
  );
}
