import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThreadCardSkeleton } from "./ThreadCardSkeleton";
import { Conversation, ChatMessage, Job } from "../types";
import { 
  subscribeToConversations, 
  sendChatMessage, 
  getJobs,
  updateConversationStatus,
  clearConversationMessages,
  reportConversation,
  updateTypingStatus
} from "../lib/services";
import { 
  Clock, 
  MessageCircle, 
  Smartphone, 
  Check, 
  X, 
  Send, 
  AlertCircle, 
  ArrowLeft, 
  ChevronRight, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  MoreHorizontal, 
  MoreVertical, 
  Trash2, 
  Flag, 
  Loader2,
  CheckCheck,
  Building,
  LogOut,
  MessageSquare,
  Paperclip
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
  const [jobExpanded, setJobExpanded] = useState<Record<string, boolean>>({});
  const [popupJob, setPopupJob] = useState<Job | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeChatId) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [activeChatId]);

  // Poll system time every 10 seconds for precise countdown calculations
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

  // Load jobs list for reference job cards lookup
  useEffect(() => {
    async function loadJobs() {
      const list = await getJobs();
      setJobsList(list);
    }
    loadJobs();
  }, []);

  // Dispatch custom event to let AppContent know if a conversation is active (and thus hide the main header)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: !!activeChatId } }));
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, [activeChatId]);

  // Filter conversations belonging to this seeker
  const seekerPhoneIdentifier = currentUser?.displayName || currentUser?.email || "Unknown Seeker";
  const myConversations = (Object.values(conversations) as Conversation[]).filter(c => 
    c.customerPhone === seekerPhoneIdentifier || 
    c.customerPhone === currentUser?.email ||
    c.customerPhone === currentUser?.displayName
  ).sort((a, b) => b.lastMessageAt - a.lastMessageAt);

  // Auto-select chat if query param jobId is specified
  useEffect(() => {
    if (initialJobId && myConversations.length > 0) {
      const match = myConversations.find(c => c.jobId === initialJobId);
      if (match) {
        setActiveChatId(match.chatId);
        // Clear query param to avoid sticky navigation state
        setSearchParams({});
      }
    } else if (!activeChatId && myConversations.length > 0) {
      // Default to first active chat on desktop
      if (window.innerWidth >= 768) {
        setActiveChatId(myConversations[0].chatId);
      }
    }
  }, [initialJobId, myConversations.length]);

  const activeConversation = activeChatId ? conversations[activeChatId] : null;

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear typing state on active chat change or unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (activeChatId && currentUser) {
        updateTypingStatus(activeChatId, currentUser.uid, false, currentUser.displayName || currentUser.email);
      }
    };
  }, [activeChatId, currentUser]);

  const handleInputChange = (val: string) => {
    setMessageInput(val);
    if (!activeChatId || !currentUser) return;
    updateTypingStatus(activeChatId, currentUser.uid, true, currentUser.displayName || currentUser.email);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(activeChatId, currentUser.uid, false, currentUser.displayName || currentUser.email);
    }, 3000);
  };

  const getTypingStatusText = () => {
    if (!activeConversation || !activeConversation.typing || !currentUser) return null;
    const now = Date.now();
    const activeTypers = Object.entries(activeConversation.typing)
      .filter(([uid, info]) => {
        const typingInfo = info as { isTyping: boolean; name: string; updatedAt: number };
        return uid !== currentUser.uid && typingInfo.isTyping && (now - (typingInfo.updatedAt || 0) < 6000);
      })
      .map(([_, info]) => {
        const typingInfo = info as { isTyping: boolean; name: string; updatedAt: number };
        return typingInfo.name || "Staff";
      });
    
    if (activeTypers.length === 0) return null;
    if (activeTypers.length === 1) return `${activeTypers[0]} is typing...`;
    return `${activeTypers.join(", ")} are typing...`;
  };

  const typingText = getTypingStatusText();

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChatId || !messageInput.trim() || !currentUser || isSending) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    updateTypingStatus(activeChatId, currentUser.uid, false, currentUser.displayName || currentUser.email);

    setIsSending(true);
    try {
      await sendChatMessage(activeChatId, "customer", messageInput.trim());
      setMessageInput("");
    } finally {
      setIsSending(false);
    }
  };

  // Seeker communications templates (when 24h Meta window expires for standard WA chats)
  const APPROVED_TEMPLATES_SEEKER = [
    "Hello! I am still highly interested in this position. Can you connect me with the next step?",
    "Yes, I confirm my availability for an interview call. Please let me know what times work best.",
    "Thank you for reaching out. Here is my updated profile and portfolio details to proceed with the application."
  ];

  const handleSendTemplate = async (templateText: string) => {
    if (!activeChatId || !currentUser) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    updateTypingStatus(activeChatId, currentUser.uid, false, currentUser.displayName || currentUser.email);
    await sendChatMessage(activeChatId, "customer", templateText);
  };

  // Helper to safely format timestamps
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Expiration Clock Calculations (24-Hour window based on arrival timestamp vs current time)
  const getExpirationState = (conv: Conversation) => {
    // Check if conversation is an in-app conversation (not standard WhatsApp)
    const isInApp = !conv.customerPhone.startsWith("+");
    if (isInApp) {
      return { isExpired: false, text: "In-App Chat", hoursLeft: 999, isUrgent: false, isInApp: true };
    }

    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const ageMs = currentSystemTime - conv.createdAt;
    const timeRemainingMs = windowMs - ageMs;

    if (timeRemainingMs <= 0) {
      return { isExpired: true, text: "Expired", hoursLeft: 0, isUrgent: false, isInApp: false };
    }

    const hoursLeft = Math.floor(timeRemainingMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeRemainingMs % (1000 * 60 * 60)) / (1000 * 60));

    const isUrgent = hoursLeft < 1; // Less than an hour
    const textStr = hoursLeft > 0 
      ? `${hoursLeft} hr${hoursLeft > 1 ? "s" : ""} left` 
      : `${minutesLeft} min${minutesLeft > 1 ? "s" : ""} left`;

    return {
      isExpired: false,
      text: textStr,
      hoursLeft,
      isUrgent,
      isInApp: false
    };
  };

  const isChatActive = !!activeConversation;

  return (
    <div className={isChatActive ? "w-full h-full md:h-auto md:max-w-7xl md:mx-auto md:px-4 sm:md:px-6 lg:md:px-8 md:pt-8 md:pb-10 flex flex-col bg-white min-h-0" : "max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 pb-10 flex flex-col"}>
      {/* Main Split-Pane Workspace Frame */}
      <div className={isChatActive ? "bg-white flex-grow flex flex-row relative overflow-hidden min-h-0 md:border md:border-slate-200/80 md:rounded-3xl md:shadow-sm md:h-[700px]" : "bg-white border border-slate-200/80 rounded-3xl shadow-sm h-[700px] flex flex-row relative overflow-hidden"}>
        
        {/* ========================================== */}
        {/* LEFT PANEL: Messaging Threads & Lists */}
        {/* ========================================== */}
        <div className={`w-full md:w-96 border-0 shadow-none rounded-none bg-white flex flex-col shrink-0 border-r border-slate-100/80 absolute md:relative inset-y-0 left-0 transform transition-transform duration-300 ease-out z-10 ${
          activeConversation ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        }`}>
          {/* Custom Navigation Header block */}
          <div className="border-b border-slate-50 shrink-0 flex items-center justify-between px-4 py-3.5 bg-white">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#1E88E5]">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-sans font-black text-slate-800 tracking-tight leading-none">
                  My Live Chats
                </h3>
                <span className="text-[9px] font-mono font-bold text-[#1E88E5] uppercase tracking-wider block mt-1">
                  Active Applications ({myConversations.length})
                </span>
              </div>
            </div>
          </div>

          {/* List Scroll Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <ThreadCardSkeleton key={n} showClaimButton={false} />
                ))}
              </div>
            ) : myConversations.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <p className="text-xs font-sans font-semibold text-slate-400 leading-snug">
                  No chat threads active yet.
                </p>
                <p className="text-[10px] font-sans text-slate-300 max-w-xs mt-1 leading-normal">
                  Go back to your dashboard, select an open job role, and click "Send Message" to start a live recruiter conversation!
                </p>
              </div>
            ) : (
              myConversations.map((conv) => {
                const isSelected = activeChatId === conv.chatId;
                const exp = getExpirationState(conv);
                const rawMessages = conv.messages;
                const messagesArray: ChatMessage[] = [];

                if (rawMessages) {
                  if (Array.isArray(rawMessages)) {
                    messagesArray.push(...rawMessages);
                  } else {
                    Object.entries(rawMessages).forEach(([id, msg]) => {
                      const typedMsg = msg as ChatMessage;
                      messagesArray.push({ id, ...typedMsg });
                    });
                  }
                }
                messagesArray.sort((a, b) => a.timestamp - b.timestamp);
                const latestMsg = messagesArray[messagesArray.length - 1];

                return (
                  <div
                    key={conv.chatId}
                    onClick={() => setActiveChatId(conv.chatId)}
                    className={`w-full text-left p-4 rounded-2xl transition-all duration-300 border cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border-blue-200 shadow-md shadow-blue-900/5 scale-[1.02]"
                        : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-950 flex items-center gap-1 max-w-[70%] truncate">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {conv.jobTitle}
                      </span>
                      {exp.isInApp ? (
                        <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-[#1E88E5] shrink-0">
                          In-App
                        </span>
                      ) : (
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 ${exp.isUrgent ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50 text-[#1E88E5]"}`}>
                          <Clock className="w-2.5 h-2.5" />
                          {exp.hoursLeft}h left
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="text-[10px] font-sans font-bold text-[#1E88E5]">
                        Hiring Team • {conv.assignedToName || "Unassigned Agent"}
                      </p>
                      {latestMsg && (
                        <p className="text-[11px] font-sans text-slate-400 line-clamp-1 italic">
                          {latestMsg.sender === "customer" ? "You: " : "Recruiter: "}
                          "{latestMsg.text}"
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANEL: Messaging Active Workspace */}
        {/* ========================================== */}
        <div className={`flex-grow flex flex-col bg-slate-50 min-w-0 border-0 shadow-none rounded-none ml-0 overflow-hidden absolute md:relative inset-y-0 right-0 w-full md:w-auto transform transition-transform duration-300 ease-out z-20 md:z-10 ${
          activeConversation ? "translate-x-0 md:translate-x-0" : "translate-x-full md:translate-x-0"
        }`}>
          {activeConversation ? (
            <motion.div
              key={activeConversation.chatId}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="flex-grow flex flex-col overflow-y-auto h-full relative pt-16 pb-48 md:overflow-y-hidden md:h-auto md:min-h-0 md:pt-0 md:pb-0 text-left"
            >
              {/* Active Conversation Metadata Header */}
              <div className="bg-white px-5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 fixed top-0 left-0 right-0 z-40 w-full md:relative md:top-auto md:left-auto md:right-auto md:z-auto">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Return button on mobile */}
                  <button
                    onClick={() => setActiveChatId(null)}
                    className="md:hidden p-1.5 -ml-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all mr-1 shrink-0 cursor-pointer"
                    title="Back to threads"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-[#1E88E5] font-mono text-xs font-black shrink-0 border border-blue-100 shadow-sm">
                    VR
                  </div>
                  <div className="min-w-0 leading-tight">
                    <h4 className="text-sm font-sans font-black text-slate-800 tracking-tight truncate">
                      {activeConversation.jobTitle}
                    </h4>
                    <p className="text-[10px] font-mono font-bold text-[#1E88E5] uppercase tracking-wider mt-0.5 truncate">
                      {activeConversation.assignedToName ? `Claimed by ${activeConversation.assignedToName}` : "Waiting for Recruiter Claim..."}
                    </p>
                  </div>
                </div>

                {/* Expiration Clock / In-App Badge */}
                <div className="flex items-center gap-2 shrink-0">
                  {(() => {
                    const exp = getExpirationState(activeConversation);
                    if (exp.isInApp) {
                      return (
                        <div className="px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold bg-blue-50 border border-blue-100 text-[#1E88E5]">
                          In-App Chat
                        </div>
                      );
                    }
                    return (
                      <div className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold flex items-center gap-1.5 border ${
                        exp.isExpired 
                          ? "bg-slate-100 border-slate-200 text-slate-400" 
                          : exp.isUrgent 
                          ? "bg-red-50 border-red-100 text-red-600 animate-[pulse_1.5s_infinite]" 
                          : "bg-blue-50 border-blue-100 text-[#1E88E5]"
                      }`}>
                        <Clock className="w-3.5 h-3.5" />
                        {exp.text}
                      </div>
                    );
                  })()}

                  {/* More Actions Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setHeaderMenuOpen(!headerMenuOpen)}
                      className={`p-2.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-xl border border-slate-100 transition-all cursor-pointer flex items-center justify-center ${headerMenuOpen ? "bg-slate-100 border-slate-200 text-slate-800" : ""}`}
                      title="More chat actions"
                    >
                      <MoreVertical className="w-4.5 h-4.5" />
                    </button>

                    {/* Dropdown Menu Overlay */}
                    <AnimatePresence>
                      {headerMenuOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setHeaderMenuOpen(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            transition={{ duration: 0.12 }}
                            className="absolute right-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-50"
                          >
                            <div className="py-1">
                              {/* Close Chat */}
                              <button
                                onClick={() => {
                                  updateConversationStatus(activeConversation.chatId, "finished");
                                  setHeaderMenuOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:text-red-700 hover:bg-red-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <LogOut className="w-3.5 h-3.5 text-slate-400" />
                                Close Chat
                              </button>

                              {/* Clear Chat */}
                              <button
                                onClick={() => {
                                  setShowClearConfirm(true);
                                  setHeaderMenuOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                Clear Chat
                              </button>

                              {/* Report Chat */}
                              <button
                                onClick={() => {
                                  setReportReason("");
                                  setShowReportDialog(true);
                                  setHeaderMenuOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-700 hover:text-amber-700 hover:bg-amber-50 flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Flag className="w-3.5 h-3.5 text-slate-400" />
                                Report Chat
                              </button>
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Chat Messages Feed logs */}
              <div className="flex-1 md:overflow-y-auto overflow-y-visible p-6 space-y-4 h-auto md:h-full">
                {(() => {
                  const rawMessages = activeConversation.messages;
                  const messagesArray: ChatMessage[] = [];

                  if (rawMessages) {
                    if (Array.isArray(rawMessages)) {
                      messagesArray.push(...rawMessages);
                    } else {
                      Object.entries(rawMessages).forEach(([id, msg]) => {
                        const typedMsg = msg as ChatMessage;
                        messagesArray.push({ id, ...typedMsg });
                      });
                    }
                  }

                  messagesArray.sort((a, b) => a.timestamp - b.timestamp);

                  if (messagesArray.length === 0) {
                    return (
                      <div className="text-center p-4 text-xs font-mono text-slate-400 italic">
                        Empty conversation history log
                      </div>
                    );
                  }

                  const firstCustomerMsg = messagesArray.find(m => m.sender === "customer");

                  return messagesArray.map((msg, index) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={msg.id || index} className="flex justify-center">
                          <div className="bg-slate-100 text-slate-500 rounded-full px-4 py-1.5 text-[10px] font-sans font-semibold tracking-wide flex items-center gap-1.5 shadow-sm border border-slate-200/50">
                            <Sparkles className="w-3 h-3 text-[#1E88E5]" />
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    // Seeker is customer (current sender)
                    const isSeeker = msg.sender === "customer";
                    const isFirstCustomerMessage = isSeeker && firstCustomerMsg && msg === firstCustomerMsg;
                    let matchedJob: Job | null = null;
                    if (isFirstCustomerMessage) {
                      const jobIdMatch = msg.text.match(/job-\w+/i);
                      const parsedId = jobIdMatch ? jobIdMatch[0] : null;
                      const finalJobId = parsedId || activeConversation.jobId;
                      if (finalJobId) {
                        matchedJob = jobsList.find(j => j.id.toLowerCase() === finalJobId.toLowerCase()) || null;
                      }
                      if (!matchedJob && activeConversation.jobTitle) {
                        matchedJob = jobsList.find(j => j.title.toLowerCase() === activeConversation.jobTitle.toLowerCase()) || null;
                      }
                    }

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex ${isSeeker ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm border ${
                          isSeeker
                            ? "bg-[#1E88E5] text-white border-blue-700 rounded-tr-none text-right"
                            : "bg-white text-slate-800 border-slate-100 rounded-tl-none text-left"
                        }`}>
                          <p className="text-xs font-sans leading-relaxed whitespace-pre-line select-text">
                            {msg.text}
                          </p>

                          {/* Beautiful Job Card Dropdown Embedded in First Message */}
                          {matchedJob && (
                            <div className={`mt-3 border rounded-xl p-3 text-left transition-all ${
                              isSeeker 
                                ? "bg-slate-900/40 border-blue-800 text-white" 
                                : "bg-slate-50 border-slate-100 text-slate-800"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className={`text-[8px] font-mono uppercase tracking-wider block mb-0.5 ${
                                    isSeeker ? "text-blue-300" : "text-blue-700"
                                  }`}>
                                    Referenced Job Opportunity
                                  </span>
                                  <h5 className={`text-xs font-bold leading-tight truncate ${
                                    isSeeker ? "text-white" : "text-slate-900"
                                  }`}>
                                    {matchedJob.title}
                                  </h5>
                                  <p className={`text-[10px] font-medium ${
                                    isSeeker ? "text-blue-200/80" : "text-slate-500"
                                  }`}>
                                    {matchedJob.company} • {matchedJob.location}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      isSeeker ? "bg-blue-800/60 text-blue-200" : "bg-[#1E88E5]/10 text-[#1E88E5]"
                                    }`}>
                                      {matchedJob.salary}
                                    </span>
                                    <span className={`text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded ${
                                      isSeeker ? "bg-blue-800/40 text-blue-300" : "bg-slate-200/60 text-slate-600"
                                    }`}>
                                      {matchedJob.type}
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setJobExpanded(prev => ({
                                      ...prev,
                                      [activeConversation.chatId]: !prev[activeConversation.chatId]
                                    }));
                                  }}
                                  className={`p-1.5 rounded-lg transition-all shrink-0 cursor-pointer ${
                                    isSeeker 
                                      ? "hover:bg-blue-800/40 text-blue-300 hover:text-white" 
                                      : "hover:bg-slate-200/60 text-slate-500 hover:text-slate-800"
                                  }`}
                                  title={jobExpanded[activeConversation.chatId] ? "Hide details" : "Show details"}
                                >
                                  {jobExpanded[activeConversation.chatId] ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </button>
                              </div>

                              {jobExpanded[activeConversation.chatId] && (
                                <div
                                  className={`mt-2.5 pt-2.5 border-t text-[10px] font-sans leading-relaxed space-y-2 ${
                                    isSeeker 
                                      ? "border-blue-800/60 text-blue-100" 
                                      : "border-slate-200/60 text-slate-600"
                                  }`}
                                >
                                  <div>
                                    <p className={`font-bold ${isSeeker ? "text-blue-200" : "text-slate-700"}`}>Description:</p>
                                    <p className="mt-0.5 whitespace-pre-line">{matchedJob.description}</p>
                                  </div>
                                  {matchedJob.requirements && matchedJob.requirements.length > 0 && (
                                    <div className="pt-1.5">
                                      <p className={`font-bold ${isSeeker ? "text-blue-200" : "text-slate-700"}`}>Requirements:</p>
                                      <ul className="list-disc pl-3.5 space-y-1 mt-1">
                                        {matchedJob.requirements.map((req, i) => (
                                          <li key={i}>{req}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          <div className={`text-[9px] font-mono mt-1.5 flex items-center gap-1.5 ${
                            isSeeker ? "text-blue-200/80 justify-end" : "text-slate-400 justify-start"
                          }`}>
                            {!isSeeker && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const jobIdMatch = msg.text.match(/job-\w+/i);
                                  const parsedId = jobIdMatch ? jobIdMatch[0] : null;
                                  const finalJobId = parsedId || activeConversation.jobId;
                                  let job = jobsList.find(j => j.id.toLowerCase() === finalJobId?.toLowerCase()) || null;
                                  if (!job && activeConversation.jobTitle) {
                                    job = jobsList.find(j => j.title.toLowerCase() === activeConversation.jobTitle.toLowerCase()) || null;
                                  }
                                  if (job) {
                                    setPopupJob(job);
                                  }
                                }}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center cursor-pointer"
                                title="View reference job details"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {formatTime(msg.timestamp)}
                            {isSeeker && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                {typingText && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 italic px-4 py-2 mt-2 bg-slate-50/50 rounded-lg animate-pulse w-fit">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                    </div>
                    <span>{typingText}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input / Expired Template Selection */}
              <div className="bg-white p-4 border-t border-slate-200 shrink-0 fixed bottom-[10px] left-0 right-0 z-40 w-full rounded-none md:relative md:bottom-auto md:left-auto md:right-auto md:p-4 md:border-t md:rounded-none md:mx-0">
                {(() => {
                  const exp = getExpirationState(activeConversation);
                  
                  if (exp.isExpired) {
                    return (
                      <div className="space-y-3">
                        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-sans font-bold leading-tight">
                              Meta 24-Hour Communication Window Expired
                            </p>
                            <p className="text-[10px] font-sans text-amber-700 leading-snug mt-1">
                              Custom typing has been disabled in compliance with Meta's customer protection guidelines. Select an approved template reply below to re-initiate routing conversations.
                            </p>
                          </div>
                        </div>

                        {/* Approved Seeker Templates list */}
                        <div className="space-y-2">
                          {APPROVED_TEMPLATES_SEEKER.map((tmpl, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSendTemplate(tmpl)}
                              className="w-full text-left p-3 hover:bg-blue-50 hover:border-blue-200 border border-slate-100 rounded-xl text-xs font-sans font-semibold text-slate-700 hover:text-[#1E88E5] transition-all cursor-pointer flex items-center justify-between gap-2"
                            >
                              <span>{tmpl}</span>
                              <ChevronRight className="w-4 h-4 shrink-0 text-slate-300" />
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                      <input
                        ref={inputRef}
                        type="text"
                        required
                        value={messageInput}
                        onChange={(e) => handleInputChange(e.target.value)}
                        placeholder={exp.isInApp ? "Type in-app message securely..." : "Type WhatsApp application message..."}
                        className={`w-full px-4 py-3 rounded-xl border text-xs font-sans font-medium focus:outline-none focus:border-[#1E88E5] ${
                          exp.isUrgent 
                            ? "border-red-300 bg-red-50/10 focus:border-red-500 animate-[pulse_2s_infinite]" 
                            : "border-slate-200"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => alert("Attachment functionality: Select images, PDFs, or audio documents.")}
                        className="p-2.5 rounded-full bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors cursor-pointer border-none shadow-none shrink-0 flex items-center justify-center"
                        title="Add attachment"
                      >
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <button
                        type="submit"
                        disabled={isSending}
                        className="w-10 h-10 rounded-full bg-[#1E88E5] hover:bg-[#1565C0] text-white flex items-center justify-center transition-colors cursor-pointer shadow-none shrink-0 disabled:opacity-75 disabled:cursor-not-allowed"
                        title="Send message"
                      >
                        {isSending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </button>
                    </form>
                  );
                })()}
              </div>
            </motion.div>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 bg-slate-150 rounded-2xl flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-sans font-extrabold text-slate-800">
                No Active Chat Session Selected
              </h4>
              <p className="text-xs font-sans text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                Choose an ongoing live message thread from the <strong>"Live Threads"</strong> list on the left to see live chat history and chat with recruiters.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Nice cool popup showing reference job details with a transparent blur backdrop */}
      <AnimatePresence>
        {popupJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPopupJob(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] z-10 text-left"
            >
              {/* Header */}
              <div className="bg-[#1E88E5] px-6 py-4 flex items-center justify-between text-white shrink-0">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-200">
                    Referenced Job Specification
                  </span>
                  <h4 className="text-base font-sans font-extrabold tracking-tight mt-0.5">
                    {popupJob.title}
                  </h4>
                </div>
                <button
                  onClick={() => setPopupJob(null)}
                  className="p-1.5 hover:bg-blue-800/60 rounded-lg transition-colors cursor-pointer text-blue-100 hover:text-white"
                  title="Close details"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Company
                    </span>
                    <p className="text-xs font-sans font-bold text-slate-900 mt-0.5">
                      {popupJob.company}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Location
                    </span>
                    <p className="text-xs font-sans font-bold text-slate-900 mt-0.5 font-medium">
                      📍 {popupJob.location}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Compensation
                    </span>
                    <p className="text-xs font-sans font-bold text-blue-700 mt-0.5">
                      💰 {popupJob.salary}
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase font-bold tracking-wider">
                      Job Type
                    </span>
                    <p className="text-xs font-sans font-bold text-slate-600 mt-0.5 font-medium">
                      💼 {popupJob.type}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold tracking-wider">
                    Role Description
                  </span>
                  <p className="text-xs font-sans leading-relaxed text-slate-600 bg-slate-50/50 p-3.5 rounded-xl border border-slate-50 whitespace-pre-line">
                    {popupJob.description}
                  </p>
                </div>

                {popupJob.requirements && popupJob.requirements.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-[9px] font-mono text-slate-400 uppercase block font-bold tracking-wider">
                      Requirements & Qualifications
                    </span>
                    <ul className="grid grid-cols-1 gap-2">
                      {popupJob.requirements.map((req, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs font-sans text-slate-600 bg-blue-50/30 px-3 py-2 rounded-lg border border-blue-50/50 leading-relaxed">
                          <Check className="w-3.5 h-3.5 text-[#1E88E5] shrink-0 mt-0.5" />
                          <span>{req}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end shrink-0">
                <button
                  onClick={() => setPopupJob(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-sans font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Clear Chat Confirm Modal */}
        {showClearConfirm && activeConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowClearConfirm(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col z-10 text-left"
            >
              {/* Header */}
              <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-200">
                    Warning: Irreversible Action
                  </span>
                  <h4 className="text-base font-sans font-extrabold tracking-tight mt-0.5">
                    Clear Chat History?
                  </h4>
                </div>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="p-1.5 hover:bg-red-700/60 rounded-lg transition-colors cursor-pointer text-red-100 hover:text-white"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 text-slate-700 space-y-3 text-left">
                <p className="text-xs font-sans leading-relaxed text-slate-500">
                  Are you sure you want to delete all message logs for this conversation? This will reset the conversation feed back to a single system notice.
                </p>
                <p className="text-[10px] font-mono text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  ⚠️ This cannot be undone and will update the remote database immediately.
                </p>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-sans font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await clearConversationMessages(activeConversation.chatId);
                    setShowClearConfirm(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-sans font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Clear History
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Report Chat Modal */}
        {showReportDialog && activeConversation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportDialog(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            
            {/* Modal Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col z-10 text-left"
            >
              {/* Header */}
              <div className="bg-amber-600 px-6 py-4 flex items-center justify-between text-white shrink-0">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-200">
                    Administrative Action
                  </span>
                  <h4 className="text-base font-sans font-extrabold tracking-tight mt-0.5">
                    Report Conversation
                  </h4>
                </div>
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="p-1.5 hover:bg-amber-700/60 rounded-lg transition-colors cursor-pointer text-amber-100 hover:text-white"
                  title="Cancel"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 text-slate-700 space-y-4">
                <p className="text-xs font-sans leading-relaxed text-slate-500">
                  Please provide a reason for flagging this live conversation. A system log will be filed and flagged for compliance review.
                </p>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Report Reason
                  </label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe the issue (e.g. offensive recruiter, spam, wrong routing)..."
                    className="w-full text-xs font-sans p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none h-24 resize-none transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-left">
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block tracking-wider">
                    Quick Suggestions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Inappropriate Language", "Spam / Mismatch", "Recruiter Inactive", "Candidate Requested Exit"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => setReportReason(tag)}
                        className={`px-2.5 py-1 text-[10px] font-sans font-medium rounded-lg border transition-all cursor-pointer ${
                          reportReason === tag 
                            ? "bg-amber-50 border-amber-200 text-amber-800 shadow-sm font-semibold" 
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-6 py-3.5 border-t border-slate-100 flex justify-end gap-2.5 shrink-0">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-sans font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const finalReason = reportReason.trim() || "Unspecified reason";
                    await reportConversation(activeConversation.chatId, finalReason);
                    setShowReportDialog(false);
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-sans font-bold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
