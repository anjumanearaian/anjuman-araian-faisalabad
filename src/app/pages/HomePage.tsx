
import HeroSection from "../components/home/HeroSection";
import ActivitiesSection from "../components/home/ActivitiesSection";
import LeadershipSection from "../components/home/LeadershipSection";
import BusinessSpotlightSection from "../components/home/BusinessSpotlightSection";
import OrganizationSection from "../components/home/OrganizationSection";
import ServicesSection from "../components/home/ServicesSection";
import StatisticsSection from "../components/home/StatisticsSection";
import EventsSection from "../components/home/EventsSection";
import "../../styles/homepage-final.css";

export function HomePage(){
 return <>
  <HeroSection/>
  <ActivitiesSection/>
  <LeadershipSection/>
  <BusinessSpotlightSection/>
  <OrganizationSection/>
  <ServicesSection/>
  <StatisticsSection/>
  <EventsSection/>
 </>;
}
