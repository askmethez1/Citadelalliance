"use client";

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Loader2, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
// FIX: Replaced '@/app/actions/auth' with relative path for consistent resolution
import { resetPasswordWithToken } from '../actions/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // If there's no token in the URL, block them
  if (!token) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Invalid Link</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          This password reset link is invalid or has missing parameters. Please request a new one.
        </p>
        <Link href="/forgot-password" className="w-full block py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all">
          Request New Link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    const res = await resetPasswordWithToken(token, newPassword);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } else {
      setError(res.message);
    }
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={32} className="text-green-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Password Updated</h2>
        <p className="text-gray-400 text-sm mb-8 leading-relaxed">
          Your password has been successfully reset. Redirecting to login...
        </p>
        <Link href="/login" className="w-full block py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all border border-white/10">
          Click here if not redirected
        </Link>
      </div>
    );
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-white mb-2">Create New Password</h2>
      <p className="text-gray-400 text-sm mb-8">
        Your new password must be different from previously used passwords.
      </p>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type={showPass ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type={showPass ? "text" : "password"}
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
          disabled={isLoading || !newPassword || !confirmPassword}
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={18} className="animate-spin" /> : null}
          {isLoading ? 'Updating...' : 'Reset Password'}
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
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
          
          <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-500" size={32}/></div>}>
            <ResetPasswordForm />
          </Suspense>

        </div>
      </div>
    </div>
  );
}