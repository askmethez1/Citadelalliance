import Link from 'next/link';
import { ArrowLeft, Compass, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 flex items-center justify-center px-6 relative overflow-hidden">
      {/* Subtle Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-md w-full text-center relative z-10">
        {/* Error Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-gray-400 text-xs font-semibold mb-6">
          <Compass size={14} className="text-blue-500" />
          <span>Error 404</span>
        </div>

        {/* Big 404 Text */}
        <h1 className="text-7xl md:text-8xl font-extrabold text-white tracking-tight mb-4">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl font-bold text-white mb-3">
          Page or Asset Not Found
        </h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          The page you are looking for doesn't exist, has been removed, or is temporarily unavailable in your jurisdiction.
        </p>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft size={16} />
            Return Home
          </Link>
          <Link
            href="/#markets"
            className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-full text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <Home size={16} />
            Explore Markets
          </Link>
        </div>
      </div>
    </div>
  );
}