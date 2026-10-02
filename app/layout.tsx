import type { Metadata, Viewport } from 'next';
import { Playfair_Display, Lato } from 'next/font/google';
import '../globals.css';
import Footer from './components/Footer';
import { MarketProvider } from './context/MarketContext';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B0E14',
  colorScheme: 'dark',
};

const SITE_URL = 'https://citadelalliance.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Citadel Alliance | Institutional-Grade Crypto & Copy Trading',
    template: '%s | Citadel Alliance',
  },
  description: 'Join Citadel Alliance to copy top-performing traders, manage crypto deposits securely, and access global financial markets with institutional-grade tools.',
  keywords: [
    'Citadel Alliance',
    'Copy Trading',
    'Crypto Trading Platform',
    'Institutional Trading',
    'Global Markets',
    'Crypto Deposits',
    'Algorithmic Trading',
    'Web3 Finance'
  ],
  authors: [{ name: 'Citadel Alliance Team' }],
  creator: 'Citadel Alliance',
  publisher: 'Citadel Alliance',
  
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    title: 'Citadel Alliance | Institutional Crypto & Copy Trading',
    description: 'Copy expert trading strategies, deposit crypto securely, and trade global markets with deep liquidity.',
    siteName: 'Citadel Alliance',
    images: [
      {
        url: '/images/og-image.jpg', // Place a 1200x630px preview image in public/images/og-image.jpg
        width: 1200,
        height: 630,
        alt: 'Citadel Alliance Platform',
      },
    ],
  },
  
  twitter: {
    card: 'summary_large_image',
    title: 'Citadel Alliance | Institutional Crypto & Copy Trading',
    description: 'Copy expert trading strategies, deposit crypto securely, and trade global markets.',
    images: ['/images/og-image.jpg'],
  },
  
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Updated icons to match the new files in your public folder
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', sizes: '96x96', type: 'image/png' }
    ],
    apple: '/apple-touch-icon.png',
  },
  
  // Link to your PWA/Android manifest file
  manifest: '/site.webmanifest',
  
  alternates: {
    canonical: '/',
  },
};

// JSON-LD Structured Data for Search Engines
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FinancialProduct',
  name: 'Citadel Alliance',
  url: SITE_URL,
  description: 'Institutional trading and copy trading platform for cryptocurrency and global markets.',
  provider: {
    '@type': 'Organization',
    name: 'Citadel Alliance',
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${lato.variable} ${playfair.variable} font-sans bg-[#0B0E14] text-gray-300 antialiased flex flex-col min-h-screen`}>
        {/* Inject Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />

        <MarketProvider>
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
        </MarketProvider>
      </body>
    </html>
  );
}