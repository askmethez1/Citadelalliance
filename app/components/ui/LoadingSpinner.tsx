"use client";

import React from 'react';

interface LoadingSpinnerProps {
  label?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ 
  label = "Loading...", 
  fullScreen = true 
}: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4">
      {/* Simple, natural ring spinner */}
      <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-blue-500 animate-spin" />
      
      {/* Clean, readable label */}
      {label && (
        <p className="text-sm text-gray-400 animate-pulse">
          {label}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="min-h-screen w-full bg-[#0B0E14] flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return (
    <div className="p-8 flex items-center justify-center w-full h-full">
      {content}
    </div>
  );
}