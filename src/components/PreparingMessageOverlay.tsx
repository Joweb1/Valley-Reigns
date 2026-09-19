import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, Send, Sparkles } from "lucide-react";

interface PreparingMessageOverlayProps {
  isVisible: boolean;
  title?: string;
  subtitle?: string;
  jobTitle?: string;
}

export const PreparingMessageOverlay: React.FC<PreparingMessageOverlayProps> = ({
  isVisible,
  title = "Preparing Message...",
  subtitle = "Routing your inquiry directly to your assigned recruiter & opening your chat channel...",
  jobTitle
}) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="preparing-message-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="bg-white rounded-3xl p-7 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center relative overflow-hidden"
          >
            {/* Ambient Background Accent */}
            <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-10 -mb-10 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Icon Centerpiece */}
            <div className="relative mx-auto w-16 h-16 mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-blue-100/80 animate-ping opacity-35" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0B1B3D] to-[#1E88E5] text-white flex items-center justify-center shadow-lg border border-blue-400/20">
                <MessageSquare className="w-7 h-7 text-white" />
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.15, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-sky-400 text-white flex items-center justify-center shadow-xs"
                >
                  <Sparkles className="w-3 h-3" />
                </motion.div>
              </div>
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight font-sans">
              {title}
            </h3>

            {/* Job Title Badge if available */}
            {jobTitle && (
              <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100 max-w-full truncate">
                <Send className="w-3 h-3 shrink-0" />
                <span className="truncate">{jobTitle}</span>
              </div>
            )}

            {/* Subtitle */}
            <p className="mt-2.5 text-xs text-slate-500 leading-relaxed font-normal">
              {subtitle}
            </p>

            {/* Bouncing Animated Loading Dots */}
            <div className="mt-6 flex items-center justify-center gap-2">
              {[0, 1, 2].map((dotIndex) => (
                <motion.span
                  key={dotIndex}
                  animate={{
                    y: [0, -8, 0],
                    opacity: [0.35, 1, 0.35],
                    scale: [0.9, 1.15, 0.9]
                  }}
                  transition={{
                    duration: 0.7,
                    repeat: Infinity,
                    delay: dotIndex * 0.18,
                    ease: "easeInOut"
                  }}
                  className="w-2.5 h-2.5 rounded-full bg-[#1E88E5]"
                />
              ))}
            </div>

            {/* Status Bar Indicator */}
            <div className="mt-5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-1/2 h-full bg-gradient-to-r from-transparent via-[#1E88E5] to-transparent rounded-full"
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
