import React, { useState, useEffect, useRef } from "react";
import { Conversation, ChatMessage, Job } from "../types";
import { uploadToImageKit } from "../lib/imagekit";
import { ChatMessageContent } from "./ChatMessageContent";
import { 
  subscribeToConversations, 
  claimConversation, 
  sendChatMessage, 
  getJobs,
  setStaffOnlineStatus,
  updateConversationStatus,
  clearConversationMessages,
  reportConversation,
  updateTypingStatus,
  toggleCandidateListTag
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
  Paperclip,
  ListPlus,
  Tag,
  List,
  PictureInPicture2,
  Users,
  FileText,
  MapPin,
  ShieldCheck,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CANDIDATE_PROGRESS_LISTS = [
  { id: "Registered Candidates", name: "Registered Candidates", lightBg: "bg-blue-50 text-blue-700 border-blue-200", icon: Users, iconColor: "text-blue-600" },
  { id: "Pending Resume(CV)", name: "Pending Resume(CV)", lightBg: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock, iconColor: "text-amber-600" },
  { id: "Submitted Resume(CV)", name: "Submitted Resume(CV)", lightBg: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: FileText, iconColor: "text-emerald-600" },
  { id: "Address Given", name: "Address Given", lightBg: "bg-indigo-50 text-indigo-700 border-indigo-200", icon: MapPin, iconColor: "text-indigo-600" },
  { id: "Verified", name: "Verified", lightBg: "bg-purple-50 text-purple-700 border-purple-200", icon: ShieldCheck, iconColor: "text-purple-600" },
  { id: "Pending Commission Retrieval", name: "Pending Commission Retrieval", lightBg: "bg-rose-50 text-rose-700 border-rose-200", icon: DollarSign, iconColor: "text-rose-600" },
];

const CHAT_TAG_FILTERS = [
  { id: "all", label: "All Chats" },
  { id: "pending", label: "Pending Chats" },
  { id: "active", label: "Active Chats" },
  { id: "Registered Candidates", label: "Registered" },
  { id: "Pending Resume(CV)", label: "Pending Resume" },
  { id: "Submitted Resume(CV)", label: "Resume Submitted" },
  { id: "Verified", label: "Verified" },
  { id: "Address Given", label: "Address Given" },
  { id: "Pending Commission Retrieval", label: "Pending Commission Retrieval" },
];

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
  const [channelTab, setChannelTab] = useState<"whatsapp" | "inapp">("whatsapp");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [claimingIds, setClaimingIds] = useState<Record<string, boolean>>({});
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = localSearchQuery || (externalSearchQuery || "");
  const setSearchQuery = (val: string) => {
    setLocalSearchQuery(val);
  };
  const [currentSystemTime, setCurrentSystemTime] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  const handleChatFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    try {
      setIsUploadingAttachment(true);
      setSendError(null);
      const res = await uploadToImageKit(file, "/chat_attachments");
      const fileNotice = res.fileType === "image" 
        ? `[Attached Image]: ${res.url}`
        : `[Attached Document/File]: ${res.name}\n${res.url}`;

      // Append to current message input or send directly
      setMessageInput(prev => prev ? `${prev}\n${fileNotice}` : fileNotice);
    } catch (err: any) {
      console.error("[Attachment Upload Error]", err);
      setSendError(err.message || "Failed to upload file attachment to ImageKit");
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
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
  const [showListModal, setShowListModal] = useState(false);

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

  // Helper to check if a conversation is In-App
  const checkIsInAppConv = (c: Conversation) => {
    if (c.isInApp || c.chatId?.startsWith("inapp_") || Boolean(c.seekerUid)) return true;
    if (!c.customerPhone) return false;
    const cleaned = c.customerPhone.replace(/[\s\-\(\)]/g, "");
    return !cleaned.startsWith("+") && !/^\d+$/.test(cleaned);
  };

  // User-visible conversations respecting 2-hour claimed rule & permissions
  const userVisibleConversations = conversationsList.filter(c => {
    // 2-Hour Claim Rule: Any chat claimed by another staff for over 2 hours is hidden/removed
    const isClaimedByOther = !!c.assignedTo && c.assignedTo !== currentUser?.uid;
    if (isClaimedByOther) {
      const claimTime = c.claimedAt || c.lastMessageAt || c.createdAt;
      const isClaimedOver2Hours = (currentSystemTime - claimTime) >= 2 * 60 * 60 * 1000;
      if (isClaimedOver2Hours) {
        return false;
      }
    }

    // Pending Requests permissions check
    if (c.status === "pending") {
      if (currentUser) {
        const isShared = !c.sharedWith || 
          c.sharedWith.length === 0 || 
          c.sharedWith.includes(currentUser.uid) ||
          currentUser.role === "staff" ||
          currentUser.role === "admin";
        if (!isShared) return false;
      }
    }

    return true;
  });

  // Split into WhatsApp Chats & In-App Chats
  const whatsappConversations = userVisibleConversations.filter(c => !checkIsInAppConv(c));
  const inAppConversations = userVisibleConversations.filter(c => checkIsInAppConv(c));

  // Active channel list
  const currentChannelConversations = channelTab === "whatsapp" ? whatsappConversations : inAppConversations;

  // Tag filter matcher (A customer can be assigned to multiple lists)
  const matchesTagFilter = (c: Conversation, tagId: string) => {
    if (tagId === "all") return true;
    if (tagId === "pending") return c.status === "pending";
    if (tagId === "active") return c.assignedTo === currentUser?.uid && c.status === "ongoing";
    // Candidate list category tags:
    return Boolean(c.candidateLists && c.candidateLists[tagId]);
  };

  // Count helper per tag in current channel
  const getTagCount = (tagId: string) => {
    return currentChannelConversations.filter(c => matchesTagFilter(c, tagId)).length;
  };

  // Tagged list
  const taggedConversations = currentChannelConversations.filter(c => matchesTagFilter(c, tagFilter));

  // Filter list by search query
  const getFilteredList = (list: Conversation[]) => {
    if (!searchQuery || !searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(c => {
      const phone = (c.customerPhone || "").toLowerCase();
      const job = (c.jobTitle || "").toLowerCase();
      const text = (c.text || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      return phone.includes(query) || job.includes(query) || text.includes(query) || name.includes(query);
    });
  };

  const visibleList = getFilteredList(taggedConversations);

  // Claim Chat Transaction Trigger
  const handleClaimChat = async (chatId: string) => {
    if (!currentUser) return;
    setClaimingIds(prev => ({ ...prev, [chatId]: true }));
    
    const success = await claimConversation(chatId, currentUser.uid, currentUser.displayName);
    
    setClaimingIds(prev => ({ ...prev, [chatId]: false }));
    if (success) {
      setTagFilter("active");
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
        setTagFilter("active");
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

  const getInitials = (name?: string, phone?: string) => {
    if (name && name !== phone && !name.startsWith("WhatsApp Customer")) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length >= 2) {
        return parts[0].substring(0, 2).toUpperCase();
      }
      if (parts.length === 1 && parts[0].length === 1) {
        return parts[0][0].toUpperCase();
      }
    }
    if (phone) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length >= 2) {
        return digits.slice(-2);
      }
    }
    return "WA";
  };

  // Expiration Clock Calculations (24-Hour window based on arrival timestamp vs current time)
  const getExpirationState = (conv: Conversation) => {
    // Check if conversation is an in-app conversation (not standard WhatsApp)
    const isInApp = Boolean(
      conv?.isInApp || 
      conv?.chatId?.startsWith("inapp_") || 
      (conv?.customerPhone ? (!conv.customerPhone.startsWith("+") && !/^\d+$/.test(conv.customerPhone)) : false)
    );

    if (isInApp) {
      return { isExpired: false, text: "In-App", hoursLeft: 999, isUrgent: false, isInApp: true };
    }

    const windowMs = 24 * 60 * 60 * 1000; // 24 hours
    const baseTime = conv.lastMessageAt || conv.createdAt || Date.now();
    const ageMs = currentSystemTime - baseTime;
    const timeRemainingMs = windowMs - ageMs;

    if (timeRemainingMs <= 0) {
      return { isExpired: true, text: "0h", hoursLeft: 0, isUrgent: true, isInApp: false };
    }

    const hoursLeft = Math.max(1, Math.ceil(timeRemainingMs / (1000 * 60 * 60)));
    const isUrgent = hoursLeft <= 2;

    return {
      isExpired: false,
      text: `${hoursLeft}h`,
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

          {/* Search Bar Input (Above Nav Tabs) */}
          <div className="pt-4 sm:pt-5 pb-3 px-3.5 border-b border-slate-100 bg-white">
            <div className="relative flex items-center bg-slate-100/80 border border-slate-200 rounded-full p-2.5 shadow-none focus-within:border-[#1E88E5] transition-all">
              <Search className="w-4.5 h-4.5 text-slate-400 ml-1 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full py-0.5 bg-transparent text-sm font-normal focus:outline-none text-slate-800 placeholder-gray-400 font-['Roboto',sans-serif]"
              />
            </div>
          </div>

          {/* Primary Channel Nav: Whatsapp Chats & In-App Chats */}
          <div className="grid grid-cols-2 border-b border-slate-100 shrink-0 font-['Roboto',sans-serif] bg-slate-50/50">
            <button
              onClick={() => { setChannelTab("whatsapp"); setActiveChatId(null); }}
              className={`py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 text-center relative flex items-center justify-center gap-2 ${
                channelTab === "whatsapp"
                  ? "border-[#00A884] text-[#00A884] bg-white shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <Smartphone className="w-4 h-4 text-[#00A884]" />
              <span>Whatsapp Chats</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                channelTab === "whatsapp" ? "bg-[#00A884] text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {whatsappConversations.length}
              </span>
            </button>

            <button
              onClick={() => { setChannelTab("inapp"); setActiveChatId(null); }}
              className={`py-3 text-xs sm:text-sm font-bold transition-all cursor-pointer border-b-2 text-center relative flex items-center justify-center gap-2 ${
                channelTab === "inapp"
                  ? "border-blue-600 text-blue-600 bg-white shadow-2xs"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
              }`}
            >
              <MessageCircle className="w-4 h-4 text-blue-600" />
              <span>In-App Chats</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold font-mono ${
                channelTab === "inapp" ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
              }`}>
                {inAppConversations.length}
              </span>
            </button>
          </div>

          {/* Secondary Tag-Like Filter Buttons (Horizontal Scrollable Bar) */}
          <div className="flex items-center gap-1.5 p-2 overflow-x-auto whitespace-nowrap scrollbar-none border-b border-slate-100 bg-slate-50/30 shrink-0">
            {CHAT_TAG_FILTERS.map((tag) => {
              const isSelected = tagFilter === tag.id;
              const count = getTagCount(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => setTagFilter(tag.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  <span>{tag.label}</span>
                  <span className={`px-1.5 py-0.2 text-[10px] font-extrabold font-mono rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* List Scroll Container */}
          <div className="flex-1 overflow-y-auto p-0 space-y-0 divide-y divide-slate-100">
            {loading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3].map((n) => (
                  <ThreadCardSkeleton key={n} />
                ))}
              </div>
            ) : visibleList.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 font-['Roboto',sans-serif]">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 mb-2">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-400 leading-snug">
                  No conversations found under "{CHAT_TAG_FILTERS.find(t => t.id === tagFilter)?.label || "Selected Filter"}".
                </p>
                <p className="text-[10px] text-slate-300 max-w-xs mt-1">
                  Try selecting another tag filter or switching between WhatsApp and In-App chats.
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
                      className="p-3.5 bg-transparent border-x-0 border-t-0 border-b border-b-slate-100 rounded-none opacity-40 select-none pointer-events-none transition-all duration-200 flex items-start gap-3 font-['Roboto',sans-serif]"
                    >
                      <div className="relative shrink-0 mt-0.5">
                        <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-sm tracking-wide">
                          {getInitials(conv.name, conv.customerPhone)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[14px] sm:text-[15px] font-normal text-slate-400 truncate font-['Roboto',sans-serif]">
                            {conv.name && conv.name !== conv.customerPhone && !conv.name.startsWith("WhatsApp Customer") 
                              ? conv.name 
                              : conv.customerPhone}
                          </span>
                          <span className="text-xs text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded-full">
                            Claimed
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-normal text-slate-400 truncate font-['Roboto',sans-serif]">
                          {conv.jobTitle}
                        </p>
                        <p className="text-[11px] text-slate-400 italic">
                          Claimed by {conv.assignedToName || "another agent"}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={conv.chatId}
                    onClick={() => {
                      setActiveChatId(conv.chatId);
                    }}
                    className={`w-full text-left p-3.5 rounded-none transition-all duration-200 border-x-0 border-t-0 border-b border-b-slate-100 cursor-pointer flex items-start gap-3 font-['Roboto',sans-serif] ${
                      isSelected
                        ? "bg-blue-50/70"
                        : "bg-transparent hover:bg-slate-50/80"
                    }`}
                  >
                    {/* Big Circle Profile Avatar */}
                    <div className="relative shrink-0 mt-0.5">
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm tracking-wide shadow-xs ${
                        exp.isInApp 
                          ? "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white" 
                          : "bg-gradient-to-tr from-[#128C7E] to-[#00A884] text-white"
                      }`}>
                        {getInitials(conv.name, conv.customerPhone)}
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full flex items-center justify-center border-2 border-white shadow-xs ${
                        exp.isInApp ? "bg-blue-600 text-white" : "bg-[#00A884] text-white"
                      }`}>
                        {exp.isInApp ? (
                          <MessageCircle className="w-2.5 h-2.5" />
                        ) : (
                          <Smartphone className="w-2.5 h-2.5" />
                        )}
                      </div>
                    </div>

                    {/* Card Content Right Column */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Top Row: Name on Left, 24h Countdown / In-App Tag on Top Right */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] sm:text-[15px] font-normal text-slate-900 truncate font-['Roboto',sans-serif]">
                          {conv.name && conv.name !== conv.customerPhone && !conv.name.startsWith("WhatsApp Customer") 
                            ? conv.name 
                            : conv.customerPhone}
                        </span>

                        {(() => {
                          const isUnclaimed = !conv.assignedTo || conv.status === "pending";
                          
                          if (!exp.isInApp) {
                            return (
                              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                                exp.isUrgent 
                                  ? "bg-red-50 text-red-600 border border-red-200 animate-pulse" 
                                  : isUnclaimed
                                  ? "bg-amber-50 text-amber-700 border border-amber-300 animate-pulse shadow-2xs"
                                  : "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                              }`}>
                                {isUnclaimed && (
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${exp.isUrgent ? "bg-red-400" : "bg-amber-400"} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${exp.isUrgent ? "bg-red-600" : "bg-amber-500"}`}></span>
                                  </span>
                                )}
                                <Clock className="w-3 h-3" />
                                {exp.text}
                              </span>
                            );
                          } else {
                            return (
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 shrink-0 ${
                                isUnclaimed
                                  ? "bg-blue-50 text-[#1E88E5] border border-blue-300 animate-pulse shadow-2xs"
                                  : "bg-blue-50 text-[#1E88E5] border border-blue-100"
                              }`}>
                                {isUnclaimed && (
                                  <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-600"></span>
                                  </span>
                                )}
                                In-App
                              </span>
                            );
                          }
                        })()}
                      </div>

                      {/* Job Title */}
                      <p className={`text-[13px] sm:text-[14px] font-normal leading-snug truncate font-['Roboto',sans-serif] ${isSelected ? "text-[#1E88E5]" : "text-slate-800"}`}>
                        {conv.jobTitle}
                      </p>

                      {/* Message Snippet */}
                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-1 font-['Roboto',sans-serif]">
                        "{conv.text}"
                      </p>
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
              {(() => {
                const isCurrentInApp = Boolean(
                  activeConversation?.isInApp || 
                  activeConversation?.chatId?.startsWith("inapp_") || 
                  (activeConversation?.customerPhone ? (!activeConversation.customerPhone.startsWith("+") && !/^\d+$/.test(activeConversation.customerPhone)) : false)
                );

                return (
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

                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-['Roboto',sans-serif] font-bold text-xs tracking-wider text-white shrink-0 shadow-xs ${
                        isCurrentInApp 
                          ? "bg-gradient-to-tr from-blue-600 to-indigo-600" 
                          : "bg-[#00A884]"
                      }`}>
                        {getInitials(activeConversation.name, activeConversation.customerPhone)}
                      </div>
                      <div className="min-w-0 leading-tight font-['Roboto',sans-serif]">
                        <h4 className="text-sm font-bold text-slate-800 tracking-tight truncate">
                          {activeConversation.name && activeConversation.name !== activeConversation.customerPhone && !activeConversation.name.startsWith("WhatsApp Customer")
                            ? activeConversation.name
                            : activeConversation.customerPhone}
                        </h4>
                        <div className="flex items-center gap-1 flex-wrap mt-0.5">
                          <p className="text-[11px] text-slate-400 truncate">
                            {activeConversation.jobTitle}
                          </p>
                          {Object.keys(activeConversation.candidateLists || {}).map(listKey => (
                            <span key={listKey} className="px-1.5 py-0.2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-[9px] font-bold shrink-0">
                              {listKey}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tags and Controls Section */}
                    <div className="flex items-center gap-1.5 shrink-0 font-['Roboto',sans-serif]">
                      {/* Smaller In-App or 24-Hour Timer Badge */}
                      {(() => {
                        const exp = getExpirationState(activeConversation);
                        if (exp.isInApp) {
                          return (
                            <div className="px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold bg-blue-50 border border-blue-100 text-[#1E88E5]">
                              In-App
                            </div>
                          );
                        }
                        return (
                          <div className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1 border ${
                            exp.isExpired 
                              ? "bg-slate-100 border-slate-200 text-slate-400" 
                              : exp.isUrgent 
                              ? "bg-red-50 border-red-100 text-red-600 animate-[pulse_1.5s_infinite]" 
                              : "bg-emerald-50 border-emerald-200 text-emerald-800"
                          }`}>
                            <Clock className="w-3 h-3" />
                            <span>{exp.text}</span>
                          </div>
                        );
                      })()}

                      {/* Add to List Icon Button (Picture-in-Picture PiP icon, transparent background, black icon, no shadow or border) */}
                      <button
                        onClick={() => setShowListModal(true)}
                        className="p-2.5 hover:bg-slate-100 text-black rounded-xl transition-all cursor-pointer flex items-center justify-center relative bg-transparent border-none shadow-none"
                        title="Add customer to progress list"
                      >
                        <PictureInPicture2 className="w-4.5 h-4.5 text-black" />
                        {Object.keys(activeConversation.candidateLists || {}).length > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00A884] text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-2xs">
                            {Object.keys(activeConversation.candidateLists || {}).length}
                          </span>
                        )}
                      </button>

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
            );
          })()}

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
                  const topMsg = firstCustomerMsg || messagesArray[0];
                  const topMsgText = topMsg?.text || activeConversation.text || "";

                  // Extract job referenced in top/first message or conversation
                  let conversationJob: Job | null = null;

                  // 1. Try Reference ID pattern e.g. Reference ID: job-seed-002
                  const refIdMatch = topMsgText.match(/Reference ID:\s*([A-Za-z0-9_-]+)/i);
                  if (refIdMatch && refIdMatch[1]) {
                    const matchedId = refIdMatch[1].trim();
                    conversationJob = jobsList.find(j => j.id.toLowerCase() === matchedId.toLowerCase()) || null;
                  }

                  // 2. Try generic pattern like JOB-101 or job-101 or job-seed-002 in top text
                  if (!conversationJob) {
                    const topJobIdMatch = topMsgText.match(/\b(JOB-[A-Za-z0-9_-]+|job-[A-Za-z0-9_-]+)\b/i);
                    if (topJobIdMatch) {
                      conversationJob = jobsList.find(j => j.id.toLowerCase() === topJobIdMatch[0].toLowerCase()) || null;
                    }
                  }

                  // 3. Try activeConversation.jobId
                  if (!conversationJob && activeConversation.jobId) {
                    conversationJob = jobsList.find(j => j.id.toLowerCase() === activeConversation.jobId.toLowerCase()) || null;
                  }

                  // 4. Search top message text for matching job ID in jobsList
                  if (!conversationJob) {
                    for (const j of jobsList) {
                      if (j.id && topMsgText.toLowerCase().includes(j.id.toLowerCase())) {
                        conversationJob = j;
                        break;
                      }
                    }
                  }

                  // 5. Try activeConversation.jobTitle or matching title in top text
                  if (!conversationJob) {
                    for (const j of jobsList) {
                      if (j.title && (topMsgText.toLowerCase().includes(j.title.toLowerCase()) || (activeConversation.jobTitle && activeConversation.jobTitle.toLowerCase() === j.title.toLowerCase()))) {
                        conversationJob = j;
                        break;
                      }
                    }
                  }

                  const isCurrentInApp = Boolean(
                    activeConversation?.isInApp || 
                    activeConversation?.chatId?.startsWith("inapp_") || 
                    (activeConversation?.customerPhone ? (!activeConversation.customerPhone.startsWith("+") && !/^\d+$/.test(activeConversation.customerPhone)) : false)
                  );

                  return messagesArray.map((msg, index) => {
                    if (msg.sender === "system") {
                      return (
                        <div key={msg.id || index} className="flex justify-center">
                          <div className="bg-slate-100 text-slate-500 rounded-full px-4 py-1.5 text-[10px] font-['Roboto',sans-serif] font-semibold tracking-wide flex items-center gap-1.5 shadow-sm border border-slate-200/50">
                            <Sparkles className={`w-3 h-3 ${isCurrentInApp ? "text-[#1E88E5]" : "text-[#00A884]"}`} />
                            {msg.text}
                          </div>
                        </div>
                      );
                    }

                    const isStaff = msg.sender === "staff";
                    const isFirstCustomerMessage = !isStaff && firstCustomerMsg && msg === firstCustomerMsg;
                    const matchedJob = isFirstCustomerMessage ? conversationJob : null;

                    return (
                      <div
                        key={msg.id || index}
                        className={`flex ${isStaff ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm border ${
                          isStaff
                            ? isCurrentInApp 
                              ? "bg-[#1E88E5] text-white border-blue-700 rounded-tr-none" 
                              : "bg-[#00A884] text-white border-[#008f6f] rounded-tr-none"
                            : "bg-white text-slate-800 border-slate-100 rounded-tl-none"
                        }`}>
                          <ChatMessageContent msg={msg} isSelf={isStaff} />

                          {/* Beautiful Job Card Dropdown Embedded in First Message */}
                          {matchedJob && (
                            <div className={`mt-3 border rounded-xl p-3 text-left transition-all font-['Roboto',sans-serif] ${
                              isStaff 
                                ? isCurrentInApp 
                                  ? "bg-slate-900/40 border-blue-800 text-white" 
                                  : "bg-emerald-950/40 border-emerald-800 text-white"
                                : "bg-slate-50 border-slate-100 text-slate-800"
                            }`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <span className={`text-[8px] font-mono uppercase tracking-wider block mb-0.5 ${
                                    isStaff 
                                      ? isCurrentInApp ? "text-blue-300" : "text-emerald-200" 
                                      : isCurrentInApp ? "text-blue-700" : "text-emerald-800"
                                  }`}>
                                    Referenced Job Opportunity
                                  </span>
                                  <h5 className={`text-xs font-bold leading-tight truncate ${
                                    isStaff ? "text-white" : "text-slate-900"
                                  }`}>
                                    {matchedJob.title}
                                  </h5>
                                  <p className={`text-[10px] font-medium ${
                                    isStaff 
                                      ? isCurrentInApp ? "text-blue-200/80" : "text-emerald-200/80" 
                                      : "text-slate-500"
                                  }`}>
                                    {matchedJob.company} • {matchedJob.location}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                      isStaff 
                                        ? isCurrentInApp ? "bg-blue-800/60 text-blue-200" : "bg-emerald-900/60 text-emerald-200"
                                        : isCurrentInApp ? "bg-[#1E88E5]/10 text-[#1E88E5]" : "bg-emerald-800/10 text-[#00A884]"
                                    }`}>
                                      {matchedJob.salary}
                                    </span>
                                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                                      isStaff 
                                        ? isCurrentInApp ? "bg-blue-800/40 text-blue-300" : "bg-emerald-900/40 text-emerald-200"
                                        : "bg-slate-200/60 text-slate-600"
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
                                      ? isCurrentInApp 
                                        ? "hover:bg-blue-800/40 text-blue-300 hover:text-white" 
                                        : "hover:bg-emerald-900/40 text-emerald-200 hover:text-white"
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
                                  className={`mt-2.5 pt-2.5 border-t text-[10px] leading-relaxed space-y-2 ${
                                    isStaff 
                                      ? isCurrentInApp 
                                        ? "border-blue-800/60 text-blue-100" 
                                        : "border-emerald-800/60 text-emerald-100"
                                      : "border-slate-200/60 text-slate-600"
                                  }`}
                                >
                                  <div>
                                    <p className={`font-bold ${isStaff ? isCurrentInApp ? "text-blue-200" : "text-emerald-200" : "text-slate-700"}`}>Description:</p>
                                    <p className="mt-0.5 whitespace-pre-line">{matchedJob.description}</p>
                                  </div>
                                  {matchedJob.requirements && matchedJob.requirements.length > 0 && (
                                    <div className="pt-1.5">
                                      <p className={`font-bold ${isStaff ? isCurrentInApp ? "text-blue-200" : "text-emerald-200" : "text-slate-700"}`}>Requirements:</p>
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
                            isStaff ? isCurrentInApp ? "text-blue-200/80" : "text-emerald-200/80" : "text-slate-400"
                          }`}>
                            {!isStaff && conversationJob && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPopupJob(conversationJob);
                                }}
                                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors inline-flex items-center cursor-pointer"
                                title="View reference job details"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isStaff && <CheckCheck className={`w-3.5 h-3.5 ${isCurrentInApp ? "text-blue-300" : "text-emerald-200"}`} />}
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
                  const isCurrentInApp = exp.isInApp;
                  
                  if (exp.isExpired) {
                    return (
                      <div className="space-y-3 font-['Roboto',sans-serif]">
                        <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-800">
                          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs font-bold leading-tight">
                              Meta 24-Hour Communication Window Expired
                            </p>
                            <p className="text-[10px] text-amber-700 leading-snug mt-1">
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
                              className={`w-full text-left p-3 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 transition-all cursor-pointer flex items-center justify-between gap-2 ${
                                isCurrentInApp 
                                  ? "hover:bg-blue-50 hover:border-blue-200 hover:text-[#1E88E5]"
                                  : "hover:bg-emerald-50 hover:border-emerald-200 hover:text-[#00A884]"
                              }`}
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
                    <div className="space-y-2 font-['Roboto',sans-serif]">
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

                      <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
                        <input 
                          ref={attachmentInputRef}
                          type="file"
                          accept="image/*,application/pdf,.doc,.docx"
                          onChange={handleChatFileAttachment}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => attachmentInputRef.current?.click()}
                          disabled={isUploadingAttachment || isSending}
                          className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          title="Attach Image, CV, or Document (ImageKit)"
                        >
                          {isUploadingAttachment ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <Paperclip className="w-4 h-4" />
                          )}
                        </button>

                        <input
                          ref={inputRef}
                          type="text"
                          required
                          value={messageInput}
                          onChange={(e) => { setMessageInput(e.target.value); if (sendError) setSendError(null); }}
                          placeholder={exp.isInApp ? "Type in-app message or attach CV/file..." : "Type WhatsApp dispatch message..."}
                          className={`w-full px-4 py-3 rounded-xl border text-xs font-medium focus:outline-none ${
                            exp.isUrgent 
                              ? "border-red-300 bg-red-50/10 focus:border-red-500 animate-[pulse_2s_infinite]" 
                              : isCurrentInApp 
                              ? "border-slate-200 focus:border-[#1E88E5]"
                              : "border-slate-200 focus:border-[#00A884]"
                          }`}
                        />
                        <button
                          type="submit"
                          disabled={isSending || isUploadingAttachment}
                          className={`px-5 py-3 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shrink-0 disabled:opacity-75 disabled:cursor-not-allowed ${
                            isCurrentInApp 
                              ? "bg-[#1E88E5] hover:bg-[#1565C0]" 
                              : "bg-[#00A884] hover:bg-[#008f6f]"
                          }`}
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

      {/* Candidate Progress List Bottom Slide-In Popup Modal */}
      <AnimatePresence>
        {showListModal && activeConversation && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Dark Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowListModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Bottom Slide-In Modal Container */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl overflow-hidden border-t border-slate-200 flex flex-col z-10 max-h-[85vh]"
            >
              {/* Top Drag/Pull Pill */}
              <div 
                className="pt-3 pb-1.5 flex justify-center bg-white cursor-pointer select-none" 
                onClick={() => setShowListModal(false)}
              >
                <div className="w-12 h-1.5 bg-slate-200 hover:bg-slate-300 rounded-full transition-colors" />
              </div>

              {/* Header */}
              <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#00A884]">
                    <ListPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-800">Add Candidate to List</h3>
                    <p className="text-[11px] text-slate-400">
                      Tracking progress for <span className="font-bold text-slate-700">{activeConversation.name || activeConversation.customerPhone}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowListModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Checkboxes List */}
              <div className="p-5 overflow-y-auto space-y-2.5">
                {CANDIDATE_PROGRESS_LISTS.map((item) => {
                  const isChecked = Boolean(activeConversation.candidateLists?.[item.id]);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={async () => {
                        await toggleCandidateListTag(
                          activeConversation.chatId,
                          item.id,
                          currentUser?.uid,
                          currentUser?.displayName
                        );
                      }}
                      className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer text-left select-none ${
                        isChecked
                          ? `${item.lightBg} border-2 shadow-2xs font-semibold`
                          : "bg-slate-50/70 hover:bg-slate-100/80 border-slate-200/80 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${item.lightBg}`}>
                          <item.icon className={`w-4 h-4 ${item.iconColor}`} />
                        </div>
                        <div>
                          <span className="text-xs font-bold block text-slate-800">{item.name}</span>
                          <span className="text-[10px] text-slate-400">
                            {isChecked ? "In candidate list" : "Tap checkbox to add"}
                          </span>
                        </div>
                      </div>

                      {/* Custom Styled Checkbox */}
                      <div className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                        isChecked 
                          ? "bg-[#00A884] text-white shadow-2xs" 
                          : "border-2 border-slate-300 bg-white"
                      }`}>
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                <span className="text-[11px] font-medium text-slate-500">
                  {Object.keys(activeConversation.candidateLists || {}).length} list(s) selected
                </span>
                <button
                  onClick={() => setShowListModal(false)}
                  className="px-6 py-2.5 bg-[#00A884] hover:bg-[#008f70] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
