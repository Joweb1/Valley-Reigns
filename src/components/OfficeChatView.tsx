import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  Search, 
  Plus, 
  Send, 
  Paperclip, 
  Users, 
  Check, 
  CheckCheck, 
  Clock, 
  X, 
  ShieldCheck, 
  User, 
  MessageSquare,
  Sparkles,
  Phone,
  Building,
  Briefcase
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { UserProfile, StaffDirectMessage } from "../types";
import { 
  getAllUserProfiles, 
  sendStaffDirectMessage, 
  subscribeToStaffDirectMessages,
  getDirectChatId,
  db 
} from "../lib/services";
import { collection, query, where, onSnapshot, doc, setDoc } from "firebase/firestore";

interface DirectChatSummary {
  chatId: string; // recipient uid
  colleague: UserProfile;
  lastMessage?: string;
  lastTimestamp?: number;
  unreadCount?: number;
}

export const OfficeChatView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuth();
  const [colleagues, setColleagues] = useState<UserProfile[]>([]);
  const [selectedColleague, setSelectedColleague] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<StaffDirectMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showTeammateModal, setShowTeammateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [modalSearchQuery, setModalSearchQuery] = useState("");
  const [directSummaries, setDirectSummaries] = useState<Record<string, { lastText: string; lastTime: number }>>({});
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReturn = () => {
    if (selectedColleague && window.innerWidth < 768) {
      setSelectedColleague(null);
      return;
    }
    const returnTarget = 
      location.pathname.startsWith("/admin") || currentUser?.role === "admin"
        ? "/admin/dashboard"
        : location.pathname.startsWith("/employer") || currentUser?.role === "employer"
        ? "/employer/dashboard"
        : "/staff";

    navigate(returnTarget);
  };

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load all staff and admin colleagues
  useEffect(() => {
    let isMounted = true;
    getAllUserProfiles().then(profiles => {
      if (!isMounted) return;
      const staffAndAdmins = profiles.filter(
        p => (p.role === "staff" || p.role === "admin") && p.uid !== currentUser?.uid
      );
      setColleagues(staffAndAdmins);

      // Auto-select first colleague on desktop if none selected
      if (staffAndAdmins.length > 0 && !selectedColleague && window.innerWidth >= 768) {
        setSelectedColleague(staffAndAdmins[0]);
      }
    }).catch(err => console.warn("Failed to load staff colleagues:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser?.uid]);

  // Real-time subscription to active 1-on-1 direct chat
  useEffect(() => {
    if (!currentUser?.uid || !selectedColleague?.uid) {
      setMessages([]);
      return;
    }

    const directId = [currentUser.uid, selectedColleague.uid].sort().join("_");
    const unsubscribe = subscribeToStaffDirectMessages(directId, (incoming) => {
      setMessages(incoming);
      if (incoming.length > 0) {
        const last = incoming[incoming.length - 1];
        setDirectSummaries(prev => ({
          ...prev,
          [selectedColleague.uid]: {
            lastText: last.text,
            lastTime: last.timestamp
          }
        }));
      }
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [currentUser?.uid, selectedColleague?.uid]);

  // Handle sending a 1-on-1 message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser || !selectedColleague || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: StaffDirectMessage = {
      id: tempId,
      directChatId: getDirectChatId(currentUser.uid, selectedColleague.uid),
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || "Me",
      senderRole: (currentUser.role as any) || "staff",
      recipientUid: selectedColleague.uid,
      text: textToSend,
      timestamp: Date.now(),
      deliveryStatus: "sending"
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await sendStaffDirectMessage(selectedColleague.uid, textToSend, {
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Staff Member",
        senderRole: (currentUser.role as any) || "staff"
      });
    } catch (error) {
      console.error("Failed to send 1-on-1 message:", error);
    } finally {
      setIsSending(false);
    }
  };

  // Filter colleagues in left sidebar
  const filteredColleagues = colleagues.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.displayName && c.displayName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q))
    );
  });

  // Filter colleagues in modal bottom sheet
  const modalFilteredColleagues = colleagues.filter(c => {
    if (!modalSearchQuery.trim()) return true;
    const q = modalSearchQuery.toLowerCase();
    return (
      (c.displayName && c.displayName.toLowerCase().includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.role && c.role.toLowerCase().includes(q))
    );
  });

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return "VR";
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-80px)] flex flex-col bg-[#F8FAFC] font-sans relative select-text overflow-hidden">
      {/* Main Split-Pane Workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        
        {/* ========================================== */}
        {/* LEFT PANEL: COLLEAGUES DIRECT CHAT THREADS */}
        {/* ========================================== */}
        <div className={`w-full md:w-[360px] lg:w-[400px] bg-white border-r border-slate-200/80 flex flex-col shrink-0 h-full min-h-0 ${selectedColleague ? "hidden md:flex" : "flex"}`}>
          
          {/* Search Box & Return Navigation */}
          <div className="p-3 border-b border-slate-100 bg-white shrink-0 flex items-center gap-2">
            <button
              type="button"
              id="office-chat-return-btn"
              onClick={handleReturn}
              className="p-2 -ml-0.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center justify-center shrink-0"
              title="Return to Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="relative flex-1 flex items-center">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff & admins..."
                className="w-full pl-9 pr-4 py-2 bg-slate-100/80 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* List of Teammates */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 pb-24">
            {filteredColleagues.length === 0 ? (
              <div className="p-8 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">No Teammates Found</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Search above or select any colleague from your team directory to start a direct message.
                </p>
              </div>
            ) : (
              filteredColleagues.map(colleague => {
                const isSelected = selectedColleague?.uid === colleague.uid;
                const summary = directSummaries[colleague.uid];
                return (
                  <div
                    key={colleague.uid}
                    onClick={() => setSelectedColleague(colleague)}
                    className={`p-3.5 flex items-center gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/70 border-l-4 border-blue-600"
                        : "hover:bg-slate-50 border-l-4 border-transparent"
                    }`}
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                        {getInitials(colleague.displayName, colleague.email)}
                      </div>
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {colleague.displayName || colleague.email}
                        </span>
                        {summary?.lastTime && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(summary.lastTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                          colleague.role === "admin" 
                            ? "bg-purple-100 text-purple-700" 
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {colleague.role}
                        </span>
                        <p className="text-[11px] text-slate-500 truncate flex-1">
                          {summary?.lastText || colleague.email || "Tap to chat"}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* RIGHT PANEL: 1-ON-1 ACTIVE CHAT CANVAS     */}
        {/* ========================================== */}
        <div className={`flex-1 flex flex-col h-full min-h-0 min-w-0 bg-[#F0F4F8] relative ${!selectedColleague ? "hidden md:flex items-center justify-center bg-[#F8FAFC]" : "flex"}`}>
          {selectedColleague ? (
            <div className="flex-1 flex flex-col h-full min-h-0 min-w-0">
              
              {/* Active Coworker Header */}
              <div className="px-4 py-3 bg-white border-b border-slate-200/80 flex items-center justify-between gap-3 shrink-0 z-10 shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedColleague(null)}
                    className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors cursor-pointer flex items-center justify-center shrink-0"
                    title="Return to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {getInitials(selectedColleague.displayName, selectedColleague.email)}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
                  </div>

                  <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-extrabold text-slate-900 truncate">
                        {selectedColleague.displayName || selectedColleague.email}
                      </h2>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        selectedColleague.role === "admin" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {selectedColleague.role}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {selectedColleague.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Feed Canvas */}
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 pb-6">
                {messages.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center p-6">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">
                      Start 1-on-1 Conversation
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Send a message to {selectedColleague.displayName || selectedColleague.email} to collaborate directly on staffing and candidates.
                    </p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const isMe = msg.senderUid === currentUser?.uid;
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                            isMe
                              ? "bg-[#0B1B3D] text-white rounded-tr-xs"
                              : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? "text-blue-200/80" : "text-slate-400"}`}>
                            <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                            {isMe && (
                              msg.deliveryStatus === "sending" ? (
                                <Clock className="w-3 h-3 text-blue-300 animate-spin" />
                              ) : (
                                <CheckCheck className="w-3.5 h-3.5 text-blue-300" />
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer Bar */}
              <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${selectedColleague.displayName || "colleague"}...`}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs font-medium text-slate-900 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || isSending}
                    className="w-10 h-10 bg-[#0B1B3D] hover:bg-[#11244e] active:scale-95 text-white rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-xs"
                    title="Send message"
                  >
                    <Send className="w-4 h-4 ml-0.5" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center p-8 flex flex-col items-center justify-center">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-xs border border-slate-200 flex items-center justify-center text-blue-600 mb-4">
                <Users className="w-7 h-7" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                Select a Colleague
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mt-1 leading-relaxed">
                Choose a teammate from the list on the left to start messaging directly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* BOTTOM SHEET MODAL POPUP: TEAMMATE SELECTOR             */}
      {/* (Same sliding animation & rounded top curve as Settings) */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showTeammateModal && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTeammateModal(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-blue-200/50 shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[85vh] animate-none"
            >
              {/* Top Handle Bar */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

              {/* Modal Header */}
              <div className="px-6 pb-4 pt-1 flex items-center justify-between border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Users className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-base font-extrabold text-[#0B1B3D] leading-none">
                      New Office Chat
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium mt-1">
                      Select any staff or administrator to message 1-on-1
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTeammateModal(false)}
                  className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Search Bar */}
              <div className="px-6 py-3 border-b border-slate-100 shrink-0 bg-white">
                <div className="relative flex items-center">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={modalSearchQuery}
                    onChange={(e) => setModalSearchQuery(e.target.value)}
                    placeholder="Search name, email, or role..."
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-100/90 hover:bg-slate-100 focus:bg-white text-xs font-medium text-slate-800 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Teammates List */}
              <div className="px-6 py-3 space-y-1.5 overflow-y-auto max-h-[50vh]">
                {modalFilteredColleagues.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400">
                    No colleagues matched your search query.
                  </div>
                ) : (
                  modalFilteredColleagues.map(colleague => (
                    <button
                      key={colleague.uid}
                      type="button"
                      onClick={() => {
                        setSelectedColleague(colleague);
                        setShowTeammateModal(false);
                      }}
                      className="w-full p-3 rounded-2xl hover:bg-blue-50/60 border border-slate-100 flex items-center justify-between text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-xs shadow-2xs group-hover:scale-105 transition-transform">
                            {getInitials(colleague.displayName, colleague.email)}
                          </div>
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {colleague.displayName || colleague.email}
                          </h4>
                          <p className="text-[11px] text-slate-500 truncate font-mono">
                            {colleague.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                          colleague.role === "admin" 
                            ? "bg-purple-100 text-purple-700 border border-purple-200/60" 
                            : "bg-blue-100 text-blue-700 border border-blue-200/60"
                        }`}>
                          {colleague.role}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 group-hover:bg-[#0B1B3D] group-hover:text-white flex items-center justify-center transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
