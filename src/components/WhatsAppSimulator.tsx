import React, { useState, useEffect } from "react";
import { simulateIncomingChat, getJobs } from "../lib/services";
import { Job } from "../types";
import { Play, Sparkles, MessageSquare, Smartphone, Check, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export const WhatsAppSimulator: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [customerPhone, setCustomerPhone] = useState("+1 (555) 019-2834");
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function load() {
      const allJobs = await getJobs();
      setJobs(allJobs);
      if (allJobs.length > 0) {
        setSelectedJobId(allJobs[0].id);
        setMessageText(`Hello! I'm interested in applying for the ${allJobs[0].title} position. Reference ID: ${allJobs[0].id}`);
      }
    }
    load();
  }, []);

  const handleJobChange = (jobId: string) => {
    setSelectedJobId(jobId);
    const selectedJob = jobs.find(j => j.id === jobId);
    if (selectedJob) {
      setMessageText(`Hello! I'm highly interested in the ${selectedJob.title} position. Reference ID: ${selectedJob.id}`);
    }
  };

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const selectedJob = jobs.find(j => j.id === selectedJobId);
    const jobTitle = selectedJob ? selectedJob.title : "General Inquiry";

    await simulateIncomingChat(customerPhone, messageText, selectedJobId, jobTitle);

    setLoading(false);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };

  if (inline) {
    return (
      <div className="w-full max-w-md bg-white border border-slate-150/80 shadow-md rounded-[24px] p-6 overflow-hidden text-slate-800 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#1E88E5]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                WhatsApp Application Router
              </h4>
              <span className="text-[10px] font-mono text-blue-700 font-semibold tracking-wide uppercase">
                Routing Pipeline
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs font-sans text-slate-500 leading-relaxed mb-4">
          Simulate direct applications. This routes the conversation instantly into the staffing system workspace so recruiters can pick it up.
        </p>

        {/* Form */}
        <form onSubmit={handleSimulate} className="space-y-4">
          {/* Phone Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Simulated Customer Phone
            </label>
            <div className="relative">
              <Smartphone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
              />
            </div>
          </div>

          {/* Job Association */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Target Job Association
            </label>
            <select
              value={selectedJobId}
              onChange={(e) => handleJobChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-sans font-semibold focus:border-[#1E88E5] focus:outline-none bg-slate-50"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.company})
                </option>
              ))}
            </select>
          </div>

          {/* Message Input */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Direct Application Message
            </label>
            <textarea
              required
              rows={3}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans font-medium focus:border-[#1E88E5] focus:outline-none resize-none"
            />
          </div>

          {/* Trigger Button */}
          <button
            type="submit"
            disabled={loading || success}
            className={`w-full py-3 rounded-xl text-xs font-sans font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md border-0 ${
              success
                ? "bg-blue-600 text-white shadow-emerald-100"
                : "bg-[#1E88E5] hover:bg-[#1565C0] text-white shadow-blue-900/10"
            }`}
          >
            {success ? (
              <>
                <Check className="w-4 h-4 inline" />
                Application Successfully Routed!
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current inline" />
                {loading ? "Routing Application..." : "Route Simulation Message"}
              </>
            )}
          </button>
        </form>

        {/* Note */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-[10px] font-sans text-slate-400">
          <HelpCircle className="w-4 h-4 text-[#1E88E5] shrink-0" />
          <span>
            Tip: Trigger a message here, switch to <strong>Staff Agent View</strong>, and watch the chat appear dynamically in the claiming queue!
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-full shadow-lg shadow-blue-950/30 flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 group border-2 border-blue-400/20"
        title="WhatsApp Conversation Router"
      >
        <MessageSquare className="w-6 h-6 animate-pulse group-hover:scale-110 transition-transform" />
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500 text-[9px] font-extrabold text-white items-center justify-center">
            !
          </span>
        </span>
      </button>

      {/* Simulator Side Panel Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white border border-slate-100 rounded-3xl shadow-2xl p-6 overflow-hidden z-50 text-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-[#1E88E5]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    WhatsApp Application Router
                  </h4>
                  <span className="text-[10px] font-mono text-blue-700 font-semibold tracking-wide uppercase">
                    Routing Pipeline
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-xs font-mono font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                CLOSE
              </button>
            </div>

            {/* Description */}
            <p className="text-xs font-sans text-slate-500 leading-relaxed mb-4">
              Simulate direct applications. This routes the conversation instantly into the staffing system workspace so recruiters can pick it up.
            </p>

            {/* Form */}
            <form onSubmit={handleSimulate} className="space-y-4">
              {/* Phone Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Simulated Customer Phone
                </label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
                  />
                </div>
              </div>

              {/* Job Association */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Target Job Association
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => handleJobChange(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-sans font-semibold focus:border-[#1E88E5] focus:outline-none bg-slate-50"
                >
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.title} ({j.company})
                    </option>
                  ))}
                </select>
              </div>

              {/* Message Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                  Direct Application Message
                </label>
                <textarea
                  required
                  rows={3}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-sans font-medium focus:border-[#1E88E5] focus:outline-none resize-none"
                />
              </div>

              {/* Trigger Button */}
              <button
                type="submit"
                disabled={loading || success}
                className={`w-full py-3 rounded-xl text-xs font-sans font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md ${
                  success
                    ? "bg-blue-600 text-white shadow-emerald-100"
                    : "bg-[#1E88E5] hover:bg-[#1565C0] text-white shadow-blue-900/10"
                }`}
              >
                {success ? (
                  <>
                    <Check className="w-4 h-4" />
                    Application Successfully Routed!
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {loading ? "Routing Application..." : "Route Simulation Message"}
                  </>
                )}
              </button>
            </form>

            {/* Note */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-start gap-2 text-[10px] font-sans text-slate-400">
              <HelpCircle className="w-4 h-4 text-[#1E88E5] shrink-0" />
              <span>
                Tip: Trigger a message here, switch to <strong>Staff Agent View</strong>, and watch the chat appear dynamically in the claiming queue!
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
