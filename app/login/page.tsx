"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  BarChart3, Mail, Lock, ArrowRight, ShieldCheck, 
  TrendingUp, AlertCircle, Loader2, Eye, EyeOff, Check
} from 'lucide-react';
import BackBtn from '../components/ui/BackBtn';
import { loginUser } from '../actions/auth';

export default function LoginPage() {
  const router = useRouter();

  // Form & UI State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Pass rememberMe to your server action later to adjust session expiry
      const res = await loginUser({ email, password });

      if (!res.success) {
        setError(res.error || "An unexpected error occurred.");
        setLoading(false);
        return;
      }

      // Success! Send them to the dashboard
      router.push('/dashboard');
    } catch (err) {
      setError("Failed to log in. Please check your connection.");
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
            Welcome back to <br />
            <span className="text-gray-500">your terminal.</span>
          </h2>
          
          <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-sm">
            Access your portfolio, manage your copy-trading allocations, and execute trades with institutional precision.
          </p>

          <div className="p-6 rounded-2xl bg-[#0B0E14] border border-white/5 max-w-sm">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="text-green-500" size={20} />
              <span className="text-white font-bold">System Status: Operational</span>
            </div>
            <p className="text-sm text-gray-500">All global exchanges, crypto payment gateways, and copy-trading engines are running at optimal latency.</p>
          </div>
        </div>

        <div className="relative z-10 text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Citadel Alliance. Institutional execution.
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
          <div className="mb-10 text-center md:text-left">
            <h1 className="text-3xl font-extrabold text-white mb-3">Sign In</h1>
            <p className="text-gray-400 text-sm">Enter your credentials to access your account.</p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            
            {/* ERROR ALERT */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-4">
                <AlertCircle size={16} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

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

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-gray-600 group-hover:border-blue-500'}`}>
                  <input 
                    type="checkbox" 
                    className="hidden" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  {rememberMe && <Check size={12} className="text-white" />}
                </div>
                <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">Remember me</span>
              </label>
              
              <Link href="/forgot-password" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-full py-4 font-bold transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(41,98,255,0.2)]"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Access Terminal</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-12 flex items-center justify-center gap-2 text-xs text-gray-600 font-medium">
            <ShieldCheck size={16} />
            <span>Secured via TLS & 2FA</span>
          </div>

          <div className="mt-8 text-center text-sm text-gray-400">
            Don't have an account? <Link href="/register" className="text-white font-bold hover:text-blue-400 transition-colors">Open an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}