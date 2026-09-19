import React, { useState, useEffect } from "react";
import { Clock, MessageSquare } from "lucide-react";
import { getCachedAppSettingsTimeout, subscribeToAppSettings } from "../lib/services";

interface SLACountdownTimerProps {
  createdAt: number;
  label?: string;
  className?: string;
  isInApp?: boolean;
  customerPhone?: string;
  timeoutHours?: number;
  lastMessageAt?: number;
  status?: "pending" | "ongoing" | "finished" | "abandoned";
}

export const SLACountdownTimer: React.FC<SLACountdownTimerProps> = ({
  createdAt,
  label = "SLA Countdown",
  className = "",
  isInApp,
  customerPhone,
  timeoutHours,
  lastMessageAt,
  status
}) => {
  const [now, setNow] = useState<number>(Date.now());
  const [appSettingsTimeout, setAppSettingsTimeout] = useState<number>(() => {
    return getCachedAppSettingsTimeout();
  });

  // Re-tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen to app settings changes in real-time
  useEffect(() => {
    const unsub = subscribeToAppSettings((settings) => {
      if (settings?.unclaimedChatTimeoutHours && Number(settings.unclaimedChatTimeoutHours) > 0) {
        setAppSettingsTimeout(Number(settings.unclaimedChatTimeoutHours));
      }
    });
    return () => unsub();
  }, []);

  const isOngoing = status === "ongoing" || label.toLowerCase().includes("ongoing");

  // Determine effective timeout duration:
  // Both claim countdowns and ongoing SLA timers use the admin configured timeout from App Settings
  let rawHours = (typeof timeoutHours === "number" && timeoutHours > 0)
    ? timeoutHours
    : (appSettingsTimeout > 0 ? appSettingsTimeout : 24);

  // Clamp SLA timeout to maximum 72 hours to prevent legacy 720h entry display bug
  if (rawHours > 72) {
    rawHours = 72;
  }
  const effectiveHours = rawHours;

  const totalDurationMs = effectiveHours * 60 * 60 * 1000;

  const expiresAt = (createdAt || Date.now()) + totalDurationMs;
  const diffMs = expiresAt - now;

  // Format date and time of the last message sent
  const formatLastMessageDateTime = (ts: number): string => {
    if (!ts || isNaN(ts)) return "N/A";
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
    const timeStr = d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
    return `${dateStr}, ${timeStr}`;
  };

  // Expired / elapsed state handling
  if (diffMs <= 0) {
    // When an ongoing chat countdown has elapsed, it should not be marked as abandoned;
    // instead, the Ongoing SLA Timer section changes to "Last message sent" with date and time
    if (isOngoing) {
      const lastSentTimestamp = lastMessageAt || createdAt || Date.now();
      return (
        <div 
          className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-slate-50 text-slate-800 border border-slate-200/90 rounded-xl text-[10px] font-sans font-bold shadow-xs ${className}`}
          title={`Ongoing countdown (${effectiveHours}h) elapsed. Showing date and time of the last message sent.`}
        >
          <div className="flex items-center gap-1.5 text-slate-600 shrink-0">
            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-[#1E88E5]" />
            <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 whitespace-nowrap">
              Last message sent:
            </span>
          </div>
          <span className="font-mono font-bold text-[10px] sm:text-[11px] text-slate-800 tracking-tight text-right truncate">
            {formatLastMessageDateTime(lastSentTimestamp)}
          </span>
        </div>
      );
    }

    return (
      <div 
        className={`flex items-center justify-between gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-mono font-bold shadow-xs ${className}`}
        title={`${label} (${effectiveHours}h configured in App Settings) has expired`}
      >
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0 text-rose-600 animate-pulse" />
          <span className="text-[9px] uppercase font-sans font-extrabold tracking-wider opacity-90">{label}:</span>
        </div>
        <span className="font-extrabold tracking-tight text-rose-800">00h 00m 00s (Expired)</span>
      </div>
    );
  }

  const totalSecs = Math.max(0, Math.floor(diffMs / 1000));
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  const formattedTime = `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;

  // Dynamic proportional styling based on remaining percentage of configured time
  const ratio = totalDurationMs > 0 ? diffMs / totalDurationMs : 1;
  let colorStyle = "bg-blue-50 text-blue-900 border-blue-200/80";
  let iconStyle = "text-blue-600";

  if (ratio <= 0.25) {
    colorStyle = "bg-rose-50 text-rose-900 border-rose-200";
    iconStyle = "text-rose-600 animate-pulse";
  } else if (ratio <= 0.5) {
    colorStyle = "bg-amber-50 text-amber-900 border-amber-200";
    iconStyle = "text-amber-600";
  }

  return (
    <div 
      className={`flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-xl border text-[10px] font-mono font-bold shadow-xs ${colorStyle} ${className}`}
      title={`${label} based on ${effectiveHours}h threshold set in App Settings`}
    >
      <div className="flex items-center gap-1.5">
        <Clock className={`w-3.5 h-3.5 shrink-0 ${iconStyle}`} />
        <span className="text-[9px] uppercase font-sans font-extrabold tracking-wider opacity-80">
          {label}:
        </span>
      </div>
      <span className="font-mono font-black text-xs tracking-tight">{formattedTime}</span>
    </div>
  );
};
