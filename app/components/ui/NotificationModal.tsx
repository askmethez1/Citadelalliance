"use client";

import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: ModalType;
  buttonText?: string;
}

export default function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = 'Continue'
}: NotificationModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    success: <CheckCircle2 className="w-10 h-10 text-green-400" />,
    error: <XCircle className="w-10 h-10 text-red-400" />,
    warning: <AlertTriangle className="w-10 h-10 text-yellow-400" />,
    info: <Info className="w-10 h-10 text-blue-400" />
  };

  const borderMap = {
    success: 'border-green-500/20',
    error: 'border-red-500/20',
    warning: 'border-yellow-500/20',
    info: 'border-blue-500/20'
  };

  const bgMap = {
    success: 'bg-green-500/10',
    error: 'bg-red-500/10',
    warning: 'bg-yellow-500/10',
    info: 'bg-blue-500/10'
  };

  const buttonBgMap = {
    success: 'bg-green-600 hover:bg-green-500 text-white shadow-green-600/20',
    error: 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20',
    warning: 'bg-yellow-600 hover:bg-yellow-500 text-black shadow-yellow-600/20',
    info: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20'
  };

  const defaultTitleMap = {
    success: 'Action Successful',
    error: 'Action Failed',
    warning: 'Attention Required',
    info: 'System Notification'
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className={`bg-[#151924] border ${borderMap[type]} rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-center`}>
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className={`w-16 h-16 rounded-2xl ${bgMap[type]} border ${borderMap[type]} flex items-center justify-center mx-auto mb-4`}>
          {iconMap[type]}
        </div>

        <h3 className="text-xl font-bold text-white mb-2">
          {title || defaultTitleMap[type]}
        </h3>

        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          {message}
        </p>

        <button
          onClick={onClose}
          className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg ${buttonBgMap[type]}`}
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
}
