import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getSystemNotifications, markNotificationAsRead } from "../lib/services";
import { SystemNotification } from "../types";
import { 
  Bell, 
  ArrowLeft, 
  AlertTriangle, 
  CheckSquare, 
  Briefcase, 
  MessageSquare, 
  ShieldAlert, 
  Clock, 
  Check, 
  RefreshCw,
  FileText,
  UserCheck,
  Send,
  HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const StaffNotifications: React.FC = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "chats" | "jobs" | "reports">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    if (!currentUser) return;
    try {
      setRefreshing(true);
      const allNotifications = await getSystemNotifications();
      // Filter only those associated with this specific staff member
      const staffOnly = allNotifications.filter(n => n.staffUid === currentUser.uid);
      setNotifications(staffOnly);
    } catch (err) {
      console.error("Failed to load staff notifications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh periodically for a snappy real-time experience
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

  // Filter staff notifications dynamically based on active tab
  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "chats") {
      return [
        "closed_conversation", 
        "reported_conversation", 
        "finished_conversation", 
        "awaiting_claim", 
        "abandoned_conversation", 
        "transferred_conversation"
      ].includes(n.type);
    }
    if (filter === "jobs") {
      return ["new_job_posted", "job_updated", "job_deleted"].includes(n.type);
    }
    if (filter === "reports") {
      return ["report_submitted"].includes(n.type);
    }
    return true;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case "awaiting_claim":
        return (
          <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case "transferred_conversation":
        return (
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Send className="w-5 h-5" />
          </div>
        );
      case "reported_conversation":
        return (
          <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        );
      case "closed_conversation":
        return (
          <div className="w-10 h-10 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case "finished_conversation":
        return (
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case "new_job_posted":
        return (
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        );
      case "report_submitted":
        return (
          <div className="w-10 h-10 bg-teal-50 border border-teal-100 rounded-xl flex items-center justify-center text-teal-600 shrink-0">
            <FileText className="w-5 h-5" />
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
    return new Date(timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  };

  const getUnreadCount = () => {
    return notifications.filter(n => !n.read).length;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6">
      {/* Top navigation row */}
      <div className="flex items-center justify-between">
        <Link 
          to="/staff" 
          className="px-4 py-2 border border-emerald-800 rounded-xl bg-white hover:bg-emerald-50/20 text-[#0B3C2D] hover:text-[#06241B] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4" /> Recruiter Dashboard
        </Link>
        <div className="flex items-center gap-1.5 bg-[#0B3C2D] border border-emerald-900 text-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
          <Bell className="w-3.5 h-3.5 animate-bounce" /> Staff Console
        </div>
      </div>

      {/* Premium Top Heading Card */}
      <div className="bg-[#0B3C2D] border border-emerald-900 rounded-[32px] text-white p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Vector pattern background overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-15">
          <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" className="text-emerald-400" />
            <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" className="text-emerald-500" strokeDasharray="3 3" />
            <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" className="text-emerald-300" />
          </svg>
        </div>

        <div className="space-y-2 z-10 text-left">
          <span className="bg-white/15 px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
            Personal Alerts Feed
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif italic font-extrabold tracking-tight">
            Staff Notifications
          </h2>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <button
            onClick={fetchNotifications}
            disabled={refreshing}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-300" : ""}`} />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={getUnreadCount() === 0}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-[#051812] border border-emerald-400 rounded-xl text-xs font-sans font-extrabold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
          >
            <CheckSquare className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-slate-200/80 mb-6 shrink-0 gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {[
          { key: "all", label: `All Alerts (${notifications.length})` },
          { key: "chats", label: "Chats & Reassignments" },
          { key: "jobs", label: "Job Postings" },
          { key: "reports", label: "Daily Reports" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === tab.key
                ? "bg-[#0B3C2D] text-white shadow-none"
                : "bg-slate-50 border border-slate-200/60 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Logs Feed */}
      {loading ? (
        <div className="bg-white border border-slate-200 w-full p-12 text-center rounded-none shadow-none">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
          <p className="text-sm font-sans font-medium text-slate-500">Loading alerts...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200 w-full p-12 text-center rounded-none shadow-none">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-serif font-bold text-slate-800 mb-1">No Notifications</h3>
          <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto">
            You don't have any staff alerts in this category at the moment.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 divide-y divide-slate-150 w-full bg-white rounded-none shadow-none overflow-hidden">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`w-full p-4.5 sm:p-5 flex items-start gap-4 transition-colors relative bg-white border-0 rounded-none shadow-none ${
                  notif.read ? "bg-white" : "bg-emerald-50/10"
                }`}
              >
                {/* Unread vertical bar indicator */}
                {!notif.read && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-600" />
                )}

                {/* Left side: Icon */}
                <div className="shrink-0 relative z-10">
                  {getIconForType(notif.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                    <span className={`text-xs font-sans font-bold leading-none ${notif.read ? "text-slate-800" : "text-slate-900 font-extrabold"}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-450 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className={`text-xs font-sans leading-relaxed mt-1.5 ${notif.read ? "text-slate-550" : "text-slate-800 font-medium"}`}>
                    {notif.message}
                  </p>

                  {/* Metadata Quick links/pills */}
                  {notif.metadata && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {notif.metadata.chatId && (
                        <Link 
                          to="/staff" 
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 text-[9px] font-mono font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3 text-emerald-600" />
                          View Chat
                        </Link>
                      )}
                      {notif.metadata.jobId && (
                        <Link 
                          to="/staff/manage-jobs" 
                          className="px-2.5 py-1 bg-slate-50 border border-slate-200/60 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 text-[9px] font-mono font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <Briefcase className="w-3 h-3 text-emerald-600" />
                          Manage Jobs
                        </Link>
                      )}
                    </div>
                  )}
                </div>

                {/* Right Action: Mark Read */}
                {!notif.read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="w-8 h-8 bg-slate-50 border border-slate-150 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-100 transition-all cursor-pointer shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
