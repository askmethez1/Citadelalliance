"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Bot, Clock,
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
  
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);

  // Image Upload & Annotation States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reference for the chat container to isolate scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initial location detect
  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setLocation(`${data.city}, ${data.country_name}`);
      })
      .catch(() => setLocation('Location Unavailable'));
  }, []);

  // Poll for messages continuously
  useEffect(() => {
    const fetchMsgs = async () => {
      const dbMessages = await getUserMessages();
      setMessages(dbMessages);
    };

    fetchMsgs(); // Initial fetch
    const interval = setInterval(fetchMsgs, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, []);

  // Auto-scroll chat container on new messages
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Cloudinary Image Upload
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

  // Canvas Annotation Handler
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
    ctx.strokeStyle = '#ef4444'; // Red pen tool

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  return (
    // FIX: Changed from min-h-screen to h-screen to prevent the whole page from scrolling
    <div className="h-screen bg-[#0B0E14] text-gray-300 font-sans flex selection:bg-blue-500/30 w-full relative overflow-hidden">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} location={location} />

      {/* FIX: Set h-full and min-h-0 to strictly constrain the flexbox math */}
      <main className="flex-1 flex flex-col h-full relative min-w-0">
        <TopHeader />

        <div className="flex-1 p-2 sm:p-4 lg:p-6 w-full max-w-6xl mx-auto flex flex-col min-h-0">
          
          <div className="mb-4 shrink-0 px-2 sm:px-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-1 sm:mb-2 tracking-tight flex items-center gap-2 sm:gap-3">
              <MessageSquare className="text-blue-500 w-6 h-6 sm:w-8 sm:h-8" /> Support Desk Chat
            </h1>
            <p className="text-gray-400 text-xs sm:text-sm">Direct live communication with our executive support team.</p>
          </div>

          {/* ON-SITE LIVE CHAT INTERFACE */}
          {/* FIX: min-h-0 guarantees this container won't push out of the bounds of the screen */}
          <div className="flex-1 bg-[#151924] border border-white/5 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col overflow-hidden relative min-h-0">
            
            {/* Chat Header */}
            <div className="h-16 sm:h-20 border-b border-white/5 bg-white/[0.02] px-4 sm:px-6 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                    <Bot className="text-white w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 border-2 border-[#151924] rounded-full"></div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">Citadel Support Desk</h3>
                  <p className="text-[10px] sm:text-xs text-green-400 flex items-center gap-1">
                    <Clock size={10} /> Online - Executive Live Support
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 bg-[#0B0E14]/50 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
            >
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 text-xs sm:text-sm mt-10">
                  Send a message to start a conversation with our support team.
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} group`}>
                    
                    {/* Reply Button (Admin Messages) */}
                    {msg.sender === 'admin' && (
                      <button 
                        onClick={() => setReplyingTo(msg)}
                        className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all self-center mr-2"
                        title="Reply to message"
                      >
                        <Reply size={16} />
                      </button>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed shadow-lg flex flex-col ${
                        msg.sender === 'user' 
                          ? 'bg-blue-600 text-white rounded-tr-sm' 
                          : 'bg-[#151924] border border-white/5 text-gray-300 rounded-tl-sm'
                      }`}>

                        {/* Quoted Reply Context */}
                        {msg.replyToText && (
                          <div className="mb-2 pl-3 py-1 border-l-2 border-white/30 text-white/70 text-[10px] sm:text-xs italic bg-black/10 rounded-r-lg">
                            {msg.replyToText.length > 60 ? msg.replyToText.substring(0, 60) + '...' : msg.replyToText}
                          </div>
                        )}

                        {/* Image Attachment with Lightbox */}
                        {msg.imageUrl && (
                          <img 
                            src={msg.imageUrl} 
                            alt="Uploaded attachment" 
                            onClick={() => setEnlargedImage(msg.imageUrl!)}
                            className="rounded-lg max-w-full max-h-48 sm:max-h-64 object-contain mb-2 border border-white/10 cursor-zoom-in hover:opacity-90 transition-opacity" 
                          />
                        )}

                        {msg.text && <span>{msg.text}</span>}
                      </div>
                      <span className="text-[9px] sm:text-[10px] text-gray-500 font-bold mt-1.5 sm:mt-2 px-1">
                        {msg.time}
                      </span>
                    </div>

                    {/* Reply Button (User Messages) */}
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
              <div className="bg-[#0B0E14] border-t border-white/5 px-4 py-2 flex items-center justify-between shrink-0">
                <div className="flex flex-col min-w-0">
                  <span className="text-[9px] sm:text-[10px] text-blue-400 font-bold uppercase">Replying to {replyingTo.sender === 'user' ? 'Yourself' : 'Support Agent'}</span>
                  <span className="text-[10px] sm:text-xs text-gray-400 truncate">{replyingTo.text || "Image Attachment"}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white p-1">
                  <X size={14} className="sm:w-4 sm:h-4" />
                </button>
              </div>
            )}

            {/* Message Input Bar */}
            <div className="p-2 sm:p-4 bg-[#151924] border-t border-white/5 shrink-0">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2 sm:gap-3 bg-[#0B0E14] border border-white/10 rounded-xl sm:rounded-2xl p-1.5 sm:p-2 pr-2 sm:pr-3 focus-within:border-blue-500/50 transition-colors">
                
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
                  className="p-2 sm:p-2.5 text-gray-500 hover:text-blue-400 transition-colors shrink-0"
                  title="Attach Image"
                >
                  <ImageIcon size={18} className="sm:w-5 sm:h-5" />
                </button>

                <input 
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-transparent border-none focus:outline-none text-xs sm:text-sm text-white placeholder:text-gray-600 min-w-0"
                />
                
                <button 
                  type="submit"
                  disabled={(!messageInput.trim() && !imagePreview) || isSending}
                  className="p-2 sm:p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-lg sm:rounded-xl transition-all shrink-0 shadow-lg shadow-blue-600/20 flex items-center justify-center"
                >
                  <Send size={16} className={`sm:w-[18px] sm:h-[18px] ${messageInput.trim() || imagePreview ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""}`} />
                </button>
              </form>
            </div>

            {/* DRAWING / ANNOTATION MODAL */}
            {isDrawingModalOpen && (
              <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 sm:p-6">
                <div className="w-full max-w-2xl bg-[#151924] rounded-2xl sm:rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                  
                  <div className="p-3 sm:p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h3 className="text-sm sm:text-base text-white font-bold flex items-center gap-2">
                      <PenTool size={16} className="text-red-500 sm:w-[18px] sm:h-[18px]" /> Annotate Image
                    </h3>
                    <button onClick={() => { setIsDrawingModalOpen(false); setImagePreview(null); }} className="text-gray-400 hover:text-white p-1">
                      <X size={18} className="sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  <div className="p-4 bg-[#0B0E14] flex justify-center items-center overflow-auto relative cursor-crosshair min-h-[200px]">
                    <canvas
                      ref={canvasRef}
                      onMouseDown={startDrawing}
                      onMouseUp={endDrawing}
                      onMouseOut={endDrawing}
                      onMouseMove={draw}
                      // For mobile touch drawing compatibility
                      onTouchStart={(e) => {
                        setIsDrawing(true);
                        const touch = e.touches[0];
                        const mouseEvent = new MouseEvent("mousedown", {
                          clientX: touch.clientX,
                          clientY: touch.clientY
                        });
                        draw(mouseEvent as any);
                      }}
                      onTouchEnd={endDrawing}
                      onTouchMove={(e) => {
                        e.preventDefault();
                        const touch = e.touches[0];
                        const mouseEvent = new MouseEvent("mousemove", {
                          clientX: touch.clientX,
                          clientY: touch.clientY
                        });
                        draw(mouseEvent as any);
                      }}
                      className="max-w-full max-h-[50vh] rounded-lg shadow-lg border border-white/10 touch-none"
                    />
                    <div className="absolute top-4 left-4 bg-black/60 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg backdrop-blur-md border border-white/10 text-[10px] sm:text-xs text-white flex items-center gap-1.5 sm:gap-2 pointer-events-none">
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-500"></div> Draw to circle areas
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 border-t border-white/5 flex gap-2 sm:gap-3">
                    <button 
                      onClick={() => { setIsDrawingModalOpen(false); setImagePreview(null); }}
                      className="flex-1 py-2.5 sm:py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg sm:rounded-xl text-xs sm:text-sm transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => handleSendMessage()}
                      disabled={isSending}
                      className="flex-1 py-2.5 sm:py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-lg sm:rounded-xl text-xs sm:text-sm shadow-lg shadow-blue-600/20 flex items-center justify-center gap-1.5 sm:gap-2 transition-all"
                    >
                      {isSending ? 'Uploading...' : 'Upload & Send'} <Send size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>

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
              className="absolute -top-10 sm:-top-12 right-0 text-gray-400 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full p-1.5 sm:p-2"
            >
              <X size={20} className="sm:w-6 sm:h-6" />
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