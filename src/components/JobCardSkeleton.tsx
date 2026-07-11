import React from "react";

export const JobCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-[#0F5132]/20 rounded-3xl overflow-hidden shadow-none p-6 sm:p-8 relative select-none">
      {/* Top right Chevron circle skeleton */}
      <div className="absolute right-6 top-6 sm:right-8 sm:top-8 w-11 h-11 rounded-full bg-slate-100 animate-shimmer border border-slate-100" />

      <div className="space-y-4 w-full">
        {/* Top badges row */}
        <div className="flex flex-wrap items-center gap-2 pr-14 sm:pr-16">
          <div className="w-16 h-5 rounded-full animate-shimmer" />
          <div className="w-20 h-5 rounded-full animate-shimmer" />
        </div>

        {/* Title skeleton - mimicking bold typography */}
        <div className="space-y-2 pr-14 sm:pr-16 pt-1">
          <div className="w-[85%] h-6 sm:h-8 rounded-lg animate-shimmer" />
          <div className="w-[50%] h-5 sm:h-7 rounded-lg animate-shimmer" />
        </div>

        {/* Bottom row containing Location (left) and 3D Button (right) */}
        <div className="flex flex-row items-center justify-between gap-3 pt-3">
          {/* Location skeleton with small mock icon */}
          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-4 h-4 rounded-full bg-slate-100 animate-shimmer shrink-0" />
            <div className="w-24 sm:w-32 h-4 rounded-md bg-slate-100 animate-shimmer" />
          </div>

          {/* 3D Button skeleton mimicking actual action button with offset styling */}
          <div className="relative inline-block shrink-0 w-32 sm:w-40 h-10 sm:h-12">
            {/* Background offset box */}
            <div className="absolute -left-1 -top-1 w-full h-full border-2 border-slate-100 rounded-xl bg-transparent" />
            {/* Main skeleton loader */}
            <div className="absolute inset-0 rounded-xl bg-slate-200 animate-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
};
