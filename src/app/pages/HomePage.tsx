import Hero from "../components/home/Hero";
import Statistics from "../components/home/Statistics";
import Leadership from "../components/home/Leadership";
import Services from "../components/home/Services";
import Activities from "../components/home/Activities";
import Events from "../components/home/Events";

export function HomePage() {
  return (
    <>
      <Hero />
      <Statistics />
      <Leadership />
      <Services />
      <Activities />
      <Events />
    </>
  );
}