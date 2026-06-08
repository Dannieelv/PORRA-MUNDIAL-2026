import { Bebas_Neue, Barlow_Condensed } from 'next/font/google';
import PWARegister from '@/components/PWARegister';
import './globals.css';

const barlow = Barlow_Condensed({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
});
const bebas = Bebas_Neue({
  variable: '--font-bebas',
  subsets: ['latin'],
  weight: '400',
});

export const metadata = {
  title: 'Porra Mundial 2026',
  description: 'Porra del Mundial de fútbol 2026 entre amigos',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Porra 2026' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#EA580B',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${barlow.variable} ${bebas.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <PWARegister />
        {children}
      </body>
    </html>
  );
}
