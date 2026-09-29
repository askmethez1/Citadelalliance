"use client";

import React from 'react';
import { Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

interface DashboardSkeletonProps {
  activeTab: string;
  location?: string;
}

export default function DashboardSkeleton({ activeTab, location = 'Detecting...' }: DashboardSkeletonProps) {
  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30">
      {/* Sidebar rendered immediately - interactions mocked so it doesn't break */}
      <Sidebar activeTab={activeTab} setActiveTab={() => {}} location={location} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        {/* Header rendered immediately */}
        <TopHeader />

        {/* Simple, clean content loader */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 size={32} className="text-blue-500 animate-spin mb-4" />
          <p className="text-gray-500 text-sm font-medium tracking-wide">Loading workspace...</p>
        </div>
      </main>
    </div>
  );
}