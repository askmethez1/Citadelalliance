"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Search, Send, Clock, CheckCircle2, MoreVertical, Paperclip, Bot, Image as ImageIcon, X, Reply, PenTool } from 'lucide-react';
import { getAdminConversations, getAdminMessagesForUser, sendAdminMessage } from '@/app/actions/chat';

interface Message {
  id: string;
  sender: 'user' | 'admin';
  text: string;
  time: string;
  imageUrl?: string;
  replyToText?: string;
}

interface ConversationList {
  id: number;
  userName: string;
  userEmail: string;
  status: string;
  unreadCount: number;
  lastMessageTime: string;
  lastMessageText: string;
}

export default function ChatTab() {
  const [conversations, setConversations] = useState<ConversationList[]>([]);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [activeMessages, setActiveMessages] = useState<Message[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Message Input States
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Image Upload & Annotation States
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDrawingModalOpen, setIsDrawingModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll Conversation List
  useEffect(() => {
    const fetchConvs = async () => {
      const data = await getAdminConversations();
      setConversations(data);
    };
    fetchConvs();
    const interval = setInterval(fetchConvs, 5000);
    return () => clearInterval(interval);
  }, []);

  // Poll Active Chat Messages
  useEffect(() => {
    if (!activeChatId) return;

    const fetchMsgs = async () => {
      const msgs = await getAdminMessagesForUser(activeChatId);
      setActiveMessages(msgs);
    };

    fetchMsgs();
    const interval = setInterval(fetchMsgs, 3000);
    return () => clearInterval(interval);
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages]);

  // --- IMAGE UPLOAD TO CLOUDINARY ---
  const uploadImageToCloudinary = async (base64Img: string) => {
    try {
      const formData = new FormData();
      formData.append('file', base64Img);
      // Updated to match your Cloudinary preset name exactly
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

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!replyText.trim() && !imagePreview) || !activeChatId || isSending) return;

    setIsSending(true);
    let finalImageUrl = undefined;

    // Handle annotated image upload
    if (imagePreview && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
      finalImageUrl = await uploadImageToCloudinary(dataUrl);
    }

    const text = replyText.trim() || (finalImageUrl ? 'Sent an image' : '');
    const replyContext = replyingTo ? replyingTo.text : undefined;
    
    // Clear inputs
    setReplyText('');
    setReplyingTo(null);
    setImagePreview(null);
    setIsDrawingModalOpen(false);

    // Optimistic Update
    setActiveMessages(prev => [...prev, {
      id: Date.now().toString(),
      sender: 'admin',
      text: text,
      imageUrl: finalImageUrl,
      replyToText: replyContext,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);

    await sendAdminMessage(activeChatId, text, finalImageUrl, replyContext);
    const updated = await getAdminMessagesForUser(activeChatId);
    setActiveMessages(updated);
    
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

  const filteredConversations = conversations.filter(c => 
    c.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.userEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeUser = conversations.find(c => c.id === activeChatId);

  return (
    <div className="bg-[#151924] border border-white/5 rounded-3xl shadow-xl flex overflow-hidden h-[75vh] relative">
      
      {/* LEFT SIDEBAR: Conversation List */}
      <div className="w-1/3 min-w-[280px] border-r border-white/5 flex flex-col bg-[#0B0E14]/50">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white mb-4">Live Support Desk</h2>
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full bg-[#151924] border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-none">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-gray-500 text-xs">No active conversations found.</div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveChatId(conv.id)}
                className={`w-full text-left p-4 border-b border-white/5 transition-all flex items-start gap-3 relative ${
                  activeChatId === conv.id ? 'bg-blue-600/10 border-l-2 border-l-blue-500' : 'hover:bg-white/5 border-l-2 border-l-transparent'
                }`}
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center font-bold text-white">
                    {conv.userName.charAt(0)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#0B0E14] rounded-full ${conv.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className={`text-sm font-bold truncate ${conv.unreadCount > 0 ? 'text-white' : 'text-gray-300'}`}>
                      {conv.userName}
                    </h4>
                    <span className="text-[10px] text-gray-500 shrink-0">{conv.lastMessageTime}</span>
                  </div>
                  <p className={`text-xs truncate pr-4 ${conv.unreadCount > 0 ? 'text-blue-400 font-medium' : 'text-gray-500'}`}>
                    {conv.lastMessageText || 'No message yet'}
                  </p>
                </div>

                {conv.unreadCount > 0 && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-lg shadow-blue-600/20">
                    {conv.unreadCount}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: Active Chat Window */}
      <div className="flex-1 flex flex-col bg-[#151924]">
        {activeChatId && activeUser ? (
          <>
            {/* Chat Header */}
            <div className="h-20 border-b border-white/5 px-6 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gray-800 border border-white/10 flex items-center justify-center font-bold text-white">
                    {activeUser.userName.charAt(0)}
                  </div>
                  <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-[#151924] rounded-full ${activeUser.status === 'online' ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    {activeUser.userName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{activeUser.userEmail}</p>
                </div>
              </div>
              <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
                <MoreVertical size={16} />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {activeMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'} group`}>
                  
                  {/* Reply Button (Appears on Hover) */}
                  {msg.sender !== 'admin' && (
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all self-center mr-2"
                      title="Reply to message"
                    >
                      <Reply size={16} />
                    </button>
                  )}

                  <div className={`max-w-[75%] sm:max-w-[60%] flex flex-col ${msg.sender === 'admin' ? 'items-end' : 'items-start'}`}>
                    
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        {msg.sender === 'admin' ? 'Support Agent' : activeUser.userName}
                      </span>
                    </div>

                    <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed shadow-lg flex flex-col ${
                      msg.sender === 'admin' 
                        ? 'bg-blue-600 text-white rounded-tr-sm' 
                        : 'bg-[#0B0E14] border border-white/5 text-gray-300 rounded-tl-sm'
                    }`}>
                      
                      {/* Render Quoted Reply Context */}
                      {msg.replyToText && (
                        <div className="mb-2 pl-3 py-1 border-l-2 border-white/30 text-white/70 text-xs italic bg-black/10 rounded-r-lg">
                          {msg.replyToText.length > 60 ? msg.replyToText.substring(0, 60) + '...' : msg.replyToText}
                        </div>
                      )}

                      {/* Render Uploaded Image */}
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Uploaded attachment" className="rounded-lg max-w-full max-h-64 object-contain mb-2 border border-white/10" />
                      )}
                      
                      {msg.text && <span>{msg.text}</span>}
                    </div>

                    <div className="flex items-center gap-1 mt-1.5 px-1">
                      <span className="text-[10px] text-gray-500 font-bold">{msg.time}</span>
                      {msg.sender === 'admin' && <CheckCircle2 size={12} className="text-blue-500" />}
                    </div>
                  </div>

                  {/* Reply Button for Admin Messages */}
                  {msg.sender === 'admin' && (
                    <button 
                      onClick={() => setReplyingTo(msg)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-white transition-all self-center ml-2"
                      title="Reply to message"
                    >
                      <Reply size={16} />
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Replying Context Banner */}
            {replyingTo && (
              <div className="bg-[#0B0E14] border-t border-white/5 px-4 py-2 flex items-center justify-between">
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] text-blue-400 font-bold uppercase">Replying to {replyingTo.sender === 'admin' ? 'Yourself' : activeUser.userName}</span>
                  <span className="text-xs text-gray-400 truncate">{replyingTo.text || "Image Attachment"}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="text-gray-500 hover:text-white">
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Chat Input */}
            <div className="p-4 border-t border-white/5 bg-[#0B0E14]/30 shrink-0">
              <form onSubmit={handleSendReply} className="flex items-center gap-3 bg-[#151924] border border-white/10 rounded-2xl p-2 pr-3 focus-within:border-blue-500/50 transition-colors">
                
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
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${activeUser.userName}...`}
                  className="flex-1 bg-transparent border-none focus:outline-none text-sm text-white placeholder:text-gray-600"
                />
                
                <button 
                  type="submit"
                  disabled={(!replyText.trim() && !imagePreview) || isSending}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-gray-700 text-white rounded-xl transition-all shrink-0 shadow-lg shadow-blue-600/20"
                >
                  <Send size={18} className={replyText.trim() || imagePreview ? "translate-x-0.5 -translate-y-0.5 transition-transform" : ""} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
            <Bot size={48} className="mb-4 text-gray-700" />
            <p className="text-sm font-bold">No Conversation Selected</p>
            <p className="text-xs mt-1">Select a user from the list to view and reply to messages.</p>
          </div>
        )}
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
                onClick={() => handleSendReply()}
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
  );
}