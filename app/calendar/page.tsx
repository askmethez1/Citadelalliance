"use client";

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { TRADERS } from '@/app/config/traders';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft,
  Users,
  Briefcase,
  Mail,
  User
} from 'lucide-react';

const TIME_SLOTS = ["09:00 AM", "10:30 AM", "01:00 PM", "02:30 PM", "04:00 PM", "05:30 PM"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarBookingPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTrader, setSelectedTrader] = useState(TRADERS[0].id);
  
  // -- Calendar Logic --
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize time for accurate past-date comparison

  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const handlePrevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  // --------------------

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    capital: '50k-100k',
    message: ''
  });

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeout(() => setStep(3), 800);
  };

  const selectedTraderData = TRADERS.find(t => t.id === selectedTrader);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-300 font-sans selection:bg-blue-500/30 flex flex-col">
      <Navbar />

      <main className="flex-1 pt-32 pb-24 px-6 max-w-6xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-12 md:text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold mb-6">
            <Video size={14} /> 1-on-1 Strategy Consultation
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            Talk to the experts before you deploy capital.
          </h1>
          <p className="text-gray-400 text-lg">
            Schedule a secure video consultation with our top Master Traders to discuss risk parameters, expected drawdowns, and portfolio alignment.
          </p>
        </div>

        <div className="bg-[#151924] border border-white/5 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Progress Indicator */}
          {step < 3 && (
            <div className="flex items-center gap-4 mb-10 border-b border-white/5 pb-6">
              <button 
                onClick={() => setStep(1)}
                disabled={step === 1}
                className={`flex items-center gap-2 text-sm font-bold transition-all ${step >= 1 ? 'text-white' : 'text-gray-500'} ${step === 2 ? 'hover:text-blue-400 cursor-pointer' : 'cursor-default'}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-white/10'}`}>1</span>
                Select Slot
              </button>
              <ChevronRight size={16} className="text-gray-600" />
              <div className={`flex items-center gap-2 text-sm font-bold ${step >= 2 ? 'text-white' : 'text-gray-500'}`}>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-white/10'}`}>2</span>
                Your Details
              </div>
            </div>
          )}

          {/* STEP 1: Select Trader & Time */}
          {step === 1 && (
            <div className="grid lg:grid-cols-2 gap-12">
              
              {/* Left Column: Trader & Date */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-blue-500"/> Select a Master Trader</h3>
                  <div className="grid gap-3">
                    {TRADERS.map(trader => (
                      <div 
                        key={trader.id}
                        onClick={() => setSelectedTrader(trader.id)}
                        className={`flex items-center gap-4 p-3 rounded-xl border cursor-pointer transition-all ${
                          selectedTrader === trader.id 
                            ? 'bg-blue-600/10 border-blue-500 text-white' 
                            : 'bg-[#0B0E14] border-white/5 hover:border-white/20'
                        }`}
                      >
                        <img src={trader.avatar} alt={trader.name} className="w-12 h-12 rounded-lg bg-[#151924] p-1" />
                        <div>
                          <h4 className="font-bold text-sm">{trader.name}</h4>
                          <p className="text-xs text-gray-400">{trader.strategy}</p>
                        </div>
                        {selectedTrader === trader.id && <CheckCircle2 size={18} className="text-blue-500 ml-auto mr-2" />}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CalendarIcon size={18} className="text-blue-500"/> Select a Date</h3>
                  
                  {/* Custom Viable Calendar */}
                  <div className="bg-[#0B0E14] border border-white/5 rounded-2xl p-5 shadow-sm">
                    {/* Calendar Header */}
                    <div className="flex justify-between items-center mb-5">
                      <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <ChevronLeft size={18}/>
                      </button>
                      <span className="font-bold text-white tracking-wide">
                        {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                      </span>
                      <button onClick={handleNextMonth} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white">
                        <ChevronRight size={18}/>
                      </button>
                    </div>
                    
                    {/* Weekdays */}
                    <div className="grid grid-cols-7 gap-1 text-center mb-2 border-b border-white/5 pb-2">
                      {WEEKDAYS.map(d => <div key={d} className="text-xs font-bold text-gray-500 uppercase">{d}</div>)}
                    </div>
                    
                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
                        const isPast = dateObj < today;
                        const isSelected = selectedDate?.toDateString() === dateObj.toDateString();
                        
                        return (
                          <button
                            key={day}
                            disabled={isPast}
                            onClick={() => setSelectedDate(dateObj)}
                            className={`aspect-square flex items-center justify-center text-sm rounded-xl transition-all
                              ${isPast 
                                ? 'text-gray-700 cursor-not-allowed opacity-50' 
                                : isSelected 
                                  ? 'bg-blue-600 text-white font-extrabold shadow-[0_0_15px_-3px_rgba(37,99,235,0.5)]' 
                                  : 'text-gray-300 hover:bg-white/10 hover:text-white font-medium'
                              }`}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Time & Confirm */}
              <div>
                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Clock size={18} className="text-blue-500"/> Available Times</h3>
                
                {!selectedDate ? (
                  <div className="flex flex-col items-center justify-center h-64 bg-[#0B0E14] border border-white/5 rounded-2xl border-dashed">
                    <CalendarIcon size={32} className="text-gray-600 mb-3" />
                    <p className="text-sm text-gray-500">Please select a date first</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
                    {TIME_SLOTS.map((time, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedTime(time)}
                        className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${
                          selectedTime === time 
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20' 
                            : 'bg-[#0B0E14] border-white/5 text-gray-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-8 border-t border-white/5">
                  <button
                    onClick={() => setStep(2)}
                    disabled={!selectedDate || !selectedTime}
                    className="w-full py-4 bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:hover:bg-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    Continue to Details <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Client Details Form */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto">
              <button 
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
              >
                <ChevronLeft size={16} /> Back to Schedule
              </button>
              
              <div className="bg-[#0B0E14] border border-white/5 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase mb-1">Meeting With</div>
                  <div className="text-white font-bold flex items-center gap-2">
                    <img src={selectedTraderData?.avatar} alt="avatar" className="w-6 h-6 rounded bg-[#151924]" />
                    {selectedTraderData?.name}
                  </div>
                </div>
                <div className="hidden sm:block w-px h-8 bg-white/10"></div>
                <div>
                  <div className="text-xs text-gray-500 font-bold uppercase mb-1">Date & Time</div>
                  <div className="text-blue-400 font-bold">
                    {selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {selectedTime}
                  </div>
                </div>
              </div>

              <form onSubmit={handleBooking} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        required
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                        placeholder="John Doe" 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      <input 
                        required
                        type="email" 
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors" 
                        placeholder="john@example.com" 
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Planned Capital Allocation</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <select 
                      value={formData.capital}
                      onChange={e => setFormData({...formData, capital: e.target.value})}
                      className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none"
                    >
                      <option value="under-10k">Under $10,000</option>
                      <option value="10k-50k">$10,000 - $50,000</option>
                      <option value="50k-100k">$50,000 - $100,000</option>
                      <option value="100k-500k">$100,000 - $500,000</option>
                      <option value="500k-plus">$500,000+</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">What are your trading goals?</label>
                  <textarea 
                    rows={3}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full bg-[#0B0E14] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-blue-500 transition-colors resize-none" 
                    placeholder="Briefly describe your risk tolerance and expected timelines..." 
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all mt-4 shadow-[0_0_20px_-5px_rgba(37,99,235,0.4)]"
                >
                  Confirm Booking
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="py-12 text-center max-w-md mx-auto animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} className="text-green-500" />
              </div>
              <h2 className="text-3xl font-extrabold text-white mb-4">Meeting Confirmed</h2>
              <p className="text-gray-400 mb-8 leading-relaxed">
                Your strategy call with <b className="text-white">{selectedTraderData?.name}</b> is scheduled for <b className="text-blue-400">{selectedDate?.toLocaleDateString()} at {selectedTime}</b>. We've sent a calendar invitation and Google Meet link to your email.
              </p>
              
              <button 
                onClick={() => window.location.href = '/dashboard/copy-trading'}
                className="w-full py-3 bg-white text-black hover:bg-gray-200 rounded-xl text-sm font-bold transition-all"
              >
                Return to Copy Trading
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}