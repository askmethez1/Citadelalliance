"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from '@/app/dashboard/components/Sidebar';
import TopHeader from '@/app/dashboard/components/TopHeader';
import NotificationModal, { ModalType } from '@/app/components/ui/NotificationModal';
import LoadingSpinner from '@/app/components/ui/LoadingSpinner';
import { 
  User, Mail, ShieldAlert, ShieldCheck, 
  UploadCloud, Clock, CheckCircle2, Lock, Smartphone, X, MapPin,
  Eye, EyeOff, Copy, QrCode
} from 'lucide-react';
import { getUserProfile, updateUserProfile, updatePassword } from '@/app/actions/profile';
import { submitKycDocument, getUserKycStatus } from '@/app/actions/kyc'; // <-- ADDED getUserKycStatus

type KYCStatus = 'unverified' | 'pending' | 'verified';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('profile');
  
  // Database State
  const [isLoading, setIsLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KYCStatus>('unverified');
  const [sidebarLocation, setSidebarLocation] = useState('Detecting...');
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    country: '',
  });

  // Dynamic Notification Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: ModalType;
  }>({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const showAlert = (message: string, type: ModalType = 'info', title?: string) => {
    setModalConfig({ isOpen: true, message, type, title });
  };

  const closeModal = () => {
    setModalConfig(prev => ({ ...prev, isOpen: false }));
  };

  // UI State
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  // Password Modal & Visibility State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 2FA Authenticator Modal State
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [totpCode, setTotpCode] = useState('');
  const [secretKey] = useState('CITADEL-AUTH-X982-K901');

  // Fetch data from Neon DB on load & Auto-Detect Location
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const data = await getUserProfile();
        
        let detectedCountry = data?.country || '';
        let displayLocation = data?.country || 'Location Unavailable';

        // Auto-Detect Location (Overrides DB country)
        try {
          const res = await fetch('https://ipapi.co/json/');
          if (res.ok) {
            const ipData = await res.json();
            if (ipData && ipData.country_name) {
              detectedCountry = ipData.country_name;
              displayLocation = `${ipData.city}, ${ipData.country_name}`;
            }
          }
        } catch (ipError) {
          console.error("IP auto-detection failed, falling back to DB location.");
        }

        setSidebarLocation(displayLocation);

        if (data && data.email) {
          setProfileData({
            firstName: data.first_name || '',
            lastName: data.last_name || '',
            email: data.email,
            country: detectedCountry,
          });
        }

        // FORCE FETCH KYC STATUS VIA RAW SQL TO BYPASS DRIZZLE ORM
        const kycRes = await getUserKycStatus();
        if (kycRes.success) {
          setKycStatus(kycRes.status as KYCStatus);
        }

      } catch (error) {
        showAlert("Failed to load profile data from the server.", "error", "Connection Error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // CLOUDINARY UPLOAD LOGIC
  const submitKYC = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'citadel');

      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'mue1ttuu';
      
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      
      if (data.secure_url) {
        const dbRes = await submitKycDocument(data.secure_url);
        
        if (dbRes.success) {
          setKycStatus('pending');
          showAlert("Your verification documents have been received and are under compliance review.", "success", "KYC Submitted");
        } else {
          showAlert("Failed to save KYC status to database.", "error");
        }
      } else {
        showAlert(data.error?.message || "Failed to upload image to Cloudinary.", "error");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showAlert("An unexpected error occurred during upload.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const success = await updateUserProfile({
        first_name: profileData.firstName,
        last_name: profileData.lastName,
        country: profileData.country
      });
      
      if (success) {
        showAlert("Profile updated successfully in the database!", "success", "Profile Saved");
      } else {
        showAlert("Failed to update profile. Please try again.", "error");
      }
    } catch (error) {
      showAlert("An unexpected error occurred while saving profile.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showAlert("New passwords do not match. Please re-enter.", "warning", "Validation Error");
      return;
    }
    
    try {
      const success = await updatePassword(passwordForm.currentPassword, passwordForm.newPassword);
      if (success) {
        showAlert("Your account password has been updated successfully.", "success", "Password Changed");
        setShowPasswordModal(false);
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        showAlert("Incorrect current password. Please verify and try again.", "error", "Authentication Failed");
      }
    } catch (error) {
      showAlert("An unexpected error occurred while updating password.", "error");
    }
  };

  const handleVerify2FA = (e: React.FormEvent) => {
    e.preventDefault();
    if (totpCode.length !== 6) {
      showAlert("Please enter a valid 6-digit authenticator code.", "warning");
      return;
    }

    setIs2FAEnabled(true);
    setShow2FAModal(false);
    setTotpCode('');
    showAlert("Two-Factor Authentication (2FA) is now active on your account.", "success", "2FA Enabled");
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    showAlert("Secret key copied to clipboard.", "info");
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={sidebarLocation} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full">
          <div className="max-w-6xl mx-auto space-y-8">
            
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">Account & Security</h1>
              <p className="text-gray-400">Manage your personal information, security preferences, and KYC verification.</p>
            </div>

            {isLoading ? (
              <div className="py-20">
                <LoadingSpinner fullScreen={false} label="Loading profile data from Neon DB..." />
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Personal Information Form */}
                  <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <User size={20} className="text-blue-500" /> Personal Details
                    </h3>
                    
                    <form onSubmit={handleSaveProfile} className="space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">First Name</label>
                          <input 
                            type="text" 
                            value={profileData.firstName}
                            onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Last Name</label>
                          <input 
                            type="text" 
                            value={profileData.lastName}
                            onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><Mail size={12}/> Registered Email</label>
                          <input 
                            type="email" 
                            disabled
                            value={profileData.email}
                            className="w-full bg-[#0B0E14]/50 border border-white/5 rounded-xl px-4 py-3 text-gray-500 text-sm cursor-not-allowed"
                          />
                          <p className="text-[10px] text-gray-500 mt-1">Locked. Contact support to change.</p>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5"><MapPin size={12}/> Country</label>
                          <input 
                            type="text" 
                            value={profileData.country}
                            onChange={(e) => setProfileData({...profileData, country: e.target.value})}
                            className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div className="pt-4 flex justify-end">
                        <button 
                          type="submit" 
                          disabled={isSaving}
                          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                        >
                          {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Security Settings */}
                  <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Lock size={20} className="text-gray-400" /> Security Settings
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                            <Lock size={18} />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm">Account Password</p>
                            <p className="text-gray-500 text-xs mt-0.5">Secure your account with a strong password</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShowPasswordModal(true)}
                          className="px-4 py-2 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/5 transition-colors shrink-0"
                        >
                          Change
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${is2FAEnabled ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-400'}`}>
                            <Smartphone size={18} />
                          </div>
                          <div>
                            <p className="text-white font-bold text-sm flex items-center gap-2">
                              Two-Factor Authentication (2FA)
                              {is2FAEnabled && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">ACTIVE</span>}
                            </p>
                            <p className="text-gray-500 text-xs mt-0.5">Protect withdrawals using Google Authenticator</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setShow2FAModal(true)}
                          className={`px-4 py-2 border rounded-lg text-xs font-bold transition-colors shrink-0 ${
                            is2FAEnabled 
                              ? 'border-green-500/30 bg-green-500/10 text-green-400 hover:bg-green-500/20' 
                              : 'border-white/10 text-white hover:bg-white/5'
                          }`}
                        >
                          {is2FAEnabled ? 'Manage' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Identity Verification (KYC) */}
                <div className="lg:col-span-1">
                  <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 sm:p-8 shadow-xl sticky top-24">
                    {kycStatus === 'verified' ? (
                      <div className="text-center py-4">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                          <ShieldCheck className="text-green-500" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Identity Verified</h3>
                        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
                          Your KYC documents have been approved. Your account is fully verified with maximum deposit limits and fiat withdrawals unlocked.
                        </p>
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#0B0E14] border border-green-500/20 rounded-xl text-green-400 text-xs font-bold uppercase tracking-wider">
                          <CheckCircle2 size={16} /> Tier 2 Status Active
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          Identity Verification
                        </h3>
                        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
                          Verify your identity to unlock higher deposit limits, institutional trading tools, and fiat withdrawals.
                        </p>

                        <div className="mb-8">
                          {kycStatus === 'unverified' && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                              <ShieldAlert className="text-red-500 shrink-0" size={24} />
                              <div>
                                <p className="text-red-500 font-bold text-sm">Unverified Account</p>
                                <p className="text-red-400/70 text-xs mt-0.5">Trading limits applied</p>
                              </div>
                            </div>
                          )}
                          {kycStatus === 'pending' && (
                            <div className="flex items-center gap-3 p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                              <Clock className="text-yellow-500 shrink-0 animate-pulse" size={24} />
                              <div>
                                <p className="text-yellow-500 font-bold text-sm">Verification Pending</p>
                                <p className="text-yellow-400/70 text-xs mt-0.5">Review takes 1-2 hours</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {kycStatus === 'unverified' && (
                          <div className="space-y-4">
                            <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group relative">
                              <input 
                                type="file" 
                                accept="image/jpeg, image/png, application/pdf" 
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                              />
                              <div className="w-12 h-12 rounded-full bg-[#0B0E14] border border-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <UploadCloud className="text-gray-400 group-hover:text-blue-500" size={20} />
                              </div>
                              <p className="text-sm font-bold text-white mb-1">
                                {selectedFile ? selectedFile.name : "Upload Government ID"}
                              </p>
                              <p className="text-xs text-gray-500">
                                {selectedFile ? "Click to change file" : "Passport, Driver's License, or ID Card"}
                              </p>
                            </div>

                            <button 
                              onClick={submitKYC}
                              disabled={!selectedFile || isUploading}
                              className="w-full py-3.5 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                            >
                              {isUploading ? "Processing..." : "Submit Document"}
                            </button>
                          </div>
                        )}

                        {kycStatus === 'pending' && (
                          <div className="text-center p-6 border border-white/5 rounded-2xl bg-white/[0.02]">
                            <CheckCircle2 className="mx-auto text-gray-500 mb-3" size={32} />
                            <p className="text-sm text-gray-300 font-bold mb-1">Documents Received</p>
                            <p className="text-xs text-gray-500">We will notify you via email once your compliance check is complete.</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      </main>

      {/* CHANGE PASSWORD MODAL WITH EYE TOGGLE */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151924] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
            
            <h3 className="text-xl font-bold text-white mb-6">Change Password</h3>
            
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Current Password</label>
                <div className="relative">
                  <input 
                    type={showCurrentPass ? "text" : "password"} 
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">New Password</label>
                <div className="relative">
                  <input 
                    type={showNewPass ? "text" : "password"} 
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirm New Password</label>
                <div className="relative">
                  <input 
                    type={showConfirmPass ? "text" : "password"} 
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 pr-10 text-white text-sm focus:outline-none focus:border-blue-500"
                    required
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-sm font-bold transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA AUTHENTICATOR SETUP MODAL */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#151924] border border-white/10 rounded-3xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShow2FAModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mx-auto mb-3">
                <QrCode size={24} />
              </div>
              <h3 className="text-xl font-bold text-white">Enable 2FA Verification</h3>
              <p className="text-xs text-gray-400 mt-1">Scan the QR code using Google Authenticator or Authy.</p>
            </div>

            <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-4 flex flex-col items-center justify-center mb-6">
              <div className="w-36 h-36 bg-white p-2 rounded-xl flex items-center justify-center mb-3">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=otpauth://totp/Citadel:${profileData.email}?secret=${secretKey}&issuer=Citadel`} 
                  alt="2FA QR Code" 
                  className="w-full h-full"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 w-full justify-between font-mono">
                <span>{secretKey}</span>
                <button onClick={copySecretKey} className="hover:text-white transition-colors">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">6-Digit Authenticator Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-4 py-3 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20"
              >
                Verify & Enable 2FA
              </button>
            </form>
          </div>
        </div>
      )}

      {/* DYNAMIC NOTIFICATION MODAL */}
      <NotificationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        message={modalConfig.message}
        type={modalConfig.type}
      />
    </div>
  );
}