import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { NavBar } from '../components/nav/NavBar';
import { Hero } from '../components/sections/Hero';
import { AboutSection } from '../components/sections/AboutSection';
import { SystemSection } from '../components/sections/SystemSection';
import { MembersSection } from '../components/sections/MembersSection';
import { JoinSection } from '../components/sections/JoinSection';
import { Footer } from '../components/sections/Footer';
import { sessionOptions, type SessionData } from '../lib/auth/session';
import { isAdmin } from '../lib/auth/roles';
import type { NavBarSession } from '../components/nav/NavBar';

export default async function Page() {
  const session = await getIronSession<SessionData>(await cookies(), sessionOptions);

  const navSession: NavBarSession = session.steamid
    ? {
        steamid: session.steamid,
        persona: session.persona ?? '',
        avatar: session.avatar ?? '',
        isAdmin: isAdmin(session.steamid),
      }
    : null;

  return (
    <>
      <NavBar session={navSession} />
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
