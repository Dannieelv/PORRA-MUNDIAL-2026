import { Noto_Sans, Fascinate } from 'next/font/google';
import PWARegister from '@/components/PWARegister';
import './globals.css';

const noto = Noto_Sans({
  variable: '--font-noto',
  subsets: ['latin'],
  weight: ['400','500','600','700','800','900'],
});
const fascinate = Fascinate({
  variable: '--font-fascinate',
  subsets: ['latin'],
  weight: '400',
});

export const metadata = {
  title: 'Porra Mundial 2026',
  description: 'Porra del Mundial de fútbol 2026 entre amigos',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Porra 2026' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#7C61D4',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${noto.variable} ${fascinate.variable}`}>
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
