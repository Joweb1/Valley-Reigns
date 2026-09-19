import React from "react";

export const RouteLoadingFallback: React.FC = () => {
  return (
    <div className="w-full min-h-[50vh] flex flex-col items-center justify-center p-8">
      <div className="relative flex items-center justify-center">
        {/* Pulsers */}
        <div className="absolute w-24 h-24 rounded-full bg-[#1E88E5]/10 border border-[#1E88E5]/10 animate-ping duration-[1800ms]" />
        <div className="absolute w-16 h-16 rounded-full bg-[#1E88E5]/15 animate-pulse duration-[1200ms]" />
        
        {/* Rotating blue loading ring */}
        <div className="w-12 h-12 rounded-full border-[3px] border-slate-200 border-t-[#1E88E5] animate-spin" />
      </div>
      <p className="mt-4 text-xs font-mono font-bold text-slate-400 uppercase tracking-widest animate-pulse">
        Loading View...
      </p>
    </div>
  );
};
export default RouteLoadingFallback;
