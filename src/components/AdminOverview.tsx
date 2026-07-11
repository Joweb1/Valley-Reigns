import React, { useState } from "react";
import { Job, Conversation, DailyStat } from "../types";
import { 
  Eye, 
  Users, 
  AlertTriangle, 
  ArrowRight, 
  ShieldCheck, 
  Activity, 
  Shuffle, 
  TrendingUp 
} from "lucide-react";
import { motion } from "motion/react";
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

interface AdminOverviewProps {
  jobsList: Job[];
  staffCount: number;
  conversationsList: Conversation[];
  dailyStats: DailyStat[];
  loading: boolean;
  onNavigateToView: (view: "staff" | "routing") => void;
}

export const AdminOverview: React.FC<AdminOverviewProps> = ({
  jobsList,
  staffCount,
  conversationsList,
  dailyStats,
  loading,
  onNavigateToView
}) => {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">("day");

  // Total metrics
  const totalImpressions = jobsList.reduce((acc, job) => acc + job.impressions, 0);
  const abandonedChats = conversationsList.filter(c => c.status === "abandoned");

  // Get data for recharts based on selected timeframe
  const getChartData = () => {
    if (!dailyStats || dailyStats.length === 0) return [];

    switch (timeframe) {
      case "day": {
        // Daily will show the last 7 days of data (current week in dataset)
        const weekData = dailyStats.slice(-7);
        const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        return weekData.map(d => {
          const dateObj = new Date(d.timestamp);
          const dayName = weekdays[dateObj.getUTCDay()];
          const shortDate = `${dateObj.getUTCMonth() + 1}/${dateObj.getUTCDate()}`;
          return {
            ...d,
            name: `${dayName} (${shortDate})`
          };
        });
      }
      case "week": {
        // Weekly will show current month's weeks (e.g. July 2026)
        // July is the month of our latest stats (2026-07)
        const targetMonth = "2026-07";
        const monthStats = dailyStats.filter(s => s.date.startsWith(targetMonth));
        const weeks = [
          { name: "Week 1 (7/1-7/7)", start: 1, end: 7 },
          { name: "Week 2 (7/8-7/14)", start: 8, end: 14 },
          { name: "Week 3 (7/15-7/21)", start: 15, end: 21 },
          { name: "Week 4 (7/22-7/25)", start: 22, end: 31 }
        ];
        return weeks.map(w => {
          const dayStats = monthStats.filter(s => {
            const dayNum = new Date(s.timestamp).getUTCDate();
            return dayNum >= w.start && dayNum <= w.end;
          });
          return {
            name: w.name,
            impressions: dayStats.reduce((sum, s) => sum + s.impressions, 0),
            sent: dayStats.reduce((sum, s) => sum + s.sent, 0),
            claimed: dayStats.reduce((sum, s) => sum + s.claimed, 0),
            finished: dayStats.reduce((sum, s) => sum + s.finished, 0),
            abandoned: dayStats.reduce((sum, s) => sum + s.abandoned, 0)
          };
        });
      }
      case "month": {
        // Monthly will show the last 6 months on the timeline
        const monthsList = [
          { name: "Feb 2026", pattern: "2026-02" },
          { name: "Mar 2026", pattern: "2026-03" },
          { name: "Apr 2026", pattern: "2026-04" },
          { name: "May 2026", pattern: "2026-05" },
          { name: "Jun 2026", pattern: "2026-06" },
          { name: "Jul 2026", pattern: "2026-07" }
        ];
        return monthsList.map(m => {
          const monthStats = dailyStats.filter(s => s.date.startsWith(m.pattern));
          return {
            name: m.name,
            impressions: monthStats.reduce((sum, s) => sum + s.impressions, 0),
            sent: monthStats.reduce((sum, s) => sum + s.sent, 0),
            claimed: monthStats.reduce((sum, s) => sum + s.claimed, 0),
            finished: monthStats.reduce((sum, s) => sum + s.finished, 0),
            abandoned: monthStats.reduce((sum, s) => sum + s.abandoned, 0)
          };
        });
      }
      case "year": {
        // Yearly will show the last 5 years on the timeline
        const yearsList = ["2022", "2023", "2024", "2025", "2026"];
        return yearsList.map(y => {
          const yearStats = dailyStats.filter(s => s.date.startsWith(y));
          return {
            name: y,
            impressions: yearStats.reduce((sum, s) => sum + s.impressions, 0),
            sent: yearStats.reduce((sum, s) => sum + s.sent, 0),
            claimed: yearStats.reduce((sum, s) => sum + s.claimed, 0),
            finished: yearStats.reduce((sum, s) => sum + s.finished, 0),
            abandoned: yearStats.reduce((sum, s) => sum + s.abandoned, 0)
          };
        });
      }
      default:
        return [];
    }
  };

  const chartData = getChartData();

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* KPI Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-150/60 rounded-3xl p-6 sm:p-8 h-32 flex flex-col justify-between">
              <div className="w-1/3 h-3 bg-slate-200 rounded" />
              <div className="w-1/2 h-8 bg-slate-200 rounded" />
              <div className="w-2/3 h-3 bg-slate-200 rounded" />
            </div>
          ))}
        </div>

        {/* Buttons Skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((n) => (
            <div key={n} className="bg-slate-50 border border-slate-100 rounded-3xl p-6 h-28 flex items-center justify-between" />
          ))}
        </div>

        {/* Chart Skeleton */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 h-96 flex flex-col justify-between">
          <div className="flex justify-between items-center">
            <div className="w-1/4 h-5 bg-slate-200 rounded" />
            <div className="w-1/5 h-8 bg-slate-200 rounded" />
          </div>
          <div className="w-full h-72 bg-slate-50 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ========================================== */}
      {/* 1. KEY PERFORMANCE INDICATOR CARDS         */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card: Job Impressions */}
        <div className="bg-white border border-slate-200/60 rounded-[28px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,81,50,0.02)] flex items-start justify-between">
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
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#0F5132] shadow-sm">
            <Eye className="w-6 h-6" />
          </div>
        </div>

        {/* Card: Registered Recruiters */}
        <div className="bg-white border border-slate-200/60 rounded-[28px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,81,50,0.02)] flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block leading-none">
              Operational Pool
            </span>
            <h4 className="text-3xl font-mono font-bold text-slate-900 tracking-tight">
              {staffCount}
            </h4>
            <p className="text-xs font-sans text-slate-500 font-semibold leading-none">
              Registered Recruiters
            </p>
          </div>
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Card: Abandoned Tickets (SLA) */}
        <div className="bg-white border border-slate-200/60 rounded-[28px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(15,81,50,0.02)] flex items-start justify-between">
          <div className="space-y-2">
            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block leading-none">
              SLA Compliance
            </span>
            <h4 className="text-3xl font-mono font-bold text-slate-900 tracking-tight text-red-600">
              {abandonedChats.length}
            </h4>
            <p className="text-xs font-sans text-slate-500 font-semibold leading-none">
              Abandoned Tickets
            </p>
          </div>
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 shadow-sm animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. NAVIGATION ICON CARDS                   */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Navigation Button: Staff Management */}
        <motion.button
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={() => onNavigateToView("staff")}
          className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-[28px] p-6 sm:p-8 flex items-center justify-between text-left shadow-[0_8px_24px_rgba(15,81,50,0.03)] hover:shadow-[0_12px_32px_rgba(15,81,50,0.06)] cursor-pointer focus:outline-none transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 group-hover:bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 transition-colors shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-sans font-extrabold text-slate-800 group-hover:text-[#0F5132] transition-colors">
                Staff Management Console
              </h5>
              <p className="text-xs font-sans text-slate-400 font-medium leading-relaxed mt-1">
                Configure roles, verify capacities, and manage system access permissions.
              </p>
            </div>
          </div>
          <div className="w-9 h-9 bg-slate-100 group-hover:bg-[#0F5132] group-hover:text-white rounded-full flex items-center justify-center text-slate-500 transition-all shrink-0">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.button>

        {/* Navigation Button: Global Routing Board */}
        <motion.button
          whileHover={{ y: -4, scale: 1.01 }}
          onClick={() => onNavigateToView("routing")}
          className="bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-[28px] p-6 sm:p-8 flex items-center justify-between text-left shadow-[0_8px_24px_rgba(15,81,50,0.03)] hover:shadow-[0_12px_32px_rgba(15,81,50,0.06)] cursor-pointer focus:outline-none transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 group-hover:bg-emerald-100 rounded-2xl flex items-center justify-center text-[#0F5132] transition-colors shadow-sm">
              <Shuffle className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-sans font-extrabold text-slate-800 group-hover:text-[#0F5132] transition-colors">
                Global Ticket Routing Board
              </h5>
              <p className="text-xs font-sans text-slate-400 font-medium leading-relaxed mt-1">
                Monitor queues, manage transfers, and resolve active conversations.
              </p>
            </div>
          </div>
          <div className="w-9 h-9 bg-slate-100 group-hover:bg-[#0F5132] group-hover:text-white rounded-full flex items-center justify-center text-slate-500 transition-all shrink-0">
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </div>
        </motion.button>
      </div>

      {/* ========================================== */}
      {/* 3. DYNAMIC REAL-TIME LINE CHART            */}
      {/* ========================================== */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(15,81,50,0.03)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#0F5132]">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                Platform Activity & Traffic Analytics
              </h3>
              <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
                Mock Datapoints seeded from June 20th, 2026
              </span>
            </div>
          </div>

          {/* Timeframe Toggles */}
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/40 shrink-0 self-start sm:self-auto select-none">
            {(["day", "week", "month", "year"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTimeframe(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all cursor-pointer ${
                  timeframe === mode
                    ? "bg-white text-slate-900 shadow-sm font-extrabold border border-slate-200/40"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {mode === "day" && "Daily"}
                {mode === "week" && "Weekly"}
                {mode === "month" && "Monthly"}
                {mode === "year" && "Yearly"}
              </button>
            ))}
          </div>
        </div>

        {/* The recharts Line Chart */}
        <div className="w-full h-80 sm:h-96 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                stroke="#94a3b8" 
                fontSize={10} 
                fontFamily="JetBrains Mono" 
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                fontFamily="JetBrains Mono" 
                tickLine={false}
                axisLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  border: "none",
                  borderRadius: "16px",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1)",
                  color: "#fff",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "11px",
                }}
                labelStyle={{ fontFamily: "JetBrains Mono", fontWeight: "bold", color: "#38bdf8", marginBottom: "4px" }}
              />
              <Legend 
                verticalAlign="top" 
                height={36} 
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "11px", fontWeight: "bold", fontFamily: "Inter, sans-serif", color: "#475569" }}
              />
              <Line
                type="monotone"
                dataKey="impressions"
                name="Job Impressions"
                stroke="#0F5132"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="sent"
                name="Sent Conversations"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="claimed"
                name="Claimed Conversations"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="finished"
                name="Finished Conversations"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="abandoned"
                name="Abandoned Conversations"
                stroke="#f43f5e"
                strokeWidth={2}
                dot={{ r: 3, strokeWidth: 1, fill: "#fff" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
