import React, { useState, useEffect } from "react";
import { Clock, MessageSquare } from "lucide-react";

interface SLACountdownTimerProps {
  createdAt: number;
  label?: string;
  className?: string;
  isInApp?: boolean;
  customerPhone?: string;
}

export const SLACountdownTimer: React.FC<SLACountdownTimerProps> = ({
  createdAt,
  label = "SLA Countdown",
  className = "",
  isInApp,
  customerPhone
}) => {
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const isAppChat = isInApp || (customerPhone ? !customerPhone.startsWith("+") : false);
  const totalSlaMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const expiresAt = (createdAt || Date.now()) + totalSlaMs;
  const diffMs = expiresAt - now;

  if (diffMs <= 0) {
    if (isAppChat) {
      return (
        <div className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-blue-50/90 text-blue-900 border border-blue-200 rounded-xl text-[10px] font-bold shadow-xs ${className}`}>
          <div className="flex items-center gap-1.5 font-sans">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#1E88E5]" />
            <span className="text-[9px] uppercase font-extrabold tracking-wider text-blue-800/80">{label}:</span>
          </div>
          <span className="font-sans font-black text-xs text-[#1E88E5] bg-blue-100/90 px-2.5 py-0.5 rounded-md tracking-tight border border-blue-200/60">
            In-App
          </span>
        </div>
      );
    }

    return (
      <div className={`flex items-center justify-between gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-mono font-bold shadow-xs ${className}`}>
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0 text-rose-600 animate-pulse" />
          <span className="text-[9px] uppercase font-sans font-extrabold tracking-wider opacity-90">{label}:</span>
        </div>
        <span className="font-extrabold tracking-tight text-rose-800">00h 00m 00s (Expired)</span>
      </div>
    );
  }

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedTime = `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;

  // Dynamic styling based on time left
  let colorStyle = "bg-blue-50 text-blue-900 border-blue-200/80";
  let iconStyle = "text-blue-600";

  if (hours < 4) {
    colorStyle = "bg-rose-50 text-rose-900 border-rose-200";
    iconStyle = "text-rose-600 animate-pulse";
  } else if (hours < 12) {
    colorStyle = "bg-amber-50 text-amber-900 border-amber-200";
    iconStyle = "text-amber-600";
  }

  return (
    <div className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold shadow-xs ${colorStyle} ${className}`}>
      <div className="flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 shrink-0 ${iconStyle}`} />
        <span className="text-[9px] uppercase font-sans font-extrabold tracking-wider opacity-80">{label}:</span>
      </div>
      <span className="font-mono font-black text-xs tracking-tight">{formattedTime}</span>
    </div>
  );
};
