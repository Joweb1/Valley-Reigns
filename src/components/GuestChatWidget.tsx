import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useWhatsAppConfig } from "../hooks/useWhatsAppConfig";
import { 
  simulateIncomingChat, 
  sendChatMessage, 
  subscribeToConversations 
} from "../lib/services";
import { Conversation, ChatMessage } from "../types";
import { 
  MessageCircle, 
  X, 
  Send, 
  Sparkles, 
  User, 
  CheckCheck, 
  Clock, 
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface GuestSession {
  chatId: string;
  guestName: string;
  guestContact: string;
}

export const GuestChatWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const { getWhatsAppLink, formattedPhone, isConnected } = useWhatsAppConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [session, setSession] = useState<GuestSession | null>(null);

  // Form states for new guest message
  const [guestName, setGuestName] = useState("");
  const [guestContact, setGuestContact] = useState("");
  const [initialMsg, setInitialMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Chat conversation state
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load guest session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("vr_guest_chat_session");
      if (saved) {
        const parsed = JSON.parse(saved) as GuestSession;
        if (parsed && parsed.chatId) {
          setSession(parsed);
        }
      }
    } catch (e) {
      console.warn("Failed to parse guest chat session from localStorage", e);
    }
  }, []);

  // Listen to live updates for the active guest conversation
  useEffect(() => {
    if (!session?.chatId) return;

    const unsubscribe = subscribeToConversations((allConvs) => {
      const current = allConvs[session.chatId];
      if (current) {
        setConversation(current);
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [session?.chatId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, conversation?.messages]);

  // Start new guest conversation
  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialMsg.trim()) return;

    setIsSubmitting(true);
    try {
      const displayName = guestName.trim() || "Guest Visitor";
      const contactInfo = guestContact.trim() ? ` (${guestContact.trim()})` : "";
      const fullGuestIdentifier = `${displayName}${contactInfo}`;

      const createdChatId = await simulateIncomingChat(
        fullGuestIdentifier,
        initialMsg.trim(),
        "guest-direct-inquiry",
        "Direct Company Guest Enquiry"
      );

      const newSession: GuestSession = {
        chatId: createdChatId,
        guestName: displayName,
        guestContact: guestContact.trim()
      };

      localStorage.setItem("vr_guest_chat_session", JSON.stringify(newSession));
      setSession(newSession);
      setInitialMsg("");
    } catch (err) {
      console.error("Failed to start guest chat session:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Send reply message in active guest conversation
  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !session?.chatId) return;

    const textToSend = replyText.trim();
    setReplyText("");
    setIsSendingReply(true);

    try {
      await sendChatMessage(session.chatId, "guest", textToSend);
    } catch (err) {
      console.error("Failed to send guest message:", err);
      setReplyText(textToSend); // Restore if failed
    } finally {
      setIsSendingReply(false);
    }
  };

  // Reset chat session to start a fresh thread
  const handleNewSession = () => {
    localStorage.removeItem("vr_guest_chat_session");
    setSession(null);
    setConversation(null);
  };

  const messagesArray: ChatMessage[] = React.useMemo(() => {
    if (!conversation?.messages) return [];
    if (Array.isArray(conversation.messages)) {
      return conversation.messages;
    }
    return (Object.values(conversation.messages) as ChatMessage[]).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [conversation?.messages]);

  // Hide completely if logged in as a registered user (seeker, staff, or admin)
  if (currentUser) {
    return null;
  }

  return (
    <>
      {/* Floating Deep Navy Blue Circle Icon Button - Bottom Right */}
      <motion.button
        id="guest-floating-chat-btn"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#0B192C]/90 hover:bg-[#0B192C] backdrop-blur-md text-white shadow-2xl border border-slate-700/60 flex items-center justify-center cursor-pointer transition-colors group"
        title="Chat with Us (Guest Live Messaging)"
        aria-label="Open Guest Live Chat"
      >
        <div className="relative flex items-center justify-center">
          <MessageCircle className="w-7 h-7 text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
          {/* Active online pulse dot */}
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#0B192C] animate-pulse" />
        </div>
      </motion.button>

      {/* Side / Pop-up Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="guest-chat-modal"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-[390px] h-[520px] max-h-[80vh] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden font-sans"
          >
            {/* Modal Header: Deep Navy Blue Theme */}
            <div className="bg-[#0B192C] text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0B192C]" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-black tracking-wide text-white flex items-center gap-1.5">
                    Valley Reigns Live Support
                  </h3>
                  <p className="text-[10px] font-mono text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Staff Recruiter Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {session?.chatId && (
                  <button
                    onClick={handleNewSession}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border-0"
                    title="Start New Inquiry Thread"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer border-0"
                  title="Close Chat Window"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {!session?.chatId ? (
              /* State 1: New Guest Welcome & Form */
              <div className="flex-1 p-6 overflow-y-auto flex flex-col justify-between bg-slate-50/60">
                <div className="space-y-4 text-left">
                  <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#0B192C] flex items-center justify-center">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                    </div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Welcome Guest Visitor!
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Send a message directly to our company support team. Our recruiters will claim your ticket and respond in real-time.
                    </p>
                  </div>

                  <form onSubmit={handleStartChat} className="space-y-3.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Your Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Alex Johnson"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B192C] focus:border-[#0B192C] outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Phone or Email (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. +234 800 000 0000"
                        value={guestContact}
                        onChange={(e) => setGuestContact(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B192C] focus:border-[#0B192C] outline-none text-slate-800 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Your Message <span className="text-rose-500">*</span>
                      </label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Type your message or inquiry here..."
                        value={initialMsg}
                        onChange={(e) => setInitialMsg(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B192C] focus:border-[#0B192C] outline-none text-slate-800 font-medium resize-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !initialMsg.trim()}
                      className="w-full py-3 bg-[#0B192C] hover:bg-[#1E3A8A] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 border-0"
                    >
                      {isSubmitting ? (
                        <span>Connecting...</span>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Send Message to Recruiter</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                <div className="text-center pt-3 border-t border-slate-200/60 text-[10px] font-mono text-slate-400 space-y-2">
                  <div className="flex items-center justify-center">
                    <a
                      href={getWhatsAppLink("Hello! I am reaching out to Valley Reigns recruitment support.")}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#00A884] hover:bg-[#008f70] text-white font-sans font-bold text-[10px] rounded-xl shadow-xs transition-all decoration-none"
                    >
                      <span>Chat via WhatsApp</span>
                      {formattedPhone && <span className="opacity-90 font-mono">({formattedPhone})</span>}
                    </a>
                  </div>
                  <div>⚡ Direct Company Support Line</div>
                </div>
              </div>
            ) : (
              /* State 2: Active Chat Conversation Stream */
              <div className="flex-1 flex flex-col justify-between overflow-hidden bg-slate-50/50">
                {/* Status Bar */}
                <div className="bg-slate-100/80 px-4 py-2 border-b border-slate-200 flex items-center justify-between text-[10px] font-mono text-slate-600 shrink-0">
                  <div className="flex items-center gap-1.5 font-bold">
                    {conversation?.assignedToName ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-emerald-700">Claimed by {conversation.assignedToName}</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3 h-3 text-amber-500" />
                        <span className="text-amber-700">Awaiting recruiter claim...</span>
                      </>
                    )}
                  </div>
                  <span className="text-slate-400 font-sans">Sender: Guest</span>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  {messagesArray.map((msg, idx) => {
                    const isGuest = msg.sender === "customer" || msg.sender === "guest";
                    const isStaff = msg.sender === "staff";
                    const isSystem = msg.sender === "system";

                    if (isSystem) {
                      return (
                        <div key={idx} className="my-2 text-center">
                          <span className="inline-block px-3 py-1 bg-slate-200/80 text-slate-600 rounded-full text-[10px] font-mono italic">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={idx}
                        className={`flex flex-col ${isGuest ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium leading-relaxed text-left shadow-sm ${
                            isGuest
                              ? "bg-[#0B192C] text-white rounded-br-none"
                              : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                          }`}
                        >
                          {!isGuest && isStaff && (
                            <div className="text-[9px] font-bold text-blue-600 font-mono mb-1 uppercase tracking-wider">
                              {conversation?.assignedToName || "Recruiter"}
                            </div>
                          )}
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                        </div>

                        <div className="text-[9px] font-mono text-slate-400 mt-1 px-1 flex items-center gap-1">
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {isGuest && <CheckCheck className="w-3 h-3 text-emerald-500" />}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply composer input */}
                <form
                  onSubmit={handleSendReply}
                  className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#0B192C] outline-none text-slate-800 font-medium"
                  />
                  <button
                    type="submit"
                    disabled={isSendingReply || !replyText.trim()}
                    className="w-10 h-10 rounded-xl bg-[#0B192C] hover:bg-[#1E3A8A] text-white flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 shrink-0 border-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4 text-emerald-400" />
                  </button>
                </form>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
