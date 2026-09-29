import type { Metadata } from 'next';
import { Playfair_Display, Lato } from 'next/font/google';
// FIXED: Adjusted import path for globals.css
import '../globals.css';
import Footer from './components/Footer';
import { MarketProvider } from './context/MarketContext';

// Mature serif for headings and branding
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

// Clean, professional sans-serif for body and financial data
const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Citadel Alliance | Institutional Trading & Copy Expertise',
  description: 'Copy trade expertises, deposit crypto, and trade global markets.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${lato.variable} ${playfair.variable} font-sans bg-[#0B0E14] text-gray-300 antialiased flex flex-col min-h-screen`}>
        
        {/* MarketProvider wrapping the entire app to supply global live data */}
        <MarketProvider>
          
          {/* Main content area grows to push footer down */}
          <main className="flex-grow">
            {children}
          </main>

          {/* Global Footer */}
          <Footer />
          
        </MarketProvider>
        
      </body>
    </html>
  );
}