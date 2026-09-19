import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThreadCardSkeleton } from "./ThreadCardSkeleton";
import { Conversation, ChatMessage, Job } from "../types";
import { uploadToImageKit } from "../lib/imagekit";
import { ChatMessageContent } from "./ChatMessageContent";
import { 
  subscribeToConversations, 
  subscribeToConversationMessages,
  markConversationMessagesAsRead,
  loadOlderMessages,
  sendChatMessage, 
  getJobs,
  clearConversationMessages,
  reportConversation
} from "../lib/services";
import { 
  Clock, 
  MessageCircle, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Trash2, 
  Flag, 
  Loader2,
  Check,
  CheckCheck,
  AlertCircle,
  Building,
  Paperclip,
  Briefcase,
  Smile,
  Camera,
  Search,
  X,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CHAT_VECTOR_WALLPAPER = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230B1B3D' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round' opacity='0.05'%3E%3Cpath d='M10 14h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-10l-6 5v-5h-2a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z'/%3E%3Cpath d='M52 48l18-8-8 18-4-6-6-4z'/%3E%3Cpath d='M58 18l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z'/%3E%3Ccircle cx='24' cy='60' r='5'/%3E%3Cpath d='M21.5 60l2 2 4-4'/%3E%3Cpath d='M56 64h10'/%3E%3Cpath d='M61 59v10'/%3E%3Cpath d='M14 36h6'/%3E%3C/g%3E%3C/svg%3E")`;

export const SeekerMessagesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialJobId = searchParams.get("jobId");

  // States
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [currentSystemTime, setCurrentSystemTime] = useState(Date.now());
  const [jobsList, setJobsList] = useState<Job[]>([]);
  const [popupJob, setPopupJob] = useState<Job | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Active subcollection messages state and pagination
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);

  // File/Photo attachment upload
  const handleSeekerFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>, forcedType?: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    try {
      setIsUploadingAttachment(true);
      setSendError(null);
      const res = await uploadToImageKit(file, "/seeker_cvs_and_files");
      const isImg = forcedType === "image" || res.fileType === "image";
      const fileNotice = isImg 
        ? `[Attached Photo]: ${res.url}`
        : `[Attached CV/Document]: ${res.name || file.name}\n${res.url}`;

      await handleSendDirectMessage(fileNotice, {
        attachmentUrl: res.url,
        fileType: isImg ? "image" : "file"
      });
    } catch (err: any) {
      console.error("[CV/File Upload Error]", err);
      setSendError(err.message || "Failed to upload file attachment");
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  useEffect(() => {
    if (activeChatId) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [activeChatId]);

  // Subscribe to scoped subcollection messages for active conversation
  useEffect(() => {
    if (!activeChatId) {
      setActiveMessages([]);
      setHasOlderMessages(false);
      return;
    }

    setHasOlderMessages(true);
    const unsubscribe = subscribeToConversationMessages(activeChatId, 50, (serverMsgs) => {
      setActiveMessages(prev => {
        const pendingOptimistic = prev.filter(
          m => m.deliveryStatus === "sending" && !serverMsgs.some(sm => sm.id === m.id)
        );
        const combined = [...serverMsgs, ...pendingOptimistic];
        return combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      });
      if (serverMsgs.length < 50) {
        setHasOlderMessages(false);
      }
      markConversationMessagesAsRead(activeChatId, currentUser?.uid, "customer");
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [activeChatId]);

  const handleLoadOlderMessages = async () => {
    if (!activeChatId || activeMessages.length === 0 || isLoadingOlder) return;
    setIsLoadingOlder(true);
    try {
      const oldestTime = activeMessages[0].timestamp;
      const older = await loadOlderMessages(activeChatId, oldestTime, 50);
      if (older.length < 50) {
        setHasOlderMessages(false);
      }
      if (older.length > 0) {
        setActiveMessages((prev) => [...older, ...prev]);
      }
    } catch (err) {
      console.warn("[SeekerMessagesView] Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Poll system time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSystemTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to real-time conversations stream
  useEffect(() => {
    const unsubscribe = subscribeToConversations((data) => {
      setConversations(data || {});
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Load jobs list
  useEffect(() => {
    async function loadJobs() {
      const list = await getJobs();
      setJobsList(list);
    }
    loadJobs();
  }, []);

  // Helper to extract the most recent message timestamp
  const getLatestMessageTime = (c: Conversation): number => {
    let latest = c.lastMessageAt || c.createdAt || 0;
    if (c.messages) {
      const msgList = Array.isArray(c.messages) ? c.messages : Object.values(c.messages);
      for (const m of msgList) {
        if (m && typeof m.timestamp === "number" && m.timestamp > latest) {
          latest = m.timestamp;
        }
      }
    }
    return latest;
  };

  // Filter conversations belonging to this seeker
  const seekerPhoneIdentifier = currentUser?.displayName || currentUser?.email || "Unknown Seeker";
  const myConversations = (Object.values(conversations) as Conversation[]).filter(c => {
    if (!c) return false;
    if (currentUser?.uid && c.seekerUid === currentUser.uid) return true;
    if (currentUser?.email && (c.customerPhone === currentUser.email || c.seekerUid === currentUser.email)) return true;
    if (currentUser?.displayName && c.customerPhone === currentUser.displayName) return true;
    if (c.customerPhone === seekerPhoneIdentifier) return true;
    if (currentUser?.uid && c.messages && Array.isArray(c.messages)) {
      return c.messages.some(m => (m.sender === "customer" || m.sender === "guest") && m.senderUid === currentUser.uid);
    }
    return false;
  }).sort((a, b) => getLatestMessageTime(b) - getLatestMessageTime(a));

  // Auto-select chat if query param jobId is specified
  useEffect(() => {
    if (initialJobId && myConversations.length > 0) {
      const match = myConversations.find(c => c.jobId === initialJobId);
      if (match) {
        setActiveChatId(match.chatId);
        setSearchParams({});
      }
    } else if (!activeChatId && myConversations.length > 0) {
      if (window.innerWidth >= 768) {
        setActiveChatId(myConversations[0].chatId);
      }
    }
  }, [initialJobId, myConversations.length]);

  const activeConversation = activeChatId ? conversations[activeChatId] : null;

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: !!activeChatId } }));
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, activeConversation?.messages]);

  // Direct send message
  const handleSendDirectMessage = async (
    textToSend: string, 
    options?: { attachmentUrl?: string; fileType?: "image" | "pdf" | "file" }
  ) => {
    if (!activeChatId || !textToSend.trim() || !currentUser || isSending) return;

    setIsSending(true);
    setSendError(null);

    const now = Date.now();
    const tempId = `msg_${now}_${Math.random().toString(36).substring(2, 7)}`;
    const optimisticMessage: ChatMessage = {
      id: tempId,
      chatId: activeChatId,
      sender: "customer",
      text: textToSend,
      timestamp: now,
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || "Applicant",
      attachmentUrl: options?.attachmentUrl,
      fileType: options?.fileType,
      deliveryStatus: "sending"
    };

    // 1. Optimistically append
    setActiveMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMsg = await sendChatMessage(activeChatId, "customer", textToSend, {
        messageId: tempId,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Applicant",
        senderRole: "seeker",
        attachmentUrl: options?.attachmentUrl,
        fileType: options?.fileType
      });

      // 2. Immediately transition optimistic message to "sent" (single tick)
      setActiveMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, ...sentMsg, deliveryStatus: "sent" } : m))
      );
      setConversations(prev => {
        const conv = prev[activeChatId];
        if (!conv) return prev;
        const msgs = conv.messages || [];
        const msgList = Array.isArray(msgs) ? msgs : Object.values(msgs);
        const updated = msgList.map((m: any) =>
          m.id === tempId ? { ...m, ...sentMsg, deliveryStatus: "sent" } : m
        );
        return {
          ...prev,
          [activeChatId]: {
            ...conv,
            messages: updated
          }
        };
      });
    } catch (err: any) {
      console.error("Failed to deliver message:", err);
      setActiveMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, deliveryStatus: "failed" } : m))
      );
      setSendError(err?.message || "Failed to deliver message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = messageInput.trim();
    if (!textToSend) return;
    setMessageInput("");
    setShowEmojiPicker(false);
    await handleSendDirectMessage(textToSend);
  };

  const formatMessageTime = (timestamp: number) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatThreadDate = (timestamp: number) => {
    if (!timestamp) return "";
    const now = new Date();
    const date = new Date(timestamp);
    if (now.toDateString() === date.toDateString()) return formatMessageTime(timestamp);
    return date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
  };

  const filteredConversations = myConversations.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.jobTitle || "").toLowerCase().includes(q) ||
      (c.text || "").toLowerCase().includes(q)
    );
  });

  // Merged messages for rendering
  const displayedMessages = React.useMemo(() => {
    if (!activeConversation) return [];
    const fromActive = activeMessages || [];
    const fromConv = activeConversation.messages 
      ? (Array.isArray(activeConversation.messages) ? activeConversation.messages : Object.values(activeConversation.messages))
      : [];

    const map = new Map<string, ChatMessage>();
    [...fromActive, ...fromConv].forEach(m => {
      if (m && (m.id || m.timestamp)) {
        const key = m.id || `${m.timestamp}_${m.sender}_${m.text}`;
        if (!map.has(key)) {
          map.set(key, m);
        } else {
          const existing = map.get(key)!;
          if (existing.deliveryStatus === "sending" && m.deliveryStatus && m.deliveryStatus !== "sending") {
            map.set(key, m);
          }
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [activeMessages, activeConversation]);

  const associatedJob = jobsList.find(j => 
    j.id === activeConversation?.jobId || 
    (activeConversation?.text && activeConversation.text.toLowerCase().includes(j.id.toLowerCase()))
  );

  return (
    <div className="w-full flex-1 h-full min-h-0 flex flex-col p-0 m-0 overflow-hidden">
      {/* Hidden File Attachment Inputs */}
      <input
        type="file"
        ref={attachmentInputRef}
        onChange={(e) => handleSeekerFileAttachment(e, "file")}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
      />
      <input
        type="file"
        ref={photoInputRef}
        onChange={(e) => handleSeekerFileAttachment(e, "image")}
        className="hidden"
        accept="image/*"
      />

      <div className="w-full flex-1 h-full min-h-0 flex bg-[#F0F2F5] md:bg-white overflow-hidden font-sans">
        
        {/* ========================================== */}
        {/* LEFT PANEL: THREADS / CONVERSATIONS LIST   */}
        {/* ========================================== */}
        <div className={`w-full md:w-[360px] lg:w-[400px] bg-white border-r border-slate-100 flex flex-col shrink-0 h-full min-h-0 pt-4 sm:pt-5 md:pt-6 ${activeChatId ? "hidden md:flex" : "flex"}`}>
          
          {/* Top Search & Filter Bar */}
          <div className="px-3.5 pt-1 pb-3 bg-white border-b border-slate-100/90 shrink-0">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full pl-9.5 pr-8 py-2 bg-slate-50 hover:bg-slate-100/80 focus:bg-white text-xs text-slate-800 placeholder-slate-400 rounded-full border border-slate-200/80 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Conversations Scroll Feed with Bottom Padding */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 bg-white pb-12 md:pb-10">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map(n => <ThreadCardSkeleton key={n} />)}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  No active chats
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Browse open job listings on the homepage to start chatting with recruiters.
                </p>
                <Link
                  to="/"
                  className="px-4 py-2 bg-[#0B1B3D] text-white rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1.5"
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Browse Jobs</span>
                </Link>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = activeChatId === conv.chatId;
                const lastTime = conv.lastMessageAt || conv.createdAt || 0;
                const latestMsgSnippet = conv.text || "Tap to view conversation";

                return (
                  <div
                    key={conv.chatId}
                    onClick={() => setActiveChatId(conv.chatId)}
                    className={`w-full p-3.5 flex items-start gap-3 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/70" : "hover:bg-slate-50 bg-white"
                    }`}
                  >
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0 mt-0.5">
                      VR
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[14px] font-bold text-slate-900 truncate">
                          {(() => {
                            const title = conv.jobTitle || "";
                            const isGenericOrWhatsapp = !title || 
                              title.toLowerCase().includes("whatsapp") || 
                              title.toLowerCase().includes("inquiry");
                            return isGenericOrWhatsapp ? "Reach Out" : title;
                          })()}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0">
                          {formatThreadDate(lastTime)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 truncate leading-relaxed">
                        {latestMsgSnippet}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANEL: WHATSAPP-STYLE MESSAGING PAGE */}
        {/* ========================================== */}
        <div className={`flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#F0F4F8] relative ${!activeChatId ? "hidden md:flex items-center justify-center bg-[#F8FAFC]" : "flex"}`}>
          
          {activeConversation ? (
            <motion.div
              key={activeChatId}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex-1 flex flex-col h-full min-h-0 min-w-0"
            >
              {/* Soft Refined Chat Header Bar */}
              <div className="px-3.5 sm:px-4 py-2.5 bg-white/95 backdrop-blur-md border-0 flex items-center justify-between gap-3 shrink-0 z-10 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95 rounded-full md:hidden cursor-pointer transition-all flex items-center justify-center shrink-0"
                    title="Back to Conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar profile - perfectly rounded circle */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-[0_2px_8px_rgba(11,27,61,0.14)]">
                      VR
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 truncate leading-tight tracking-tight">
                      Valley Reigns Support
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>online • {activeConversation.jobTitle || "Career Specialist"}</span>
                    </p>
                  </div>
                </div>

                {/* Right Top Header Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {associatedJob && (
                    <button
                      type="button"
                      onClick={() => setPopupJob(associatedJob)}
                      className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50/70 active:scale-95 rounded-full transition-all cursor-pointer"
                      title="View Job Details"
                    >
                      <Briefcase className="w-4 h-4" />
                    </button>
                  )}

                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                      className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95 rounded-full transition-all cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    <AnimatePresence>
                      {headerMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40"
                            onClick={() => setHeaderMenuOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -4 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-11 w-48 bg-white/98 backdrop-blur-md rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-100 py-1.5 z-50 overflow-hidden"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                setShowClearConfirm(true);
                              }}
                              className="w-full px-4 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50/80 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-slate-400" />
                              <span>Clear Chat</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                setShowReportDialog(true);
                              }}
                              className="w-full px-4 py-2 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50/80 flex items-center gap-2 cursor-pointer transition-colors"
                            >
                              <Flag className="w-4 h-4 text-amber-500" />
                              <span>Report Chat</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Collapsible Job Overview Strip */}
              {associatedJob && (
                <div className="bg-blue-50/90 border-b border-blue-100 px-4 py-2 flex items-center justify-between text-xs text-blue-900 shrink-0">
                  <div className="flex items-center gap-2 truncate">
                    <span className="font-bold truncate">{associatedJob.title}</span>
                    <span className="text-blue-600 font-mono text-[11px] shrink-0">({associatedJob.salary})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPopupJob(associatedJob)}
                    className="text-[11px] font-bold text-blue-700 hover:underline shrink-0 ml-2"
                  >
                    View Details
                  </button>
                </div>
              )}

              {/* Messages Feed with Cool Vector Background */}
              <div 
                className="flex-1 overflow-y-auto p-4 md:p-6 space-y-3 relative bg-[#F0F4F8]"
                style={{
                  backgroundImage: CHAT_VECTOR_WALLPAPER,
                  backgroundRepeat: "repeat",
                  backgroundSize: "80px 80px"
                }}
              >
                {/* Pagination */}
                {hasOlderMessages && displayedMessages.length >= 50 && (
                  <div className="flex justify-center mb-2">
                    <button
                      type="button"
                      onClick={handleLoadOlderMessages}
                      disabled={isLoadingOlder}
                      className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-full text-[11px] font-semibold flex items-center gap-1.5 shadow-2xs border border-slate-200 cursor-pointer disabled:opacity-50"
                    >
                      {isLoadingOlder ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Loading earlier messages...</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5" />
                          <span>Load earlier messages</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Floating Date Separator Pill */}
                <div className="flex justify-center my-2 sticky top-2 z-10">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-xs text-slate-600 text-[11px] font-semibold rounded-full shadow-2xs border border-black/5">
                    Today
                  </span>
                </div>

                {/* Message Bubbles (WhatsApp Geometry with Soft Shadow) */}
                {displayedMessages.map((msg, idx) => {
                  const isSeekerMe = msg.sender === "seeker" || msg.sender === "customer" || (msg.senderUid && currentUser && msg.senderUid === currentUser.uid);
                  const isSystem = msg.sender === "system";

                  if (isSystem) {
                    return (
                      <div key={msg.id || idx} className="flex justify-center my-2">
                        <span className="px-3 py-1 bg-slate-200/90 text-slate-700 text-[11px] font-medium rounded-full shadow-2xs text-center max-w-sm">
                          {msg.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex w-full ${isSeekerMe ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[65%] px-3.5 py-2 ${
                          isSeekerMe
                            ? "bg-[#DCF8C6] text-slate-900 rounded-2xl rounded-tr-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            : "bg-white text-slate-900 rounded-2xl rounded-tl-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        {!isSeekerMe && (
                          <p className="text-[11px] font-bold text-blue-600 mb-0.5">
                            {msg.senderName || "Valley Reigns Specialist"}
                          </p>
                        )}

                        <div className="text-[13.5px] leading-relaxed">
                          <ChatMessageContent msg={msg} isSelf={isSeekerMe} />
                        </div>

                        <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5 select-none">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isSeekerMe && (
                            <>
                              {msg.deliveryStatus === "sending" && (
                                <Clock className="w-3.5 h-3.5 text-slate-400 animate-pulse" title="Sending to Firestore..." />
                              )}
                              {msg.deliveryStatus === "failed" && (
                                <button
                                  type="button"
                                  onClick={() => handleSendDirectMessage(msg.text, { attachmentUrl: msg.attachmentUrl, fileType: msg.fileType })}
                                  className="inline-flex items-center gap-0.5 text-rose-600 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                                  title="Failed to deliver. Click to retry"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Retry</span>
                                </button>
                              )}
                              {(msg.deliveryStatus === "sent" || (!msg.deliveryStatus && !msg.read)) && !msg.read && (
                                <Check className="w-3.5 h-3.5 text-slate-400" title="Sent to server" />
                              )}
                              {(msg.read || msg.deliveryStatus === "delivered") && (
                                <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" title="Read by recipient" />
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div ref={messagesEndRef} />
              </div>

              {/* Send Error Toast */}
              {sendError && (
                <div className="px-4 py-2 bg-rose-50 border-t border-rose-200 text-rose-700 text-xs flex items-center justify-between">
                  <span>{sendError}</span>
                  <button onClick={() => setSendError(null)} className="text-rose-500 hover:text-rose-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* WhatsApp Style Bottom Input Bar (Transparent, No Border, No Box Shadow) */}
              <div className="p-3 bg-transparent border-0 shadow-none shrink-0 mt-auto">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 bg-white/95 backdrop-blur-md rounded-full border-0 shadow-none flex items-center px-3.5 py-1.5 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none py-1"
                    />

                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Attach Resume / CV"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : (
                        <Paperclip className="w-5 h-5 -rotate-45" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Send Photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isSending}
                    className="w-11 h-11 bg-[#0B1B3D] hover:bg-blue-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-none border-0 transition-all active:scale-95 shrink-0 cursor-pointer"
                    title="Send Message"
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 ml-0.5" />
                    )}
                  </button>
                </form>

                {showEmojiPicker && (
                  <div className="flex items-center gap-2 mt-2 p-2 bg-white rounded-xl shadow-xs border border-slate-200 overflow-x-auto">
                    {["👍", "👋", "✅", "🎉", "💼", "📄", "🙏", "⭐", "🔥", "🤝"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          setMessageInput(prev => prev + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="text-lg hover:scale-125 transition-transform p-1 cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Your Job Communications
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Select a recruiter thread to chat directly, upload your CV, or discuss interview schedules.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clear Single Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Clear this chat history?</h4>
              <p className="text-xs text-slate-500 mt-1">
                All messages in this thread will be permanently cleared.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (activeChatId) {
                    await clearConversationMessages(activeChatId);
                    setActiveMessages([]);
                    setShowClearConfirm(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Details Popup */}
      {popupJob && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-slate-900 leading-tight">{popupJob.title}</h4>
                  <p className="text-xs text-slate-500 font-medium">{popupJob.company} • {popupJob.location}</p>
                </div>
              </div>
              <button
                onClick={() => setPopupJob(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Salary Range:</span>
              <span className="font-bold text-emerald-700">{popupJob.salary}</span>
            </div>

            <div>
              <h5 className="text-xs font-bold text-slate-700 mb-1">Job Description</h5>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {popupJob.description}
              </p>
            </div>

            {popupJob.requirements && (
              <div>
                <h5 className="text-xs font-bold text-slate-700 mb-1">Requirements</h5>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {popupJob.requirements}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setPopupJob(null)}
                className="px-4 py-2 bg-[#0B1B3D] text-white rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Report Conversation</h4>
              <p className="text-xs text-slate-500 mt-1">
                Let us know what went wrong. We will review the message logs.
              </p>
            </div>
            <textarea
              rows={3}
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Enter reason..."
              className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReportDialog(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (activeChatId && reportReason.trim()) {
                    await reportConversation(activeChatId, reportReason.trim());
                    setShowReportDialog(false);
                    setReportReason("");
                  }
                }}
                disabled={!reportReason.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold"
              >
                Submit Report
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
