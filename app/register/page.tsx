"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, Mail, Lock, User, 
  ArrowRight, ShieldCheck, Globe, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff
} from 'lucide-react';
import BackBtn from '../components/ui/BackBtn';
import { registerUser } from '../actions/auth';

export default function RegisterPage() {
  const router = useRouter();

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await registerUser({
        firstName,
        lastName,
        email,
        password,
        country: "Nigeria", // Auto-detected region
      });

      if (!res.success) {
        setError(res.error || "An unexpected error occurred.");
        setLoading(false);
        return;
      }

      // Success! Redirect directly to user terminal dashboard
      router.push('/dashboard');
    } catch (err) {
      setError("Failed to register. Please check your connection.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col md:flex-row font-sans selection:bg-blue-500/30">
      
      {/* Left Panel - Branding & Trust */}
      <div className="hidden md:flex md:w-5/12 bg-[#151924] border-r border-white/5 flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>
        
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 mb-16 inline-flex hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
              <BarChart3 className="text-white" size={18} />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">Citadel</span>
          </Link>
          
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Start mirroring <br />
            <span className="text-gray-500">global experts.</span>
          </h2>
          
          <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-sm">
            Join the premier brokerage platform for zero-latency copy trading, crypto funding, and direct market access.
          </p>

          <div className="space-y-5">
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 className="text-green-500" size={20} />
              <span className="font-medium">Sub-12ms execution latency</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 className="text-green-500" size={20} />
              <span className="font-medium">Instant Crypto deposits (USDT/USDC)</span>
            </div>
            <div className="flex items-center gap-3 text-gray-300">
              <CheckCircle2 className="text-green-500" size={20} />
              <span className="font-medium">Regulated ETF & Equities access</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-4 bg-[#0B0E14] p-4 rounded-2xl border border-white/5 w-max">
            <div className="flex -space-x-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#0B0E14] bg-gray-800"></div>
              <div className="w-10 h-10 rounded-full border-2 border-[#0B0E14] bg-blue-900"></div>
              <div className="w-10 h-10 rounded-full border-2 border-[#0B0E14] bg-purple-900 flex items-center justify-center text-xs font-bold text-white">+12k</div>
            </div>
            <div className="text-sm">
              <p className="text-white font-bold">Active Traders</p>
              <p className="text-gray-500">Joined this week</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 relative">
        
        <BackBtn />

        <div className="md:hidden flex items-center gap-2 mb-12 mt-8">
          <div className="w-8 h-8 rounded bg-blue-600 flex items-center justify-center">
            <BarChart3 className="text-white" size={18} />
          </div>
          <span className="text-xl font-extrabold text-white tracking-tight">Citadel</span>
        </div>

        <div className="max-w-md w-full mx-auto">
          <div className="mb-8 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-white mb-3">Create an account</h1>
            <p className="text-gray-400 text-sm">Enter your details below to set up your trading workspace.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* Auto-Geo Indicator */}
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              <Globe size={16} />
              <span>Region auto-detected. KYC tailored for your jurisdiction.</span>
            </div>

            {/* ERROR ALERT */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">First Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full bg-[#151924] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    placeholder="John" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Last Name</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <User size={18} className="text-gray-500" />
                  </div>
                  <input 
                    type="text" 
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full bg-[#151924] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                    placeholder="Doe" 
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-gray-500" />
                </div>
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#151924] border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                  placeholder="name@example.com" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-gray-500" />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#151924] border border-white/10 rounded-xl py-3 pl-11 pr-12 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors" 
                  placeholder="••••••••" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full py-4 font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(41,98,255,0.2)]"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Creating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-8 text-center text-sm text-gray-500">
            By creating an account, you agree to our <Link href="/terms" className="text-blue-400 hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-blue-400 hover:underline">Privacy Policy</Link>.
          </div>

          <div className="mt-10 flex items-center justify-center gap-2 text-xs text-gray-600 font-medium">
            <ShieldCheck size={16} />
            <span>256-bit Institutional Encryption</span>
          </div>

          <div className="mt-6 text-center text-sm text-gray-400">
            Already have an account? <Link href="/login" className="text-white font-bold hover:text-blue-400 transition-colors">Log in here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}