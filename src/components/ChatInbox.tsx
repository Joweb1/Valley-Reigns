import React, { useState, useEffect, useRef } from "react";
import { Conversation, ChatMessage, Job } from "../types";
import { 
  subscribeToConversations, 
  claimConversation, 
  sendChatMessage, 
  getJobs,
  setStaffOnlineStatus,
  updateConversationStatus,
  clearConversationMessages,
  reportConversation,
  updateTypingStatus
} from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { ThreadCardSkeleton } from "./ThreadCardSkeleton";
import { 
  Clock, 
  MessageCircle, 
  Smartphone, 
  Check, 
  UserCheck, 
  X, 
  Send, 
  AlertCircle, 
  ToggleLeft, 
  ToggleRight, 
  Search,
  CheckCheck,
  ChevronRight,
  Sparkles,
  Zap,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Power,
  CheckCircle2,
  LogOut,
  MoreVertical,
  Trash2,
  Flag,
  Loader2,
  Paperclip
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatInboxProps {
  jobsList: Job[];
  searchQuery?: string;
  onActiveChatChange?: (hasActive: boolean) => void;
}

export const ChatInbox: React.FC<ChatInboxProps> = ({ jobsList, searchQuery: externalSearchQuery, onActiveChatChange }) => {
  const { currentUser } = useAuth();
  
  // States
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(() => {
    if (currentUser?.uid) {
      const saved = localStorage.getItem(`staff_online_${currentUser.uid}`);
      return saved !== "offline";
    }
    return true;
  });

  // Listen to staff online status changes from Header
  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsOnline(customEvent.detail);
    };
    window.addEventListener("staff-status-changed", handleStatusChange);
    return () => window.removeEventListener("staff-status-changed", handleStatusChange);
  }, []);
  const [activeTab, setActiveTab] = useState<"available" | "my-chats">("available");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [claimingIds, setClaimingIds] = useState<Record<string, boolean>>({});
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : localSearchQuery;
  const setSearchQuery = externalSearchQuery !== undefined ? () => {} : setLocalSearchQuery;
  const [currentSystemTime, setCurrentSystemTime] = useState(Date.now());

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

  // Sync staff availability status in Realtime Database
  useEffect(() => {
    if (currentUser?.uid) {
      setStaffOnlineStatus(currentUser.uid, isOnline);
    }
  }, [currentUser?.uid, isOnline]);

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

  // Auto-scroll messages to bottom
  const activeConversation = activeChatId ? conversations[activeChatId] : null;
  const [jobExpanded, setJobExpanded] = useState<Record<string, boolean>>({});
  const [popupJob, setPopupJob] = useState<Job | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  useEffect(() => {
    if (onActiveChatChange) {
      onActiveChatChange(!!activeConversation);
    }
    // Dispatch custom event to let AppContent know if a conversation is active
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: !!activeConversation } }));

    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, [activeConversation, onActiveChatChange]);

  // Get matching Job Description for active chat
  const associatedJob = jobsList.find(j => j.id === activeConversation?.jobId);

  // Grouped conversations
  const conversationsList = Object.values(conversations) as Conversation[];

  // 1. Available/Unassigned Requests shared with this staff member
  const availableConversations = conversationsList.filter(c => 
    c.status === "pending" && 
    (currentUser ? (
      !c.sharedWith || 
      c.sharedWith.length === 0 || 
      c.sharedWith.includes(currentUser.uid) ||
      currentUser.role === "staff" ||
      currentUser.role === "admin"
    ) : true)
  );

  // 2. Active conversations claimed by current logged-in Staff Member
  const myLiveConversations = conversationsList.filter(c => 
    c.assignedTo === currentUser?.uid && c.status === "ongoing"
  );

  // Filter list by search query
  const getFilteredList = (list: Conversation[]) => {
    if (!searchQuery.trim()) return list;
    return list.filter(c => 
      c.customerPhone.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const visibleList = activeTab === "available" 
    ? getFilteredList(availableConversations) 
    : getFilteredList(myLiveConversations);

  // Claim Chat Transaction Trigger
  const handleClaimChat = async (chatId: string) => {
    if (!currentUser) return;
    setClaimingIds(prev => ({ ...prev, [chatId]: true }));
    
    const success = await claimConversation(chatId, currentUser.uid, currentUser.displayName);
    
    setClaimingIds(prev => ({ ...prev, [chatId]: false }));
    if (success) {
      setActiveTab("my-chats");
      setActiveChatId(chatId);
    }
  };

  const [sendError, setSendError] = useState<string | null>(null);

  // Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChatId || !messageInput.trim() || !currentUser || isSending) return;

    setIsSending(true);
    setSendError(null);
    try {
      if (activeConversation && activeConversation.status === "pending") {
        await claimConversation(activeChatId, currentUser.uid, currentUser.displayName);
        setActiveTab("my-chats");
      }
      await sendChatMessage(activeChatId, "staff", messageInput.trim());
      setMessageInput("");
    } catch (err: any) {
      console.error("Failed to send message:", err);
      setSendError(err?.message || "Failed to deliver message via WhatsApp.");
    } finally {
      setIsSending(false);
    }
  };

  // Approved Communication Template dispatchers (Meta 24h fallback templates)
  const APPROVED_TEMPLATES = [
    `Hello, this is ${currentUser?.displayName} from Valley Reigns. We are reviewing your application for the position. Can you confirm your schedule for a brief call tomorrow?`,
    "Thank you for contacting Valley Reigns recruitment. Since we haven't heard from you in a bit, would you like us to keep routing your profile to our high-paying tech partners?",
    "We have reviewed your matching criteria! Please send over your updated CV or LinkedIn handle to help our routing directors schedule your interviews."
  ];

  const handleSendTemplate = async (templateText: string) => {
    if (!activeChatId || !currentUser) return;
    if (activeConversation && activeConversation.status === "pending") {
      await claimConversation(activeChatId, currentUser.uid, currentUser.displayName);
    }
    await sendChatMessage(activeChatId, "staff", templateText);
  };

  // Expiration Clock Calculations (24-Hour window based on arrival timestamp vs current time)
  const getExpirationState = (conv: Conversation) => {
    // Check if conversation is an in-app conversation (not standard WhatsApp)
    const isInApp = conv?.isInApp || (conv?.customerPhone ? !conv.customerPhone.startsWith("+") : true);
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

  return (
    <div className={`border-0 rounded-none shadow-none flex flex-col ${activeConversation ? "h-full min-h-0 md:h-[750px] md:border md:border-slate-200/80 md:rounded-3xl md:shadow-sm md:overflow-hidden md:bg-white" : "bg-white border border-slate-200/80 rounded-3xl shadow-sm h-[750px]"}`}>
      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-transparent relative">
        {/* ========================================== */}
        {/* LEFT PANEL: Messaging Threads & Claim Queues */}
        {/* ========================================== */}
        <div className={`w-full md:w-96 border-0 shadow-none rounded-none bg-white flex flex-col shrink-0 border-r border-slate-100/80 absolute md:relative inset-y-0 left-0 transform transition-transform duration-300 ease-out z-10 ${
          activeConversation ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        }`}>

          {/* Nav Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-50 shrink-0">
            <button
              onClick={() => { setActiveTab("available"); setActiveChatId(null); }}
              className={`py-3.5 text-sm font-sans font-bold transition-colors cursor-pointer border-b-2 text-center relative ${
                activeTab === "available"
                  ? "border-[#1E88E5] text-[#1E88E5]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              Available Requests
              {availableConversations.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-amber-500 text-white rounded-full text-[9px] font-extrabold font-mono animate-pulse">
                  {availableConversations.length}
                </span>
              )}
            </button>
            <button
              onClick={() => { setActiveTab("my-chats"); setActiveChatId(null); }}
              className={`py-3.5 text-sm font-sans font-bold transition-colors cursor-pointer border-b-2 text-center relative ${
                activeTab === "my-chats"
                  ? "border-[#1E88E5] text-[#1E88E5]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              My Live Inbox
              {myLiveConversations.length > 0 && (
                <span className="ml-1.5 px-2 py-0.5 bg-[#1E88E5] text-white rounded-full text-[9px] font-extrabold font-mono">
                  {myLiveConversations.length}
                </span>
              )}
            </button>
          </div>

          {/* List Scroll Container */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <ThreadCardSkeleton key={n} showClaimButton={activeTab === "available"} />
                ))}
              </div>
            ) : visibleList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mb-2">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-sans font-semibold text-slate-400 leading-snug">
                  {activeTab === "available" 
                    ? "No incoming requests found." 
                    : "Your ongoing inbox is empty."}
                </p>
                <p className="text-[10px] font-sans text-slate-300 max-w-xs mt-1">
                  Trigger simulated inbound messages using the simulator floating tool in the lower corner!
                </p>
              </div>
            ) : (
              visibleList.map((conv) => {
                const isSelected = activeChatId === conv.chatId;
                const exp = getExpirationState(conv);
                
                // Realtime Lock logic: turn gray (40% opacity) if claimed by someone else
                const isClaimedByOther = !!conv.assignedTo && conv.assignedTo !== currentUser?.uid;

                if (isClaimedByOther) {
                  return (
                    <div
                      key={conv.chatId}
                      className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl opacity-40 select-none pointer-events-none transition-all duration-300"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          {conv.customerPhone}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                          Claimed
                        </span>
                      </div>
                      <p className="text-xs font-sans font-semibold text-slate-400 truncate">
                        {conv.jobTitle}
                      </p>
                      <p className="text-[10px] font-sans text-slate-400 italic mt-2">
                        Claimed by {conv.assignedToName || "another agent"}
                      </p>
                    </div>
                  );
                }

                return (
                  <div
                    key={conv.chatId}
                    onClick={() => {
                      setActiveChatId(conv.chatId);
                    }}
                    className={`w-full text-left p-5 rounded-3xl transition-all duration-300 border cursor-pointer ${
                      isSelected
                        ? "bg-[#FAFDFB] border-2 border-[#1E88E5] shadow-md scale-[1.01]"
                        : activeTab === "available"
                        ? "bg-gradient-to-r from-amber-50/70 via-amber-100/40 to-amber-50/70 border border-[#1E88E5] shadow-sm hover:shadow-md hover:scale-[1.01]"
                        : "bg-white border border-[#1E88E5]/30 hover:border-[#1E88E5] hover:shadow-sm"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-mono font-bold text-slate-900 flex items-center gap-1 truncate">
                        <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        {conv.name && conv.name !== conv.customerPhone && !conv.name.startsWith("WhatsApp Customer") 
                          ? `${conv.name} (${conv.customerPhone})` 
                          : conv.customerPhone}
                      </span>
                      {activeTab === "available" ? (
                        <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
                      ) : exp.isInApp ? (
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

                    <div className="space-y-2">
                      <p className={`text-xs font-sans font-bold leading-none ${isSelected ? "text-slate-900" : "text-slate-800"}`}>
                        {conv.jobTitle}
                      </p>
                      <p className="text-[11px] font-sans text-slate-400 line-clamp-1 italic">
                        "{conv.text}"
                      </p>

                      {/* Claim Button Action */}
                      {activeTab === "available" && (
                        <div className="pt-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleClaimChat(conv.chatId); }}
                            disabled={claimingIds[conv.chatId]}
                            className={`w-full py-1.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl text-[10px] font-sans font-extrabold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 ${
                              claimingIds[conv.chatId] ? "" : "animate-soft-bounce"
                            }`}
                          >
                            <Zap className="w-3 h-3 fill-current" />
                            {claimingIds[conv.chatId] ? "Securing Claim..." : "Claim Live Chat"}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* CENTER PANEL: WhatsApp Active Conversation */}
        {/* ========================================== */}
        <div className={`flex-1 flex flex-col bg-slate-50 min-w-0 border-0 shadow-none rounded-none ml-0 overflow-hidden absolute md:relative inset-y-0 right-0 w-full md:w-auto transform transition-transform duration-300 ease-out z-20 md:z-10 ${
          activeConversation ? "translate-x-0 md:translate-x-0" : "translate-x-full md:translate-x-0"
        }`}>
          {activeConversation ? (
            <div
              key={activeConversation.chatId}
              className="flex-grow flex flex-col overflow-y-auto h-full relative pt-16 pb-48 md:overflow-y-hidden md:h-auto md:min-h-0 md:pt-0 md:pb-0"
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
                    WA
                  </div>
                  <div className="min-w-0 leading-tight">
                    <h4 className="text-sm font-sans font-black text-slate-800 tracking-tight truncate">
                      {activeConversation.name && activeConversation.name !== activeConversation.customerPhone && !activeConversation.name.startsWith("WhatsApp Customer")
                        ? `${activeConversation.name} (${activeConversation.customerPhone})`
                        : activeConversation.customerPhone}
                    </h4>
                  </div>
                </div>

                {/* 24-Hour Communicator Timer countdown */}
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
                          {/* Invisible Backdrop to handle click away */}
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setHeaderMenuOpen(false)}
                          />
                          
                          {/* Dropdown Card */}
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
                                <LogOut className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-500" />
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
                      // It's a Record<string, ChatMessage> from RTDB
                      Object.entries(rawMessages).forEach(([id, msg]) => {
                        const typedMsg = msg as ChatMessage;
                        messagesArray.push({ id, ...typedMsg });
                      });
                    }
                  }

                  // Sort by timestamp
                  messagesArray.sort((a, b) => a.timestamp - b.timestamp);

                  if (messagesArray.length === 0) {
                    return (
                      <div className="text-center p-4 text-xs font-mono text-slate-400 italic">
                        Empty conversation history log
                      </div>
                    );
                  }

                  const firstCustomerMsg = messagesArray.find(m => m.sender === "customer" || m.sender === "guest");

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

                    const isStaff = msg.sender === "staff";
                    const isFirstCustomerMessage = !isStaff && firstCustomerMsg && msg === firstCustomerMsg;
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
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm border ${
                          isStaff
                            ? "bg-[#1E88E5] text-white border-blue-700 rounded-tr-none"
                            : "bg-white text-slate-800 border-slate-100 rounded-tl-none"
                        }`}>
                          <p className="text-xs font-sans leading-relaxed whitespace-pre-line">
                            {msg.text}
                          </p>

                          {/* Beautiful Job Card Dropdown Embedded in First Message */}
                          {matchedJob && (
                            <div className={`mt-3 border rounded-xl p-3 text-left transition-all ${
                              isStaff 
                                ? "bg-slate-900/40 border-blue-800 text-white" 
                                : "bg-slate-50 border-slate-100 text-slate-800"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className={`text-[8px] font-mono uppercase tracking-wider block mb-0.5 ${
                                    isStaff ? "text-blue-300" : "text-blue-700"
                                  }`}>
                                    Referenced Job Opportunity
                                  </span>
                                  <h5 className={`text-xs font-bold leading-tight truncate ${
                                    isStaff ? "text-white" : "text-slate-900"
                                  }`}>
                                    {matchedJob.title}
                                  </h5>
                                  <p className={`text-[10px] font-medium ${
                                    isStaff ? "text-blue-200/80" : "text-slate-500"
                                  }`}>
                                    {matchedJob.company} • {matchedJob.location}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      isStaff ? "bg-blue-800/60 text-blue-200" : "bg-[#1E88E5]/10 text-[#1E88E5]"
                                    }`}>
                                      {matchedJob.salary}
                                    </span>
                                    <span className={`text-[9px] font-sans font-semibold px-1.5 py-0.5 rounded ${
                                      isStaff ? "bg-blue-800/40 text-blue-300" : "bg-slate-200/60 text-slate-600"
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
                                    isStaff 
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
                                    isStaff 
                                      ? "border-blue-800/60 text-blue-100" 
                                      : "border-slate-200/60 text-slate-600"
                                  }`}
                                >
                                  <div>
                                    <p className={`font-bold ${isStaff ? "text-blue-200" : "text-slate-700"}`}>Description:</p>
                                    <p className="mt-0.5 whitespace-pre-line">{matchedJob.description}</p>
                                  </div>
                                  {matchedJob.requirements && matchedJob.requirements.length > 0 && (
                                    <div className="pt-1.5">
                                      <p className={`font-bold ${isStaff ? "text-blue-200" : "text-slate-700"}`}>Requirements:</p>
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

                          <div className={`text-[9px] font-mono mt-1.5 text-right flex items-center justify-end gap-1.5 ${
                            isStaff ? "text-blue-200/80" : "text-slate-400"
                          }`}>
                            {!isStaff && (
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
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isStaff && <CheckCheck className="w-3.5 h-3.5 text-blue-300" />}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input / Expired Template Selection */}
              <div className="bg-white p-4 border-t border-slate-100 shrink-0 fixed bottom-5 left-4 right-4 z-40 shadow-lg rounded-2xl border border-slate-200/80 md:relative md:bottom-auto md:left-auto md:right-auto md:p-4 md:shadow-none md:border-t md:rounded-none md:mx-0">
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

                        {/* Approved Templates list */}
                        <div className="space-y-2">
                          {APPROVED_TEMPLATES.map((tmpl, idx) => (
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
                    <div className="space-y-2">
                      {sendError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                            <span>{sendError}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSendError(null)}
                            className="text-red-500 hover:text-red-800 text-xs font-bold"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      <form onSubmit={handleSendMessage} className="flex gap-2">
                        <input
                          ref={inputRef}
                          type="text"
                          required
                          value={messageInput}
                          onChange={(e) => { setMessageInput(e.target.value); if (sendError) setSendError(null); }}
                          placeholder={exp.isInApp ? "Type in-app message securely..." : "Type WhatsApp dispatch message..."}
                          className={`w-full px-4 py-3 rounded-xl border text-xs font-sans font-medium focus:outline-none focus:border-[#1E88E5] ${
                            exp.isUrgent 
                              ? "border-red-300 bg-red-50/10 focus:border-red-500 animate-[pulse_2s_infinite]" 
                              : "border-slate-200"
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={isSending}
                          className="px-5 py-3 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl text-xs font-sans font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0 disabled:opacity-75 disabled:cursor-not-allowed"
                        >
                          {isSending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Send className="w-3.5 h-3.5" />
                          )}
                          <span>{isSending ? "Sending..." : "Send"}</span>
                        </button>
                      </form>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <MessageCircle className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-sans font-extrabold text-slate-800">
                No Active Chat Session Selected
              </h4>
              <p className="text-xs font-sans text-slate-400 max-w-xs mt-1.5 leading-relaxed">
                Choose an ongoing live message thread from the <strong>"My Live Inbox"</strong> tab on the left to start live routing, or claim new threads from <strong>"Available Requests"</strong>.
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
              className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] z-10"
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
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col z-10"
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
              <div className="p-6 text-slate-700 space-y-3">
                <p className="text-xs font-sans leading-relaxed text-slate-500">
                  Are you sure you want to delete all message logs for this customer (<strong className="text-slate-800">{activeConversation.customerPhone}</strong>)? This will reset the conversation feed back to a single system notice.
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
              className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col z-10"
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
                  Please provide a reason for flagging this live candidate conversation. A system log will be filed and flagged for compliance review.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Report Reason
                  </label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe the issue (e.g. spam, abusive user, routing mismatch)..."
                    className="w-full text-xs font-sans p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none h-24 resize-none transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono font-bold text-slate-400 uppercase block tracking-wider">
                    Quick Suggestions
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {["Spam Candidate", "Inappropriate Language", "Wrong Phone Routing", "Candidate Requested Exit"].map((tag) => (
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
