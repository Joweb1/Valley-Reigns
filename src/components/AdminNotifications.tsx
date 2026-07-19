import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getSystemNotifications, markNotificationAsRead } from "../lib/services";
import { SystemNotification } from "../types";
import { 
  Bell, 
  ArrowLeft, 
  AlertTriangle, 
  CheckSquare, 
  Briefcase, 
  Trash2, 
  MessageSquare, 
  ShieldAlert, 
  Clock, 
  Check, 
  RefreshCw,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const AdminNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "offline" | "staff" | "jobs">("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      setRefreshing(true);
      const data = await getSystemNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh periodically
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      await Promise.all(unread.map(n => markNotificationAsRead(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  // Filter logic
  const filteredNotifications = notifications.filter(n => {
    if (filter === "all") return true;
    if (filter === "offline") return n.type === "offline_routing";
    if (filter === "staff") {
      return ["closed_conversation", "reported_conversation", "finished_conversation", "report_submitted"].includes(n.type);
    }
    if (filter === "jobs") {
      return ["new_job_posted", "job_updated", "job_deleted"].includes(n.type);
    }
    return true;
  });

  const getIconForType = (type: string) => {
    switch (type) {
      case "offline_routing":
        return (
          <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        );
      case "reported_conversation":
        return (
          <div className="w-10 h-10 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
        );
      case "closed_conversation":
      case "finished_conversation":
        return (
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
        );
      case "new_job_posted":
        return (
          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        );
      case "job_updated":
        return (
          <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
        );
      case "job_deleted":
        return (
          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600 shrink-0">
            <Trash2 className="w-5 h-5" />
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6">
      {/* Top navigation row */}
      <div className="flex items-center justify-between">
        <Link 
          to="/admin" 
          className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
          title="Go Back"
        >
          <ArrowLeft className="w-4 h-4" /> Go Back
        </Link>
        <div className="flex items-center gap-1.5 bg-black border border-neutral-800 text-blue-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
          <Bell className="w-3.5 h-3.5" /> Audit Console
        </div>
      </div>

      {/* Premium Top Heading Card */}
      <div className="bg-[#0084FF] border border-[#0084FF]/40 rounded-[32px] text-white p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
        {/* Vector pattern background overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
          <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" className="text-white/40" />
            <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="3 3" />
            <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" className="text-white/35" />
          </svg>
        </div>

        <div className="space-y-2 z-10 text-left">
          <span className="bg-white/15 px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
            System Alerts & Diagnostics
          </span>
          <h2 className="text-2xl sm:text-3xl font-display font-black uppercase tracking-wider">
            System Notifications
          </h2>
        </div>

        <div className="flex items-center gap-2.5 z-10">
          <button
            onClick={fetchNotifications}
            disabled={refreshing}
            className="p-3 bg-white/10 hover:bg-white/20 border border-white/10 text-white rounded-xl shadow-sm cursor-pointer transition-all active:scale-95 flex items-center justify-center shrink-0"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-blue-300" : ""}`} />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter(n => !n.read).length === 0}
            className="px-4 py-2.5 bg-blue-500 hover:bg-blue-400 text-white border border-blue-400 rounded-xl text-xs font-sans font-extrabold flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
          >
            <CheckSquare className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-slate-200/80 mb-6 shrink-0 gap-2 overflow-x-auto pb-1.5 scrollbar-none">
        {[
          { key: "all", label: "All Alerts" },
          { key: "offline", label: "Offline Warnings" },
          { key: "staff", label: "Staff Actions" },
          { key: "jobs", label: "Job Changes" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2 rounded-xl text-xs font-sans font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === tab.key
                ? "bg-black text-white shadow-none"
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
          <RefreshCw className="w-8 h-8 text-blue-700 animate-spin mx-auto mb-3" />
          <p className="text-sm font-sans font-medium text-slate-500">Loading system logs...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-200 w-full p-12 text-center rounded-none shadow-none">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-sans font-bold text-slate-900">All Quiet Here</h3>
          <p className="text-xs font-sans text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            There are no {filter !== "all" ? `"${filter}"` : ""} system alerts logged in this channel yet.
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
                  notif.read ? "bg-white" : "bg-blue-50/10"
                }`}
              >
                {/* Unread vertical bar indicator */}
                {!notif.read && (
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600" />
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
                  <p className="text-xs font-sans text-slate-600 leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Actions */}
                {!notif.read && (
                  <button
                    onClick={() => handleMarkAsRead(notif.id)}
                    className="p-1.5 hover:bg-blue-50 hover:text-blue-800 text-blue-600 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
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
