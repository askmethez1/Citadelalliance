"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminSidebar from './components/AdminSidebar'; 
import TopHeader from '@/app/dashboard/components/TopHeader';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { getUserRole } from '@/app/actions/auth';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [location, setLocation] = useState('Detecting...');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const role = await getUserRole();
        if (role !== 'admin') {
          router.replace('/dashboard');
          return;
        }
        const locRes = await fetch('https://ipapi.co/json/').then(res => res.ok ? res.json() : null);
        if (locRes) setLocation(`${locRes.city}, ${locRes.country_name}`);
      } catch (error) {
        setLocation('Location Unavailable');
      } finally {
        setIsLoading(false);
      }
    };
    initAuth();
  }, [router]);

  if (isLoading) {
    return <LoadingSpinner label="Verifying Executive Credentials & Synchronizing Admin Desk..." />;
  }

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-red-500/30">
      {/* Sidebar is permanently injected here */}
      <AdminSidebar location={location} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Page content changes dynamically based on URL */}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}