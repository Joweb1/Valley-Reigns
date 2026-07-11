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
  RefreshCw 
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
      return ["closed_conversation", "reported_conversation", "finished_conversation"].includes(n.type);
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
          <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link 
            to="/admin" 
            className="w-10 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
            title="Back to Admin Panel"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Bell className="w-6 h-6 text-emerald-700" />
              System Notifications
            </h1>
            <p className="text-xs font-sans text-slate-500 mt-1">
              Real-time monitoring of staff activities and offline routing alerts.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchNotifications}
            disabled={refreshing}
            className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 rounded-xl shadow-sm cursor-pointer transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-emerald-700" : ""}`} />
          </button>
          <button
            onClick={handleMarkAllRead}
            disabled={notifications.filter(n => !n.read).length === 0}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-xl text-xs font-sans font-bold flex items-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckSquare className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div className="flex border-b border-slate-100 mb-6 shrink-0 gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: "all", label: "All Alerts" },
          { key: "offline", label: "Offline Warnings" },
          { key: "staff", label: "Staff Actions" },
          { key: "jobs", label: "Job Changes" }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-2.5 rounded-xl text-xs font-sans font-bold transition-all whitespace-nowrap cursor-pointer ${
              filter === tab.key
                ? "bg-emerald-900 text-white shadow-sm"
                : "bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notification Logs Feed */}
      {loading ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
          <RefreshCw className="w-8 h-8 text-emerald-700 animate-spin mx-auto mb-3" />
          <p className="text-sm font-sans font-medium text-slate-500">Loading system logs...</p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-base font-sans font-bold text-slate-900">All Quiet Here</h3>
          <p className="text-xs font-sans text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            There are no {filter !== "all" ? `"${filter}"` : ""} system alerts logged in this channel yet.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {filteredNotifications.map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                className={`bg-white border rounded-2xl p-4 flex items-start gap-4 transition-all hover:shadow-sm relative overflow-hidden ${
                  notif.read ? "border-slate-100" : "border-emerald-200/60 bg-emerald-50/5"
                }`}
              >
                {/* Unread dot */}
                {!notif.read && (
                  <span className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-600" />
                )}

                {/* Left side: Icon */}
                {getIconForType(notif.type)}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                    <span className={`text-xs font-sans font-bold leading-none ${notif.read ? "text-slate-800" : "text-slate-900 font-extrabold"}`}>
                      {notif.title}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
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
                    className="p-1.5 hover:bg-emerald-50 hover:text-emerald-800 text-emerald-600 rounded-lg cursor-pointer border-0 bg-transparent shrink-0"
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
