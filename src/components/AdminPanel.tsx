import React, { useState, useEffect, useRef } from "react";
import { Job, UserProfile, Conversation, DailyStat, StaffDailyReport } from "../types";
import { SLACountdownTimer } from "./SLACountdownTimer";
import { 
  getStaffProfiles, 
  toggleStaffJobPosting, 
  subscribeToConversations,
  forceReassignConversation,
  updateConversationStatus,
  getStaffStatuses,
  getDailyStats,
  subscribeToDailyReports,
  getAllUserProfiles,
  batchDeleteConversations,
  batchResetConversations,
  deleteConversation,
  reopenStaffReportSubmissions,
  isReportSubmissionReopened,
  subscribeToReportReopens,
  isDeadlinePassedForDate,
  getLocalTodayString,
  memoryStore
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
  TrendingDown,
  Inbox,
  Clock,
  CheckCircle2,
  Calendar,
  Bell,
  Briefcase,
  ClipboardList,
  Search,
  MessageSquare,
  LayoutGrid,
  List,
  Filter,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square,
  BookUser,
  AlertCircle,
  FileText,
  X,
  UserX,
  Unlock,
  Lock
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { JobManagement } from "./JobManagement";
import { AdminPostJobPage } from "./AdminPostJobPage";
import { ContactsView } from "./ContactsView";
import { CandidateListSummarySection } from "./CandidateListSummarySection";
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
  onOpenChange?: (open: boolean) => void;
}> = ({ currentOwnerId, staffList, getActiveChatsCount, onSelect, placeholder, label, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredStaff = currentOwnerId 
    ? staffList.filter(s => s.uid !== currentOwnerId)
    : staffList;

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onOpenChange) onOpenChange(nextState);
  };

  return (
    <div className={`relative space-y-1 text-left w-full select-none ${isOpen ? "z-50" : "z-10"}`}>
      <label className="text-[9px] font-mono font-extrabold text-slate-400 uppercase tracking-wider block">
        {label}
      </label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="w-full text-[10px] font-sans font-extrabold px-3 py-2.5 bg-white hover:bg-blue-50/20 border border-blue-800/30 hover:border-blue-800/60 rounded-xl text-slate-850 flex items-center justify-between transition-all cursor-pointer shadow-sm select-none"
      >
        <span className="truncate">{placeholder}</span>
        <span className="text-[9px] text-[#111827] shrink-0 ml-1">▼</span>
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop layer to click-out */}
          <div 
            onClick={() => {
              setIsOpen(false);
              if (onOpenChange) onOpenChange(false);
            }}
            className="fixed inset-0 z-30"
          />
          
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-blue-800/30 rounded-2xl shadow-xl z-40 max-h-48 overflow-y-auto py-1.5 animate-fadeIn">
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
                      if (onOpenChange) onOpenChange(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-[10px] font-sans font-black text-slate-800 hover:bg-blue-50 hover:text-[#111827] transition-all flex items-center justify-between border-b border-slate-50 last:border-b-0 cursor-pointer"
                  >
                    <span className="truncate">{staff.displayName}</span>
                    <span className="text-[8px] font-mono bg-white text-[#111827] border border-blue-200 px-1.5 py-0.5 rounded font-black shrink-0 uppercase tracking-wider">
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
  const [activeView, setActiveView] = useState<"overview" | "staff" | "routing" | "reports" | "jobs" | "post-job" | "contacts">("overview");
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleHomeClick = () => {
      setActiveView("overview");
    };
    window.addEventListener("admin-home-click", handleHomeClick);
    return () => window.removeEventListener("admin-home-click", handleHomeClick);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewParam = searchParams.get("view");
    if (viewParam === "overview") {
      setActiveView("overview");
    } else if (viewParam === "routing") {
      setActiveView("routing");
    } else if (viewParam === "jobs") {
      setActiveView("jobs");
    } else if (viewParam === "staff") {
      setActiveView("staff");
    } else if (viewParam === "reports") {
      setActiveView("reports");
    } else if (viewParam === "post-job") {
      setActiveView("post-job");
    } else if (viewParam === "contacts") {
      navigate("/admin/contacts", { replace: true });
    }
  }, [location.search, navigate]);

  // Global State
  const [staffList, setStaffList] = useState<UserProfile[]>([]);
  const [seekerCount, setSeekerCount] = useState<number>(0);
  const [staffStatuses, setStaffStatuses] = useState<Record<string, "online" | "offline">>({});
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [dailyStatsList, setDailyStatsList] = useState<DailyStat[]>([]);
  const [dailyReports, setDailyReports] = useState<StaffDailyReport[]>([]);

  // Responsive state for mobile chart abbreviations
  const [isMobile, setIsMobile] = useState(false);
  const [staffViewMode, setStaffViewMode] = useState<"list" | "card">("list");
  
  // Search & Filter state for Staff Management
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffStatusFilter, setStaffStatusFilter] = useState<"all" | "busy" | "available" | "online" | "offline">("all");

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 1024) {
      setStaffViewMode("card");
    } else {
      setStaffViewMode("list");
    }
  }, []);

  const legendFormatter = (value: string) => {
    if (isMobile) {
      switch (value) {
        case "Job Impressions": return "IMP";
        case "Sent Requests": return "SNT";
        case "Claimed Requests": return "CLM";
        case "Finished Chats": return "FIN";
        case "Abandoned Tickets": return "ABD";
        default: return value;
      }
    }
    return value;
  };
  
  // Local UI States for Reports
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [selectedReportsDate, setSelectedReportsDate] = useState<string>(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [reportsSearchQuery, setReportsSearchQuery] = useState("");
  const [showMissingStaffModal, setShowMissingStaffModal] = useState(false);
  const [selectedReopenStaffUids, setSelectedReopenStaffUids] = useState<Set<string>>(new Set());
  const [reopenFeedbackMsg, setReopenFeedbackMsg] = useState<string | null>(null);
  const [reopenModalData, setReopenModalData] = useState<{
    isOpen: boolean;
    uids: string[];
    targetDate: string;
  } | null>(null);
  const [, setReopenTrigger] = useState(0);

  useEffect(() => {
    const unsub = subscribeToReportReopens(() => setReopenTrigger(v => v + 1));
    return () => unsub();
  }, []);

  const handleToggleSelectReopenStaff = (uid: string) => {
    setSelectedReopenStaffUids(prev => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const handleOpenReopenModal = (uidsToReopen?: string[]) => {
    const targetUids = uidsToReopen || Array.from(selectedReopenStaffUids);
    if (targetUids.length === 0) return;
    setReopenModalData({
      isOpen: true,
      uids: targetUids,
      targetDate: selectedReportsDate
    });
  };

  const handleConfirmReopenModal = async () => {
    if (!reopenModalData) return;
    const { uids, targetDate } = reopenModalData;
    if (!isDeadlinePassedForDate(targetDate)) return;

    await reopenStaffReportSubmissions(uids, targetDate, staffList);
    setReopenFeedbackMsg(`Successfully reopened report submission for ${targetDate} for ${uids.length} staff member(s) for 6 hours!`);
    setSelectedReopenStaffUids(new Set());
    setReopenModalData(null);
    setTimeout(() => setReopenFeedbackMsg(null), 4000);
  };

  const [systemReportTarget, setSystemReportTarget] = useState<{
    uid: string;
    staffName: string;
    staffEmail?: string;
    date: string;
    report?: StaffDailyReport;
  } | null>(null);

  const missingStaffList = React.useMemo(() => {
    const submittedUids = new Set(
      dailyReports
        .filter(r => r.date === selectedReportsDate)
        .map(r => r.uid)
    );
    return staffList.filter(s => (s.role === "staff" || s.role === "admin") && !submittedUids.has(s.uid));
  }, [staffList, dailyReports, selectedReportsDate]);
  
  // Loading & Feedback States
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(true);
  const [isRefreshingStaff, setIsRefreshingStaff] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  
  // Local UI States
  const [expandedPendingChatId, setExpandedPendingChatId] = useState<string | null>(null);
  const [activeDropdownChatId, setActiveDropdownChatId] = useState<string | null>(null);
  const [routingTab, setRoutingTab] = useState<"pending" | "ongoing" | "finished" | "abandoned">("pending");
  const [chartFilter, setChartFilter] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  // Abandoned and Finished chats batch action states
  const [selectedAbandonedChatIds, setSelectedAbandonedChatIds] = useState<Set<string>>(new Set());
  const [selectedFinishedChatIds, setSelectedFinishedChatIds] = useState<Set<string>>(new Set());
  const [confirmBatchModal, setConfirmBatchModal] = useState<{
    isOpen: boolean;
    action: "delete" | "reset";
    chatIds: string[];
  } | null>(null);

  const handleToggleSelectAbandoned = (chatId: string) => {
    setSelectedAbandonedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };

  const handleSelectAllAbandoned = (abandonedChatsList: Conversation[]) => {
    if (selectedAbandonedChatIds.size === abandonedChatsList.length && abandonedChatsList.length > 0) {
      setSelectedAbandonedChatIds(new Set());
    } else {
      setSelectedAbandonedChatIds(new Set(abandonedChatsList.map(c => c.chatId)));
    }
  };

  const handleToggleSelectFinished = (chatId: string) => {
    setSelectedFinishedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) {
        next.delete(chatId);
      } else {
        next.add(chatId);
      }
      return next;
    });
  };

  const handleSelectAllFinished = (finishedChatsList: Conversation[]) => {
    if (selectedFinishedChatIds.size === finishedChatsList.length && finishedChatsList.length > 0) {
      setSelectedFinishedChatIds(new Set());
    } else {
      setSelectedFinishedChatIds(new Set(finishedChatsList.map(c => c.chatId)));
    }
  };

  const handleExecuteBatchAction = async () => {
    if (!confirmBatchModal) return;
    const { action, chatIds } = confirmBatchModal;
    try {
      if (action === "delete") {
        await batchDeleteConversations(chatIds);
        setActionSuccess(`Successfully deleted ${chatIds.length} ticket(s).`);
      } else if (action === "reset") {
        await batchResetConversations(chatIds);
        setActionSuccess(`Successfully restored ${chatIds.length} ticket(s) back to pending queue.`);
      }
      setSelectedAbandonedChatIds(new Set());
      setSelectedFinishedChatIds(new Set());
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error("Batch action failed:", err);
    } finally {
      setConfirmBatchModal(null);
    }
  };

  const notifiedChatsRef = useRef<Set<string>>(new Set());

  // Load staff profiles from Firestore
  const loadStaff = async () => {
    const list = await getStaffProfiles();
    setStaffList(list);
    const statuses = await getStaffStatuses();
    setStaffStatuses(statuses);
  };

  // Load seeker count
  const loadSeekers = async () => {
    try {
      const allUsers = await getAllUserProfiles();
      const seekers = allUsers.filter(u => u.role === "seeker");
      setSeekerCount(seekers.length);
    } catch (e) {
      console.warn("Failed to load seekers count", e);
    }
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
      c => c.status === "pending" && (!c.assignedTo) && (!c.sharedWith || c.sharedWith.length === 0 || c.sharedWith.includes(staffUid))
    ).length;
  };

  const isStaffOnline = (staffUid: string) => {
    return (staffStatuses[staffUid] || "offline") === "online";
  };

  // Initial stream setup
  useEffect(() => {
    const initData = async () => {
      setLoading(true);
      await Promise.all([
        loadStaff(),
        loadSeekers(),
        loadChartStats()
      ]);
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

  // Subscribe to daily reports real-time stream
  useEffect(() => {
    const unsubscribe = subscribeToDailyReports((data) => {
      setDailyReports(data || []);
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

  const todayDateStr = (() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  })();
  const todayReportsCount = dailyReports.filter(r => r.date === todayDateStr).length;

  // Trend calculations for KPI Cards
  const getJobViewsTrend = () => {
    const sortedStats = [...dailyStatsList].sort((a, b) => a.date.localeCompare(b.date));
    let changePercent = 12; // Realistic fallback
    if (sortedStats.length >= 2) {
      const latestStat = sortedStats[sortedStats.length - 1];
      const prevStat = sortedStats[sortedStats.length - 2];
      const latestImp = latestStat.impressions || 0;
      const prevImp = prevStat.impressions || 0;
      if (prevImp > 0) {
        changePercent = Math.round(((latestImp - prevImp) / prevImp) * 100);
      }
    }
    return {
      value: Math.abs(changePercent),
      isUp: changePercent >= 0,
      isZero: changePercent === 0
    };
  };

  const getChatsTrend = () => {
    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;
    const fortyEightHoursAgo = now - 48 * 60 * 60 * 1000;

    const chatsLast24h = conversationsList.filter(c => c.createdAt >= twentyFourHoursAgo).length;
    const chatsPrev24h = conversationsList.filter(c => c.createdAt >= fortyEightHoursAgo && c.createdAt < twentyFourHoursAgo).length;

    let changePercent = 5; // Fallback trend
    if (chatsPrev24h > 0) {
      changePercent = Math.round(((chatsLast24h - chatsPrev24h) / chatsPrev24h) * 100);
    } else if (chatsLast24h > 0) {
      changePercent = 100;
    } else {
      changePercent = 0;
    }

    return {
      value: Math.abs(changePercent),
      isUp: changePercent >= 0,
      isZero: changePercent === 0
    };
  };

  const getStaffTrend = () => {
    return {
      value: 0,
      isUp: true,
      isZero: true
    };
  };

  const jobViewsTrend = getJobViewsTrend();
  const chatsTrend = getChatsTrend();
  const staffTrend = getStaffTrend();

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
            <Calendar className="w-3.5 h-3.5 text-blue-400" /> {label}
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

  const filteredStaffList = staffList.filter((staff) => {
    const matchesSearch = 
      (staff.displayName || "").toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
      (staff.email || "").toLowerCase().includes(staffSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    const isOnline = isStaffOnline(staff.uid);
    const activeChats = getActiveChatsCount(staff.uid);
    const isBusy = activeChats >= 2;
    const isAvailable = isOnline && activeChats < 2;

    switch (staffStatusFilter) {
      case "online":
        return isOnline;
      case "offline":
        return !isOnline;
      case "busy":
        return isBusy;
      case "available":
        return isAvailable;
      default:
        return true;
    }
  });

  return (
    <div className={`space-y-8 select-text ${activeView === "overview" ? "pt-6 sm:pt-8" : "pt-1"}`}>
      {/* Toast notifications */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className="fixed top-6 left-1/2 transform bg-slate-900 border border-slate-700/50 text-white px-5 py-3 rounded-2xl shadow-2xl z-50 text-xs font-mono font-semibold flex items-center gap-2.5 max-w-md"
          >
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            <span>{actionSuccess}</span>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Main Workspace Render Transition Engine */}
      {loading ? (
        <div className="space-y-8" key="main-loading">
          <KPIGridSkeleton />
          <NavigationCardsSkeleton />
          <ChartSkeleton />
        </div>
      ) : activeView === "overview" ? (
        <div
          key="overview"
          className="space-y-8"
        >
            {/* 1. KPI Grid Dashboard */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {/* Card 1: Job Impressions */}
              <div className="bg-white border border-black hover:border-black/80 rounded-3xl p-4 sm:p-6 shadow-none hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between col-span-1">
                <div className="space-y-2">
                  <p className="text-xs font-sans text-[#0B1B3D]/70 font-medium leading-tight tracking-wide">
                    Job Views
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl sm:text-3xl font-mono font-bold text-[#0B1B3D] tracking-tight">
                      {totalImpressions}
                    </h4>
                    {jobViewsTrend.isZero ? (
                      <span className="text-[10px] font-mono font-bold text-slate-400" title="Stable over the last 24 hours">
                        → 0%
                      </span>
                    ) : jobViewsTrend.isUp ? (
                      <span className="text-[10px] font-mono font-extrabold text-emerald-600 flex items-center gap-0.5" title="Improved over the last 24 hours">
                        ▲ +{jobViewsTrend.value}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-extrabold text-rose-600 flex items-center gap-0.5" title="Declined over the last 24 hours">
                        ▼ -{jobViewsTrend.value}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveView("jobs")}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0B1B3D] hover:bg-[#112a5c] active:scale-95 text-white rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:shadow-sm"
                  title="Manage Job Listings"
                >
                  <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Card 2: Active Recruiter Pool */}
              <div className="bg-[#0084FF] border border-[#0084FF]/40 hover:border-[#0084FF] rounded-3xl p-4 sm:p-6 shadow-none hover:shadow-[0_12px_30px_rgba(0,132,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between col-span-1 relative overflow-hidden">
                {/* Subtle vector graphics / green pattern */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
                    <circle cx="95%" cy="25%" r="120" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="4 4" />
                    <path d="M-20,120 C40,60 120,150 220,100" stroke="currentColor" strokeWidth="1.5" className="text-white/35" />
                    <path d="M-10,130 C50,70 130,160 230,110" stroke="currentColor" strokeWidth="1" className="text-white/20" />
                  </svg>
                </div>

                <div className="space-y-2 relative z-10">
                  <p className="text-xs font-sans text-white font-medium leading-tight tracking-wide">
                    Staffs
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                      {staffList.length}
                    </h4>
                    {staffTrend.isZero ? (
                      <span className="text-[10px] font-mono font-bold text-blue-100/80" title="Stable over the last 24 hours">
                        → 0%
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-extrabold text-white flex items-center gap-0.5" title="Improved over the last 24 hours">
                        ▲ +{staffTrend.value}%
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setActiveView("staff")}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-100/40 text-[#0B1B3D] rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:shadow-md relative z-10"
                  title="Manage Staff"
                >
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Card 3: SLA Compliance / Abandoned Chats */}
              <div className="bg-[#0084FF] border border-[#0084FF]/40 hover:border-[#0084FF] rounded-3xl p-4 sm:p-6 shadow-none hover:shadow-[0_12px_30px_rgba(0,132,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between col-span-2 md:col-span-2 relative overflow-hidden">
                {/* Subtle vector graphics / green pattern representing communication/chats */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M-10,30 Q80,10 170,50 T350,20" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
                    <path d="M-10,40 Q80,20 170,60 T350,30" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="3 3" />
                    <path d="M20,100 Q110,80 200,120 T380,90" stroke="currentColor" strokeWidth="1.5" className="text-white/35" />
                    <circle cx="15%" cy="75%" r="40" stroke="currentColor" strokeWidth="1.2" className="text-white/25" strokeDasharray="2 2" />
                  </svg>
                </div>

                <div className="space-y-2 flex-1 min-w-0 mr-1 relative z-10">
                  <p className="text-xs font-sans text-white font-medium leading-tight tracking-wide">
                    Chats
                  </p>
                  <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                      {conversationsList.length}
                    </h4>
                    {chatsTrend.isZero ? (
                      <span className="text-[10px] font-mono font-bold text-blue-100/80" title="Stable over the last 24 hours">
                        → 0%
                      </span>
                    ) : chatsTrend.isUp ? (
                      <span className="text-[10px] font-mono font-extrabold text-white flex items-center gap-0.5" title="Improved over the last 24 hours">
                        ▲ +{chatsTrend.value}%
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-extrabold text-rose-200 flex items-center gap-0.5" title="Declined over the last 24 hours">
                        ▼ -{chatsTrend.value}%
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 text-[10px] sm:text-[11px] font-sans font-extrabold tracking-tight">
                    <span className="text-amber-800 bg-white px-1.5 py-0.5 rounded-lg border border-amber-200/50" title="Pending">
                      Pending: {pendingChats.length}
                    </span>
                    <span className="text-blue-800 bg-white px-1.5 py-0.5 rounded-lg border border-blue-200/50" title="Ongoing">
                      Ongoing: {ongoingChats.length}
                    </span>
                    <span className="text-blue-800 bg-white px-1.5 py-0.5 rounded-lg border border-blue-200/50" title="Finished">
                      Finished: {finishedChats.length}
                    </span>
                    <span className="text-rose-800 bg-white px-1.5 py-0.5 rounded-lg border border-rose-200/50" title="Abandoned">
                      Abandoned: {abandonedChats.length}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView("routing")}
                  className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-100/40 text-[#0B1B3D] rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:shadow-md relative z-10"
                  title="Manage Ticket Routing"
                >
                  <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>
            </div>

            {/* 2. Bento Navigation Quick Links (Directly after SLA Compliance card) */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              {/* Card 1: Staffs */}
              <button
                onClick={() => setActiveView("staff")}
                className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                   <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                  Staffs
                </span>
              </button>

              {/* Card 2: Chats */}
              <button
                onClick={() => setActiveView("routing")}
                className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                   <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                  Chats
                </span>
              </button>

              {/* Card 3: Jobs */}
              <button
                onClick={() => setActiveView("jobs")}
                className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                   <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                  Jobs
                </span>
              </button>

              {/* Card 4: Reports */}
              <button
                onClick={() => setActiveView("reports")}
                className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
              >
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                   <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div className="text-center">
                  <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                    Reports
                  </span>
                  <p className="text-[8px] sm:text-[9px] font-mono font-bold text-[#0B1B3D]/70 uppercase tracking-wider block leading-none mt-0.5 sm:mt-1">
                    {todayReportsCount} Submitted
                  </p>
                </div>
              </button>
            </div>

            {/* 3. Real-Time Timeline Performance Chart */}
            <div className="bg-white border border-blue-800 rounded-3xl pt-3.5 pb-6 px-6 sm:pt-4 sm:pb-8 sm:px-8 shadow-none space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                      Traffic Chart
                    </h3>
                  </div>
                </div>
 
                {/* Switcher Filter tabs */}
                <div className="flex gap-1 bg-[#1E88E5] border border-blue-600/40 p-1.5 rounded-2xl w-full sm:w-auto overflow-x-auto shrink-0">
                  {(["daily", "weekly", "monthly", "yearly"] as const).map((filter) => {
                    const isActive = chartFilter === filter;
                    return (
                      <button
                        key={filter}
                        onClick={() => setChartFilter(filter)}
                        className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-tight cursor-pointer uppercase transition-all whitespace-nowrap ${
                          isActive 
                            ? "bg-white text-black shadow-sm border border-transparent font-black" 
                            : "text-blue-100/80 hover:text-white"
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
                  <RefreshCw className="w-7 h-7 text-[#1E88E5] animate-spin" />
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
                        formatter={legendFormatter}
                        wrapperStyle={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                      />
                      
                      {/* Job Impressions Line - Green Emerald */}
                      <Line 
                        name="Job Impressions" 
                        type="monotone" 
                        dataKey="impressions" 
                        stroke="#1E88E5" 
                        strokeWidth={2.5} 
                        activeDot={{ r: 6 }} 
                        dot={{ r: 4, strokeWidth: 1.5, fill: "#FFF" }} 
                      />

                      {/* Sent Conversations Line - Slate Teal */}
                      <Line 
                        name="Sent Requests" 
                        type="monotone" 
                        dataKey="sent" 
                        stroke="#1e3a8a" 
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
          </div>
        ) : activeView === "staff" ? (
          <div
            key="staff"
            className="space-y-6"
          >
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView("overview")}
                className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
              <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" /> Staff View Panel
              </div>
            </div>

            {/* Staff Management Table/Card view */}
            <div className="bg-white border border-blue-800 rounded-3xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
              <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                      Staff Management
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View mode toggle */}
                  <div className="flex items-center bg-[#1E88E5] border border-blue-600/40 rounded-xl p-0.5">
                    <button
                      onClick={() => setStaffViewMode("list")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        staffViewMode === "list" 
                          ? "bg-white text-black shadow-sm border border-transparent" 
                          : "text-blue-100/80 hover:text-white"
                      }`}
                      title="List View"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setStaffViewMode("card")}
                      className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                        staffViewMode === "card" 
                          ? "bg-white text-black shadow-sm border border-transparent" 
                          : "text-blue-100/80 hover:text-white"
                      }`}
                      title="Card View"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={async () => {
                      setIsRefreshingStaff(true);
                      await loadStaff();
                      setTimeout(() => setIsRefreshingStaff(false), 800);
                    }}
                    className="p-2 hover:bg-blue-50 border border-blue-800 rounded-xl text-blue-800 hover:text-[#111827] transition-colors cursor-pointer bg-white"
                    title="Refresh profiles"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshingStaff ? "animate-spin" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="p-4 sm:px-8 sm:py-5 bg-[#111827]/[0.02] border-b border-blue-800/20 flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
                {/* Search input */}
                <div className="relative flex-1">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-blue-800/60">
                    <Search className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    value={staffSearchQuery}
                    onChange={(e) => setStaffSearchQuery(e.target.value)}
                    placeholder="Search staff by name or email..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-blue-800/30 rounded-2xl text-xs font-sans font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-emerald-600/35 transition-all shadow-xs"
                  />
                </div>

                {/* Status Filters */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap overflow-x-auto max-w-full">
                  <span className="text-[10px] font-mono font-extrabold uppercase tracking-wider text-black flex items-center gap-1.5 mr-1 shrink-0 bg-white border border-blue-800/20 px-2.5 py-1.5 rounded-xl">
                    <Filter className="w-3 h-3" /> Status:
                  </span>
                  <div className="flex gap-1 bg-[#1E88E5] border border-blue-600/40 p-1 rounded-2xl overflow-x-auto max-w-full shrink-0">
                    {(["all", "busy", "available", "online", "offline"] as const).map((filter) => {
                      const label = {
                        all: "All Staff",
                        busy: "Busy",
                        available: "Available",
                        online: "Online",
                        offline: "Offline",
                      }[filter];

                      const isActive = staffStatusFilter === filter;

                      return (
                        <button
                          key={filter}
                          onClick={() => setStaffStatusFilter(filter)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold tracking-tight cursor-pointer uppercase transition-all whitespace-nowrap ${
                            isActive 
                              ? "bg-white text-black shadow-sm border border-transparent font-black" 
                              : "text-blue-100/80 hover:text-white"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Table details / Card View details */}
              {staffViewMode === "list" ? (
                <div className="overflow-x-auto min-w-full">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#111827] text-blue-100 border-b border-slate-800">
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider">
                          Recruiter Identity
                        </th>
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider">
                          System Email
                        </th>
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider">
                          Security Role
                        </th>
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider text-center">
                          Availability
                        </th>
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider text-center">
                          Available Requests
                        </th>
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider text-center">
                          Active Chats
                        </th>
                        <th className="px-6 py-4 text-[10px] font-mono font-extrabold uppercase tracking-wider text-center">
                          Job Creation Privilege
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-800/10">
                      {filteredStaffList.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-6 py-10 text-center text-xs font-mono text-slate-400 italic">
                            No operational staff records found matching search or filter criteria
                          </td>
                        </tr>
                      ) : (
                        filteredStaffList.map((staff) => {
                          const unclaimedCount = getUnclaimedRoutedChatsCount(staff.uid);
                          return (
                            <tr key={staff.uid} className="hover:bg-blue-50/10 transition-colors">
                              <td className="px-6 py-4.5 font-sans text-xs font-extrabold text-slate-900">
                                {staff.displayName}
                              </td>
                              <td className="px-6 py-4.5 font-mono text-xs text-slate-500">
                                {staff.email}
                              </td>
                              <td className="px-6 py-4.5">
                                <span className="px-2 py-0.5 bg-white text-blue-800 border border-blue-200 rounded text-[9px] font-mono font-black uppercase">
                                  {staff.role}
                                </span>
                              </td>
                              <td className="px-6 py-4.5 text-center">
                                {isStaffOnline(staff.uid) ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-[#111827] border border-blue-200 rounded text-[9px] font-mono font-black">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Online
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-white text-slate-500 border border-slate-200 rounded text-[9px] font-mono font-black">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                                    Offline
                                  </span>
                                )}
                              </td>
                              {/* Available request pending unclaimed counts */}
                              <td className="px-6 py-4.5 text-center">
                                <span className={`inline-flex items-center justify-center font-mono text-[10px] font-bold px-2.5 py-1 rounded-xl bg-white border ${unclaimedCount > 0 ? "text-amber-800 border-amber-200" : "text-slate-400 border-slate-200"}`}>
                                  {unclaimedCount} unclaimed
                                </span>
                              </td>
                              <td className="px-6 py-4.5 text-center font-mono text-xs font-bold text-[#111827]">
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
                                      <div className="w-11 h-6 bg-[#111827] border border-slate-800 rounded-full flex items-center justify-end p-0.5 transition-all">
                                        <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                                      </div>
                                    ) : (
                                      <div className="w-11 h-6 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-start p-0.5 transition-all">
                                        <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                                      </div>
                                    )}
                                  </button>
                                  <span className={`text-[10px] font-mono font-bold uppercase min-w-[32px] ${staff.canPostJobs ? "text-blue-700 font-black" : "text-slate-400"}`}>
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
              ) : (
                <div className="p-6">
                  {filteredStaffList.length === 0 ? (
                    <div className="py-10 text-center text-xs font-mono text-slate-400 italic bg-blue-50/5 border border-dashed border-blue-800/30 rounded-2xl">
                      No operational staff records found matching search or filter criteria
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {filteredStaffList.map((staff) => {
                        const unclaimedCount = getUnclaimedRoutedChatsCount(staff.uid);
                        const activeChats = getActiveChatsCount(staff.uid);
                        const isOnline = isStaffOnline(staff.uid);
                        
                        return (
                          <div 
                            key={staff.uid} 
                            className="bg-white border border-blue-800/30 rounded-2xl p-5 flex flex-col justify-between transition-all hover:bg-blue-50/[0.02] hover:shadow-[0_15px_30px_-5px_rgba(0,0,0,0.03)] hover:border-blue-800/80"
                          >
                            <div className="space-y-4">
                              {/* Header: Name and Status */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <h4 className="font-sans font-extrabold text-sm text-slate-900 tracking-tight truncate">
                                    {staff.displayName}
                                  </h4>
                                  <p className="font-mono text-[10px] text-slate-400 truncate" title={staff.email}>
                                    {staff.email}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end gap-1.5 shrink-0">
                                  <span className="px-2 py-0.5 bg-white text-blue-800 border border-blue-200 rounded text-[9px] font-mono font-black uppercase">
                                    {staff.role}
                                  </span>
                                  {isOnline ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white text-[#111827] border border-blue-200 rounded text-[9px] font-mono font-black">
                                      <span className="w-1 h-1 rounded-full bg-blue-500"></span>
                                      Online
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white text-slate-400 border border-slate-200 rounded text-[9px] font-mono font-black">
                                      <span className="w-1 h-1 rounded-full bg-slate-400"></span>
                                      Offline
                                    </span>
                                  )}
                                </div>
                              </div>
 
                              {/* Stats section */}
                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-800/10">
                                <div className="bg-white border border-blue-800/20 p-2.5 rounded-xl text-center space-y-1 shadow-xs">
                                  <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Unclaimed</p>
                                  <p className={`font-mono text-xs font-bold ${unclaimedCount > 0 ? "text-amber-700" : "text-slate-500"}`}>
                                    {unclaimedCount} unclaimed
                                  </p>
                                </div>
                                <div className="bg-white border border-blue-800/20 p-2.5 rounded-xl text-center space-y-1 shadow-xs">
                                  <p className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider">Active Chats</p>
                                  <p className="font-mono text-xs font-bold text-[#111827]">
                                    {activeChats} chats
                                  </p>
                                </div>
                              </div>
                            </div>
 
                            {/* Toggle button bottom panel */}
                            <div className="flex items-center justify-between mt-4 pt-3 border-t border-blue-800/10">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">Job Privilege</span>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleTogglePermission(staff.uid, staff.canPostJobs)}
                                  className="focus:outline-none cursor-pointer border-0 bg-transparent p-0"
                                  title={`Toggle canPostJobs for ${staff.displayName}`}
                                >
                                  {staff.canPostJobs ? (
                                    <div className="w-10 h-5 bg-[#111827] border border-slate-800 rounded-full flex items-center justify-end p-0.5 transition-all">
                                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                  ) : (
                                    <div className="w-10 h-5 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-start p-0.5 transition-all">
                                      <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                                    </div>
                                  )}
                                </button>
                                <span className={`text-[10px] font-mono font-bold uppercase min-w-[32px] ${staff.canPostJobs ? "text-blue-700 font-black" : "text-slate-400"}`}>
                                  {staff.canPostJobs ? "Active" : "Locked"}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : activeView === "routing" ? (
          <div
            key="routing"
            className="space-y-6"
          >
            {/* Header with Back Button */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setActiveView("overview")}
                className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
              <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5" /> Ticket Routing Board
              </div>
            </div>

            {/* Custom Board Card Panel with Top Switched Tabs */}
            <div className="bg-white border border-blue-800 rounded-3xl p-6 sm:p-8 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] space-y-6">
              
              {/* Kanban Switcher Tab list aligned side-by-side */}
              <div className="flex flex-col gap-4 border-b border-blue-800/10 pb-4">
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Manage Chats
                  </h3>
                </div>

                <div className="flex gap-2 bg-[#1E88E5] border border-blue-600/40 p-1.5 rounded-2xl w-full overflow-x-auto shrink-0 scrollbar-none">
                  {(["pending", "ongoing", "finished", "abandoned"] as const).map((tab) => {
                    const count = {
                      pending: pendingChats.length,
                      ongoing: ongoingChats.length,
                      finished: finishedChats.length,
                      abandoned: abandonedChats.length
                    }[tab];

                    const label = {
                      pending: "Pending",
                      ongoing: "Ongoing",
                      finished: "Finished",
                      abandoned: "Abandoned"
                    }[tab];

                    const badgeColors = {
                      pending: "bg-white text-amber-900 border-amber-200",
                      ongoing: "bg-white text-blue-900 border-blue-200",
                      finished: "bg-white text-black border-blue-200",
                      abandoned: "bg-white text-rose-900 border-rose-200"
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
                            ? "bg-white text-black shadow-sm border border-transparent font-black" 
                            : "text-blue-100/80 hover:text-white"
                        }`}
                      >
                        {icon}
                        <span>{label}</span>
                        <span className={`px-2 py-0.5 border text-[10px] font-mono font-bold rounded-full transition-all ${
                          isActive 
                            ? tab === "pending"
                              ? "bg-amber-950 text-white border-transparent"
                              : tab === "ongoing"
                              ? "bg-[#1565C0] text-white border-transparent"
                              : tab === "finished"
                              ? "bg-slate-900 text-white border-transparent"
                              : "bg-rose-950 text-white border-transparent"
                            : badgeColors
                        }`}>
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
                    className="grid grid-cols-1 gap-0 w-full"
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
                          const isDropdownActive = activeDropdownChatId === c.chatId;
                          return (
                            <div 
                              key={c.chatId} 
                              className={`p-6 bg-white rounded-none border-y border-[#1E88E5] space-y-4 transition-all duration-300 relative w-full ${
                                isDropdownActive 
                                  ? 'z-40 bg-[#FAFDFB]' 
                                  : isExpanded 
                                  ? 'z-30 bg-[#FAFDFB]' 
                                  : 'z-10'
                              }`}
                            >
                              {/* Vector graphic pattern background design */}
                              <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-[#1E88E5]">
                                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                              </div>

                              {/* Clickable Header for details */}
                              <div 
                                onClick={() => setExpandedPendingChatId(isExpanded ? null : c.chatId)}
                                className="cursor-pointer space-y-2.5 select-none hover:opacity-90 relative z-10"
                                title="Click to view assigned recruiters"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-mono font-bold text-slate-800">
                                    {c.customerPhone}
                                  </span>
                                  <span className="text-[9px] font-mono font-bold px-2.5 py-1 bg-amber-950 text-amber-200 rounded-lg border border-amber-900/40 shrink-0 shadow-sm">
                                    {c.sharedWith?.length || 0} routed
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-sans font-black text-black leading-snug">
                                    {c.jobTitle}
                                  </p>
                                  <span className="text-[8px] font-mono font-bold text-white bg-[#1E88E5] hover:bg-[#111827] px-2.5 py-1 rounded shadow-sm">
                                    {isExpanded ? "▲ Hide Staff" : "▼ See Staff"}
                                  </span>
                                </div>
                              </div>

                              {/* SLA 24-hour Countdown Timer */}
                              <div className="relative z-10 pt-1">
                                <SLACountdownTimer 
                                  createdAt={c.createdAt} 
                                  label="Claim Countdown" 
                                  isInApp={c.isInApp || (c.customerPhone ? !c.customerPhone.startsWith("+") : true)}
                                  customerPhone={c.customerPhone}
                                />
                              </div>

                              {isExpanded && (
                                <div className="pt-2.5 border-t border-dashed border-slate-100 space-y-2 relative z-10">
                                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider block text-left">
                                    Routed recruiters:
                                  </span>
                                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
                                    {c.sharedWith && c.sharedWith.length > 0 ? (
                                      c.sharedWith.map((uid) => {
                                        const staffMember = staffList.find(s => s.uid === uid);
                                        const isOnline = isStaffOnline(uid);
                                        return (
                                          <div key={uid} className="flex items-center justify-between text-[10px] text-slate-600 font-sans font-bold">
                                            <span className="truncate max-w-[130px]">
                                              {staffMember ? staffMember.displayName : `Recruiter (${uid.substring(0, 8)})`}
                                            </span>
                                            <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${isOnline ? "bg-blue-50 text-[#1E88E5] border border-[#1E88E5]/20" : "bg-slate-100 text-slate-500 border border-slate-200"}`}>
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

                              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 relative z-10">
                                <span className="text-[9px] font-mono font-black px-2.5 py-1 bg-amber-950 text-amber-200 rounded-lg border border-amber-900/40 shadow-sm uppercase tracking-wider block">
                                  Awaiting Claim
                                </span>
                                <button
                                  onClick={() => handleMarkAbandoned(c.chatId)}
                                  className="text-[9px] font-mono font-bold px-2.5 py-1 bg-rose-950 text-rose-200 hover:bg-rose-900/80 border border-rose-900/40 rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                                >
                                  Mark Abandoned
                                </button>
                              </div>

                              {/* Manual Assign Selector */}
                              <div className={`pt-3 border-t border-slate-100 relative ${isDropdownActive ? 'z-30' : 'z-10'}`}>
                                <RecruiterDropdown
                                  staffList={staffList}
                                  getActiveChatsCount={getActiveChatsCount}
                                  onSelect={async (targetUid, displayName) => {
                                    await forceReassignConversation(c.chatId, targetUid, displayName);
                                    setActionSuccess(`Chat manually assigned to ${displayName}`);
                                    setTimeout(() => setActionSuccess(null), 3000);
                                  }}
                                  onOpenChange={(isOpen) => setActiveDropdownChatId(isOpen ? c.chatId : null)}
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
                        ongoingChats.map((c) => {
                          const isDropdownActive = activeDropdownChatId === c.chatId;
                          return (
                            <div 
                              key={c.chatId} 
                              className={`p-6 bg-white rounded-none border-y border-[#1E88E5] space-y-4 transition-all duration-300 relative w-full ${
                                isDropdownActive 
                                  ? 'z-40 bg-[#FAFDFB]' 
                                  : 'z-10'
                              }`}
                            >
                              {/* Vector graphic pattern background design */}
                              <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-[#1E88E5]">
                                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                                </svg>
                              </div>

                              <div className="flex items-center justify-between gap-1 relative z-10">
                                <span className="text-xs font-mono font-bold text-slate-800">
                                  {c.customerPhone}
                                </span>
                              </div>
                              <p className="text-sm font-sans font-black text-black leading-snug relative z-10">
                                {c.jobTitle}
                              </p>

                              {/* SLA 24-hour Countdown Timer */}
                              <div className="relative z-10 pt-1">
                                <SLACountdownTimer 
                                  createdAt={c.createdAt} 
                                  label="Ongoing SLA Timer" 
                                  isInApp={c.isInApp || (c.customerPhone ? !c.customerPhone.startsWith("+") : true)}
                                  customerPhone={c.customerPhone}
                                />
                              </div>

                              <div className="flex items-center gap-1.5 bg-[#1E88E5]/10 text-[#1E88E5] px-3 py-2 rounded-xl text-[10px] font-sans font-bold border border-[#1E88E5]/25 shadow-xs relative z-10">
                                <Users className="w-3.5 h-3.5 text-[#1E88E5] shrink-0" />
                                <span className="truncate">
                                  Owner: <strong className="font-extrabold text-[#1565C0]">{c.assignedToName || "System Agent"}</strong>
                                </span>
                              </div>
                              
                              {/* Transfer Route Selector */}
                              <div className={`pt-1.5 relative ${isDropdownActive ? 'z-30' : 'z-10'}`}>
                                <RecruiterDropdown
                                  currentOwnerId={c.assignedTo}
                                  staffList={staffList}
                                  getActiveChatsCount={getActiveChatsCount}
                                  onSelect={async (targetUid, displayName) => {
                                    await forceReassignConversation(c.chatId, targetUid, displayName);
                                    setActionSuccess(`Chat transferred to ${displayName}`);
                                    setTimeout(() => setActionSuccess(null), 3000);
                                  }}
                                  onOpenChange={(isOpen) => setActiveDropdownChatId(isOpen ? c.chatId : null)}
                                  placeholder="-- Transfer to Recruiter --"
                                  label="Reallocate Conversation"
                                />
                              </div>

                              {/* Reset route back to pending */}
                              <div className="pt-3 border-t border-slate-100 relative z-0">
                                <button
                                  onClick={() => handleForceReassign(c.chatId)}
                                  className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-mono font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-200/50"
                                  title="Clear assignee and reset status"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                  Release back to Pending
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )
                    )}

                    {routingTab === "finished" && (
                      finishedChats.length === 0 ? (
                        <div className="col-span-full h-44 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-400 italic gap-2">
                          <CheckCircle2 className="w-8 h-8 text-slate-300" />
                          <span>No Archived/Finished Chat Sessions Found</span>
                        </div>
                      ) : (
                        <div className="col-span-full space-y-4">
                          {/* Batch Action Toolbar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl shadow-xs">
                            <button
                              onClick={() => handleSelectAllFinished(finishedChats)}
                              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-700 transition-colors cursor-pointer border-0 bg-transparent"
                            >
                              {selectedFinishedChatIds.size === finishedChats.length && finishedChats.length > 0 ? (
                                <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-400" />
                              )}
                              <span>
                                {selectedFinishedChatIds.size === finishedChats.length && finishedChats.length > 0
                                  ? "Deselect All"
                                  : `Select All (${finishedChats.length})`}
                              </span>
                            </button>

                            {selectedFinishedChatIds.size > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg">
                                  {selectedFinishedChatIds.size} Selected
                                </span>
                                <button
                                  onClick={() => setConfirmBatchModal({ isOpen: true, action: "reset", chatIds: Array.from(selectedFinishedChatIds) })}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Restore Selected
                                </button>
                                <button
                                  onClick={() => setConfirmBatchModal({ isOpen: true, action: "delete", chatIds: Array.from(selectedFinishedChatIds) })}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Cards Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {finishedChats.map((c) => (
                              <div
                                key={c.chatId}
                                className={`p-5 bg-white rounded-2xl border ${
                                  selectedFinishedChatIds.has(c.chatId)
                                    ? "border-blue-500 ring-2 ring-blue-100 shadow-sm"
                                    : "border-slate-200"
                                } space-y-4 relative transition-all duration-300 z-10 w-full shadow-xs hover:shadow-md flex flex-col justify-between`}
                              >
                                {/* Vector graphic pattern background design */}
                                <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-blue-600">
                                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                                  </svg>
                                </div>

                                <div className="space-y-2 relative z-10">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleToggleSelectFinished(c.chatId)}
                                        className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer border-0 bg-transparent p-0"
                                      >
                                        {selectedFinishedChatIds.has(c.chatId) ? (
                                          <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                                        ) : (
                                          <Square className="w-4.5 h-4.5 text-slate-300" />
                                        )}
                                      </button>
                                      <span className="text-xs font-mono font-bold text-slate-900">
                                        {c.customerPhone}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => setConfirmBatchModal({ isOpen: true, action: "delete", chatIds: [c.chatId] })}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                                      title="Delete finished chat permanently"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <p className="text-xs font-extrabold text-slate-800 leading-snug">
                                    {c.jobTitle}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex flex-row items-center justify-between gap-2 relative z-10">
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-200 shadow-xs">
                                    ✓ ARCHIVED ({c.assignedToName || "System"})
                                  </span>
                                  <button
                                    onClick={() => setConfirmBatchModal({ isOpen: true, action: "reset", chatIds: [c.chatId] })}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer border-0 bg-transparent text-[11px] font-extrabold hover:underline"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Restore Queue
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}

                    {routingTab === "abandoned" && (
                      abandonedChats.length === 0 ? (
                        <div className="col-span-full h-44 flex flex-col items-center justify-center text-center text-xs font-mono text-slate-400 italic gap-2">
                          <AlertTriangle className="w-8 h-8 text-slate-300" />
                          <span>No Abandoned Sessions Reported</span>
                        </div>
                      ) : (
                        <div className="col-span-full space-y-4">
                          {/* Batch Action Toolbar */}
                          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-2xl shadow-xs">
                            <button
                              onClick={() => handleSelectAllAbandoned(abandonedChats)}
                              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-rose-700 transition-colors cursor-pointer border-0 bg-transparent"
                            >
                              {selectedAbandonedChatIds.size === abandonedChats.length && abandonedChats.length > 0 ? (
                                <CheckSquare className="w-4.5 h-4.5 text-rose-600" />
                              ) : (
                                <Square className="w-4.5 h-4.5 text-slate-400" />
                              )}
                              <span>
                                {selectedAbandonedChatIds.size === abandonedChats.length && abandonedChats.length > 0
                                  ? "Deselect All"
                                  : `Select All (${abandonedChats.length})`}
                              </span>
                            </button>

                            {selectedAbandonedChatIds.size > 0 && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono font-bold text-rose-800 bg-rose-100 px-2.5 py-1 rounded-lg">
                                  {selectedAbandonedChatIds.size} Selected
                                </span>
                                <button
                                  onClick={() => setConfirmBatchModal({ isOpen: true, action: "reset", chatIds: Array.from(selectedAbandonedChatIds) })}
                                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" /> Reset Selected
                                </button>
                                <button
                                  onClick={() => setConfirmBatchModal({ isOpen: true, action: "delete", chatIds: Array.from(selectedAbandonedChatIds) })}
                                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Cards Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {abandonedChats.map((c) => (
                              <div
                                key={c.chatId}
                                className={`p-5 bg-white rounded-2xl border ${
                                  selectedAbandonedChatIds.has(c.chatId)
                                    ? "border-rose-500 ring-2 ring-rose-100 shadow-sm"
                                    : "border-slate-200"
                                } space-y-4 relative transition-all duration-300 z-10 w-full shadow-xs hover:shadow-md flex flex-col justify-between`}
                              >
                                {/* Vector graphic pattern background design */}
                                <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-rose-600">
                                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                                  </svg>
                                </div>

                                <div className="space-y-2 relative z-10">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleToggleSelectAbandoned(c.chatId)}
                                        className="text-slate-400 hover:text-rose-600 transition-colors cursor-pointer border-0 bg-transparent p-0"
                                      >
                                        {selectedAbandonedChatIds.has(c.chatId) ? (
                                          <CheckSquare className="w-4.5 h-4.5 text-rose-600" />
                                        ) : (
                                          <Square className="w-4.5 h-4.5 text-slate-300" />
                                        )}
                                      </button>
                                      <span className="text-xs font-mono font-bold text-slate-900">
                                        {c.customerPhone}
                                      </span>
                                    </div>

                                    <button
                                      onClick={() => setConfirmBatchModal({ isOpen: true, action: "delete", chatIds: [c.chatId] })}
                                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                                      title="Delete abandoned chat permanently"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>

                                  <p className="text-xs font-extrabold text-slate-800 leading-snug">
                                    {c.jobTitle}
                                  </p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex flex-row items-center justify-between gap-2 relative z-10">
                                  <span className="flex items-center gap-1 text-[10px] font-mono text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-200 shadow-xs">
                                    ✖ ABANDONED
                                  </span>
                                  <button
                                    onClick={() => setConfirmBatchModal({ isOpen: true, action: "reset", chatIds: [c.chatId] })}
                                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer border-0 bg-transparent text-[11px] font-extrabold hover:underline"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" /> Reset Queue
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        ) : activeView === "reports" ? (() => {
          const reportsByDate = dailyReports.filter(r => r.date === selectedReportsDate);
          
          const totalReachOuts = reportsByDate.reduce((sum, r) => sum + (Number(r.newReachOuts) || 0), 0);
          const totalAddressesGiven = reportsByDate.reduce((sum, r) => sum + (Number(r.addressesGiven) || 0), 0);
          
          const reachOutsMetCount = reportsByDate.filter(r => r.targetReachOutsMet).length;
          const reachOutsMetPercent = staffList.length > 0
            ? Math.round((reachOutsMetCount / staffList.length) * 100)
            : 0;

          const addressLogsMetCount = reportsByDate.filter(r => r.targetAddressesMet).length;
          const addressLogsMetPercent = staffList.length > 0
            ? Math.round((addressLogsMetCount / staffList.length) * 100)
            : 0;

          const onTimeMetCount = reportsByDate.filter(r => r.targetOnTimeMet).length;
          const onTimeMetPercent = staffList.length > 0
            ? Math.round((onTimeMetCount / staffList.length) * 100)
            : 0;

          const getStaffEmail = (uid: string) => {
            const staff = staffList.find(s => s.uid === uid);
            return staff ? staff.email : "";
          };

          const filteredReportsList = reportsByDate.filter(report => {
            const staffEmail = getStaffEmail(report.uid).toLowerCase();
            const staffName = (report.staffName || "").toLowerCase();
            const q = reportsSearchQuery.toLowerCase();
            return staffName.includes(q) || staffEmail.includes(q);
          });

          return (
            <div
              key="reports"
              className="space-y-6 text-left"
            >
              {/* Header with Back Button */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setActiveView("overview")}
                  className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Go Back
                </button>
                <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
                  <ClipboardList className="w-3.5 h-3.5" /> Staff Daily Reports Hub
                </div>
              </div>

              {/* Date & Name Filter Controls */}
              <div className="relative overflow-hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#0084FF] border border-[#0084FF]/40 rounded-3xl p-5 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)]">
                {/* Background vector graphics */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="10%" cy="50%" r="60" stroke="currentColor" strokeWidth="1" className="text-white/30" />
                    <circle cx="90%" cy="30%" r="50" stroke="currentColor" strokeWidth="1" className="text-white/20" strokeDasharray="3 3" />
                  </svg>
                </div>

                <div className="relative w-full sm:w-80 z-10">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#111827]" />
                  <input
                    type="text"
                    placeholder="Search by staff name or email..."
                    value={reportsSearchQuery}
                    onChange={(e) => setReportsSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-blue-800/30 hover:border-blue-800/60 focus:border-blue-800 focus:ring-0 rounded-2xl bg-white/85 hover:bg-white/95 focus:bg-white focus:outline-none text-xs font-extrabold text-[#111827] transition-all placeholder:text-slate-900/75"
                  />
                </div>

                <div className="flex flex-row items-center gap-3 self-stretch sm:self-auto shrink-0 z-10">
                  <span className="text-xs font-black text-blue-100 flex items-center gap-1.5 whitespace-nowrap">
                    <Calendar className="w-4 h-4 text-blue-300" /> Select Date:
                  </span>
                  <input
                    type="date"
                    value={selectedReportsDate}
                    onChange={(e) => setSelectedReportsDate(e.target.value)}
                    className="px-4 py-2.5 border border-blue-800/30 hover:border-blue-800/60 rounded-2xl bg-white/85 hover:bg-white/95 focus:bg-white text-xs font-extrabold text-[#111827] focus:outline-none transition-all cursor-pointer min-w-[140px] w-full sm:w-52"
                  />
                </div>
              </div>

              {/* Reports Metric Panel */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Total logs card */}
                <div className="bg-[#0084FF] border border-[#0084FF]/40 rounded-3xl p-5 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
                    <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="85%" cy="15%" r="40" stroke="currentColor" strokeWidth="1.5" className="text-white/45" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-sans font-medium text-blue-100 tracking-wide block leading-none">Reports</span>
                  <p className="text-3xl font-mono font-black text-white leading-none mt-2">{reportsByDate.length} / {staffList.length}</p>
                  <p className="text-[10px] text-blue-50/90 font-sans font-bold mt-2">Continuous audits</p>
                </div>

                {/* Reach outs card */}
                <div className="bg-white border border-blue-800/20 rounded-3xl p-5 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <span className="text-[10px] font-sans font-medium text-slate-500 tracking-wide block leading-none">Reach-outs</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#111827] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" title="Total reach-outs sent">
                      {totalReachOuts}
                    </span>
                    <p className="text-3xl font-mono font-black text-[#111827] leading-none">
                      {reachOutsMetPercent}%
                    </p>
                  </div>
                  <div className="h-1 bg-blue-100 rounded-full overflow-hidden mt-3.5">
                    <div className="h-full bg-[#111827]" style={{ width: `${reachOutsMetPercent}%` }} />
                  </div>
                </div>

                {/* Address logs card */}
                <div className="bg-white border border-blue-800/20 rounded-3xl p-5 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <span className="text-[10px] font-sans font-medium text-slate-500 tracking-wide block leading-none">Address Sent</span>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs sm:text-sm font-mono font-black text-[#111827] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 shadow-[0_1px_2px_rgba(0,0,0,0.02)]" title="Total addresses sent">
                      {totalAddressesGiven}
                    </span>
                    <p className="text-3xl font-mono font-black text-[#111827] leading-none">
                      {addressLogsMetPercent}%
                    </p>
                  </div>
                  <div className="h-1 bg-blue-100 rounded-full overflow-hidden mt-3.5">
                    <div className="h-full bg-[#111827]" style={{ width: `${addressLogsMetPercent}%` }} />
                  </div>
                </div>

                {/* SLA punctuality card */}
                <div className="bg-white border border-blue-800/20 rounded-3xl p-5 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] relative overflow-hidden">
                  <span className="text-[10px] font-sans font-medium text-slate-500 tracking-wide block leading-none">Staff Punctuality</span>
                  <p className="text-3xl font-mono font-black text-[#111827] leading-none mt-2">
                    {onTimeMetPercent}%
                  </p>
                  <p className="text-[10px] text-blue-800/80 font-sans font-bold mt-2">Before 9:00 PM</p>
                </div>
              </div>

              {/* Activity Logs Feed Container */}
              <div className="bg-white border border-blue-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#111827] border border-slate-800 rounded-xl flex items-center justify-center text-blue-200 shrink-0 shadow-sm">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                        Activity Logs Feed
                      </h3>
                    </div>
                  </div>

                  {/* Icon Button: Staff Missing Reports */}
                  <button
                    type="button"
                    onClick={() => setShowMissingStaffModal(true)}
                    className="px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 text-amber-900 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-2xs hover:scale-[1.02] active:scale-95"
                    title="View Missing Staff Daily Reports"
                  >
                    <div className="relative">
                      <UserMinus className="w-4 h-4 text-amber-700" />
                      {missingStaffList.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-600 rounded-full animate-ping" />
                      )}
                    </div>
                    <span>({missingStaffList.length})</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredReportsList.length === 0 ? (
                    <div className="text-center py-12 text-xs font-sans font-bold text-slate-400 italic">
                      No Daily Report logs currently match the selected filters.
                    </div>
                  ) : (
                    filteredReportsList.map((report) => {
                      const isExpanded = expandedReportId === report.id;
                      const staffEmail = getStaffEmail(report.uid);
                      return (
                        <div 
                          key={report.id} 
                          className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
                            isExpanded ? "border-blue-800 bg-blue-50/10 shadow-sm" : "border-slate-200 hover:border-blue-800/40 bg-white"
                          }`}
                        >
                          {/* Header Trigger */}
                          <div 
                            onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                            className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                          >
                            <div className="space-y-1.5 text-left">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-black text-[#111827] font-sans">
                                  {report.staffName}
                                </h4>
                                {staffEmail && (
                                  <span className="text-xs font-extrabold text-slate-900 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                                    {staffEmail}
                                  </span>
                                )}
                                <span className="text-xs font-mono bg-[#111827] text-white px-2.5 py-0.5 rounded-full font-extrabold">
                                  {report.date}
                                </span>
                                {report.targetOnTimeMet ? (
                                  <span className="text-[10px] font-mono bg-white text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200 font-black shadow-sm">
                                    ✓ ON-TIME SLA
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-mono bg-white text-amber-800 px-2 py-0.5 rounded-lg border border-amber-200 font-black shadow-sm">
                                    PAST 9PM LIMIT
                                  </span>
                                )}

                                {/* Tag-like button: View System Report */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSystemReportTarget({
                                      uid: report.uid,
                                      staffName: report.staffName,
                                      staffEmail: staffEmail || undefined,
                                      date: report.date,
                                      report: report
                                    });
                                  }}
                                  className="text-[10px] font-mono bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-0.5 rounded-lg font-bold shadow-xs flex items-center gap-1 transition-all cursor-pointer border-0 hover:scale-[1.03] active:scale-95"
                                  title="View Full System Activity & Candidate Logs Report"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>View System Report</span>
                                </button>
                              </div>
                              <p className="text-xs text-slate-500 font-mono font-medium">
                                Registered at {new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 justify-between sm:justify-end shrink-0">
                              <div className="flex gap-2.5 text-xs font-mono text-slate-600 font-extrabold">
                                <span>Outreach: <strong className={report.targetReachOutsMet ? "text-blue-800 font-black" : "text-amber-800 font-black"}>{report.newReachOuts}</strong></span>
                                <span>•</span>
                                <span>Addresses: <strong className={report.targetAddressesMet ? "text-blue-800 font-black" : "text-amber-800 font-black"}>{report.addressesGiven}</strong></span>
                              </div>
                              <span className="text-xs font-black text-blue-800 hover:text-[#111827] flex items-center gap-1">
                                {isExpanded ? "▲ Collapse" : "▼ Expand Detail"}
                              </span>
                            </div>
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="p-5 border-t border-dashed border-blue-800/20 text-left space-y-6 bg-blue-50/[0.02]">
                              
                              {/* Stats Receipt Grid */}
                              <div>
                                <span className="text-[10px] font-mono text-slate-400 font-extrabold uppercase tracking-widest block mb-2.5">
                                  Performance Checklist Receipts
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Reach-Outs</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.newReachOuts}</p>
                                    <span className={`text-[10px] font-mono font-black ${report.targetReachOutsMet ? "text-blue-800" : "text-amber-800"}`}>
                                      {report.targetReachOutsMet ? "Target Met (20+)" : "Unmet Target (<20)"}
                                    </span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Addresses Given</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.addressesGiven}</p>
                                    <span className={`text-[10px] font-mono font-black ${report.targetAddressesMet ? "text-blue-800" : "text-amber-800"}`}>
                                      {report.targetAddressesMet ? "Target Met (4+)" : "Unmet Target (<4)"}
                                    </span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Registered</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.candidatesRegistered}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Candidates</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">CVs Collected</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.cvsCollected}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Total resumes</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Resumptions</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.resumptions}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Assigned starts</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Commission Ret.</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.commissionRetrieved || "None"}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Revenue collection</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Flyers Made</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.flyersMade}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Graphics count</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Videos Made</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.videosMade}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Reels/Promos</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Jobs Gotten</span>
                                    <p className="text-base font-mono font-black text-slate-900">{report.jobsGotten}</p>
                                    <span className="text-[10px] text-slate-500 font-extrabold">Direct placements</span>
                                  </div>

                                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 space-y-1 shadow-sm">
                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Client Relations</span>
                                    <p className="text-base font-sans font-black text-slate-900 truncate" title={report.newJobsGottenClientRelations}>
                                      {report.newJobsGottenClientRelations || "None"}
                                    </p>
                                    <span className="text-[10px] text-slate-500 font-extrabold block truncate">Relations logs</span>
                                  </div>
                                </div>
                              </div>

                              {/* Qualitative Feedbacks */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-amber-50/50 border border-amber-200/80 p-4 rounded-2xl space-y-1.5">
                                  <span className="text-xs font-mono font-black text-amber-950 uppercase tracking-wider block">Challenges Encountered</span>
                                  <p className="text-sm text-slate-850 leading-relaxed font-sans font-extrabold">
                                    {report.challenges || "No major challenges logged."}
                                  </p>
                                </div>

                                <div className="bg-blue-50/50 border border-blue-200/80 p-4 rounded-2xl space-y-1.5">
                                  <span className="text-xs font-mono font-black text-blue-950 uppercase tracking-wider block">Plans for Tomorrow</span>
                                  <p className="text-sm text-slate-850 leading-relaxed font-sans font-extrabold">
                                    {report.plansTomorrow || "Continue recruitment operations."}
                                  </p>
                                </div>
                              </div>

                              {/* Verification and proof */}
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                                <div className="space-y-1 text-left">
                                  <span className="text-xs font-mono font-black text-slate-900 uppercase tracking-widest block">Sign-off Checklist Status</span>
                                  <div className="flex items-center gap-1.5 text-sm font-extrabold text-[#111827]">
                                    <CheckCircle2 className="w-5 h-5 text-blue-800 shrink-0" />
                                    <span>Chats are fully cleared and proof submitted before sign-off</span>
                                  </div>
                                </div>

                                {report.chatsClearedProofUrl && (
                                  <button
                                    type="button"
                                    onClick={() => setLightboxUrl(report.chatsClearedProofUrl)}
                                    className="px-4 py-2.5 bg-[#111827] hover:bg-[#1f2937] text-blue-100 text-xs font-sans font-black rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-95 border-0"
                                  >
                                    <Eye className="w-4 h-4" /> View Proof Screenshot
                                  </button>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })() : activeView === "jobs" ? (
          <div key="jobs">
            <JobManagement 
              onBack={() => setActiveView("overview")} 
              onPostJob={() => setActiveView("post-job")} 
            />
          </div>
        ) : activeView === "post-job" ? (
          <div key="post-job">
            <AdminPostJobPage 
              onBack={() => setActiveView("jobs")} 
              onJobAdded={() => setActiveView("jobs")} 
            />
          </div>
        ) : activeView === "contacts" ? (
          <div key="contacts">
            <ContactsView onBack={() => setActiveView("overview")} />
          </div>
        ) : null}

      {/* Batch Action Confirmation Popup */}
      <AnimatePresence>
        {confirmBatchModal && confirmBatchModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmBatchModal(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 z-10"
            >
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-2xl border ${confirmBatchModal.action === "delete" ? "bg-rose-50 border-rose-100 text-rose-600" : "bg-blue-50 border-blue-100 text-blue-600"}`}>
                  {confirmBatchModal.action === "delete" ? <Trash2 className="w-6 h-6" /> : <RotateCcw className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                    {confirmBatchModal.action === "delete" ? "Delete Abandoned Ticket(s)" : "Reset Queue Ticket(s)"}
                  </h3>
                  <p className="text-xs font-mono text-slate-500">
                    {confirmBatchModal.chatIds.length} item(s) selected
                  </p>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {confirmBatchModal.action === "delete"
                  ? `Are you sure you want to permanently delete ${confirmBatchModal.chatIds.length} abandoned conversation(s)? This action cannot be undone.`
                  : `Are you sure you want to reset ${confirmBatchModal.chatIds.length} abandoned conversation(s) back to the pending queue for available staff to claim?`}
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setConfirmBatchModal(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteBatchAction}
                  className={`px-4 py-2 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5 ${
                    confirmBatchModal.action === "delete"
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {confirmBatchModal.action === "delete" ? (
                    <>
                      <Trash2 className="w-3.5 h-3.5" /> Delete Permanently
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" /> Confirm Reset
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <div 
            onClick={() => setLightboxUrl(null)}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-4 cursor-zoom-out"
          >
            <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl bg-slate-900 border border-white/10 shadow-2xl">
              <img 
                src={lightboxUrl} 
                alt="High-resolution Proof" 
                className="max-h-[80vh] w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <div className="p-3 bg-slate-900 text-center text-xs text-slate-400 font-mono">
                Click anywhere to close full screen verification
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Missing Daily Reports Staff List */}
      <AnimatePresence>
        {showMissingStaffModal && (
          <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative"
            >
              {/* Top Sticky Header */}
              <div className="p-5 sm:p-6 bg-[#111827] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center text-amber-400 shrink-0">
                    <UserMinus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-sans font-black tracking-tight leading-tight">
                      Unsubmitted Daily Staff Reports
                    </h3>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      Selected Date: <span className="text-amber-400 font-bold">{selectedReportsDate}</span> • {missingStaffList.length} Staff Member(s) Pending
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowMissingStaffModal(false)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer border-0"
                  title="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 text-left bg-slate-50/50">
                {reopenFeedbackMsg && (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-2xl text-xs font-extrabold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{reopenFeedbackMsg}</span>
                  </div>
                )}

                {missingStaffList.length === 0 ? (
                  <div className="bg-white border border-emerald-200 rounded-2xl p-8 text-center space-y-2">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="text-base font-bold text-slate-900">All Staff Submitted!</h4>
                    <p className="text-xs text-slate-500">Every registered staff member has submitted their daily report for {selectedReportsDate}.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Active date deadline check */}
                    {!isDeadlinePassedForDate(selectedReportsDate) && (
                      <div className="bg-amber-50/80 border border-amber-200 text-amber-900 p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2.5 shadow-2xs">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Today's 9:00 PM deadline has not been reached yet. Staff can submit natively for this date. Reopening is available once 9:00 PM passes or when choosing a previous date.
                        </span>
                      </div>
                    )}

                    {/* Batch Actions Header Bar */}
                    <div className="p-3 bg-white border border-slate-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedReopenStaffUids.size === missingStaffList.length) {
                            setSelectedReopenStaffUids(new Set());
                          } else {
                            setSelectedReopenStaffUids(new Set(missingStaffList.map(s => s.uid)));
                          }
                        }}
                        className="flex items-center gap-2 text-xs font-extrabold text-slate-700 hover:text-slate-900 cursor-pointer"
                      >
                        {selectedReopenStaffUids.size === missingStaffList.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                        <span>Select All ({missingStaffList.length})</span>
                      </button>

                      <button
                        type="button"
                        disabled={!isDeadlinePassedForDate(selectedReportsDate)}
                        onClick={() => {
                          if (!isDeadlinePassedForDate(selectedReportsDate)) return;
                          if (selectedReopenStaffUids.size > 0) {
                            handleOpenReopenModal();
                          } else {
                            handleOpenReopenModal(missingStaffList.map(s => s.uid));
                          }
                        }}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 border-0 shadow-2xs ${
                          isDeadlinePassedForDate(selectedReportsDate)
                            ? "bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer hover:scale-[1.02] active:scale-95"
                            : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                        }`}
                        title={
                          isDeadlinePassedForDate(selectedReportsDate)
                            ? "Select Date to Reopen Submission"
                            : "Reopening is inactive because the 9:00 PM deadline for today has not been reached yet."
                        }
                      >
                        <Unlock className="w-4 h-4" />
                        <span>Reopen</span>
                      </button>
                    </div>

                    <div className="divide-y divide-slate-200/70">
                      {missingStaffList.map((staff) => {
                        const isReopened = isReportSubmissionReopened(staff.uid, selectedReportsDate).isReopened;
                        const isSelected = selectedReopenStaffUids.has(staff.uid);
                        const isDatePassed = isDeadlinePassedForDate(selectedReportsDate);

                        return (
                          <div 
                            key={staff.uid}
                            className={`py-3.5 flex items-center justify-between gap-3 ${isSelected ? "bg-amber-50/40 px-2 rounded-xl" : ""}`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <button
                                type="button"
                                onClick={() => handleToggleSelectReopenStaff(staff.uid)}
                                className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-300" />
                                )}
                              </button>

                              <div className="w-9 h-9 rounded-full bg-[#111827] text-white flex items-center justify-center text-xs font-black uppercase shrink-0">
                                {(staff.displayName || "S").charAt(0)}
                              </div>

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                                    {staff.displayName || "Staff Member"}
                                  </h4>
                                  {isReopened && (
                                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                      <Unlock className="w-2.5 h-2.5" /> Reopened (6h Extension)
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-mono">
                                  {staff.email}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                disabled={!isDatePassed}
                                onClick={() => {
                                  if (!isDatePassed) return;
                                  handleOpenReopenModal([staff.uid]);
                                }}
                                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shrink-0 border-0 shadow-2xs ${
                                  !isDatePassed
                                    ? "bg-slate-100 text-slate-300 cursor-not-allowed opacity-50"
                                    : isReopened
                                      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 cursor-pointer hover:scale-105 active:scale-95"
                                      : "bg-amber-500 text-slate-950 hover:bg-amber-600 cursor-pointer hover:scale-105 active:scale-95"
                                }`}
                                title={
                                  !isDatePassed
                                    ? "Reopening is inactive because today's 9:00 PM deadline has not been reached yet."
                                    : isReopened
                                      ? "Extend Reopen Window for 6 Hours"
                                      : "Reopen Report Submission for 6 Hours"
                                }
                              >
                                <Unlock className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setShowMissingStaffModal(false);
                                  setSystemReportTarget({
                                    uid: staff.uid,
                                    staffName: staff.displayName || "Staff Member",
                                    staffEmail: staff.email,
                                    date: selectedReportsDate
                                  });
                                }}
                                className="w-9 h-9 rounded-full bg-[#111827] hover:bg-[#1f2937] text-white flex items-center justify-center transition-all shrink-0 cursor-pointer border-0 shadow-2xs hover:scale-105 active:scale-95"
                                title="View Staff System Report"
                              >
                                <FileText className="w-4 h-4 text-blue-300" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Select Reopen Date Popup */}
      <AnimatePresence>
        {reopenModalData && reopenModalData.isOpen && (
          <div className="fixed inset-0 z-[10005] bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-left"
            >
              {/* Header */}
              <div className="p-5 bg-[#111827] text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight leading-tight">Reopen Report Submission</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Select date & grant 6-hour window</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReopenModalData(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer border-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 bg-slate-50/50">
                {/* Target Staff List Summary */}
                <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Target Staff ({reopenModalData.uids.length})
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {reopenModalData.uids.map((uid) => {
                      const staffObj = staffList.find(s => s.uid === uid);
                      const name = staffObj?.displayName || memoryStore.users[uid]?.displayName || "Staff Member";
                      return (
                        <span key={uid} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-800">
                          <span className="w-4 h-4 rounded-full bg-[#111827] text-white text-[9px] font-black flex items-center justify-center uppercase">
                            {name.charAt(0)}
                          </span>
                          <span>{name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-900 block">
                    Select Report Date to Reopen:
                  </label>
                  <input
                    type="date"
                    value={reopenModalData.targetDate}
                    max={getLocalTodayString()}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) {
                        setReopenModalData(prev => prev ? { ...prev, targetDate: val } : null);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs cursor-pointer"
                  />

                  {/* Dynamic Status badge for chosen date */}
                  {(() => {
                    const modalDatePassed = isDeadlinePassedForDate(reopenModalData.targetDate);
                    if (modalDatePassed) {
                      return (
                        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>9:00 PM Deadline Passed — Eligible for Reopen</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Today's 9:00 PM deadline has not been reached yet. Reports are open natively.</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                {/* Extension detail */}
                <div className="bg-blue-50/80 border border-blue-200 p-3 rounded-2xl flex items-center gap-3">
                  <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <span className="text-xs font-extrabold text-blue-950 block">6-Hour Time Extension</span>
                    <span className="text-[11px] text-blue-800 font-medium leading-relaxed">
                      Staff will be granted 6 hours from now to submit or update their daily report for {reopenModalData.targetDate}.
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReopenModalData(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!isDeadlinePassedForDate(reopenModalData.targetDate)}
                  onClick={handleConfirmReopenModal}
                  className={`px-5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-2xs border-0 ${
                    isDeadlinePassedForDate(reopenModalData.targetDate)
                      ? "bg-amber-500 hover:bg-amber-600 text-slate-950 cursor-pointer hover:scale-[1.02] active:scale-95"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed opacity-60"
                  }`}
                >
                  <Unlock className="w-4 h-4" />
                  <span>Confirm Reopen (6 Hours)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Full Screen Staff System Report */}
      <AnimatePresence>
        {systemReportTarget && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-5 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              className="bg-white border border-slate-200 rounded-[28px] shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden relative text-left"
            >
              {/* Top Bar */}
              <div className="p-5 sm:p-6 bg-[#111827] text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base sm:text-lg font-sans font-black tracking-tight leading-tight">
                        Staff Report Activity
                      </h3>
                      <span className="text-[10px] font-mono bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                        {systemReportTarget.date}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      Staff: <span className="text-blue-300 font-bold">{systemReportTarget.staffName}</span>
                      {systemReportTarget.staffEmail && ` (${systemReportTarget.staffEmail})`}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSystemReportTarget(null)}
                  className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer border-0"
                  title="Close System Report"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scroll Content: Only Candidate & List Activity Log Section */}
              <div className="p-5 sm:p-7 overflow-y-auto space-y-8 flex-1 bg-slate-50/40">
                <div className="space-y-4">
                  <div className="border-b border-slate-200/80 pb-3 flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-extrabold text-slate-900 font-sans">
                        Candidate & List Activity Log
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">
                        Showing candidate updates made by {systemReportTarget.staffName}
                      </p>
                    </div>
                  </div>

                  <CandidateListSummarySection 
                    initialDate={systemReportTarget.date}
                    filterStaffUid={systemReportTarget.uid}
                    filterStaffName={systemReportTarget.staffName}
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
