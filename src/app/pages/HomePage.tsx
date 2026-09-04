import HeroSlider from '../components/HeroSlider';
import ActivitySection from '../components/ActivitySection';
import LeadershipSection from '../components/LeadershipSection';
import ServicesSection from '../components/ServicesSection';
import EventsSection from '../components/EventsSection';

export function HomePage() {
  return (
    <main>
      <HeroSlider />
      <ActivitySection />
      <LeadershipSection />
      <ServicesSection />
      <EventsSection />
    </main>
  );
}
