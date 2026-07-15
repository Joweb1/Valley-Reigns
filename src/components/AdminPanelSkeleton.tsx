import React from "react";

export const KPIGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
      {/* Card 1: Job Views skeleton */}
      <div className="bg-white border border-emerald-800 rounded-3xl p-4 sm:p-6 flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-2.5 animate-shimmer rounded w-1/2"></div>
          <div className="h-8 animate-shimmer rounded w-2/3"></div>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 animate-shimmer rounded-2xl shrink-0"></div>
      </div>

      {/* Card 2: Staff count skeleton */}
      <div className="bg-[#0B3C2D]/10 border border-emerald-800 rounded-3xl p-4 sm:p-6 flex items-start justify-between">
        <div className="space-y-3 flex-1">
          <div className="h-2.5 animate-shimmer rounded w-1/2"></div>
          <div className="h-8 animate-shimmer rounded w-2/3"></div>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 animate-shimmer rounded-2xl shrink-0"></div>
      </div>

      {/* Card 3: Chats overview skeleton (col-span-2) */}
      <div className="bg-[#0B3C2D]/10 border border-emerald-800 rounded-3xl p-4 sm:p-6 flex items-start justify-between col-span-2 md:col-span-2">
        <div className="space-y-3.5 flex-1 mr-2">
          <div className="h-2.5 animate-shimmer rounded w-1/4"></div>
          <div className="h-8 animate-shimmer rounded w-1/6"></div>
          <div className="flex flex-wrap gap-2 pt-1.5">
            <div className="h-5 animate-shimmer border border-slate-200/50 rounded-lg w-16"></div>
            <div className="h-5 animate-shimmer border border-slate-200/50 rounded-lg w-16"></div>
            <div className="h-5 animate-shimmer border border-slate-200/50 rounded-lg w-16"></div>
            <div className="h-5 animate-shimmer border border-slate-200/50 rounded-lg w-16"></div>
          </div>
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 animate-shimmer rounded-2xl shrink-0"></div>
      </div>
    </div>
  );
};

export const NavigationCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 bg-slate-50/50 text-center space-y-2"
        >
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full animate-shimmer shrink-0"></div>
          <div className="h-3.5 animate-shimmer rounded w-2/3"></div>
          {i === 4 && <div className="h-2.5 animate-shimmer rounded w-1/2"></div>}
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-emerald-800 rounded-3xl pt-3.5 pb-6 px-6 sm:pt-4 sm:pb-8 sm:px-8 shadow-none space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0B3C2D]/15 border border-emerald-900 rounded-xl flex items-center justify-center shrink-0">
            <div className="w-5 h-5 animate-shimmer rounded-md" />
          </div>
          <div className="space-y-2">
            <div className="h-4 animate-shimmer rounded w-28 animate-shimmer"></div>
          </div>
        </div>
        <div className="flex gap-1 bg-[#0B3C2D]/10 border border-emerald-950 p-1.5 rounded-2xl w-full sm:w-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-6 animate-shimmer rounded-xl w-14 sm:w-16"></div>
          ))}
        </div>
      </div>
      <div className="h-64 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 flex items-end justify-between p-6">
        {[20, 45, 60, 30, 75, 40, 90, 55, 70, 45, 80, 60].map((height, idx) => (
          <div key={idx} className="animate-shimmer rounded-t-lg w-6" style={{ height: `${height}%` }}></div>
        ))}
      </div>
    </div>
  );
};

export const StaffManagementSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-emerald-850 rounded-3xl shadow-none overflow-hidden text-left">
      <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 animate-shimmer rounded-xl"></div>
          <div className="space-y-2">
            <div className="h-4 animate-shimmer rounded w-36"></div>
            <div className="h-3 animate-shimmer rounded w-48"></div>
          </div>
        </div>
        <div className="w-8 h-8 animate-shimmer rounded-xl"></div>
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3.5 border-b border-slate-100 last:border-b-0">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 animate-shimmer rounded w-1/4"></div>
              <div className="h-2.5 animate-shimmer rounded w-1/3"></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-6 animate-shimmer rounded-md w-16"></div>
              <div className="h-6 animate-shimmer rounded-md w-12"></div>
              <div className="h-6 animate-shimmer rounded-full w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TicketRoutingSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-emerald-850 rounded-3xl p-6 sm:p-8 shadow-none space-y-6 text-left">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 animate-shimmer rounded-xl"></div>
        <div className="space-y-2">
          <div className="h-4 animate-shimmer rounded w-48"></div>
          <div className="h-3 animate-shimmer rounded w-64"></div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 animate-shimmer rounded-xl w-24"></div>
        ))}
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="h-3 animate-shimmer rounded w-1/3"></div>
              <div className="h-4 animate-shimmer rounded w-10"></div>
            </div>
            <div className="h-4 animate-shimmer rounded w-3/4"></div>
            <div className="h-10 animate-shimmer rounded-xl w-full"></div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <div className="h-3 animate-shimmer rounded w-16"></div>
              <div className="h-3 animate-shimmer rounded w-12"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
