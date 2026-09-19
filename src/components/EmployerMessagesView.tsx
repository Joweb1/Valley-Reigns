import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ThreadCardSkeleton } from "./ThreadCardSkeleton";
import { Conversation, ChatMessage, UserProfile } from "../types";
import { uploadToImageKit } from "../lib/imagekit";
import { ChatMessageContent } from "./ChatMessageContent";
import { 
  subscribeToConversations, 
  subscribeToConversationMessages,
  markConversationMessagesAsRead,
  loadOlderMessages,
  sendChatMessage, 
  getStaffProfiles,
  getAllUserProfiles,
  getEmployerProfiles,
  clearConversationMessages,
  reportConversation,
  refreshConversationsFromFirestore,
  fetchLatestConversationMessages,
  memoryStore
} from "../lib/services";
import { 
  Clock, 
  MessageSquare, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Trash2, 
  Flag, 
  Loader2,
  Check, 
  CheckCheck,
  AlertCircle,
  Building2,
  Paperclip,
  Briefcase,
  Smile,
  Camera,
  Search,
  X,
  ShieldCheck,
  UserCheck,
  Users,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CHAT_VECTOR_WALLPAPER = `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230B1B3D' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round' opacity='0.05'%3E%3Cpath d='M10 14h18a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-10l-6 5v-5h-2a3 3 0 0 1-3-3V17a3 3 0 0 1 3-3z'/%3E%3Cpath d='M52 48l18-8-8 18-4-6-6-4z'/%3E%3Cpath d='M58 18l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5z'/%3E%3Ccircle cx='24' cy='60' r='5'/%3E%3Cpath d='M21.5 60l2 2 4-4'/%3E%3Cpath d='M56 64h10'/%3E%3Cpath d='M61 59v10'/%3E%3Cpath d='M14 36h6'/%3E%3C/g%3E%3C/svg%3E")`;

export const EmployerMessagesView: React.FC = () => {
  const { currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "staff";

  // State
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [adminList, setAdminList] = useState<UserProfile[]>([]);
  const [employerList, setEmployerList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Active subcollection messages state and pagination
  const [activeMessages, setActiveMessages] = useState<ChatMessage[]>([]);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);

  // Load list of Administrators and Employers
  useEffect(() => {
    async function loadProfiles() {
      try {
        const [allProfiles, empProfiles] = await Promise.all([
          getAllUserProfiles(),
          getEmployerProfiles()
        ]);

        let admins = allProfiles.filter(p => p.role === "admin");
        if (admins.length === 0) {
          const staff = await getStaffProfiles();
          admins = staff.filter(p => p.role === "admin");
        }
        if (admins.length === 0) {
          admins = [
            {
              uid: "admin-genesis",
              email: "genesisjosephoghene+admin@gmail.com",
              displayName: "System Administrator",
              role: "admin",
              canPostJobs: true,
              messagingPreference: "in-app",
              createdAt: Date.now()
            },
            {
              uid: "admin-support-lead",
              email: "support@valleyreigns.com",
              displayName: "Valley Reigns Admin Desk",
              role: "admin",
              canPostJobs: true,
              messagingPreference: "in-app",
              createdAt: Date.now()
            }
          ];
        }
        setAdminList(admins);

        // Deduplicate employers
        const empMap = new Map<string, UserProfile>();
        empProfiles.forEach(p => empMap.set(p.uid, p));
        allProfiles.filter(p => p.role === "employer").forEach(p => empMap.set(p.uid, p));
        setEmployerList(Array.from(empMap.values()));
      } catch (err) {
        console.warn("Failed to load profiles in EmployerMessagesView:", err);
      }
    }
    loadProfiles();
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

  // Handle URL query parameters (e.g. ?employerUid=... or ?chatId=...)
  useEffect(() => {
    const queryChatId = searchParams.get("chatId");
    const queryEmpUid = searchParams.get("employerUid");

    if (queryChatId) {
      setActiveChatId(queryChatId);
    } else if (queryEmpUid && currentUser) {
      if (isAdmin) {
        const existing = (Object.values(conversations) as Conversation[]).find(c =>
          (c.isEmployer || c.chatId.startsWith("employer_")) &&
          (c.seekerUid === queryEmpUid || c.employerUid === queryEmpUid || c.chatId.includes(queryEmpUid))
        );
        if (existing) {
          setActiveChatId(existing.chatId);
        } else {
          const newChatId = `employer_${queryEmpUid}_admin_${currentUser.uid}`;
          setActiveChatId(newChatId);
        }
      }
    }
  }, [searchParams, conversations, currentUser, isAdmin]);

  // File/Photo attachment upload
  const handleEmployerFileAttachment = async (e: React.ChangeEvent<HTMLInputElement>, forcedType?: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file || !activeChatId) return;

    try {
      setIsUploadingAttachment(true);
      setSendError(null);
      const res = await uploadToImageKit(file, "/employer_files_and_briefs");
      const isImg = forcedType === "image" || res.fileType === "image";
      const fileNotice = isImg 
        ? `[Attached Photo]: ${res.url}`
        : `[Attached Brief / Document]: ${res.name || file.name}\n${res.url}`;

      await handleSendDirectMessage(fileNotice, {
        attachmentUrl: res.url,
        fileType: isImg ? "image" : "file"
      });
    } catch (err: any) {
      console.error("[Employer File Upload Error]", err);
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
      markConversationMessagesAsRead(activeChatId, currentUser?.uid, isAdmin ? "staff" : "customer");
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [activeChatId, currentUser?.uid, isAdmin]);

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
      console.warn("[EmployerMessagesView] Failed to load older messages:", err);
    } finally {
      setIsLoadingOlder(false);
    }
  };

  // Manual refresh / fetch new messages trigger
  const handleRefreshMessages = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      // 1. Fetch updated conversations list from Firestore / local storage
      const freshConvs = await refreshConversationsFromFirestore();
      if (freshConvs && Object.keys(freshConvs).length > 0) {
        setConversations(freshConvs);
      }
      
      // 2. If an active conversation is open, fetch latest subcollection messages
      if (activeChatId) {
        const latestMsgs = await fetchLatestConversationMessages(activeChatId, 50);
        if (latestMsgs && latestMsgs.length > 0) {
          setActiveMessages(prev => {
            const pendingOptimistic = prev.filter(
              m => m.deliveryStatus === "sending" && !latestMsgs.some(sm => sm.id === m.id)
            );
            const combined = [...latestMsgs, ...pendingOptimistic];
            return combined.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          });
        }
        await markConversationMessagesAsRead(activeChatId, currentUser?.uid, isAdmin ? "staff" : "customer");
      }
    } catch (err) {
      console.warn("[EmployerMessagesView] Refresh error:", err);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 400);
    }
  };

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

  // Filter conversations list
  const employerIdentifier = currentUser?.companyName || currentUser?.displayName || currentUser?.email || "Corporate Employer";
  const myConversations = useMemo(() => {
    const list = Object.values(conversations) as Conversation[];
    if (isAdmin) {
      // For Admin: show all employer conversations
      return list.filter(c => {
        if (!c) return false;
        return Boolean(
          c.isEmployer ||
          c.userRole === "employer" ||
          c.seekerRole === "employer" ||
          c.companyName ||
          (c.chatId && c.chatId.startsWith("employer_"))
        );
      }).sort((a, b) => getLatestMessageTime(b) - getLatestMessageTime(a));
    } else {
      // For Employer: show conversations belonging to this employer
      return list.filter(c => {
        if (!c) return false;
        const isEmp = Boolean(
          c.isEmployer ||
          c.userRole === "employer" ||
          c.seekerRole === "employer" ||
          c.companyName ||
          (c.chatId && c.chatId.startsWith("employer_"))
        );
        if (!isEmp) return false;
        if (currentUser?.uid && (c.seekerUid === currentUser.uid || c.employerUid === currentUser.uid || c.assignedTo === currentUser.uid || c.chatId.includes(currentUser.uid))) return true;
        if (currentUser?.email && (c.customerPhone === currentUser.email || c.seekerUid === currentUser.email)) return true;
        if (currentUser?.displayName && c.customerPhone === currentUser.displayName) return true;
        if (c.customerPhone === employerIdentifier || c.companyName === currentUser?.companyName) return true;
        if (currentUser?.uid && c.messages && Array.isArray(c.messages)) {
          return c.messages.some(m => (m.sender === "customer" || m.sender === "guest") && m.senderUid === currentUser.uid);
        }
        return false;
      }).sort((a, b) => getLatestMessageTime(b) - getLatestMessageTime(a));
    }
  }, [conversations, isAdmin, currentUser, employerIdentifier]);

  // Find or construct active conversation
  const activeConversation = useMemo(() => {
    if (!activeChatId) return null;
    if (conversations[activeChatId]) {
      return conversations[activeChatId];
    }
    // Synthesize fallback conversation
    if (activeChatId.startsWith("employer_") && activeChatId.includes("_admin_")) {
      const parts = activeChatId.split("_admin_");
      const empUid = parts[0].replace("employer_", "");
      const admUid = parts[1];
      const matchedEmp = employerList.find(e => e.uid === empUid);
      const matchedAdm = adminList.find(a => a.uid === admUid);

      const compName = matchedEmp?.companyName || matchedEmp?.displayName || "Corporate Employer";
      return {
        chatId: activeChatId,
        customerPhone: compName,
        companyName: compName,
        companyIndustry: matchedEmp?.companyIndustry || "Corporate Partner",
        seekerUid: empUid,
        employerUid: empUid,
        userRole: "employer",
        seekerRole: "employer",
        isEmployer: true,
        jobTitle: `Admin Support (${matchedAdm?.displayName || "Admin"})`,
        jobId: "admin-support",
        adminUid: admUid,
        adminName: matchedAdm?.displayName || "Administrator",
        assignedStaffUid: admUid,
        assignedStaffName: matchedAdm?.displayName || "Administrator",
        assignedTo: admUid,
        assignedToName: matchedAdm?.displayName || "Administrator",
        status: "ongoing",
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        text: "Direct channel",
        messages: []
      } as Conversation;
    }

    return {
      chatId: activeChatId,
      customerPhone: employerIdentifier,
      companyName: employerIdentifier,
      seekerUid: currentUser?.uid || "employer-demo",
      employerUid: currentUser?.uid || "employer-demo",
      userRole: "employer",
      isEmployer: true,
      jobTitle: "Direct Admin Desk",
      text: "Direct channel to administration",
      status: "ongoing",
      createdAt: Date.now(),
      messages: []
    } as Conversation;
  }, [activeChatId, conversations, employerList, adminList, employerIdentifier, currentUser]);

  // Resolved other party info for active chat
  const targetAdmin = useMemo(() => {
    if (!activeChatId) return null;
    if (activeConversation?.adminUid) {
      const found = adminList.find(a => a.uid === activeConversation.adminUid);
      if (found) return found;
    }
    const match = activeChatId.match(/_admin_([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const found = adminList.find(a => a.uid === match[1]);
      if (found) return found;
    }
    return adminList[0] || {
      uid: "admin-support",
      displayName: activeConversation?.adminName || "System Administrator",
      email: "admin@valleyreigns.com",
      role: "admin"
    };
  }, [activeChatId, activeConversation, adminList]);

  const targetEmployer = useMemo(() => {
    if (!activeChatId) return null;
    const empUid = activeConversation?.employerUid || activeConversation?.seekerUid;
    if (empUid) {
      const found = employerList.find(e => e.uid === empUid);
      if (found) return found;
    }
    if (activeChatId.startsWith("employer_")) {
      const match = activeChatId.match(/employer_([a-zA-Z0-9_-]+)_admin_/);
      if (match && match[1]) {
        const found = employerList.find(e => e.uid === match[1]);
        if (found) return found;
      }
    }
    return null;
  }, [activeChatId, activeConversation, employerList]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: !!activeChatId } }));
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, [activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages, activeConversation?.messages]);

  // Start or open chat with an Admin (for Employer)
  const handleOpenAdminChat = (admin: UserProfile) => {
    if (!currentUser) return;
    
    const existing = myConversations.find(c => 
      c.adminUid === admin.uid || 
      c.assignedStaffUid === admin.uid || 
      c.assignedTo === admin.uid ||
      c.chatId.includes(admin.uid)
    );

    if (existing) {
      setActiveChatId(existing.chatId);
    } else {
      const generatedChatId = `employer_${currentUser.uid}_admin_${admin.uid}`;
      const businessName = currentUser.companyName || currentUser.displayName || "Employer Business";
      const newConv: Conversation = {
        chatId: generatedChatId,
        seekerUid: currentUser.uid,
        employerUid: currentUser.uid,
        userRole: "employer",
        seekerRole: "employer",
        isEmployer: true,
        companyName: businessName,
        companyIndustry: currentUser.companyIndustry || "Corporate Client",
        name: businessName,
        customerPhone: businessName,
        jobTitle: `Admin Support (${admin.displayName || "Admin"})`,
        jobId: "admin-support",
        adminUid: admin.uid,
        adminName: admin.displayName || "Administrator",
        assignedStaffUid: admin.uid,
        assignedStaffName: admin.displayName || "Administrator",
        assignedTo: admin.uid,
        assignedToName: admin.displayName || "Administrator",
        sharedWith: [admin.uid],
        status: "ongoing",
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        text: `Conversation with ${admin.displayName || "Administrator"}`,
        messages: []
      };

      setConversations(prev => ({
        ...prev,
        [generatedChatId]: newConv
      }));
      setActiveChatId(generatedChatId);
    }
  };

  // Start or open chat with an Employer (for Admin)
  const handleOpenEmployerChat = (emp: UserProfile) => {
    if (!currentUser) return;

    const existing = myConversations.find(c =>
      c.employerUid === emp.uid ||
      c.seekerUid === emp.uid ||
      c.chatId.includes(emp.uid)
    );

    if (existing) {
      setActiveChatId(existing.chatId);
    } else {
      const generatedChatId = `employer_${emp.uid}_admin_${currentUser.uid}`;
      const compName = emp.companyName || emp.displayName || "Corporate Employer";
      const newConv: Conversation = {
        chatId: generatedChatId,
        seekerUid: emp.uid,
        employerUid: emp.uid,
        userRole: "employer",
        seekerRole: "employer",
        isEmployer: true,
        companyName: compName,
        companyIndustry: emp.companyIndustry || "Corporate Partner",
        name: compName,
        customerPhone: compName,
        jobTitle: `Admin Support (${currentUser.displayName || "Admin"})`,
        jobId: "admin-support",
        adminUid: currentUser.uid,
        adminName: currentUser.displayName || "Administrator",
        assignedStaffUid: currentUser.uid,
        assignedStaffName: currentUser.displayName || "Administrator",
        assignedTo: currentUser.uid,
        assignedToName: currentUser.displayName || "Administrator",
        sharedWith: [currentUser.uid],
        status: "ongoing",
        createdAt: Date.now(),
        lastMessageAt: Date.now(),
        text: `Channel with ${compName}`,
        messages: []
      };

      setConversations(prev => ({
        ...prev,
        [generatedChatId]: newConv
      }));
      setActiveChatId(generatedChatId);
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
    const senderRole = isAdmin ? "staff" : "customer";
    const senderName = isAdmin 
      ? (currentUser.displayName || "Administrator")
      : (currentUser.companyName || currentUser.displayName || "Employer");

    const optimisticMessage: ChatMessage = {
      id: tempId,
      chatId: activeChatId,
      sender: senderRole,
      text: textToSend,
      timestamp: now,
      senderUid: currentUser.uid,
      senderName,
      senderRole: isAdmin ? "admin" : "employer",
      attachmentUrl: options?.attachmentUrl,
      fileType: options?.fileType,
      deliveryStatus: "sending"
    };

    // 1. Optimistically append
    setActiveMessages(prev => [...prev, optimisticMessage]);

    try {
      const sentMsg = await sendChatMessage(activeChatId, senderRole, textToSend, {
        messageId: tempId,
        senderUid: currentUser.uid,
        senderName,
        senderRole: isAdmin ? "admin" : "employer",
        companyName: activeConversation?.companyName || targetEmployer?.companyName || (isAdmin ? undefined : currentUser.companyName),
        companyIndustry: activeConversation?.companyIndustry || targetEmployer?.companyIndustry || (isAdmin ? undefined : currentUser.companyIndustry),
        isEmployer: true,
        userRole: "employer",
        adminUid: isAdmin ? currentUser.uid : (targetAdmin?.uid || activeConversation?.adminUid),
        adminName: isAdmin ? (currentUser.displayName || "Administrator") : (targetAdmin?.displayName || activeConversation?.adminName),
        attachmentUrl: options?.attachmentUrl,
        fileType: options?.fileType
      });

      // 2. Immediately transition optimistic message to "sent"
      setActiveMessages(prev =>
        prev.map(m => (m.id === tempId ? { ...m, ...sentMsg, deliveryStatus: "sent" } : m))
      );
      setConversations(prev => {
        const conv = prev[activeChatId] || activeConversation;
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
            messages: updated,
            lastMessageAt: now,
            text: textToSend
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

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || isSending) return;
    const text = messageInput.trim();
    setMessageInput("");
    handleSendDirectMessage(text);
  };

  const formatMessageTime = (timestamp?: number) => {
    if (!timestamp) return "";
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const filteredAdmins = adminList.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (a.displayName || "").toLowerCase().includes(q) || (a.email || "").toLowerCase().includes(q);
  });

  const filteredEmployers = employerList.filter(e => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.companyName || "").toLowerCase().includes(q) ||
      (e.displayName || "").toLowerCase().includes(q) ||
      (e.companyIndustry || "").toLowerCase().includes(q) ||
      (e.email || "").toLowerCase().includes(q)
    );
  });

  const filteredConversations = myConversations.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.customerPhone || "").toLowerCase().includes(q) ||
      (c.companyName || "").toLowerCase().includes(q) ||
      (c.name || "").toLowerCase().includes(q) ||
      (c.text || "").toLowerCase().includes(q) ||
      (c.jobTitle || "").toLowerCase().includes(q)
    );
  });

  // Merge active subcollection messages and parent doc messages
  const displayedMessages = useMemo(() => {
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

  // Chat Header Display Details
  const chatHeaderTitle = useMemo(() => {
    if (isAdmin) {
      return (
        activeConversation?.companyName ||
        targetEmployer?.companyName ||
        activeConversation?.name ||
        targetEmployer?.displayName ||
        "Corporate Employer"
      );
    } else {
      return targetAdmin?.displayName || activeConversation?.adminName || "System Administrator";
    }
  }, [isAdmin, activeConversation, targetEmployer, targetAdmin]);

  const chatHeaderSubtitle = useMemo(() => {
    if (isAdmin) {
      const industry = activeConversation?.companyIndustry || targetEmployer?.companyIndustry || "Corporate Partner";
      return `${industry} • Online`;
    } else {
      return "Online • Administrator Portal";
    }
  }, [isAdmin, activeConversation, targetEmployer]);

  const chatHeaderInitials = useMemo(() => {
    if (chatHeaderTitle) {
      return chatHeaderTitle.substring(0, 2).toUpperCase();
    }
    return isAdmin ? "EM" : "VR";
  }, [chatHeaderTitle, isAdmin]);

  return (
    <div className="w-full flex-1 h-full min-h-0 flex flex-col p-0 m-0 overflow-hidden">
      {/* Hidden File Attachment Inputs */}
      <input
        type="file"
        ref={attachmentInputRef}
        onChange={(e) => handleEmployerFileAttachment(e, "file")}
        className="hidden"
        accept=".pdf,.doc,.docx,.txt,.xls,.xlsx"
      />
      <input
        type="file"
        ref={photoInputRef}
        onChange={(e) => handleEmployerFileAttachment(e, "image")}
        className="hidden"
        accept="image/*"
      />

      <div className="w-full flex-1 h-full min-h-0 flex bg-[#F0F2F5] md:bg-white overflow-hidden font-sans">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: DIRECTORY & CONVERSATIONS FEED               */}
        {/* ======================================================== */}
        <div className={`w-full md:w-[360px] lg:w-[400px] bg-white border-r border-slate-100 flex flex-col shrink-0 h-full min-h-0 pt-4 sm:pt-5 md:pt-6 ${activeChatId ? "hidden md:flex" : "flex"}`}>
          
          {/* Top Search & Filter Bar */}
          <div className="px-3.5 pt-1 pb-3 bg-white border-b border-slate-100/90 shrink-0 flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isAdmin ? "Search employers or conversations..." : "Search administrators or inquiries..."}
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
            <button
              type="button"
              id="refresh-employer-conversations-btn"
              onClick={handleRefreshMessages}
              disabled={isRefreshing}
              title="Refresh messages and channels"
              aria-label="Refresh messages"
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200/80 rounded-full transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>

          {/* List of Available Contacts & Existing Conversations */}
          <div className="flex-1 min-h-0 overflow-y-auto divide-y divide-slate-100 bg-white pb-12 md:pb-10">
            {/* Section 1: Contacts Available to Message */}
            <div className="p-3 bg-slate-50/70 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1 mb-2 font-mono">
                {isAdmin ? (
                  <>
                    <Building2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Registered Employers</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Admins You Can Message</span>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {isAdmin ? (
                  filteredEmployers.length === 0 ? (
                    <p className="text-xs text-slate-400 px-2 py-1">No registered employers found</p>
                  ) : (
                    filteredEmployers.map((emp) => {
                      const isSelected = activeChatId && (
                        activeConversation?.employerUid === emp.uid ||
                        activeConversation?.seekerUid === emp.uid ||
                        activeChatId.includes(emp.uid)
                      );

                      return (
                        <div
                          key={emp.uid}
                          onClick={() => handleOpenEmployerChat(emp)}
                          className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-blue-50/90 border-blue-200 shadow-xs" 
                              : "bg-white hover:bg-blue-50/40 border-slate-100 hover:border-blue-100 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs shrink-0">
                              <Building2 className="w-4 h-4 text-blue-200" />
                            </div>

                            <div className="min-w-0 text-left">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {emp.companyName || emp.displayName || "Corporate Employer"}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {emp.displayName} • {emp.companyIndustry || "Corporate Partner"}
                              </p>
                              {emp.isVerifiedEmployer && (
                                <span className="inline-block text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded mt-0.5 border border-emerald-100">
                                  CAC Verified
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0">
                            <button
                              type="button"
                              className="px-2.5 py-1.5 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Chat</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                ) : (
                  filteredAdmins.length === 0 ? (
                    <p className="text-xs text-slate-400 px-2 py-1">No matching administrators found</p>
                  ) : (
                    filteredAdmins.map((admin) => {
                      const existingChat = myConversations.find(c => 
                        c.adminUid === admin.uid || c.chatId.includes(admin.uid)
                      );
                      const isSelected = activeChatId && (
                        activeChatId === existingChat?.chatId || 
                        activeChatId === `employer_${currentUser?.uid}_admin_${admin.uid}`
                      );

                      return (
                        <div
                          key={admin.uid}
                          onClick={() => handleOpenAdminChat(admin)}
                          className={`w-full p-3 rounded-2xl flex items-center justify-between gap-3 border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-blue-50/90 border-blue-200 shadow-xs" 
                              : "bg-white hover:bg-blue-50/40 border-slate-100 hover:border-blue-100 shadow-2xs"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              {admin.photoURL ? (
                                <img 
                                  src={admin.photoURL} 
                                  alt={admin.displayName || "Admin"} 
                                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-xs font-mono shadow-xs">
                                  {admin.displayName ? admin.displayName.substring(0, 2).toUpperCase() : "AD"}
                                </div>
                              )}
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
                            </div>

                            <div className="min-w-0 text-left">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {admin.displayName || "System Administrator"}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-mono truncate">
                                {admin.email}
                              </p>
                              <span className="inline-block text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded mt-0.5">
                                Admin Support
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0">
                            <button
                              type="button"
                              className="px-2.5 py-1.5 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all active:scale-95 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Chat</span>
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )
                )}
              </div>
            </div>

            {/* Section 2: Channels Feed */}
            <div className="p-3 bg-white">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase tracking-wider px-1 mb-2 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isAdmin ? "All Employer Channels" : "Recent Channels"}</span>
              </div>

              {loading ? (
                <div className="divide-y divide-slate-100">
                  {[1, 2].map(n => <ThreadCardSkeleton key={n} />)}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs font-medium">
                  {isAdmin ? "No employer conversations yet" : "Select an admin above to start a direct message"}
                </div>
              ) : (
                filteredConversations.map((conv) => {
                  const isSelected = activeChatId === conv.chatId;
                  const lastTime = conv.lastMessageAt || conv.createdAt || 0;
                  const latestMsgSnippet = conv.text || "Tap to open messages";
                  const title = isAdmin
                    ? (conv.companyName || conv.name || conv.customerPhone || "Employer")
                    : (conv.adminName || conv.jobTitle || "Admin Support");

                  return (
                    <div
                      key={conv.chatId}
                      onClick={() => setActiveChatId(conv.chatId)}
                      className={`w-full p-3 mb-1.5 rounded-2xl flex items-start gap-3 transition-colors cursor-pointer ${
                        isSelected ? "bg-blue-50/70 border border-blue-100" : "hover:bg-slate-50 bg-white border border-slate-100/60"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 mt-0.5">
                        {isAdmin ? <Building2 className="w-4 h-4 text-blue-200" /> : "VR"}
                      </div>

                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {title}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-mono shrink-0">
                            {formatMessageTime(lastTime)}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-1 truncate font-sans">
                          {latestMsgSnippet}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT PANEL: CHAT ACTIVE CONVERSATION PANE               */}
        {/* ======================================================== */}
        <div className={`flex-1 flex flex-col h-full min-h-0 bg-[#EFEAE2] relative overflow-hidden ${activeChatId ? "flex" : "hidden md:flex"}`}>
          {activeChatId && activeConversation ? (
            <motion.div
              key={activeChatId}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex-1 flex flex-col h-full min-h-0 min-w-0"
            >
              {/* Refined Chat Header Bar */}
              <div className="px-3.5 sm:px-4 py-2.5 bg-white/95 backdrop-blur-md border-0 flex items-center justify-between gap-3 shrink-0 z-10 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setActiveChatId(null)}
                    className="p-2 -ml-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 active:scale-95 rounded-full md:hidden cursor-pointer transition-all flex items-center justify-center shrink-0"
                    title="Back to Directory"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar Profile */}
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-[0_2px_8px_rgba(11,27,61,0.14)]">
                      {chatHeaderInitials}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
                  </div>

                  <div className="min-w-0 text-left">
                    <h3 className="text-[13px] sm:text-[14px] font-bold text-slate-900 truncate leading-tight tracking-tight">
                      {chatHeaderTitle}
                    </h3>
                    <p className="text-[11px] text-emerald-600 font-medium truncate mt-0.5 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                      <span>{chatHeaderSubtitle}</span>
                    </p>
                  </div>
                </div>

                {/* Right Top Header Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    id="refresh-employer-active-chat-btn"
                    onClick={handleRefreshMessages}
                    disabled={isRefreshing}
                    title="Refresh conversation & fetch new messages"
                    aria-label="Refresh conversation messages"
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:scale-95 rounded-full transition-all cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
                  </button>

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
                            className="absolute right-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 overflow-hidden text-xs"
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                setShowClearConfirm(true);
                              }}
                              className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Clear Chat History</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setHeaderMenuOpen(false);
                                setShowReportDialog(true);
                              }}
                              className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                            >
                              <Flag className="w-4 h-4 text-amber-500" />
                              <span>Report Inquiry Issue</span>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Message Feed Canvas */}
              <div 
                className="flex-1 min-h-0 overflow-y-auto px-3 sm:px-4 py-3 space-y-2 relative"
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

                {/* Date Separator */}
                <div className="flex justify-center my-2 sticky top-2 z-10">
                  <span className="px-3 py-1 bg-white/90 backdrop-blur-xs text-slate-600 text-[11px] font-semibold rounded-full shadow-2xs border border-black/5">
                    Live Channel
                  </span>
                </div>

                {/* Message Bubbles */}
                {displayedMessages.map((msg, idx) => {
                  const isSelf = Boolean(
                    (msg.senderUid && currentUser && msg.senderUid === currentUser.uid) ||
                    (!isAdmin && (msg.sender === "customer" || msg.sender === "guest")) ||
                    (isAdmin && msg.sender === "staff")
                  );
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

                  const otherPartyName = isAdmin
                    ? (msg.senderName || activeConversation?.companyName || targetEmployer?.companyName || "Employer")
                    : (msg.senderName || targetAdmin?.displayName || "Valley Reigns Admin");

                  return (
                    <div
                      key={msg.id || idx}
                      className={`flex w-full ${isSelf ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`relative max-w-[85%] sm:max-w-[70%] md:max-w-[65%] px-3.5 py-2 ${
                          isSelf
                            ? "bg-[#DCF8C6] text-slate-900 rounded-2xl rounded-tr-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                            : "bg-white text-slate-900 rounded-2xl rounded-tl-xs shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        }`}
                      >
                        {!isSelf && (
                          <p className="text-[11px] font-bold text-blue-600 mb-0.5">
                            {otherPartyName}
                          </p>
                        )}

                        <div className="text-[13.5px] leading-relaxed">
                          <ChatMessageContent msg={msg} isSelf={isSelf} />
                        </div>

                        <div className="flex items-center justify-end gap-1.5 mt-1 -mb-0.5 select-none">
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatMessageTime(msg.timestamp)}
                          </span>
                          {isSelf && (
                            <>
                              {msg.deliveryStatus === "sending" && (
                                <Clock className="w-3.5 h-3.5 text-slate-400 animate-pulse" title="Sending..." />
                              )}
                              {msg.deliveryStatus === "failed" && (
                                <button
                                  type="button"
                                  onClick={() => handleSendDirectMessage(msg.text, { attachmentUrl: msg.attachmentUrl, fileType: msg.fileType })}
                                  className="inline-flex items-center gap-0.5 text-rose-600 hover:text-rose-700 text-[10px] font-bold cursor-pointer"
                                  title="Failed. Click to retry"
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span>Retry</span>
                                </button>
                              )}
                              {(msg.deliveryStatus === "sent" || (!msg.deliveryStatus && !msg.read)) && !msg.read && (
                                <Check className="w-3.5 h-3.5 text-slate-400" title="Delivered" />
                              )}
                              {(msg.read || msg.deliveryStatus === "delivered") && (
                                <CheckCheck className="w-3.5 h-3.5 text-[#34B7F1]" title="Read" />
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

              {/* Bottom Input Bar */}
              <div className="p-3 bg-transparent border-0 shadow-none shrink-0 mt-auto">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <div className="flex-1 flex items-center bg-white rounded-full px-3 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-slate-200/80">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                      title="Emoji"
                    >
                      <Smile className="w-5 h-5" />
                    </button>

                    <input
                      ref={inputRef}
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder={isAdmin ? "Type a reply to employer..." : "Type a message to administration..."}
                      className="flex-1 bg-transparent px-2 py-1 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                    />

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => attachmentInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                        title="Attach Document / Brief"
                      >
                        {isUploadingAttachment ? (
                          <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                          <Paperclip className="w-5 h-5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        disabled={isUploadingAttachment}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer"
                        title="Attach Photo"
                      >
                        <Camera className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || isSending}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                      messageInput.trim() && !isSending
                        ? "bg-[#0084FF] text-white shadow-md hover:bg-[#0070DA] active:scale-95"
                        : "bg-slate-200 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    {isSending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </form>

                {/* Emoji Picker Menu */}
                <AnimatePresence>
                  {showEmojiPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 grid grid-cols-8 gap-1 max-w-sm"
                    >
                      {["👋", "👍", "💼", "🏢", "✅", "🤝", "📋", "❓", "📅", "🚀", "💡", "📞", "🙏", "⭐", "🎉", "🔥"].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            setMessageInput(prev => prev + emoji);
                            setShowEmojiPicker(false);
                            inputRef.current?.focus();
                          }}
                          className="w-8 h-8 flex items-center justify-center text-lg hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mb-4 shadow-xs">
                <Building2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Employer Administration Portal
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mb-4 leading-relaxed">
                {isAdmin
                  ? "Select a registered corporate employer on the left to review messages, discuss job requirements, and manage inquiries in real-time."
                  : "Connect directly with Valley Reigns administrators to request staffing solutions, discuss talent pipelines, or manage corporate requisitions."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Clear Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Clear Message History?</h3>
              <p className="text-xs text-slate-500">
                This will clear messages in this chat session on your screen.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (activeChatId) {
                      await clearConversationMessages(activeChatId);
                      setActiveMessages([]);
                    }
                    setShowClearConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Report Conversation Modal */}
      <AnimatePresence>
        {showReportDialog && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Flag className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Report Inconvenience</h3>
                </div>
                <button onClick={() => setShowReportDialog(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700">Reason for report</label>
                <textarea
                  rows={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Describe your inquiry issue..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReportDialog(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (activeChatId && reportReason.trim()) {
                      await reportConversation(activeChatId, reportReason.trim());
                    }
                    setShowReportDialog(false);
                    setReportReason("");
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl cursor-pointer"
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
