import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  ArrowLeft,
  Send, 
  Users, 
  CheckCheck, 
  Clock, 
  MessageCircle, 
  ShieldCheck, 
  Sparkles, 
  Paperclip,
  Smile,
  Hash,
  Info
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { StaffGroupChatMessage, UserProfile } from "../types";
import { 
  sendStaffGroupMessage, 
  subscribeToStaffGroupMessages, 
  getAllUserProfiles 
} from "../lib/services";

export const GroupChatView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<StaffGroupChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load team members
  useEffect(() => {
    getAllUserProfiles().then(profiles => {
      const team = profiles.filter(p => p.role === "staff" || p.role === "admin");
      setTeamMembers(team);
    }).catch(err => console.warn("Failed to load group members:", err));
  }, []);

  // Subscribe to real-time group messages
  useEffect(() => {
    const unsubscribe = subscribeToStaffGroupMessages((incoming) => {
      setMessages(incoming);
    }, "staff_team_hub");

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  // Send message to group
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    const tempId = `temp_group_${Date.now()}`;
    const optimisticMsg: StaffGroupChatMessage = {
      id: tempId,
      channelId: "staff_team_hub",
      senderUid: currentUser.uid,
      senderName: currentUser.displayName || "Me",
      senderRole: (currentUser.role as any) || "staff",
      text: textToSend,
      timestamp: Date.now(),
      deliveryStatus: "sending"
    };

    setMessages(prev => [...prev, optimisticMsg]);

    try {
      await sendStaffGroupMessage(textToSend, {
        channelId: "staff_team_hub",
        senderUid: currentUser.uid,
        senderName: currentUser.displayName || "Staff Member",
        senderRole: (currentUser.role as any) || "staff"
      });
    } catch (err) {
      console.error("Failed to send group message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "VR";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-80px)] flex flex-col bg-[#F0F4F8] font-sans relative select-text overflow-hidden">
      {/* Group Header Bar */}
      <div className="bg-white border-b border-slate-200/80 px-4 py-3 flex items-center justify-between shrink-0 shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate(currentUser?.role === "admin" ? "/admin" : "/staff");
              }
            }}
            className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
            title="Return"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full shadow-2xs" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold text-[#0B1B3D] leading-none">
                Team Hub Group Chat
              </h1>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider bg-blue-100 text-blue-800">
                Staff & Admin
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {teamMembers.length} team members • Broadcast & team discussions
            </p>
          </div>
        </div>

        {/* Member Avatars Stack */}
        <div className="hidden sm:flex items-center -space-x-2">
          {teamMembers.slice(0, 5).map(member => (
            <div
              key={member.uid}
              title={member.displayName || member.email}
              className="w-8 h-8 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center font-bold text-[10px] text-slate-700 shadow-2xs"
            >
              {getInitials(member.displayName || member.email)}
            </div>
          ))}
          {teamMembers.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center font-bold text-[10px] text-slate-500 shadow-2xs">
              +{teamMembers.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4 max-w-4xl w-full mx-auto pb-6">
        {messages.length === 0 ? (
          <div className="h-72 flex flex-col items-center justify-center text-center p-6">
            <div className="w-14 h-14 bg-white rounded-3xl shadow-xs border border-slate-200 flex items-center justify-center text-blue-600 mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h2 className="text-base font-extrabold text-slate-900">
              Welcome to the Staff Team Hub!
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
              This is the official group channel for all Valley Reigns recruiters, staff, and administrators. Drop updates, announce candidates, and coordinate placements in real time.
            </p>
          </div>
        ) : (
          messages.map(msg => {
            const isMe = msg.senderUid === currentUser?.uid;
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isMe ? "justify-end" : "justify-start"}`}
              >
                {!isMe && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5 shadow-2xs">
                    {getInitials(msg.senderName)}
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3.5 text-xs leading-relaxed shadow-xs ${
                    isMe
                      ? "bg-[#0B1B3D] text-white rounded-tr-xs"
                      : "bg-white text-slate-900 border border-slate-200/80 rounded-tl-xs"
                  }`}
                >
                  {/* Sender Header */}
                  {!isMe && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="font-extrabold text-blue-600 text-xs">
                        {msg.senderName || "Staff Member"}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                        msg.senderRole === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {msg.senderRole || "staff"}
                      </span>
                    </div>
                  )}

                  <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  
                  <div className={`flex items-center justify-end gap-1 mt-1.5 text-[10px] ${isMe ? "text-blue-200/80" : "text-slate-400"}`}>
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

      {/* Group Message Composer */}
      <div className="p-3 sm:p-4 bg-white border-t border-slate-200/80 shrink-0">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Message the team..."
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-100/90 focus:bg-white text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 rounded-full border border-transparent focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="w-11 h-11 bg-[#0B1B3D] hover:bg-[#11244e] active:scale-95 text-white rounded-full flex items-center justify-center transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
            title="Send to group"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
