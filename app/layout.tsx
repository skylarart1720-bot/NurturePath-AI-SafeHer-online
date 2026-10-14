import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import './globals.css';
import '@/components/mobile-navigation.css';
import './safeher.css';
export const metadata: Metadata = {
  title: {
    default: 'NurturePath AI — SafeHer',
    template: '%s · NurturePath AI',
  },
  description:
    'Safe information. Safe choices. Safer futures. Youth-focused rights, health, digital safety information, and source-checked Ghanaian service contacts. Educational preview.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/brand/favicon.svg', apple: '/brand/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#087E83' };
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await connection();
  return (
    // Browser extensions can add attributes to this element before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
