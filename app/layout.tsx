import type { Metadata, Viewport } from 'next';
import './globals.css';
import '@/components/mobile-navigation.css';
export const metadata: Metadata = {
  title: {
    default: 'NurturePath AI · Care that follows her home',
    template: '%s · NurturePath AI',
  },
  description:
    'Offline-first maternal follow-up and referral coordination. Synthetic demonstration.',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/brand/favicon.svg', apple: '/brand/icon-192.png' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#087E83' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
