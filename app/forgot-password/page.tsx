"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, Loader2, ShieldCheck, KeyRound, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { requestPasswordReset, resetPasswordWithPin } from '../actions/auth';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1); // 1 = Request PIN, 2 = Verify PIN & New Password
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // STEP 1: Send PIN
  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const res = await requestPasswordReset(email);

    if (res.success) {
      setStep(2);
    } else {
      setError(res.message);
    }

    setIsLoading(false);
  };

  // STEP 2: Reset Password with PIN
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    const res = await resetPasswordWithPin({
      email,
      pin,
      newPassword
    });

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2500);
    } else {
      setError(res.message);
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center p-4 selection:bg-blue-500/30">
      <div className="w-full max-w-md">
        
        {/* Branding */}
        <div className="flex justify-center mb-8">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
              <ShieldCheck className="text-white" size={24} />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">Citadel</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-[#151924] border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600"></div>

          {isSuccess ? (
            <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Password Updated</h2>
              <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                Your password has been reset successfully. Redirecting you to login...
              </p>
              <Link 
                href="/login" 
                className="w-full block py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 text-center"
              >
                Go to Login
              </Link>
            </div>
          ) : step === 1 ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
              <p className="text-gray-400 text-sm mb-8">
                Enter your email address and we will generate a 6-digit verification code.
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleRequestPin} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || !email}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isLoading ? 'Sending Code...' : 'Get Reset PIN'}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                  <ArrowLeft size={16} /> Back to Login
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-2">Enter Reset Code</h2>
              <p className="text-gray-400 text-sm mb-6">
                Enter the 6-digit code sent to <span className="text-white font-medium">{email}</span>.
                <br />
                <span className="text-blue-400 text-xs">(Testing Mode: Check your VS Code terminal for the code!)</span>
              </p>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">6-Digit PIN Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                    <input 
                      type="text" 
                      maxLength={6}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white text-lg tracking-widest font-mono focus:outline-none focus:border-blue-500 transition-colors text-center"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18}/>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading || pin.length < 6 || !newPassword}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
                  {isLoading ? 'Resetting Password...' : 'Reset Password'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <button 
                  type="button" 
                  onClick={() => setStep(1)} 
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Need a new code? Try again
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}