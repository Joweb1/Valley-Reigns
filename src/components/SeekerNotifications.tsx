import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSystemNotifications, markNotificationAsRead } from "../lib/services";
import { SystemNotification } from "../types";
import { 
  Bell, 
  ArrowLeft, 
  Briefcase, 
  MessageSquare, 
  Clock, 
  Check, 
  RefreshCw,
  UserCheck,
  Send,
  Lock,
  X,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const SeekerNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const allNotifications = await getSystemNotifications();
      
      // Filter seeker-relevant notifications:
      // 1. Associated with this seeker's UID (if logged in)
      // 2. Global "new_job_posted" notifications
      const seekerRelevant = allNotifications.filter(n => {
        if (n.type === "new_job_posted") return true;
        if (currentUser && n.seekerUid === currentUser.uid) return true;
        return false;
      });

      setNotifications(seekerRelevant);
    } catch (err) {
      console.error("Failed to load seeker notifications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Snappy auto-refresh every 8 seconds
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "conversation_started":
        return (
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case "conversation_claimed":
        return (
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case "conversation_transferred":
        return (
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Send className="w-5 h-5" />
          </div>
        );
      case "conversation_finished":
      case "conversation_closed":
        return (
          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
            <X className="w-5 h-5" />
          </div>
        );
      case "new_job_posted":
        return (
          <div className="w-10 h-10 bg-[#111827]/5 border border-blue-600/10 rounded-xl flex items-center justify-center text-[#1E88E5] shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
        );
    }
  };

  const formatTime = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    if (diffMs < 60000) return "Just Now";
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div id="seeker-notifications-view" className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      {/* Upper Brand Header */}
      <div className="bg-black text-white pt-8 pb-10 px-4 rounded-b-[36px] shadow-lg relative overflow-hidden border-b border-neutral-800/40">
        {/* Subtle decorative grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="100" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="150" cy="200" r="150" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.08, rotate: -3 }}
              whileTap={{ scale: 0.93 }}
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white border border-white/5 cursor-pointer"
              title="Go Back"
              id="seeker-notif-back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-blue-400 font-bold">
                Updates & activity
              </span>
              <h1 className="text-2xl font-black uppercase tracking-wider font-display text-white">
                My Notifications
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <motion.button
                whileHover={{ scale: 1.05, y: -1 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleMarkAllRead}
                className="text-xs bg-blue-500/25 hover:bg-blue-500/40 text-blue-300 font-bold px-3 py-1.5 rounded-full border border-blue-400/20 transition-all cursor-pointer flex items-center gap-1.5"
                id="seeker-notif-mark-all-read-btn"
              >
                <Check className="w-3.5 h-3.5" /> Mark all read
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.08, rotate: 15 }}
              whileTap={{ scale: 0.92 }}
              onClick={fetchNotifications}
              disabled={refreshing}
              className={`p-2.5 rounded-2xl bg-white/10 hover:bg-white/20 transition-all text-white border border-white/5 cursor-pointer ${
                refreshing ? "animate-spin" : ""
              }`}
              title="Refresh Notifications"
              id="seeker-notif-refresh-btn"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-xl mx-auto px-4 mt-6">
        {/* Guest user info Banner */}
        {!currentUser && (
          <div className="bg-black border border-neutral-800 text-white rounded-2xl p-5 shadow-sm mb-6 flex gap-4 items-start relative overflow-hidden">
            <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 text-blue-500/10 pointer-events-none">
              <Sparkles className="w-32 h-32" />
            </div>
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/10">
              <Lock className="w-5 h-5 text-blue-400" />
            </div>
            <div className="space-y-1 relative z-10 text-left">
              <h4 className="text-sm font-bold font-sans">Want to track your inquiries?</h4>
              <p className="text-xs text-blue-200/90 leading-relaxed font-sans">
                Sign in or register to receive instant notifications when our recruitment staff claim, transfer, or finish your chat applications!
              </p>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                className="mt-3 text-xs bg-white text-slate-900 font-extrabold px-4 py-1.5 rounded-xl hover:bg-blue-50 cursor-pointer shadow-sm transition-all"
                id="seeker-notif-signin-btn"
              >
                Sign In / Join
              </motion.button>
            </div>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-100 flex gap-4 animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-3.5 bg-slate-200 rounded w-1/3" />
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-[24px] border border-slate-150/80 p-8 text-center shadow-sm max-w-sm mx-auto mt-12">
            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Bell className="w-7 h-7 stroke-1.5" />
            </div>
            <h3 className="text-base font-bold text-slate-800 font-sans">All Quiet For Now</h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed max-w-[240px] mx-auto font-sans">
              There are no job updates or system notifications matching your account right now.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {notifications.map((notif) => (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => {
                    if (!notif.read) handleMarkAsRead(notif.id);
                    
                    // Route click if applicable
                    if (notif.metadata?.chatId) {
                      navigate(`/seeker/messages?jobId=${notif.metadata?.jobId || ""}`);
                    } else if (notif.metadata?.jobId) {
                      navigate(`/seeker?jobId=${notif.metadata.jobId}`);
                    }
                  }}
                  id={`seeker-notif-item-${notif.id}`}
                  className={`bg-white rounded-2xl p-4 border transition-all duration-200 flex gap-4 relative cursor-pointer text-left group hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] ${
                    notif.read 
                      ? "border-slate-100 opacity-80" 
                      : "border-blue-600/10 ring-1 ring-emerald-500/5 shadow-xs"
                  }`}
                >
                  {/* Read dot indicator */}
                  {!notif.read && (
                    <span className="absolute top-4 right-4 w-2 h-2 rounded-full bg-blue-500 ring-4 ring-emerald-500/10" />
                  )}

                  {/* Icon */}
                  {getIconForType(notif.type)}

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-sm font-extrabold text-slate-800 font-sans tracking-tight leading-tight">
                        {notif.title}
                      </h4>
                      {!notif.read && (
                        <span className="inline-block px-1.5 py-0.5 bg-blue-50 text-[9px] font-mono font-bold text-blue-600 border border-blue-500/10 rounded uppercase tracking-wider scale-90 origin-left">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1 font-sans">
                      {notif.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400 font-medium mt-2">
                      <Clock className="w-3 h-3 text-slate-350" />
                      <span>{formatTime(notif.timestamp)}</span>
                      {notif.metadata?.jobTitle && (
                        <>
                          <span className="text-slate-200">•</span>
                          <span className="text-blue-600 hover:underline">
                            {notif.metadata.jobTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
