import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';

/** SF Pro Apple qurilmalarida tizimdan keladi; qolganlarda Inter zaxira. */
const inter = Inter({
  subsets: ['latin', 'latin-ext', 'cyrillic', 'cyrillic-ext'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Advokat.uz',
  description: 'Advokat Muzaffar Turdimatov uchun ish tizimi',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f2f7' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
};

/**
 * Mavzu bo'yalishdan OLDIN o'rnatiladi.
 * Aks holda sahifa bir lahza noto'g'ri rangda chaqnaydi.
 */
const THEME_SCRIPT = `
(function () {
  try {
    var LIGHT = ['white', 'soft', 'sepia'];
    var t = localStorage.getItem('advokat-theme') || 'auto';
    var a = localStorage.getItem('advokat-accent') || 'green';
    if (t === 'auto') {
      t = matchMedia('(prefers-color-scheme: dark)').matches ? 'graphite' : 'soft';
    }
    var r = document.documentElement;
    r.dataset.theme = t;
    r.dataset.accent = a;
    r.dataset.scheme = LIGHT.indexOf(t) >= 0 ? 'light' : 'dark';
  } catch (e) {
    document.documentElement.dataset.theme = 'black';
    document.documentElement.dataset.accent = 'green';
    document.documentElement.dataset.scheme = 'dark';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.variable} suppressHydrationWarning>
      <body>
        <Script id="theme-init" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        {children}
      </body>
    </html>
  );
}
