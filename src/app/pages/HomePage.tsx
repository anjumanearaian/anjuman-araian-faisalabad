import Hero from "../components/Hero";
import LeadershipSection from "../components/LeadershipSection";
import ServicesSection from "../components/ServicesSection";
import StatsSection from "../components/StatsSection";
import ActivitySection from "../components/ActivitySection";

export default function HomePage(){
 return (
  <>
   <Hero />
   <ActivitySection />
   <LeadershipSection />
   <ServicesSection />
   <StatsSection />
  </>
 );
}