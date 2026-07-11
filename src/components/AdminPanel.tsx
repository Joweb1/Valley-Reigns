import React, { useState, useEffect, useRef } from "react";
import { Job, UserProfile, Conversation, DailyStat } from "../types";
import { 
  getStaffProfiles, 
  toggleStaffJobPosting, 
  subscribeToConversations,
  forceReassignConversation,
  updateConversationStatus,
  getStaffStatuses,
  getDailyStats
} from "../lib/services";
import { 
  BarChart3, 
  Users, 
  AlertTriangle, 
  UserMinus, 
  ShieldCheck, 
  RefreshCw, 
  Eye,
  Settings,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  TrendingUp,
  Inbox,
  Clock,
  CheckCircle2,
  Calendar,
  Bell,
  Briefcase
} from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from "recharts";
import { 
  KPIGridSkeleton, 
  NavigationCardsSkeleton, 
  ChartSkeleton, 
  StaffManagementSkeleton, 
  TicketRoutingSkeleton 
} from "./AdminPanelSkeleton";

interface AdminPanelProps {
  jobsList: Job[];
}

const RecruiterDropdown: React.FC<{
  currentOwnerId?: string | null;
  staffList: UserProfile[];
  getActiveChatsCount: (uid: string) => number;
  onSelect: (uid: string, displayName: string) => void;
  placeholder: string;
  label: string;
}> = ({ currentOwnerId, staffList, getActiveChatsCount, onSelect, placeholder, label }) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredStaff = currentOwnerId 
    ? staffList.filter(s => s.uid !== currentOwnerId)
    : staffList;

  return (
    <div className="relative space-y-1 text-left w-full select-none">
      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-[10px] font-sans font-bold px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 flex items-center justify-between transition-all cursor-pointer shadow-sm select-none"
      >
        <span className="truncate">{placeholder}</span>
        <span className="text-[10px] text-slate-400 shrink-0 ml-1">▼</span>
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop layer to click-out */}
          <div 
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-30"
          />
          
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-40 max-h-48 overflow-y-auto py-1.5 animate-fadeIn">
            {filteredStaff.length === 0 ? (
              <div className="px-3.5 py-2.5 text-[10px] text-slate-400 italic font-medium">
                No other recruiters available
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const activeCount = getActiveChatsCount(staff.uid);
                return (
                  <button
                    key={staff.uid}
                    type="button"
                    onClick={() => {
                      onSelect(staff.uid, staff.displayName);
                      setIsOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-[10px] font-sans font-bold text-slate-700 hover:bg-[#0F5132]/[0.04] hover:text-[#0F5132] transition-all flex items-center justify-between border-b border-slate-50 last:border-b-0 cursor-pointer"
                  >
                    <span className="truncate">{staff.displayName}</span>
                    <span className="text-[8px] font-mono bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-extrabold shrink-0 uppercase tracking-wider">
                      {activeCount} active
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const AdminPanel: React.FC<AdminPanelProps> = ({ jobsList }) => {
  // Navigation State
  const [activeView, setActiveView] = useState<"overview" | "staff" | "routing">("overview");

  // Global State
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [staffStatuses, setStaffStatuses] = useState<Record<string, "online" | "offline">>({});
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [dailyStatsList, setDailyStatsList] = useState<DailyStat[]>([]);
  
  // Loading & Feedback States
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [isRefreshingStaff, setIsRefreshingStaff] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Local UI States
  const [expandedPendingChatId, setExpandedPendingChatId] = useState<string | null>(null);
  const [routingTab, setRoutingTab] = useState<"pending" | "ongoing" | "finished" | "abandoned">("pending");
  const [chartFilter, setChartFilter] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  const notifiedChatsRef = useRef<Set<string>>(new Set());

  // Load staff profiles from Firestore
  const loadStaff = async () => {
    const list = await getStaffProfiles();
    setStaffList(list);
    const statuses = await getStaffStatuses();
    setStaffStatuses(statuses);
  };

  // Load chart stats from Firestore
  const loadChartStats = async () => {
    setChartLoading(true);
    const data = await getDailyStats();
    setDailyStatsList(data);
    setChartLoading(false);
  };

  // Chat queries
  const getActiveChatsCount = (staffUid: string) => {
    return (Object.values(conversations) as Conversation[]).filter(
      c => c.status === "ongoing" && c.assignedTo === staffUid
    ).length;
  };

  // Unclaimed routed chats (available requests in recruiter pending inbox)
  const getUnclaimedRoutedChatsCount = (staffUid: string) => {
    return (Object.values(conversations) as Conversation[]).filter(
      c => c.status === "pending" && c.sharedWith?.includes(staffUid)
    ).length;
  };

  const isStaffOnline = (staffUid: string) => {
    return (staffStatuses[staffUid] || "offline") === "online";
  };

  // Initial stream setup
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await loadStaff();
      await loadChartStats();
      setLoading(false);
    };
    initData();

    // Request desktop/browser notification permissions if supported
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
    
    // Subscribe to real-time chat conversations stream
    const unsubscribe = subscribeToConversations((data) => {
      setConversations(data || {});
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Total calculations
  const totalImpressions = jobsList.reduce((acc, job) => acc + job.impressions, 0);
  
  const conversationsList = Object.values(conversations) as Conversation[];
  const pendingChats = conversationsList.filter(c => c.status === "pending");
  const ongoingChats = conversationsList.filter(c => c.status === "ongoing");
  const finishedChats = conversationsList.filter(c => c.status === "finished");
  const abandonedChats = conversationsList.filter(c => c.status === "abandoned");

  // Toggle staff "Can Post Jobs" privilege directly in Firestore
  const handleTogglePermission = async (uid: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    
    // Optimistic UI Update
    setStaffList(prev => prev.map(s => s.uid === uid ? { ...s, canPostJobs: nextVal } : s));
    
    await toggleStaffJobPosting(uid, nextVal);
    setActionSuccess(`Permissions updated for staff member ${uid}`);
    setTimeout(() => setActionSuccess(null), 3000);
    
    // Reload database
    await loadStaff();
  };

  // Administrative Barge-In / Force Reassign Command
  const handleForceReassign = async (chatId: string) => {
    await forceReassignConversation(chatId, null, null);
    setActionSuccess(`Conversation has been successfully released back to Pending.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const handleMarkAbandoned = async (chatId: string) => {
    await updateConversationStatus(chatId, "abandoned");
    setActionSuccess(`Conversation moved to abandoned.`);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Parsing and aggregation for Timeline Chart
  const getChartData = () => {
    if (chartFilter === "daily") {
      // Show days of the current week (July 6, 2026 to July 12, 2026)
      const days = [
        { name: "Mon (07/06)", dateStr: "2026-07-06" },
        { name: "Tue (07/07)", dateStr: "2026-07-07" },
        { name: "Wed (07/08)", dateStr: "2026-07-08" },
        { name: "Thu (07/09)", dateStr: "2026-07-09" },
        { name: "Fri (07/10)", dateStr: "2026-07-10" },
        { name: "Sat (07/11)", dateStr: "2026-07-11" },
        { name: "Sun (07/12)", dateStr: "2026-07-12" }
      ];

      return days.map(day => {
        const found = dailyStatsList.find(s => s.date === day.dateStr);
        return {
          name: day.name,
          impressions: found?.impressions ?? 0,
          sent: found?.sent ?? 0,
          claimed: found?.claimed ?? 0,
          finished: found?.finished ?? 0,
          abandoned: found?.abandoned ?? 0
        };
      });
    }

    if (chartFilter === "weekly") {
      // Show weeks of the current month (July 2026)
      const weeks = [
        { name: "Week 1 (07/01-07/07)", start: "2026-07-01", end: "2026-07-07" },
        { name: "Week 2 (07/08-07/14)", start: "2026-07-08", end: "2026-07-14" },
        { name: "Week 3 (07/15-07/21)", start: "2026-07-15", end: "2026-07-21" },
        { name: "Week 4 (07/22-07/28)", start: "2026-07-22", end: "2026-07-28" },
        { name: "Week 5 (07/29-07/31)", start: "2026-07-29", end: "2026-07-31" }
      ];

      return weeks.map(w => {
        const statsInWeek = dailyStatsList.filter(s => s.date >= w.start && s.date <= w.end);
        return {
          name: w.name,
          impressions: statsInWeek.reduce((sum, s) => sum + s.impressions, 0),
          sent: statsInWeek.reduce((sum, s) => sum + s.sent, 0),
          claimed: statsInWeek.reduce((sum, s) => sum + s.claimed, 0),
          finished: statsInWeek.reduce((sum, s) => sum + s.finished, 0),
          abandoned: statsInWeek.reduce((sum, s) => sum + s.abandoned, 0)
        };
      });
    }

    if (chartFilter === "monthly") {
      // Last 6 months ending July 2026
      const months = [
        { name: "Feb 2026", prefix: "2026-02" },
        { name: "Mar 2026", prefix: "2026-03" },
        { name: "Apr 2026", prefix: "2026-04" },
        { name: "May 2026", prefix: "2026-05" },
        { name: "Jun 2026", prefix: "2026-06" },
        { name: "Jul 2026", prefix: "2026-07" }
      ];

      return months.map(m => {
        const statsInMonth = dailyStatsList.filter(s => s.date.startsWith(m.prefix));
        return {
          name: m.name,
          impressions: statsInMonth.reduce((sum, s) => sum + s.impressions, 0),
          sent: statsInMonth.reduce((sum, s) => sum + s.sent, 0),
          claimed: statsInMonth.reduce((sum, s) => sum + s.claimed, 0),
          finished: statsInMonth.reduce((sum, s) => sum + s.finished, 0),
          abandoned: statsInMonth.reduce((sum, s) => sum + s.abandoned, 0)
        };
      });
    }

    if (chartFilter === "yearly") {
      // Last 5 years
      const years = [
        { name: "2022", prefix: "2022" },
        { name: "2023", prefix: "2023" },
        { name: "2024", prefix: "2024" },
        { name: "2025", prefix: "2025" },
        { name: "2026", prefix: "2026" }
      ];

      return years.map(y => {
        const statsInYear = dailyStatsList.filter(s => s.date.startsWith(y.prefix));
        return {
          name: y.name,
          impressions: statsInYear.reduce((sum, s) => sum + s.impressions, 0),
          sent: statsInYear.reduce((sum, s) => sum + s.sent, 0),
          claimed: statsInYear.reduce((sum, s) => sum + s.claimed, 0),
          finished: statsInYear.reduce((sum, s) => sum + s.finished, 0),
          abandoned: statsInYear.reduce((sum, s) => sum + s.abandoned, 0)
        };
      });
    }

    return [];
  };

  // Recharts Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl shadow-xl text-left space-y-2 font-mono text-[10px]">
          <p className="font-sans font-extrabold text-slate-200 text-xs border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" /> {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-6">
                <span className="flex items-center gap-1.5 font-sans font-medium text-slate-400">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold text-white text-right">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 select-text">
      {/* Toast notifications */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 transform bg-slate-900 border border-slate-700/50 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 text-xs font-mono font-semibold flex items-center gap-2.5 max-w-md"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Main Workspace Render Transition Engine */}
      <AnimatePresence mode="wait">
        {loading ? (
          <div className="space-y-8" key="main-loading">
            <KPIGridSkeleton />
            <NavigationCardsSkeleton />
            <ChartSkeleton />
          </div>
        ) : activeView === "overview" ? (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-8"
          >
            {/* 1. KPI Grid Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: Job Impressions */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex items-start justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block leading-none">
                    Aggregate Discovery
                  </span>
                  <h4 className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
                    {totalImpressions}
                  </h4>
                  <p className="text-xs font-sans text-slate-500 font-semibold leading-none">
                    Seeker Job Impressions
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#0F5132]">
                  <Eye className="w-6 h-6" />
                </div>
              </div>

              {/* Card 2: Active Recruiter Pool */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex items-start justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block leading-none">
                    Operational Pool
                  </span>
                  <h4 className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
                    {staffList.length}
                  </h4>
                  <p className="text-xs font-sans text-slate-500 font-semibold leading-none">
                    Registered Recruiters
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              {/* Card 3: SLA Compliance / Abandoned Chats */}
              <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex items-start justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block leading-none">
                    SLA Compliance
                  </span>
                  <h4 className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
                    {abandonedChats.length}
                  </h4>
                  <p className="text-xs font-sans text-slate-500 font-semibold leading-none">
                    Abandoned Tickets
                  </p>
                </div>
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600">
                  <AlertTriangle className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* 2. Bento Navigation Quick Links (Directly after SLA Compliance card) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Staff Management */}
              <button
                onClick={() => setActiveView("staff")}
                className="group text-left bg-white border border-slate-200/60 hover:border-purple-200 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-purple-50 group-hover:bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0 transition-colors duration-300">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-sans font-bold text-slate-900 group-hover:text-purple-700 transition-colors truncate">
                    Staff Management
                  </h4>
                </div>
              </button>

              {/* Card 2: Ticket Routing Board */}
              <button
                onClick={() => setActiveView("routing")}
                className="group text-left bg-white border border-slate-200/60 hover:border-emerald-200 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-emerald-50 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center text-[#0F5132] shrink-0 transition-colors duration-300">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-sans font-bold text-slate-900 group-hover:text-emerald-700 transition-colors truncate">
                    Ticket Routing Board
                  </h4>
                </div>
              </button>

              {/* Card 3: Job Management */}
              <Link
                to="/admin/manage-jobs"
                className="group text-left bg-white border border-slate-200/60 hover:border-blue-200 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-blue-50 group-hover:bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shrink-0 transition-colors duration-300">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-sans font-bold text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                    Job Management
                  </h4>
                </div>
              </Link>

              {/* Card 4: System Alerts */}
              <Link
                to="/admin/notifications"
                className="group text-left bg-white border border-slate-200/60 hover:border-rose-200 rounded-2xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-all duration-300 flex items-center gap-3"
              >
                <div className="w-10 h-10 bg-rose-50 group-hover:bg-rose-100 rounded-xl flex items-center justify-center text-rose-600 shrink-0 transition-colors duration-300">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-sans font-bold text-slate-900 group-hover:text-rose-700 transition-colors truncate">
                    System Alerts
                  </h4>
                </div>
              </Link>
            </div>

            {/* 3. Real-Time Timeline Performance Chart */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                      Operational Traffic Timeline
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
                      Job Impressions & Message Traffic Seeding (June 20th 2026 Start)
                    </span>
                  </div>
                </div>

                {/* Switcher Filter tabs */}
                <div className="flex gap-1 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto shrink-0">
                  {(["daily", "weekly", "monthly", "yearly"] as const).map((filter) => {
                    const isActive = chartFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => setChartFilter(filter)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-tight cursor-pointer uppercase transition-all whitespace-nowrap ${
                          isActive 
                            ? "bg-white text-[#0F5132] shadow-sm border border-slate-150 font-black" 
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {chartLoading ? (
                <div className="h-64 flex items-center justify-center">
                  <RefreshCw className="w-7 h-7 text-[#0F5132] animate-spin" />
                </div>
              ) : (
                <div className="w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={getChartData()}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0/40" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#94A3B8" 
                        fontSize={9} 
                        fontWeight={700}
                        fontFamily="var(--font-mono)"
                        tickLine={false}
                        axisLine={false}
                        dy={8}
                      />
                      <YAxis 
                        stroke="#94A3B8" 
                        fontSize={9} 
                        fontWeight={700}
                        fontFamily="var(--font-mono)"
                        tickLine={false}
                        axisLine={false}
                        dx={-8}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        iconSize={6}
                        wrapperStyle={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                      />
                      
                      {/* Job Impressions Line - Green Emerald */}
                      <Line 
                        name="Job Impressions" 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#0F5132" 
                        strokeWidth={2.5} 
                        activeDot={{ r: 6 }} 
                        dot={{ r: 4, strokeWidth: 1.5, fill: "#FFF" }} 
                      />

                      {/* Sent Conversations Line - Slate Teal */}
                      <Line 
                        name="Sent Requests" 
                        type="monotone" 
                        dataKey="sent" 
                        stroke="#0B3C49" 
                        strokeWidth={2} 
                        activeDot={{ r: 5 }} 
                        dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                      />

                      {/* Claimed Conversations Line - Blue */}
                      <Line 
                        name="Claimed Requests" 
                        type="monotone" 
                        dataKey="claimed" 
                        stroke="#2563EB" 
                        strokeWidth={2} 
                        activeDot={{ r: 5 }} 
                        dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                      />

                      {/* Finished Conversations Line - Bright Green */}
                      <Line 
                        name="Finished Chats" 
                        type="monotone" 
                        dataKey="finished" 
                        stroke="#10B981" 
                        strokeWidth={2} 
                        activeDot={{ r: 5 }} 
                        dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                      />

                      {/* Abandoned Tickets Line - Rose Warning */}
                      <Line 
                        name="Abandoned Tickets" 
                        type="monotone" 
                        dataKey="abandoned" 
                        stroke="#EF4444" 
                        strokeWidth={2} 
                        activeDot={{ r: 5 }} 
                        dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeView === "staff" ? (
          <motion.div
            key="staff"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView("overview")}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Console Overview
              </button>
              <div className="flex items-center gap-1.5 bg-purple-50 border border-purple-100 text-purple-800 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Staff View Panel
              </div>
            </div>

            {/* Staff Management Table view */}
            <div className="bg-white border border-slate-200/60 rounded-3xl shadow-sm overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                      Staff Management
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
                      Configure permissions, monitor statuses, and track available requests.
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    setIsRefreshingStaff(true);
                    await loadStaff();
                    setTimeout(() => setIsRefreshingStaff(false), 800);
                  }}
                  className="p-2 hover:bg-slate-50 border border-slate-150 rounded-xl text-slate-500 hover:text-slate-800 transition-colors cursor-pointer bg-white"
                  title="Refresh profiles"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshingStaff ? "animate-spin" : ""}`} />
                </button>
              </div>

              {/* Table details */}
              <div className="overflow-x-auto min-w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/55 border-b border-slate-100">
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Recruiter Identity
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        System Email
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        Security Role
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                        Availability
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                        Available Requests
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                        Active Chats
                      </th>
                      <th className="px-6 py-3.5 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                        Job Creation Privilege
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staffList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-10 text-center text-xs font-mono text-slate-400 italic">
                          No operational staff records retrieved
                        </td>
                      </tr>
                    ) : (
                      staffList.map((staff) => {
                        const unclaimedCount = getUnclaimedRoutedChatsCount(staff.uid);
                        return (
                          <tr key={staff.uid} className="hover:bg-slate-50/30 transition-colors">
                            <td className="px-6 py-4.5 font-sans text-xs font-extrabold text-slate-900">
                              {staff.displayName}
                            </td>
                            <td className="px-6 py-4.5 font-mono text-xs text-slate-500">
                              {staff.email}
                            </td>
                            <td className="px-6 py-4.5">
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-mono font-bold uppercase">
                                {staff.role}
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              {isStaffOnline(staff.uid) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px] font-mono font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px] font-mono font-bold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                  Offline
                                </span>
                              )}
                            </td>
                            {/* Available request pending unclaimed counts */}
                            <td className="px-6 py-4.5 text-center">
                              <span className={`inline-flex items-center justify-center font-mono text-xs font-bold px-2.5 py-1 rounded-xl ${unclaimedCount > 0 ? "bg-amber-50 text-amber-800 border border-amber-100/50" : "bg-slate-50 text-slate-400"}`}>
                                {unclaimedCount} unclaimed
                              </span>
                            </td>
                            <td className="px-6 py-4.5 text-center font-mono text-xs font-bold text-slate-700">
                              {getActiveChatsCount(staff.uid)} chats
                            </td>
                            <td className="px-6 py-4.5">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => handleTogglePermission(staff.uid, staff.canPostJobs)}
                                  className="focus:outline-none cursor-pointer border-0 bg-transparent p-0"
                                  title={`Toggle canPostJobs for ${staff.displayName}`}
                                >
                                  {staff.canPostJobs ? (
                                    <div className="w-11 h-6 bg-emerald-600 rounded-full flex items-center justify-end p-0.5 transition-all">
                                      <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                                    </div>
                                  ) : (
                                    <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center justify-start p-0.5 transition-all">
                                      <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                                    </div>
                                  )}
                                </button>
                                <span className={`text-[10px] font-mono font-bold uppercase min-w-[32px] ${staff.canPostJobs ? "text-emerald-600" : "text-slate-400"}`}>
                                  {staff.canPostJobs ? "Active" : "Locked"}
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="routing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25 }}
            className="space-y-6"
          >
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView("overview")}
                className="px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back to Console Overview
              </button>
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-100 text-emerald-800 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5" /> Ticket Routing Board
              </div>
            </div>

            {/* Custom Board Card Panel with Top Switched Tabs */}
            <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.02)] space-y-6">
              
              {/* Kanban Switcher Tab list aligned side-by-side */}
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Ticket Routing Queues
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
                    Toggle side-by-side queues to manually transfer, claims, or force release tickets.
                  </span>
                </div>

                <div className="flex gap-2 bg-slate-50 border border-slate-100 p-1.5 rounded-2xl w-full overflow-x-auto shrink-0 scrollbar-none">
                  {(["pending", "ongoing", "finished", "abandoned"] as const).map((tab) => {
                    const count = {
                      pending: pendingChats.length,
                      ongoing: ongoingChats.length,
                      finished: finishedChats.length,
                      abandoned: abandonedChats.length
                    }[tab];

                    const label = {
                      pending: "Pending Queue",
                      ongoing: "Ongoing Live",
                      finished: "Finished",
                      abandoned: "Abandoned"
                    }[tab];

                    const badgeColors = {
                      pending: "bg-amber-100 text-amber-800 border-amber-200",
                      ongoing: "bg-blue-100 text-blue-800 border-blue-200",
                      finished: "bg-emerald-100 text-[#0F5132] border-emerald-200",
                      abandoned: "bg-rose-100 text-rose-800 border-rose-200"
                    }[tab];

                    const icon = {
                      pending: <Inbox className="w-4 h-4" />,
                      ongoing: <Clock className="w-4 h-4" />,
                      finished: <CheckCircle2 className="w-4 h-4" />,
                      abandoned: <AlertTriangle className="w-4 h-4" />
                    }[tab];

                    const isActive = routingTab === tab;
                    return (
                      <button
                        key={tab}
                        onClick={() => setRoutingTab(tab)}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex-1 justify-center ${
                          isActive 
                            ? "bg-white text-slate-900 shadow-sm border border-slate-150 font-extrabold" 
                            : "text-slate-400 hover:text-slate-700"
                        }`}
                      >
                        {icon}
                        <span>{label}</span>
                        <span className={`px-2 py-0.5 border text-[10px] font-mono font-bold rounded-full ${badgeColors}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grid with animation switching */}
              <div className="min-h-[250px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={routingTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
                  >
                    {routingTab === "pending" && (
                      pendingChats.length === 0 ? (
                        <div className="col-span-full h-44 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-400 italic gap-2">
                          <Inbox className="w-8 h-8 text-slate-300" />
                          <span>No Pending Tickets Claim Requests Available</span>
                        </div>
                      ) : (
                        pendingChats.map((c) => {
                          const isExpanded = expandedPendingChatId === c.chatId;
                          return (
                            <div 
                              key={c.chatId} 
                              className={`p-4 bg-white border rounded-2xl shadow-sm space-y-3.5 transition-all ${isExpanded ? 'border-amber-300 bg-amber-50/5' : 'border-slate-200/60 hover:border-slate-300'}`}
                            >
                              {/* Clickable Header for details */}
                              <div 
                                onClick={() => setExpandedPendingChatId(isExpanded ? null : c.chatId)}
                                className="cursor-pointer space-y-2 select-none hover:opacity-85"
                                title="Click to view assigned recruiters"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-mono font-bold text-slate-800">
                                    {c.customerPhone}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md border border-amber-100">
                                    {c.sharedWith?.length || 0} routed
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-xs font-sans font-extrabold text-slate-700 leading-none">
                                    {c.jobTitle}
                                  </p>
                                  <span className="text-[8px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                                    {isExpanded ? "▲ Hide Staff" : "▼ See Staff"}
                                  </span>
                                </div>
                              </div>

                              {isExpanded && (
                                <div className="pt-2.5 border-t border-dashed border-slate-200 space-y-2">
                                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block text-left">
                                    Routed recruiters:
                                  </span>
                                  <div className="space-y-1.5 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100">
                                    {c.sharedWith && c.sharedWith.length > 0 ? (
                                      c.sharedWith.map((uid) => {
                                        const staffMember = staffList.find(s => s.uid === uid);
                                        const isOnline = isStaffOnline(uid);
                                        return (
                                          <div key={uid} className="flex items-center justify-between text-[10px] text-slate-600 font-sans font-semibold">
                                            <span className="truncate max-w-[130px]">
                                              {staffMember ? staffMember.displayName : `Recruiter (${uid.substring(0, 8)})`}
                                            </span>
                                            <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${isOnline ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-200 text-slate-500"}`}>
                                              {isOnline ? "Online" : "Offline"}
                                            </span>
                                          </div>
                                        );
                                      })
                                    ) : (
                                      <span className="text-[9px] font-mono text-slate-400 italic">No recruiters assigned</span>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                <span className="text-[9px] font-mono text-amber-600 font-bold uppercase tracking-wider block">
                                  Awaiting Claim
                                </span>
                                <button
                                  onClick={() => handleMarkAbandoned(c.chatId)}
                                  className="text-[9px] font-sans font-bold text-red-500 hover:text-red-700 hover:underline cursor-pointer border-0 bg-transparent"
                                >
                                  SLA Abandon
                                </button>
                              </div>

                              {/* Manual Assign Selector */}
                              <div className="pt-3 border-t border-slate-100">
                                <RecruiterDropdown
                                  staffList={staffList}
                                  getActiveChatsCount={getActiveChatsCount}
                                  onSelect={async (targetUid, displayName) => {
                                    await forceReassignConversation(c.chatId, targetUid, displayName);
                                    setActionSuccess(`Chat manually assigned to ${displayName}`);
                                    setTimeout(() => setActionSuccess(null), 3000);
                                  }}
                                  placeholder="-- Assign Recruiter --"
                                  label="Manual Route Assignment"
                                />
                              </div>
                            </div>
                          );
                        })
                      )
                    )}

                    {routingTab === "ongoing" && (
                      ongoingChats.length === 0 ? (
                        <div className="col-span-full h-44 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-400 italic gap-2">
                          <Clock className="w-8 h-8 text-slate-300" />
                          <span>No Live Ongoing Discussions Ongoing</span>
                        </div>
                      ) : (
                        ongoingChats.map((c) => (
                          <div key={c.chatId} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-3">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-bold text-slate-800">
                                {c.customerPhone}
                              </span>
                            </div>
                            <p className="text-xs font-sans font-extrabold text-slate-700 leading-none">
                              {c.jobTitle}
                            </p>
                            <div className="flex items-center gap-1.5 bg-blue-50/80 text-blue-800 px-3 py-2 rounded-xl text-[10px] font-sans font-bold border border-blue-100/50">
                              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">
                                Claimed: <strong className="font-extrabold text-blue-900">{c.assignedToName || "System Agent"}</strong>
                              </span>
                            </div>
                            
                            {/* Transfer Route Selector */}
                            <div className="pt-1.5">
                              <RecruiterDropdown
                                currentOwnerId={c.assignedTo}
                                staffList={staffList}
                                getActiveChatsCount={getActiveChatsCount}
                                onSelect={async (targetUid, displayName) => {
                                  await forceReassignConversation(c.chatId, targetUid, displayName);
                                  setActionSuccess(`Chat transferred to ${displayName}`);
                                  setTimeout(() => setActionSuccess(null), 3000);
                                }}
                                placeholder="-- Transfer to Recruiter --"
                                label="Reallocate Conversation"
                              />
                            </div>

                            {/* Reset route back to pending */}
                            <div className="pt-3 border-t border-slate-100">
                              <button
                                onClick={() => handleForceReassign(c.chatId)}
                                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-mono font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border-0"
                                title="Clear assignee and reset status"
                              >
                                <UserMinus className="w-3.5 h-3.5" />
                                Release back to Pending
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {routingTab === "finished" && (
                      finishedChats.length === 0 ? (
                        <div className="col-span-full h-44 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-400 italic gap-2">
                          <CheckCircle2 className="w-8 h-8 text-slate-300" />
                          <span>No Archived/Finished Chat Sessions Found</span>
                        </div>
                      ) : (
                        finishedChats.map((c) => (
                          <div key={c.chatId} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-3 opacity-80">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-bold text-slate-800">
                                {c.customerPhone}
                              </span>
                            </div>
                            <p className="text-xs font-sans font-extrabold text-slate-700 leading-none">
                              {c.jobTitle}
                            </p>
                            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] font-mono text-emerald-600 font-bold">
                              <span>✓ ARCHIVED SESSION</span>
                              <span className="text-slate-400 font-sans font-medium">By: {c.assignedToName || "System"}</span>
                            </div>
                          </div>
                        ))
                      )
                    )}

                    {routingTab === "abandoned" && (
                      abandonedChats.length === 0 ? (
                        <div className="col-span-full h-44 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-400 italic gap-2">
                          <AlertTriangle className="w-8 h-8 text-slate-300" />
                          <span>No Abandoned Sessions Reported</span>
                        </div>
                      ) : (
                        abandonedChats.map((c) => (
                          <div key={c.chatId} className="p-4 bg-white border border-slate-200/60 rounded-2xl shadow-sm space-y-3 opacity-80">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-xs font-mono font-bold text-slate-800">
                                {c.customerPhone}
                              </span>
                            </div>
                            <p className="text-xs font-sans font-extrabold text-slate-700 leading-none">
                              {c.jobTitle}
                            </p>
                            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] font-mono text-red-600 font-semibold">
                              <span className="flex items-center gap-1">✖ ABANDONED TICKET</span>
                              <button
                                onClick={() => handleForceReassign(c.chatId)}
                                className="text-slate-500 hover:text-slate-800 underline flex items-center gap-1 cursor-pointer border-0 bg-transparent text-[10px] font-sans font-bold"
                              >
                                Reset Queue <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
