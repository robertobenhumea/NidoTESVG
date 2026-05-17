import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/providers';
import { SkipLink } from '@/components/ui/SkipLink';
import { config } from '@/lib/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: {
    template: `%s | ${config.app.name}`,
    default: config.app.name,
  },
  description: config.app.description,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: config.app.shortName,
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: config.app.name,
    title: config.app.name,
    description: config.app.description,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#111113' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Apply saved theme before first paint — prevents flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('fn_theme');var d=t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}`,
          }}
        />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
      </head>
      <body className={`${inter.variable} font-sans`}>
        <SkipLink />
        <Providers>
          <main id="main-content" className="contents">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
