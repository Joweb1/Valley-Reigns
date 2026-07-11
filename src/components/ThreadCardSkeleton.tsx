import React from "react";

interface ThreadCardSkeletonProps {
  showClaimButton?: boolean;
}

export const ThreadCardSkeleton: React.FC<ThreadCardSkeletonProps> = ({ showClaimButton = false }) => {
  return (
    <div className="w-full text-left p-4 rounded-2xl border border-slate-100 bg-white/80 space-y-3 relative select-none">
      {/* Top row: Phone/Name/Icon on the left, Badge/Timer on the right */}
      <div className="flex items-center justify-between gap-2">
        {/* Phone/Name shape */}
        <div className="flex items-center gap-1.5 w-[60%]">
          <div className="w-3.5 h-3.5 rounded-full bg-slate-100 animate-shimmer shrink-0" />
          <div className="w-24 h-4 rounded-md bg-slate-100 animate-shimmer" />
        </div>
        {/* Countdown/Badge shape */}
        <div className="w-16 h-5 rounded-lg bg-slate-100 animate-shimmer shrink-0" />
      </div>

      {/* Content rows */}
      <div className="space-y-2">
        {/* Main Job Title thicker bar */}
        <div className="w-[75%] h-4 rounded bg-slate-150 animate-shimmer" />
        {/* Message snippet thinner, longer bar */}
        <div className="w-[90%] h-3 rounded bg-slate-100 animate-shimmer" />
      </div>

      {/* Optional claim button loader */}
      {showClaimButton && (
        <div className="pt-2">
          <div className="w-full h-8 rounded-xl bg-slate-100 animate-shimmer" />
        </div>
      )}
    </div>
  );
};
