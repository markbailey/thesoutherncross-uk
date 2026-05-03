import { NavBar } from '../components/nav/NavBar';
import { Hero } from '../components/sections/Hero';
import { AboutSection } from '../components/sections/AboutSection';
import { SystemSection } from '../components/sections/SystemSection';
import { MembersSection } from '../components/sections/MembersSection';
import { JoinSection } from '../components/sections/JoinSection';
import { Footer } from '../components/sections/Footer';

export default function Page() {
  return (
    <>
      <NavBar />
      <main>
        <Hero />
        <AboutSection />
        <SystemSection />
        <MembersSection />
        <JoinSection />
      </main>
      <Footer />
    </>
  );
}
