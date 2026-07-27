import React, { useState, useEffect, useMemo } from "react";
import { CandidateListLog } from "../types";
import { subscribeToCandidateListLogs } from "../lib/services";
import { 
  Calendar, 
  Filter, 
  CheckCircle2, 
  Clock, 
  Users, 
  Search, 
  FileText, 
  MapPin, 
  ShieldCheck, 
  DollarSign, 
  Tag, 
  BarChart3, 
  ChevronRight,
  TrendingUp,
  UserCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const CANDIDATE_LIST_CONFIG = [
  { id: "Registered Candidates", name: "Registered Candidates", lightBg: "bg-blue-50 text-blue-700 border-blue-200", badgeColor: "bg-blue-600", icon: Users, iconColor: "text-blue-600" },
  { id: "Pending Resume(CV)", name: "Pending Resume(CV)", lightBg: "bg-amber-50 text-amber-700 border-amber-200", badgeColor: "bg-amber-600", icon: Clock, iconColor: "text-amber-600" },
  { id: "Submitted Resume(CV)", name: "Submitted Resume(CV)", lightBg: "bg-emerald-50 text-emerald-700 border-emerald-200", badgeColor: "bg-emerald-600", icon: FileText, iconColor: "text-emerald-600" },
  { id: "Address Given", name: "Address Given", lightBg: "bg-indigo-50 text-indigo-700 border-indigo-200", badgeColor: "bg-indigo-600", icon: MapPin, iconColor: "text-indigo-600" },
  { id: "Verified", name: "Verified", lightBg: "bg-purple-50 text-purple-700 border-purple-200", badgeColor: "bg-purple-600", icon: ShieldCheck, iconColor: "text-purple-600" },
  { id: "Pending Commission Retrieval", name: "Pending Commission Retrieval", lightBg: "bg-rose-50 text-rose-700 border-rose-200", badgeColor: "bg-rose-600", icon: DollarSign, iconColor: "text-rose-600" },
];

const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CandidateListSummarySectionProps {
  initialDate?: string;
  filterStaffUid?: string;
  filterStaffName?: string;
}

export const CandidateListSummarySection: React.FC<CandidateListSummarySectionProps> = ({
  initialDate,
  filterStaffUid,
  filterStaffName
}) => {
  const [logs, setLogs] = useState<CandidateListLog[]>([]);
  const [timeframe, setTimeframe] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getLocalTodayString());
  const [selectedListFilter, setSelectedListFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    if (initialDate) {
      setSelectedDate(initialDate);
    }
  }, [initialDate]);

  useEffect(() => {
    const unsub = subscribeToCandidateListLogs((data) => {
      setLogs(data);
    });
    return () => unsub();
  }, []);

  // Filter logs based on selected timeframe & date & optional staff filter
  const filteredLogsByTime = useMemo(() => {
    const targetDate = new Date(selectedDate);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();

    return logs.filter((log) => {
      if (filterStaffUid && log.staffUid && log.staffUid !== filterStaffUid) {
        return false;
      }
      if (filterStaffName && !filterStaffUid && log.staffName) {
        if (!log.staffName.toLowerCase().includes(filterStaffName.toLowerCase())) {
          return false;
        }
      }

      const logDate = new Date(log.timestamp);
      
      if (timeframe === "daily") {
        return (
          logDate.getFullYear() === targetYear &&
          logDate.getMonth() === targetMonth &&
          logDate.getDate() === targetDay
        );
      } else if (timeframe === "weekly") {
        const diffMs = targetDate.getTime() - logDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      } else {
        return (
          logDate.getFullYear() === targetYear &&
          logDate.getMonth() === targetMonth
        );
      }
    });
  }, [logs, timeframe, selectedDate, filterStaffUid, filterStaffName]);

  // Counts per list category for the chosen timeframe
  const countsByList = useMemo(() => {
    const counts: Record<string, number> = {
      "Registered Candidates": 0,
      "Pending Resume(CV)": 0,
      "Submitted Resume(CV)": 0,
      "Address Given": 0,
      "Verified": 0,
      "Pending Commission Retrieval": 0,
    };

    filteredLogsByTime.forEach((log) => {
      if (log.action === "added" && counts[log.listName] !== undefined) {
        counts[log.listName] += 1;
      }
    });

    return counts;
  }, [filteredLogsByTime]);

  // Detailed records list after applying list filter and search query
  const detailedRecords = useMemo(() => {
    return filteredLogsByTime.filter((log) => {
      const matchesList = selectedListFilter === "all" || log.listName === selectedListFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        log.customerName.toLowerCase().includes(q) ||
        log.customerPhone.toLowerCase().includes(q) ||
        log.listName.toLowerCase().includes(q) ||
        log.staffName.toLowerCase().includes(q);
      return matchesList && matchesSearch;
    });
  }, [filteredLogsByTime, selectedListFilter, searchQuery]);

  // Total additions count
  const totalAddedCount = useMemo(() => {
    return filteredLogsByTime.filter(l => l.action === "added").length;
  }, [filteredLogsByTime]);

  const formatDateLabel = () => {
    if (timeframe === "daily") {
      const isToday = selectedDate === getLocalTodayString();
      if (isToday) return `Today (${selectedDate})`;
      return selectedDate;
    } else if (timeframe === "weekly") {
      return `Past 7 Days from ${selectedDate}`;
    } else {
      const d = new Date(selectedDate);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
  };

  return (
    <div className="bg-transparent text-left space-y-3">
      {/* Top Filter Bar: Timeframe Nav on left, Date Picker on right on same row */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100/80 pb-2.5">
        {/* Timeframe Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl shrink-0">
          {(["daily", "weekly", "monthly"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setTimeframe(mode)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                timeframe === mode
                  ? "bg-white text-[#00A884] shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Date Picker Input at the right side (no label text) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Calendar className="w-4 h-4 text-[#00A884] shrink-0" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-2 py-1 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg text-xs font-semibold font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A884]/30 cursor-pointer transition-colors w-32"
          />
        </div>
      </div>

      {/* Date / Period Summary & Total Candidates Small Tag */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div className="text-xs font-bold text-slate-700 flex items-center gap-2">
          <span className="text-slate-900 font-extrabold">{formatDateLabel()}</span>
        </div>

        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 font-bold text-[11px] flex items-center gap-1.5 shrink-0">
          <Users className="w-3.5 h-3.5 text-[#00A884]" />
          <span>{totalAddedCount} Candidates</span>
        </span>
      </div>

      {/* 6 Category Summary Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {CANDIDATE_LIST_CONFIG.map((cfg) => {
          const count = countsByList[cfg.id] || 0;
          const IconComp = cfg.icon;
          const isSelected = selectedListFilter === cfg.id;

          return (
            <button
              key={cfg.id}
              onClick={() => setSelectedListFilter(isSelected ? "all" : cfg.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                isSelected
                  ? `${cfg.lightBg} border-2 shadow-xs ring-2 ring-emerald-500/20`
                  : "bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cfg.lightBg}`}>
                  <IconComp className={`w-4 h-4 ${cfg.iconColor}`} />
                </div>
                <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md text-white ${cfg.badgeColor}`}>
                  {count}
                </span>
              </div>
              <div className="mt-2.5">
                <span className="text-[11px] font-bold text-slate-800 leading-tight block truncate">
                  {cfg.name}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar for Activity Table */}
      <div className="space-y-3 pt-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-500 mr-1 shrink-0 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Category Filter:
            </span>
            <button
              onClick={() => setSelectedListFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                selectedListFilter === "all"
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories ({filteredLogsByTime.length})
            </button>
            {CANDIDATE_LIST_CONFIG.map((cfg) => {
              const active = selectedListFilter === cfg.id;
              const IconComp = cfg.icon;
              return (
                <button
                  key={cfg.id}
                  onClick={() => setSelectedListFilter(cfg.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? `${cfg.lightBg} border border-emerald-300 shadow-2xs`
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${active ? cfg.iconColor : "text-slate-500"}`} />
                  <span className="truncate max-w-[120px]">{cfg.name}</span>
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div className="relative shrink-0 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search candidate name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#00A884]/30"
            />
          </div>
        </div>

        {/* Detailed Candidates List */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50">
          <div className="bg-slate-100/70 px-4 py-2.5 border-b border-slate-200/60 flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            <span>Candidate & List Activity Log</span>
            <span>{detailedRecords.length} record(s)</span>
          </div>

          {detailedRecords.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-1">
              <UserCheck className="w-8 h-8 mx-auto text-slate-300" />
              <p className="font-semibold text-slate-600">No candidate list activity recorded for this selection.</p>
              <p className="text-[11px]">Select a different date or timeframe above, or add candidates to lists in Chat Inbox.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {detailedRecords.map((log) => {
                const config = CANDIDATE_LIST_CONFIG.find(c => c.id === log.listName);
                const isAdded = log.action === "added";
                const d = new Date(log.timestamp);
                const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                // Check if this log is for a WhatsApp chat (only WhatsApp chats show mobile number)
                const isWhatsApp = Boolean(
                  !log.chatId?.startsWith("inapp_") && 
                  log.customerPhone && 
                  (log.customerPhone.startsWith("+") || /^\+?\d[\d\s\-\(\)]{6,}$/.test(log.customerPhone))
                );
                const displayName = log.customerName || (isWhatsApp ? log.customerPhone : "Candidate");

                return (
                  <div key={log.id} className="p-3.5 bg-white hover:bg-slate-50/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${config?.lightBg || "bg-slate-100"}`}>
                        {config ? (
                          <config.icon className={`w-4 h-4 ${config.iconColor}`} />
                        ) : (
                          <FileText className="w-4 h-4 text-slate-500" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{displayName}</span>
                          {isWhatsApp && log.customerPhone && (
                            <span className="text-[10px] font-mono text-slate-400">({log.customerPhone})</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {log.jobTitle || "Job Candidate"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${config?.lightBg || "bg-slate-100 text-slate-700 border-slate-200"}`}>
                        {log.listName}
                      </span>

                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase ${isAdded ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                        {isAdded ? "+ Added" : "- Removed"}
                      </span>

                      <span className="text-[10px] font-medium text-slate-400">
                        by <strong className="text-slate-600">{log.staffName || "Staff"}</strong> at {timeStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
