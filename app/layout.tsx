import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Orbitron, JetBrains_Mono } from 'next/font/google';
import { SITE } from '../config/site';
import { GUILD } from '../config/guild';
import './globals.css';

const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-display',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.name} — Guild Ops Dashboard`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    'gaming guild',
    'Steam group',
    'game server hosting',
    'Minecraft server',
    'Source engine server',
    'EU-West guild',
  ],
  openGraph: {
    type: 'website',
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.name,
    description: SITE.description,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: SITE.name }],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.name,
    description: SITE.description,
    images: ['/opengraph-image'],
  },
  robots: { index: true, follow: true },
  alternates: { canonical: SITE.url },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: SITE.themeColor,
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: GUILD.name,
  url: SITE.url,
  logo: `${SITE.url}/icon.svg`,
  description: SITE.description,
  foundingDate: String(GUILD.established),
  sameAs: [GUILD.comms.lfg.href, GUILD.comms.voice.href].filter(Boolean),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        <Script
          id="organization-jsonld"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </body>
    </html>
  );
}
