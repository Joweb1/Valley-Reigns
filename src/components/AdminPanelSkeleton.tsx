import React from "react";

export const KPIGridSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm flex items-start justify-between relative overflow-hidden">
          <div className="space-y-3 flex-1">
            <div className="h-2.5 bg-slate-200/80 rounded-md w-2/5 animate-shimmer"></div>
            <div className="h-8 bg-slate-200/80 rounded-lg w-1/3 animate-shimmer"></div>
            <div className="h-3 bg-slate-100 rounded-md w-3/5 animate-shimmer"></div>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-2xl animate-shimmer shrink-0"></div>
        </div>
      ))}
    </div>
  );
};

export const NavigationCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-pulse">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-center justify-between relative overflow-hidden">
          <div className="flex items-center gap-4 flex-1">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl animate-shimmer shrink-0"></div>
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-slate-200/80 rounded-md w-1/3 animate-shimmer"></div>
              <div className="h-3 bg-slate-100 rounded-md w-2/3 animate-shimmer"></div>
            </div>
          </div>
          <div className="w-5 h-5 bg-slate-100 rounded-full animate-shimmer shrink-0"></div>
        </div>
      ))}
    </div>
  );
};

export const ChartSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-pulse relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-4 bg-slate-200/80 rounded-md w-48 animate-shimmer"></div>
          <div className="h-3 bg-slate-100 rounded-md w-64 animate-shimmer"></div>
        </div>
        <div className="flex gap-1.5 bg-slate-50 p-1.5 rounded-2xl w-full sm:w-auto">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-slate-200/80 rounded-xl w-16 animate-shimmer"></div>
          ))}
        </div>
      </div>
      <div className="h-64 bg-slate-50/50 rounded-2xl border border-dashed border-slate-100 flex items-end justify-between p-6">
        {[20, 45, 60, 30, 75, 40, 90, 55, 70, 45, 80, 60].map((height, idx) => (
          <div key={idx} className="bg-slate-200/40 rounded-t-lg w-6 animate-shimmer" style={{ height: `${height}%` }}></div>
        ))}
      </div>
    </div>
  );
};

export const StaffManagementSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden animate-pulse">
      <div className="p-6 sm:p-8 border-b border-slate-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-100 rounded-xl animate-shimmer"></div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200/80 rounded-md w-36 animate-shimmer"></div>
            <div className="h-3 bg-slate-100 rounded-md w-48 animate-shimmer"></div>
          </div>
        </div>
        <div className="w-8 h-8 bg-slate-100 rounded-xl animate-shimmer"></div>
      </div>
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100/50">
            <div className="space-y-2 flex-1">
              <div className="h-3.5 bg-slate-200/80 rounded-md w-1/4 animate-shimmer"></div>
              <div className="h-2.5 bg-slate-100 rounded-md w-1/3 animate-shimmer"></div>
            </div>
            <div className="flex items-center gap-6">
              <div className="h-6 bg-slate-100 rounded-md w-16 animate-shimmer"></div>
              <div className="h-6 bg-slate-100 rounded-md w-12 animate-shimmer"></div>
              <div className="h-6 bg-slate-200/80 rounded-full w-12 animate-shimmer"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TicketRoutingSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl animate-shimmer"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-200/80 rounded-md w-48 animate-shimmer"></div>
          <div className="h-3 bg-slate-100 rounded-md w-64 animate-shimmer"></div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-100 pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 bg-slate-200/80 rounded-xl w-24 animate-shimmer"></div>
        ))}
      </div>

      {/* Grid of cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-slate-200/80 rounded-md w-1/3 animate-shimmer"></div>
              <div className="h-4 bg-slate-100 rounded-md w-10 animate-shimmer"></div>
            </div>
            <div className="h-4 bg-slate-200/80 rounded-md w-3/4 animate-shimmer"></div>
            <div className="h-10 bg-slate-100 rounded-xl animate-shimmer w-full"></div>
            <div className="flex justify-between pt-2 border-t border-slate-100">
              <div className="h-3 bg-slate-100 rounded-md w-16 animate-shimmer"></div>
              <div className="h-3 bg-slate-200/80 rounded-md w-12 animate-shimmer"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
