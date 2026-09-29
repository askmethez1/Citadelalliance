"use client";

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Send, Paperclip, ShieldCheck, 
  Users, ExternalLink, ArrowLeft, Bot, Clock,
  Image as ImageIcon, X, Reply, PenTool
} from 'lucide-react';
import Sidebar from '@/app/dashboard/components/Sidebar';
import TopHeader from '@/app/dashboard/components/TopHeader';
import { getUserMessages, sendUserMessage } from '@/app/actions/chat';

interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'admin';
  time: string;
  imageUrl?: string;
  replyToText?: string;
}

export default function ChatPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [location, setLocation] = useState('Detecting...');
  
  const [view, setView] = useState<'menu' | 'live-chat'>('menu');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Image Upload & Annotation States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null); // NEW: Lightbox state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reference for the chat container to isolate scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setLocation(`${data.city}, ${data.country_name}`);
      })
      .catch(() => setLocation('Location Unavailable'));
  }, []);

  // Poll for messages when live chat is open
  useEffect(() => {
    if (view !== 'live-chat') return;

    const fetchMsgs = async () => {
      const dbMessages = await getUserMessages();
      setMessages(dbMessages);
    };

    fetchMsgs(); // Initial fetch
    const interval = setInterval(fetchMsgs, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [view]);

  // ISOLATED AUTO-SCROLL: Only scrolls the chat div, never the page
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // --- IMAGE UPLOAD TO CLOUDINARY ---
  const uploadImageToCloudinary = async (base64Img: string) => {
    try {
      const formData = new FormData();
      formData.append('file', base64Img);
      formData.append('upload_preset', 'citadel'); 

      const res = await fetch(`https://api.cloudinary.com/v1_1/mue1ttuu/image/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      return null;
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!messageInput.trim() && !imagePreview) || isSending) return;

    setIsSending(true);
    let finalImageUrl = undefined;

    // Handle annotated image upload
    if (imagePreview && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      finalImageUrl = await uploadImageToCloudinary(dataUrl);
    }

    const text = messageInput.trim() || (finalImageUrl ? 'Sent an image' : '');
    const replyContext = replyingTo ? replyingTo.text : undefined;
    
    // Clear inputs
    setMessageInput('');
    setReplyingTo(null);
    setImagePreview(null);
    setIsDrawingModalOpen(false);

    // Optimistic UI update
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      text: text,
      sender: 'user',
      imageUrl: finalImageUrl,
      replyToText: replyContext,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    await sendUserMessage(text, finalImageUrl, replyContext);
    const updatedMessages = await getUserMessages();
    setMessages(updatedMessages);
    
    setIsSending(false);
  };

  // --- CANVAS ANNOTATION LOGIC ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImagePreview(event.target?.result as string);
        setIsDrawingModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (isDrawingModalOpen && imagePreview && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      img.src = imagePreview;
      img.onload = () => {
        // Calculate aspect ratio to fit inside modal (max 600px width)
        const maxWidth = 600;
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
    }
  }, [isDrawingModalOpen, imagePreview]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const endDrawing = () => {
    setIsDrawing(false);
    canvasRef.current?.getContext('2d')?.beginPath();
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#ef4444'; // Red circle/pen tool

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    <div className="min-h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} />

      <main className="flex-1 flex flex-col min-h-screen relative min-w-0 overflow-x-hidden">
        <TopHeader />

        <div className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-6xl mx-auto flex flex-col">
          
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">Communications Hub</h1>
            <p className="text-gray-400">Connect with master traders, join the community, or get live support.</p>
          </div>

          {view === 'menu' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
              
              {/* ADMIN SUPPORT DESK CARD */}
              <div className="bg-[#151924] border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/10 transition-colors"></div>
                
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500 mb-6">
                    <ShieldCheck size={28} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Executive Support Desk</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-8">
                    Need account assistance, deposit verification, or technical help? Chat with our live admin team directly on the platform or reach out via our official Telegram support line.
                  </p>
                </div>

                <div className="space-y-3 relative z-10">
                  <button 
                    onClick={() => setView('live-chat')}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <MessageSquare size={18} /> Start On-Site Live Chat
                  </button>
                  <Link 
                    href="https://t.me/your_admin_support_handle" 
                    target="_blank"
                    className="w-full py-4 bg-[#2AABEE]/10 hover:bg-[#2AABEE]/20 border border-[#2AABEE]/30 text-[#2AABEE] rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <ExternalLink size={18} /> Contact Support on Telegram
                  </Link>
                </div>
              </div>

              {/* GLOBAL TRADERS TELEGRAM CARD */}
              <div className="bg-[#151924] border border-white/5 rounded-3xl p-8 shadow-xl flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#2AABEE]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[#2AABEE]/10 transition-colors"></div>
                
                <div>
                  <div className="w-14 h-14 rounded-2xl bg-[#2AABEE]/10 border border-[#2AABEE]/20 flex items-center justify-center text-[#2AABEE] mb-6">
                    <Users size={28} />
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-3">Global Traders Network</h2>
                  <p className="text-sm text-gray-400 leading-relaxed mb-8">
                    Join thousands of active traders in our official Telegram community. Discuss market trends, share setups, and interact with our Master AI algorithmic bots in real-time.
                  </p>

                  <div className="flex items-center gap-4 mb-8">
                    <div className="flex -space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gray-600 border-2 border-[#151924]"></div>
                      <div className="w-8 h-8 rounded-full bg-blue-600 border-2 border-[#151924]"></div>
                      <div className="w-8 h-8 rounded-full bg-purple-600 border-2 border-[#151924]"></div>
                    </div>
                    <div className="text-xs text-gray-400 font-bold">12,450+ Active Members</div>
                  </div>
                </div>

                <div className="relative z-10">
                  <Link 
                    href="https://t.me/your_community_group" 
                    target="_blank"
                    className="w-full py-4 bg-[#2AABEE] hover:bg-[#229ED9] text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-[#2AABEE]/20 flex items-center justify-center gap-2"
                  >
                    <Send size={18} /> Join Telegram Community
                  </Link>
                </div>
              </div>

            </div>
          ) : (

            /* ON-SITE LIVE CHAT INTERFACE */
            <div className="flex-1 bg-[#151924] border border-white/5 rounded-3xl shadow-xl flex flex-col overflow-hidden max-h-[75vh] relative animate-in fade-in duration-300">
              
              <div className="h-20 border-b border-white/5 bg-white/[0.02] px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setView('menu')}
                    className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Bot size={20} className="text-white" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#151924] rounded-full"></div>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm">Citadel Support Desk</h3>
                      <p className="text-xs text-green-400 flex items-center gap-1">
                        <Clock size={10} /> Online - Live Chat
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#0B0E14]/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
              >
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 text-sm mt-10">
                    Send a message to start a conversation with our support team.
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
                      
                      {/* Reply Button (Appears on Hover for Admin Messages) */}
                      {msg.sender === 'admin' && (
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all self-center mr-2"
                          title="Reply to message"
                        >
                          <Reply size={16} />
                        </button>
                      )}

                      <div className={`max-w-[75%] sm:max-w-[60%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg flex flex-col ${
                          msg.sender === 'user' 
                            ? 'bg-blue-600 text-white rounded-tr-sm' 
                            : 'bg-[#151924] border border-white/5 text-gray-300 rounded-tl-sm'
                        }`}>

                          {/* Render Quoted Reply Context */}
                          {msg.replyToText && (
                            <div className="mb-2 pl-3 py-1 border-l-2 border-white/30 text-white/70 text-xs italic bg-black/10 rounded-r-lg">
                              {msg.replyToText.length > 60 ? msg.replyToText.substring(0, 60) + '...' : msg.replyToText}
                            </div>
                          )}

                          {/* Render Uploaded Image with Click-to-Enlarge */}
                          {msg.imageUrl && (
                            <img 
                              src={msg.imageUrl} 
                              alt="Uploaded attachment" 
                              onClick={() => setEnlargedImage(msg.imageUrl!)}
                              className="rounded-lg max-w-full max-h-64 object-contain mb-2 border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity" 
                            />
                          )}

                          {msg.text && <span>{msg.text}</span>}
                        </div>
                        <span className="text-[10px] text-gray-500 font-bold mt-2 px-1">
                          {msg.time}
                        </span>
                      </div>

                      {/* Reply Button (Appears on Hover for User Messages) */}
                      {msg.sender === 'user' && (
                        <button 
                          onClick={() => setReplyingTo(msg)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all self-center ml-2"
                          title="Reply to message"
                        >
                          <Reply size={16} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Replying Context Banner */}
              {replyingTo && (
                <div className="bg-[#0B0E14] border-t border-white/5 px-4 py-2 flex items-center justify-between">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-blue-400 font-bold uppercase">Replying to {replyingTo.sender === 'user' ? 'Yourself' : 'Support Agent'}</span>
                    <span className="text-xs text-gray-400 truncate">{replyingTo.text || "Image Attachment"}</span>
                  </div>
                  <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">
                    <X size={16} />
                  </button>
                </div>
              )}

              <div className="p-4 bg-[#151924] border-t border-white/5 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 bg-[#0B0E14] border border-white/10 rounded-2xl p-2 pr-3 focus-within:border-blue-500/50 transition-colors">
                  
                  {/* Hidden File Input */}
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                  />

                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 text-gray-500 hover:text-blue-400 transition-colors shrink-0"
                  >
                    <ImageIcon size={20} />
                  </button>

                  <input 
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white placeholder:text-gray-600"
                  />
                  <button 
                    type="submit"
                    disabled={(!messageInput.trim() && !imagePreview) || isSending}
                    className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-xl transition-all shrink-0 shadow-lg shadow-blue-600/20"
                  >
                    <Send size={18} className={messageInput.trim() || imagePreview ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
                  </button>
                </form>
              </div>

              {/* DRAWING / ANNOTATION MODAL */}
              {isDrawingModalOpen && (
                <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
                  <div className="w-full max-w-2xl bg-[#151924] rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                    
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <PenTool size={18} className="text-red-500" /> Annotate Image
                      </h3>
                      <button onClick={() => { setIsDrawingModalOpen(false); setImagePreview(null); }} className="text-gray-400 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="p-4 bg-[#0B0E14] flex justify-center items-center overflow-auto relative cursor-crosshair">
                      <canvas
                        ref={canvasRef}
                        onMouseDown={startDrawing}
                        onMouseUp={endDrawing}
                        onMouseOut={endDrawing}
                        onMouseMove={draw}
                        className="max-w-full rounded-lg shadow-lg border border-white/10"
                      />
                      <div className="absolute top-6 left-6 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md border border-white/10 text-xs text-white flex items-center gap-2 pointer-events-none">
                        <div className="w-2 h-2 rounded-full bg-red-500"></div> Draw to circle areas
                      </div>
                    </div>

                    <div className="p-4 border-t border-white/5 flex gap-3">
                      <button 
                        onClick={() => { setIsDrawingModalOpen(false); setImagePreview(null); }}
                        className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl text-sm transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleSendMessage()}
                        disabled={isSending}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all"
                      >
                        {isSending ? 'Uploading...' : 'Upload & Send Image'} <Send size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* ENLARGED IMAGE LIGHTBOX MODAL */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
          onClick={() => setEnlargedImage(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
              className="absolute -top-12 right-0 text-gray-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-2"
            >
              <X size={24} />
            </button>
            <img 
              src={enlargedImage} 
              alt="Enlarged view" 
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()} 
            />
          </div>
        </div>
      )}

    </div>
  );
}