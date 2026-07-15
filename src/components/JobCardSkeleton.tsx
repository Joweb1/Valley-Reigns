import React from "react";

export const JobCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-[#0B3C2D]/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.02)] p-4 sm:p-5 relative select-none">
      <div className="space-y-2.5 w-full pr-28 sm:pr-32 text-left">
        {/* Title skeleton */}
        <div className="h-5 animate-shimmer rounded-md w-[70%]" />
        
        {/* Location skeleton */}
        <div className="flex items-center gap-1.5 pt-0.5">
          <div className="w-3.5 h-3.5 rounded-full animate-shimmer shrink-0" />
          <div className="w-24 h-3 rounded-md animate-shimmer" />
        </div>
      </div>

      {/* Right placement buttons skeleton */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-5 flex items-center gap-1.5">
        <div className="w-20 sm:w-24 h-8 rounded-lg animate-shimmer" />
        <div className="w-8 h-8 rounded-full animate-shimmer border border-slate-200" />
      </div>
    </div>
  );
};
