import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Wifi, WifiOff, AlertTriangle, X } from "lucide-react";

type NetworkStatus = "online" | "unstable" | "offline" | "rtdb-offline";

export const NetworkStatusMonitor: React.FC = () => {
  const [status, setStatus] = useState<NetworkStatus>(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return "offline";
    }
    // Try to detect unstable on initial load if network info is available
    const conn = typeof navigator !== "undefined" ? (navigator as any).connection : null;
    if (conn && (conn.effectiveType === "2g" || conn.effectiveType === "3g" || conn.saveData)) {
      return "unstable";
    }
    return "online";
  });

  const [isVisible, setIsVisible] = useState(false);
  const isInitialMount = useRef(true);
  const previousStatus = useRef<NetworkStatus>(status);

  useEffect(() => {
    const handleOnline = () => {
      // Check if connection details suggest unstable
      const conn = (navigator as any).connection;
      let newStatus: NetworkStatus = "online";
      if (conn && (conn.effectiveType === "2g" || conn.effectiveType === "3g" || conn.saveData)) {
        newStatus = "unstable";
      }

      if (previousStatus.current !== newStatus) {
        setStatus(newStatus);
        previousStatus.current = newStatus;
        if (!isInitialMount.current) {
          setIsVisible(true);
        }
      }
    };

    const handleOffline = () => {
      const newStatus: NetworkStatus = "offline";
      if (previousStatus.current !== newStatus) {
        setStatus(newStatus);
        previousStatus.current = newStatus;
        if (!isInitialMount.current) {
          setIsVisible(true);
        }
      }
    };

    const handleRtdbConnection = (e: Event) => {
      const customEvent = e as CustomEvent<{ connected: boolean }>;
      const isConnected = customEvent.detail.connected;
      
      let newStatus: NetworkStatus = isConnected ? "online" : "rtdb-offline";
      
      if (!navigator.onLine) {
        newStatus = "offline";
      }

      if (previousStatus.current !== newStatus) {
        setStatus(newStatus);
        previousStatus.current = newStatus;
        if (!isInitialMount.current) {
          setIsVisible(true);
        }
      }
    };

    const handleConnectionChange = () => {
      const conn = (navigator as any).connection;
      if (!navigator.onLine) {
        handleOffline();
        return;
      }
      
      let newStatus: NetworkStatus = "online";
      if (conn && (conn.effectiveType === "2g" || conn.effectiveType === "3g" || conn.saveData)) {
        newStatus = "unstable";
      }

      if (previousStatus.current !== newStatus) {
        setStatus(newStatus);
        previousStatus.current = newStatus;
        if (!isInitialMount.current) {
          setIsVisible(true);
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("rtdb-connection-changed", handleRtdbConnection);

    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener("change", handleConnectionChange);
    }

    // Set initial mount to false after a tiny delay so initial status is registered but not popped up
    const timer = setTimeout(() => {
      isInitialMount.current = false;
    }, 1000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("rtdb-connection-changed", handleRtdbConnection);
      if (conn) {
        conn.removeEventListener("change", handleConnectionChange);
      }
      clearTimeout(timer);
    };
  }, []);

  // Auto-dismiss after 4 seconds
  useEffect(() => {
    if (isVisible) {
      const dismissTimer = setTimeout(() => {
        setIsVisible(false);
      }, 4000);
      return () => clearTimeout(dismissTimer);
    }
  }, [isVisible, status]);

  const getStatusDetails = () => {
    switch (status) {
      case "offline":
        return {
          bg: "bg-rose-50 border-rose-200/80",
          text: "text-rose-800",
          icon: <WifiOff className="w-4 h-4 text-rose-600" />,
          title: "Connection Lost",
          desc: "You are currently offline.",
        };
      case "rtdb-offline":
        return {
          bg: "bg-rose-50 border-rose-200/80",
          text: "text-rose-800",
          icon: <WifiOff className="w-4 h-4 text-rose-600" />,
          title: "Presence Offline",
          desc: "You went offline due to connection issues.",
        };
      case "unstable":
        return {
          bg: "bg-amber-50 border-amber-200/80",
          text: "text-amber-800",
          icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
          title: "Unstable Connection",
          desc: "Network speed is slow or unstable.",
        };
      case "online":
      default:
        return {
          bg: "bg-emerald-50 border-emerald-200/80",
          text: "text-emerald-800",
          icon: <Wifi className="w-4 h-4 text-emerald-600" />,
          title: "Back Online",
          desc: "Connection restored successfully.",
        };
    }
  };

  const details = getStatusDetails();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="network-status-toast"
          initial={{ opacity: 0, x: 50, y: -10, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 50, y: -10, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 200, damping: 22 }}
          className={`fixed top-20 right-4 z-50 flex items-center gap-3 p-3 max-w-xs rounded-xl border shadow-[0_8px_24px_rgba(0,0,0,0.08)] ${details.bg} ${details.text} pointer-events-auto`}
        >
          <div className="flex items-center justify-center p-1.5 rounded-lg bg-white/80 shadow-sm shrink-0">
            {details.icon}
          </div>
          
          <div className="flex-1 min-w-0 text-left pr-1">
            <h4 className="text-xs font-bold leading-none">{details.title}</h4>
            <p className="text-[10px] text-slate-500 mt-1 leading-tight">{details.desc}</p>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full transition-colors shrink-0 hover:bg-white/50 cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
