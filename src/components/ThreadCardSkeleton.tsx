import React from "react";

interface ThreadCardSkeletonProps {
  showClaimButton?: boolean;
}

export const ThreadCardSkeleton: React.FC<ThreadCardSkeletonProps> = () => {
  return (
    <div className="w-full text-left p-3.5 rounded-none border-x-0 border-t-0 border-b border-slate-100 bg-transparent flex items-start gap-3 relative select-none">
      {/* Big Circle Profile Avatar Skeleton */}
      <div className="w-11 h-11 rounded-full bg-slate-100 animate-shimmer shrink-0 mt-0.5" />

      {/* Content Area */}
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="w-24 h-4 rounded-md bg-slate-100 animate-shimmer" />
          <div className="w-10 h-4 rounded-md bg-slate-100 animate-shimmer shrink-0" />
        </div>
        <div className="w-[75%] h-3.5 rounded bg-slate-150 animate-shimmer" />
        <div className="w-[90%] h-3 rounded bg-slate-100 animate-shimmer" />
      </div>
    </div>
  );
};
