import React, { useState, useEffect, useRef } from "react";
import { Conversation, ChatMessage, Job } from "../types";
import { uploadToImageKit } from "../lib/imagekit";
import { ChatMessageContent } from "./ChatMessageContent";
import { CandidateProfileView } from "./CandidateProfileView";
import { 
  subscribeToConversations, 
  subscribeToConversationMessages,
  markConversationMessagesAsRead,
  loadOlderMessages,
  claimConversation, 
  sendChatMessage, 
  setStaffOnlineStatus,
  clearConversationMessages,
  reportConversation,
  toggleCandidateListTag,
  clearAllDatabaseChatsAndContacts,
  refreshConversationsFromFirestore,
  fetchLatestConversationMessages,
  checkAndEnforceSLAs,
  isInternalStaffChat
} from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { ThreadCardSkeleton } from "./ThreadCardSkeleton";
import { 
  Clock, 
  MessageCircle, 
  Check, 
  UserCheck, 
  X, 
  Send, 
  AlertCircle, 
  Search,
  CheckCheck,
  ChevronRight,
  Sparkles,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Trash2,
  Flag,
  Loader2,
  Paperclip,
  Tag,
  Users,
  FileText,
  MapPin,
  ShieldCheck,
  DollarSign,
  Briefcase,
  Smile,
  Camera,
  RefreshCw,
  Plus,
  Bell,
  Phone,
  Info,
  CheckCircle2,
  Building,
  UserPlus
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
  { id: "all", label: "All", badgeColor: "bg-slate-100 text-slate-700" },
  { id: "pending", label: "Pending", badgeColor: "bg-amber-100 text-amber-800" },
  { id: "active", label: "Active", badgeColor: "bg-blue-100 text-blue-800" },
  { id: "employers", label: "Employers", badgeColor: "bg-purple-100 text-purple-800" },
  { id: "Registered Candidates", label: "Registered", badgeColor: "bg-indigo-100 text-indigo-800" },
  { id: "Submitted Resume(CV)", label: "Resume Submitted", badgeColor: "bg-emerald-100 text-emerald-800" },
  { id: "Verified", label: "Verified", badgeColor: "bg-purple-100 text-purple-800" },
  { id: "Address Given", label: "Address Given", badgeColor: "bg-teal-100 text-teal-800" },
  { id: "Pending Commission Retrieval", label: "Commission", badgeColor: "bg-rose-100 text-rose-800" },
];

const CHAT_VECTOR_WALLPAPER = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230B1B3D' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round' opacity='0.05'%3E%3Cpath d='M10 14h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-10l-6 5v-5h-2a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z'/%3E%3Cpath d='M52 48l18-8-8 18-4-6-6-4z'/%3E%3Cpath d='M58 18l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z'/%3E%3Ccircle cx='24' cy='60' r='5'/%3E%3Cpath d='M21.5 60l2 2 4-4'/%3E%3Cpath d='M56 64h10'/%3E%3Cpath d='M61 59v10'/%3E%3C/g%3E%3C/svg%3E")`;

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

  // Listen to staff online status changes
  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsOnline(customEvent.detail);
    };
    window.addEventListener("staff-status-changed", handleStatusChange);
    return () => window.removeEventListener("staff-status-changed", handleStatusChange);
  }, []);

  const [tagFilter, setTagFilter] = useState<string>(() => {
    return currentUser?.role === "staff" ? "active" : "all";
  });

  useEffect(() => {
    if (currentUser?.role === "staff") {
      setTagFilter("active");
    }
  }, [currentUser?.role]);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [claimingIds, setClaimingIds] = useState<Record<string, boolean>>({});
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const searchQuery = localSearchQuery || (externalSearchQuery || "");
  const [currentSystemTime, setCurrentSystemTime] = useState(Date.now());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Active subcollection messages state and pagination
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);

  // Modals & Sheets
  const [popupJob, setPopupJob] = useState<Job | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showClearAllDatabaseConfirm, setShowClearAllDatabaseConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [showListModal, setShowListModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatPhone, setNewChatPhone] = useState("");
  const [newChatName, setNewChatName] = useState("");
  const [newChatJobId, setNewChatJobId] = useState("");
  const [newChatInitialMsg, setNewChatInitialMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isJobBannerExpanded, setIsJobBannerExpanded] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [viewingCandidateProfileChatId, setViewingCandidateProfileChatId] = useState<string | null>(null);

  // Focus & Scroll on Chat Selection
  useEffect(() => {
    if (activeChatId) {
      setTimeout(() => {
        inputRef.current?.focus();
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    }
  }, [activeChatId]);

  // Poll system time
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSystemTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Sync staff availability
  useEffect(() => {
    if (currentUser?.uid) {
      setStaffOnlineStatus(currentUser.uid, isOnline);
    }
  }, [currentUser?.uid, isOnline]);

  // Subscribe to real-time conversations
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
      markConversationMessagesAsRead(activeChatId, currentUser?.uid, "staff");
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [activeChatId]);

  const handleRefreshInbox = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshNotice(null);
    try {
      // 1. Run SLA check to update any timed-out, abandoned, or pending conversations
      checkAndEnforceSLAs().catch((err) => console.warn("[handleRefreshInbox] SLA notice:", err));

      // 2. Fetch fresh conversations directly from Firestore database
      const updatedConvs = await refreshConversationsFromFirestore();
      if (updatedConvs) {
        setConversations({ ...updatedConvs });
      }

      // 3. If an active conversation is open, fetch its latest messages from the subcollection & parent doc
      if (activeChatId) {
        const freshMsgs = await fetchLatestConversationMessages(activeChatId, 50);
        if (freshMsgs && freshMsgs.length > 0) {
          setActiveMessages([...freshMsgs]);
        }
        await markConversationMessagesAsRead(activeChatId, currentUser?.uid, "staff");

        // Scroll active chat view to newest messages
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 120);
      }

      // 4. Force DOM/view recalculation for relative timestamps and timers
      setCurrentSystemTime(Date.now());

      // 5. Brief visual confirmation
      setRefreshNotice("Up to date");
      setTimeout(() => {
        setRefreshNotice(null);
      }, 2200);
    } catch (err) {
      console.warn("[handleRefreshInbox] Refresh notice:", err);
      setRefreshNotice("Synced");
      setTimeout(() => {
        setRefreshNotice(null);
      }, 1800);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 450);
    }
  };

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
      console.warn("[ChatInbox] Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const activeConversation = activeChatId ? conversations[activeChatId] : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, activeConversation?.messages]);

  useEffect(() => {
    const isDetailActive = !!activeChatId || !!viewingCandidateProfileChatId;
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: isDetailActive } }));
    if (onActiveChatChange) {
      onActiveChatChange(isDetailActive);
    }
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
      if (onActiveChatChange) {
        onActiveChatChange(false);
      }
    };
  }, [activeChatId, viewingCandidateProfileChatId, onActiveChatChange]);

  // File & Photo Attachment Handling
  const handleChatFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>, forcedType?: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    try {
      setIsUploadingAttachment(true);
      setSendError(null);
      const res = await uploadToImageKit(file, "/chat_attachments");
      const isImg = forcedType === "image" || res.fileType === "image";
      const fileNotice = isImg 
        ? `[Attached Image]: ${res.url}`
        : `[Attached Document/File]: ${res.name || file.name}\n${res.url}`;

      // Optimistic Send or populate input
      await handleSendDirectMessage(fileNotice, {
        attachmentUrl: res.url,
        fileType: isImg ? "image" : "file"
      });
    } catch (err: any) {
      console.error("[Attachment Upload Error]", err);
      setSendError(err.message || "Failed to upload file attachment to ImageKit");
    } finally {
      setIsUploadingAttachment(false);
      if (attachmentInputRef.current) attachmentInputRef.current.value = "";
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  // Helper to extract the most recent message received/sent timestamp
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

  const sortByMostRecent = (list: Conversation[]) => {
    return [...list].sort((a, b) => getLatestMessageTime(b) - getLatestMessageTime(a));
  };

  // User-visible conversations
  const conversationsList = Object.values(conversations) as Conversation[];
  const userVisibleConversations = conversationsList.filter(c => {
    // Exclude internal staff chats (office chat, group chat, test diagnostic logs)
    if (isInternalStaffChat(c)) return false;

    // 2-Hour Claim Rule
    const isClaimedByOther = !!c.assignedTo && c.assignedTo !== currentUser?.uid;
    if (isClaimedByOther) {
      const claimTime = c.claimedAt || c.lastMessageAt || c.createdAt;
      const isClaimedOver2Hours = (currentSystemTime - claimTime) >= 2 * 60 * 60 * 1000;
      if (isClaimedOver2Hours) return false;
    }

    if (c.status === "pending" && currentUser) {
      const isShared = !c.sharedWith || 
        c.sharedWith.length === 0 || 
        c.sharedWith.includes(currentUser.uid) ||
        currentUser.role === "staff" ||
        currentUser.role === "admin";
      if (!isShared) return false;
    }

    return true;
  });

  // Tag filter matcher
  const matchesTagFilter = (c: Conversation, tagId: string) => {
    if (isInternalStaffChat(c)) return false;

    const isEmployer = Boolean(
      c.isEmployer ||
      c.userRole === "employer" ||
      c.seekerRole === "employer" ||
      c.companyName ||
      (c.chatId && c.chatId.startsWith("employer_"))
    );

    if (tagId === "all") {
      if (currentUser?.role === "staff") {
        return (c.status === "pending" && !isEmployer) || (c.assignedTo === currentUser?.uid && c.status === "ongoing");
      }
      return true;
    }
    if (tagId === "pending") {
      // In the admin chat page a message from an employer is not a pending chat
      return c.status === "pending" && !isEmployer;
    }
    if (tagId === "active") {
      return (c.assignedTo === currentUser?.uid || c.adminUid === currentUser?.uid) && c.status === "ongoing";
    }
    if (tagId === "employers") {
      return isEmployer;
    }
    return Boolean(c.candidateLists && c.candidateLists[tagId]);
  };

  const getTagCount = (tagId: string) => {
    return userVisibleConversations.filter(c => matchesTagFilter(c, tagId)).length;
  };

  const taggedConversations = userVisibleConversations.filter(c => matchesTagFilter(c, tagFilter));

  const getFilteredList = (list: Conversation[]) => {
    if (!searchQuery || !searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(c => {
      const phone = (c.customerPhone || "").toLowerCase();
      const job = (c.jobTitle || "").toLowerCase();
      const text = (c.text || "").toLowerCase();
      const name = (c.name || "").toLowerCase();
      const company = (c.companyName || "").toLowerCase();
      return phone.includes(query) || job.includes(query) || text.includes(query) || name.includes(query) || company.includes(query);
    });
  };

  const rawVisibleList = sortByMostRecent(getFilteredList(taggedConversations));
  const visibleList = React.useMemo(() => {
    const seen = new Set<string>();
    return rawVisibleList.filter(c => {
      if (!c || !c.chatId || seen.has(c.chatId)) return false;
      seen.add(c.chatId);
      return true;
    });
  }, [rawVisibleList]);

  // Pagination for the "All" chat tab
  const [allPageSize, setAllPageSize] = React.useState(25);
  const isAllTab = tagFilter === "all";

  // Reset page size when filter or search changes
  React.useEffect(() => {
    setAllPageSize(25);
  }, [tagFilter, localSearchQuery]);

  const displayedVisibleList = React.useMemo(() => {
    if (!isAllTab) return visibleList;
    return visibleList.slice(0, allPageSize);
  }, [isAllTab, visibleList, allPageSize]);

  const hasMoreAll = isAllTab && visibleList.length > allPageSize;

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isAllTab || !hasMoreAll) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 120) {
      setAllPageSize(prev => Math.min(prev + 25, visibleList.length));
    }
  };

  // Claim Chat Action
  const handleClaimChat = async (chatId: string) => {
    if (!currentUser) return;
    setClaimingIds(prev => ({ ...prev, [chatId]: true }));
    const success = await claimConversation(chatId, currentUser.uid, currentUser.displayName || "Staff Member");
    setClaimingIds(prev => ({ ...prev, [chatId]: false }));
    if (success) {
      setTagFilter("active");
      setActiveChatId(chatId);
    }
  };

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
      sender: "staff",
      text: textToSend,
      timestamp: now,
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || "Staff Member",
      attachmentUrl: options?.attachmentUrl,
      fileType: options?.fileType,
      deliveryStatus: "sending"
    };

    // 1. Optimistically append to activeMessages with clock icon
    setActiveMessages(prev => [...prev, optimisticMessage]);

    try {
      if (activeConversation && activeConversation.status === "pending") {
        await claimConversation(activeChatId, currentUser.uid, currentUser.displayName || "Staff");
        setTagFilter("active");
      }
      const sentMsg = await sendChatMessage(activeChatId, "staff", textToSend, {
        messageId: tempId,
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Staff Member",
        senderRole: "staff",
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
      console.error("Failed to send message:", err);
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

  // Clear All Database chats & contacts
  const handleClearAllDatabase = async () => {
    setIsClearingAll(true);
    try {
      await clearAllDatabaseChatsAndContacts();
      setConversations({});
      setActiveMessages([]);
      setActiveChatId(null);
      setShowClearAllDatabaseConfirm(false);
      setHeaderMenuOpen(false);
    } catch (err) {
      console.error("Failed to clear database chats:", err);
    } finally {
      setIsClearingAll(false);
    }
  };

  // Clear single chat
  const handleClearSingleChat = async () => {
    if (!activeChatId) return;
    try {
      await clearConversationMessages(activeChatId);
      setActiveMessages([]);
      setShowClearConfirm(false);
      setHeaderMenuOpen(false);
    } catch (err) {
      console.error("Failed to clear chat:", err);
    }
  };

  // Create new conversation
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatPhone.trim() || !currentUser) return;
    const phoneClean = newChatPhone.trim();
    const chatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const initialText = newChatInitialMsg.trim() || `Hello ${newChatName || "there"}, this is ${currentUser.displayName || "Valley Reigns Recruitment"}.`;
    
    try {
      await sendChatMessage(chatId, "staff", initialText, {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Staff",
        senderRole: "staff"
      });

      // Update local state
      setActiveChatId(chatId);
      setShowNewChatModal(false);
      setNewChatPhone("");
      setNewChatName("");
      setNewChatJobId("");
      setNewChatInitialMsg("");
    } catch (err) {
      console.error("Failed to create new chat:", err);
    }
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name && name !== phone) {
      const parts = name.trim().split(/\s+/).filter(Boolean);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      if (parts.length === 1 && parts[0].length >= 1) return parts[0].substring(0, 2).toUpperCase();
    }
    if (phone) {
      const digits = String(phone).replace(/\D/g, "");
      if (digits.length >= 2) return digits.slice(-2);
    }
    return "VR";
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
    const isToday = now.toDateString() === date.toDateString();
    if (isToday) return formatMessageTime(timestamp);
    return date.toLocaleDateString([], { month: "numeric", day: "numeric", year: "2-digit" });
  };

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

  // Current associated job
  const associatedJob = jobsList.find(j => 
    j.id === activeConversation?.jobId || 
    (activeConversation?.text && activeConversation.text.toLowerCase().includes(j.id.toLowerCase()))
  );

  // If viewing candidate profile (staff only)
  if (viewingCandidateProfileChatId && conversations[viewingCandidateProfileChatId] && (currentUser?.role === "staff" || currentUser?.role === "admin")) {
    return (
      <CandidateProfileView
        conversation={conversations[viewingCandidateProfileChatId]}
        currentUser={currentUser}
        jobsList={jobsList}
        onBack={() => setViewingCandidateProfileChatId(null)}
        onOpenChat={(id) => {
          setViewingCandidateProfileChatId(null);
          setActiveChatId(id);
        }}
      />
    );
  }

  return (
    <div id="chat-inbox-container" className="w-full h-full flex flex-col bg-transparent border-0 shadow-none font-sans min-h-0">
      {/* Hidden File Attachment Inputs */}
      <input
        type="file"
        ref={attachmentInputRef}
        onChange={(e) => handleChatFileAttachment(e, "file")}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
      />
      <input
        type="file"
        ref={photoInputRef}
        onChange={(e) => handleChatFileAttachment(e, "image")}
        className="hidden"
        accept="image/*"
      />

      {/* Split-Pane: Conversations List (Left) & WhatsApp Chat Canvas (Right) */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* ========================================== */}
        {/* LEFT PANEL: THREADS / CONVERSATION INBOX   */}
        {/* ========================================== */}
        <div className={`w-full md:w-[380px] lg:w-[420px] bg-white border-r border-slate-200/80 flex flex-col shrink-0 h-full min-h-0 ${activeChatId ? "hidden md:flex" : "flex"}`}>
          
          {/* Top Sticky Search Bar (Fixed under header) */}
          <div className="shrink-0 z-20 px-3.5 py-3 bg-white border-b border-slate-100 flex items-center shadow-2xs">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={localSearchQuery}
                onChange={(e) => setLocalSearchQuery(e.target.value)}
                placeholder="Search candidates, jobs, messages..."
                className="w-full pl-9 pr-8 py-2 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              />
              {localSearchQuery && (
                <button
                  type="button"
                  onClick={() => setLocalSearchQuery("")}
                  className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

            {/* Horizontal Filter Chips Bar with Fixed Refresh Button */}
            <div className="relative bg-white/95 border-b border-slate-100 flex items-center shrink-0">
              <div 
                className="px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {CHAT_TAG_FILTERS.map((f) => {
                  const count = getTagCount(f.id);
                  const isActive = tagFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => setTagFilter(f.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? "bg-[#0B1B3D] text-white shadow-xs"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      <span>{f.label}</span>
                      {count > 0 && (
                        <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isActive ? "bg-white/20 text-white" : f.badgeColor
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
                {/* Generous spacing at the end of the tags row so the refresh button never covers the last tag */}
                <div className="w-20 shrink-0 pointer-events-none" aria-hidden="true" />
              </div>

              {/* Fixed Right-Aligned Refresh Button with subtle fade gradient underlay and square right corners */}
              <div className="absolute right-0 top-0 bottom-0 pl-6 pr-0 bg-gradient-to-l from-white via-white/95 to-transparent flex items-center justify-end pointer-events-auto">
                <AnimatePresence>
                  {refreshNotice && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.9, x: 6 }}
                      animate={{ opacity: 1, scale: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.9, x: 4 }}
                      transition={{ duration: 0.15 }}
                      className="mr-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/90 px-2 py-0.5 rounded-md whitespace-nowrap shadow-xs pointer-events-none"
                    >
                      {refreshNotice}
                    </motion.span>
                  )}
                </AnimatePresence>
                <button
                  type="button"
                  disabled={isRefreshing}
                  onClick={handleRefreshInbox}
                  title="Check for new messages and refresh view"
                  className="h-9 px-3.5 bg-black hover:bg-neutral-900 active:scale-95 rounded-l-full rounded-r-none transition-all cursor-pointer shadow-md flex items-center justify-center shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 text-white stroke-[2.2] ${isRefreshing ? "animate-spin" : ""}`} />
                </button>
              </div>
            </div>

          {/* Threads Scroll List with Bottom Padding */}
          <div 
            onScroll={handleListScroll}
            className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 bg-white pb-12 md:pb-10"
          >
            {loading ? (
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4].map((n) => (
                  <ThreadCardSkeleton key={n} />
                ))}
              </div>
            ) : visibleList.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">
                  No conversations yet
                </h3>
                <p className="text-xs text-slate-500 max-w-xs mb-4">
                  Incoming candidate messages and inquiries will automatically appear here.
                </p>
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(true)}
                  className="px-4 py-2 bg-[#0B1B3D] hover:bg-blue-700 text-white rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start New Chat</span>
                </button>
              </div>
            ) : (
              <>
                {displayedVisibleList.map((conv) => {
                  const isSelected = activeChatId === conv.chatId;
                  const isClaimedByOther = !!conv.assignedTo && conv.assignedTo !== currentUser?.uid;
                  const lastTime = conv.lastMessageAt || conv.createdAt || 0;
                  const latestMsgSnippet = conv.text || "Tap to view conversation";
                  const isEmployerConv = Boolean(
                    conv.isEmployer ||
                    conv.userRole === "employer" ||
                    conv.seekerRole === "employer" ||
                    conv.companyName ||
                    (conv.chatId && conv.chatId.startsWith("employer_"))
                  );
                  const cardDisplayName = isEmployerConv
                    ? (conv.companyName || conv.name || conv.customerPhone || "Employer Business")
                    : (conv.name || conv.customerPhone || "Candidate");

                return (
                  <div
                    key={conv.chatId}
                    onClick={() => {
                      if (!isClaimedByOther) {
                        setActiveChatId(conv.chatId);
                      }
                    }}
                    className={`w-full p-3.5 flex items-start gap-3 transition-colors cursor-pointer relative ${
                      isSelected
                        ? "bg-blue-50/70"
                        : isClaimedByOther
                        ? "opacity-50 pointer-events-none bg-slate-50"
                        : "hover:bg-slate-50/90 bg-white"
                    }`}
                  >
                    {/* Circle Avatar with ring - Click to view profile for staff */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (currentUser?.role === "staff" || currentUser?.role === "admin") {
                          setViewingCandidateProfileChatId(conv.chatId);
                        }
                      }}
                      className="relative shrink-0 mt-0.5 cursor-pointer group"
                      title={currentUser?.role === "staff" || currentUser?.role === "admin" ? (isEmployerConv ? "View Employer Profile" : "View Candidate Profile") : undefined}
                    >
                      <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm tracking-wide text-white shadow-xs group-hover:scale-105 transition-transform ${
                        isEmployerConv
                          ? "bg-gradient-to-tr from-purple-700 to-indigo-600 ring-2 ring-purple-200"
                          : conv.status === "pending"
                          ? "bg-gradient-to-tr from-amber-500 to-amber-600 ring-2 ring-amber-200"
                          : conv.status === "ongoing"
                          ? "bg-gradient-to-tr from-blue-600 to-indigo-600 ring-2 ring-blue-200"
                          : "bg-gradient-to-tr from-slate-600 to-slate-700 ring-2 ring-slate-200"
                      }`}>
                        {getInitials(cardDisplayName, conv.customerPhone)}
                      </div>
                      {conv.status === "pending" && !isEmployerConv && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-amber-500 border-2 border-white rounded-full" />
                      )}
                      {isEmployerConv && (
                        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-purple-600 border-2 border-white rounded-full shadow-xs" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[14px] font-bold text-slate-900 truncate">
                          {cardDisplayName}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400 shrink-0">
                          {formatThreadDate(lastTime)}
                        </span>
                      </div>

                      {/* Reach Out / Job Title Label (No border or bg color) */}
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {isEmployerConv ? (
                          <span className="text-[11px] font-semibold text-purple-600 truncate max-w-[220px] flex items-center gap-1">
                            <Building className="w-3 h-3 shrink-0" />
                            <span>{conv.companyIndustry ? `${conv.companyIndustry} (Employer)` : "Employer Business Desk"}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] font-semibold text-blue-600 truncate max-w-[220px]">
                            {(() => {
                              const title = conv.jobTitle || "";
                              const isGenericOrWhatsapp = !title || 
                                title.toLowerCase().includes("whatsapp") || 
                                title.toLowerCase().includes("inquiry");
                              return isGenericOrWhatsapp ? "Reach Out" : title;
                            })()}
                          </span>
                        )}

                        {conv.assignedToName && (
                          <span className="text-[10px] font-medium text-slate-400">
                            • {conv.assignedToName}
                          </span>
                        )}

                        {currentUser?.role === "admin" && conv.status === "pending" && !isEmployerConv && (
                          <span className="text-[10px] font-semibold text-amber-600">
                            • Pending Claim
                          </span>
                        )}
                        {currentUser?.role === "admin" && conv.status === "abandoned" && (
                          <span className="text-[10px] font-semibold text-rose-600">
                            • Abandoned
                          </span>
                        )}
                      </div>

                      {/* Message Snippet */}
                      <p className="text-xs text-slate-500 truncate leading-relaxed">
                        {latestMsgSnippet}
                      </p>
                    </div>
                  </div>
                );
              })}

              {hasMoreAll && (
                <div className="p-3 text-center bg-slate-50/80 border-t border-slate-100 flex flex-col items-center justify-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-500">
                    Showing {displayedVisibleList.length} of {visibleList.length} conversations
                  </span>
                  <button
                    type="button"
                    onClick={() => setAllPageSize(prev => Math.min(prev + 25, visibleList.length))}
                    className="px-3.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-full text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                  >
                    Load More
                  </button>
                </div>
              )}
            </>
          )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANEL: WHATSAPP-STYLE ACTIVE CHAT    */}
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
              {/* Soft Refined Active Chat Header Bar */}
              <div className="px-3.5 sm:px-4 py-2.5 bg-white/95 backdrop-blur-md border-0 flex items-center justify-between gap-3 shrink-0 z-10 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div 
                  onClick={() => {
                    if (currentUser?.role === "staff" || currentUser?.role === "admin") {
                      setViewingCandidateProfileChatId(activeChatId);
                    }
                  }}
                  className={`flex items-center gap-2.5 sm:gap-3 min-w-0 ${currentUser?.role === "staff" || currentUser?.role === "admin" ? "cursor-pointer group hover:opacity-95" : ""}`}
                  title={currentUser?.role === "staff" || currentUser?.role === "admin" ? "View Candidate Profile" : undefined}
                >
                  {/* Back button for mobile view */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveChatId(null);
                    }}
                    className="p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95 rounded-full md:hidden cursor-pointer transition-all flex items-center justify-center shrink-0"
                    title="Back to Chats"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Contact Avatar - Perfectly rounded circle */}
                  <div className="relative shrink-0">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-[0_2px_8px_rgba(11,27,61,0.14)] group-hover:ring-2 ring-blue-300 transition-all ${
                      (activeConversation.isEmployer || activeConversation.userRole === "employer" || activeConversation.seekerRole === "employer" || activeConversation.companyName || (activeConversation.chatId && activeConversation.chatId.startsWith("employer_")))
                        ? "bg-gradient-to-tr from-purple-700 to-indigo-600"
                        : "bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5]"
                    }`}>
                      {getInitials(
                        (activeConversation.isEmployer || activeConversation.userRole === "employer" || activeConversation.seekerRole === "employer" || activeConversation.companyName || (activeConversation.chatId && activeConversation.chatId.startsWith("employer_")))
                          ? (activeConversation.companyName || activeConversation.name || activeConversation.customerPhone)
                          : activeConversation.name,
                        activeConversation.customerPhone
                      )}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                  </div>

                  {/* Name & Subtitle */}
                  <div className="min-w-0">
                    <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 truncate leading-tight tracking-tight group-hover:text-blue-600 transition-colors">
                      {(() => {
                        const isEmp = Boolean(
                          activeConversation.isEmployer ||
                          activeConversation.userRole === "employer" ||
                          activeConversation.seekerRole === "employer" ||
                          activeConversation.companyName ||
                          (activeConversation.chatId && activeConversation.chatId.startsWith("employer_"))
                        );
                        return isEmp
                          ? (activeConversation.companyName || activeConversation.name || activeConversation.customerPhone || "Employer Business")
                          : (activeConversation.name || activeConversation.customerPhone || "Candidate");
                      })()}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>
                        online • {(() => {
                          const isEmp = Boolean(
                            activeConversation.isEmployer ||
                            activeConversation.userRole === "employer" ||
                            activeConversation.seekerRole === "employer" ||
                            activeConversation.companyName ||
                            (activeConversation.chatId && activeConversation.chatId.startsWith("employer_"))
                          );
                          if (isEmp) {
                            return activeConversation.companyIndustry ? `${activeConversation.companyIndustry} (Employer)` : "Employer Business Desk";
                          }
                          return activeConversation.jobTitle || "Job Seeker";
                        })()}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Right Top Header Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {/* Job Details Card Button */}
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

                  {/* Candidate Tagging Button */}
                  {!(activeConversation.isEmployer || activeConversation.userRole === "employer" || activeConversation.seekerRole === "employer" || activeConversation.companyName || (activeConversation.chatId && activeConversation.chatId.startsWith("employer_"))) && (
                    <button
                      type="button"
                      onClick={() => setShowListModal(true)}
                      className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50/70 active:scale-95 rounded-full transition-all cursor-pointer"
                      title="Candidate Stage Lists"
                    >
                      <Tag className="w-4 h-4" />
                    </button>
                  )}

                  {/* Options Menu */}
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
                              <span>
                                {(activeConversation.isEmployer || activeConversation.userRole === "employer" || activeConversation.seekerRole === "employer" || activeConversation.companyName || (activeConversation.chatId && activeConversation.chatId.startsWith("employer_")))
                                  ? "Report Employer"
                                  : "Report Candidate"}
                              </span>
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
                {/* Pagination button for loading earlier messages */}
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
                  const isStaffOrSelf = msg.sender === "staff" || msg.sender === "system" || (msg.senderUid && currentUser && msg.senderUid === currentUser.uid);
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
                      className={`flex w-full ${isStaffOrSelf ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[65%] px-3.5 py-2 ${
                          isStaffOrSelf
                            ? "bg-[#DCF8C6] text-slate-900 rounded-2xl rounded-tr-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            : "bg-white text-slate-900 rounded-2xl rounded-tl-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        {/* Sender name for candidate/other party if available */}
                        {!isStaffOrSelf && msg.senderName && (
                          <p className="text-[11px] font-bold text-blue-600 mb-0.5">
                            {msg.senderName}
                          </p>
                        )}

                        {/* Content text and attachment previews */}
                        <div className="text-[13.5px] leading-relaxed">
                          <ChatMessageContent msg={msg} isSelf={isStaffOrSelf} />
                        </div>

                        {/* Bottom Row: Time & Delivery Status */}
                        <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5 select-none">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isStaffOrSelf && (
                            <>
                              {msg.deliveryStatus === "sending" && (
                                <span title="Sending to Firestore...">
                                  <Clock className="w-3.5 h-3.5 text-slate-400 animate-pulse" />
                                </span>
                              )}
                              {msg.deliveryStatus === "failed" && (
                                <button
                                  type="button"
                                  onClick={() => handleSendDirectMessage(msg.text, { attachmentUrl: msg.attachmentUrl, fileType: (msg.fileType as "file" | "image" | "pdf") || undefined })}
                                  className="inline-flex items-center gap-0.5 text-rose-600 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                                  title="Failed to deliver. Click to retry"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Retry</span>
                                </button>
                              )}
                              {(msg.deliveryStatus === "sent" || (!msg.deliveryStatus && !msg.read)) && !msg.read && (
                                <span title="Sent to server">
                                  <Check className="w-3.5 h-3.5 text-slate-400" />
                                </span>
                              )}
                              {(msg.read || msg.deliveryStatus === "delivered") && (
                                <span title="Read by recipient">
                                  <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" />
                                </span>
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

              {/* Send Error Toast if any */}
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
                  
                  {/* Left Pill Input Container (Transparent/Seamless with No Border or Shadow) */}
                  <div className="flex-1 bg-white/95 backdrop-blur-md rounded-full border-0 shadow-none flex items-center px-3.5 py-1.5 gap-2">
                    
                    {/* Emoji Button */}
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Emojis"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    {/* Text Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      disabled={isSending}
                      className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none py-1"
                    />

                    {/* Paperclip File/CV Attachment */}
                    <button
                      type="button"
                      onClick={() => attachmentInputRef.current?.click()}
                      disabled={isUploadingAttachment}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Attach Document / CV"
                    >
                      {isUploadingAttachment ? (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      ) : (
                        <Paperclip className="w-5 h-5 -rotate-45" />
                      )}
                    </button>

                    {/* Camera / Photo Attachment */}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="text-slate-400 hover:text-slate-700 transition-colors p-1 cursor-pointer"
                      title="Send Photo"
                    >
                      <Camera className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Circular Send Button */}
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

                {/* Quick Emoji Bar when toggled */}
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
            // Empty State when no chat is open
            <div className="flex flex-col items-center justify-center p-8 text-center max-w-sm">
              <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 shadow-sm">
                <MessageCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Valley Reigns Communications
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Select a conversation from the list to view chat history, communicate with applicants, and review resumes.
              </p>
              <button
                type="button"
                onClick={() => setShowNewChatModal(true)}
                className="px-5 py-2.5 bg-[#0B1B3D] hover:bg-blue-700 text-white text-xs font-bold rounded-full shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Start New Candidate Chat</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* MODALS & DIALOGS                           */}
      {/* ========================================== */}

      {/* 1. Clear Single Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Clear this conversation?</h4>
              <p className="text-xs text-slate-500 mt-1">
                All message history for this candidate will be cleared. This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearSingleChat}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Clear All Database Chats & Contacts Modal */}
      {showClearAllDatabaseConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Clear all database chats & contacts?</h4>
              <p className="text-xs text-slate-500 mt-1">
                This will delete all conversation history, messages, and saved contacts from the database.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearAllDatabaseConfirm(false)}
                disabled={isClearingAll}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllDatabase}
                disabled={isClearingAll}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                {isClearingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isClearingAll ? "Clearing..." : "Yes, Clear All"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Candidate Progress List Modal - Bottom Sheet */}
      <AnimatePresence>
        {showListModal && activeConversation && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowListModal(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-slate-200 shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[85vh]"
            >
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2 shrink-0" />

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="w-5 h-5 text-purple-600" />
                    <h4 className="text-base font-extrabold text-slate-900">Candidate Progress Stage</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowListModal(false)}
                    className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Assign or update the recruitment workflow stage for this candidate:
                </p>
                <div className="space-y-2">
                  {CANDIDATE_PROGRESS_LISTS.map((list) => {
                    const isTagged = Boolean(activeConversation.candidateLists?.[list.id]);
                    const IconComponent = list.icon;
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => {
                          if (currentUser) {
                            toggleCandidateListTag(
                              activeConversation.chatId,
                              list.id,
                              currentUser.uid,
                              currentUser.displayName || "Staff"
                            );
                          }
                        }}
                        className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isTagged
                            ? `${list.lightBg} border-current shadow-xs`
                            : "bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <IconComponent className={`w-5 h-5 ${list.iconColor}`} />
                          <span className="text-xs font-bold">{list.name}</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isTagged ? "bg-purple-600 border-purple-600 text-white" : "border-slate-300"
                        }`}>
                          {isTagged && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
                  className="w-full py-3 bg-[#0B1B3D] hover:bg-[#11244e] text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* 4. Start New Chat Modal */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Start Candidate Chat</h4>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Phone or Email *</label>
                <input
                  type="text"
                  required
                  value={newChatPhone}
                  onChange={(e) => setNewChatPhone(e.target.value)}
                  placeholder="e.g. +234 812 345 6789 or candidate@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Name (Optional)</label>
                <input
                  type="text"
                  value={newChatName}
                  onChange={(e) => setNewChatName(e.target.value)}
                  placeholder="e.g. Alex Rivera"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Initial Opening Message</label>
                <textarea
                  rows={2}
                  value={newChatInitialMsg}
                  onChange={(e) => setNewChatInitialMsg(e.target.value)}
                  placeholder="Type an opening greeting or message..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newChatPhone.trim()}
                  className="px-5 py-2 bg-[#0B1B3D] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer"
                >
                  Open Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Job Details Popup */}
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
              <span className="text-slate-500 font-medium">Compensation / Salary:</span>
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

      {/* 6. Report Dialog */}
      {showReportDialog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
              <Flag className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-900">Report Conversation</h4>
              <p className="text-xs text-slate-500 mt-1">
                Provide a reason for reporting this chat. Our administration team will review it.
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
