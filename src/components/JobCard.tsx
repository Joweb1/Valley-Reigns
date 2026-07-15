import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Job } from "../types";
import { incrementJobImpressions, simulateIncomingChat } from "../lib/services";
import { ChevronDown, MapPin, Banknote, Calendar, Flame, CheckCircle, Send, Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface JobCardProps {
  job: Job;
  onImpressionsUpdate?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onImpressionsUpdate }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sendingInApp, setSendingInApp] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [webhookSent, setWebhookSent] = useState(false);
  const [localImpressions, setLocalImpressions] = useState(job.impressions);
  const [copied, setCopied] = useState(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);

  const isStaffOrAdmin = currentUser?.role === "staff" || currentUser?.role === "admin";

  const handleRestrictedAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowRestrictedModal(true);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(whatsappLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const isInApp = currentUser?.messagingPreference === "in-app";

  const handleInAppApply = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    setSendingInApp(true);
    try {
      const seekerPhoneIdentifier = currentUser.displayName || currentUser.email || "Unknown Seeker";
      const initialMsg = `Hello! I'm interested in applying for the ${job.title} position. Reference ID: ${job.id}`;
      
      await simulateIncomingChat(seekerPhoneIdentifier, initialMsg, job.id, job.title, currentUser.uid);
      navigate(`/seeker/messages?jobId=${job.id}`);
    } catch (err) {
      console.error("Failed to initialize in-app chat:", err);
    } finally {
      setSendingInApp(false);
    }
  };

  // Sync state if job prop changes
  React.useEffect(() => {
    setLocalImpressions(job.impressions);
  }, [job.impressions]);

  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      // Update views counter locally first
      setLocalImpressions(prev => prev + 1);
      // Fire in the background, don't await or trigger parent re-fetch
      incrementJobImpressions(job.id).catch(console.error);
    }
  };

  // Compile formatted WhatsApp deep link
  const messageText = `I am applying for the ${job.title} position. Reference ID: ${job.id}`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  // Simulates direct application routing
  const triggerMockWebhook = async () => {
    setWebhookSent(true);
    const mockPhones = ["+234 803 123 4567", "+234 812 345 6789", "+234 905 678 9012", "+234 701 234 5678"];
    const randomPhone = mockPhones[Math.floor(Math.random() * mockPhones.length)];
    const mockMessageText = `Hello! I'm interested in the ${job.title} position. Reference ID: ${job.id}`;
    
    await simulateIncomingChat(randomPhone, mockMessageText, job.id, job.title);
    
    setTimeout(() => {
      setWebhookSent(false);
    }, 4000);
  };

  const formattedSalary = job.salary.replace(/\$/g, "₦");

  return (
    <div id={`job-card-${job.id}`} className={`bg-white border border-[#0B3C2D]/40 rounded-2xl overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.03),0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.03)] transition-all duration-300 text-left relative ${isOpen ? "ring-1 ring-[#0B3C2D]" : ""} group/card`}>
      {/* Accordion Header */}
      <div
        onClick={handleToggle}
        className="relative w-full text-left p-4 sm:p-5 focus:outline-none cursor-pointer z-10"
      >
        <div className="space-y-1 w-full pr-36 sm:pr-44">
          <h3 className="text-base sm:text-lg font-sans font-black text-[#0B3C2D] tracking-tight leading-snug">
            {job.title}
          </h3>

          <div className="flex flex-wrap sm:flex-row sm:items-center gap-2 text-[11px] sm:text-xs font-sans font-bold w-full pt-0.5">
            <span className="flex items-center gap-1 text-amber-500 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="truncate text-amber-950">{job.location}</span>
            </span>
          </div>
        </div>

        {/* Action Button and Dropdown side-by-side matching JobManagementCard right placement layout */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 sm:right-5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <AnimatePresence initial={false}>
            {!isOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-visible flex items-center shrink-0"
              >
                <motion.div 
                  whileHover="hover"
                  whileTap="tap"
                  className="relative group/btn shrink-0 mr-2"
                >
                  {/* The layered shadow border outline box (similar to homepage sign-in button) */}
                  <motion.div 
                    variants={{
                      hover: { x: 1.5, y: 1.5 },
                      tap: { x: 0, y: 0 }
                    }}
                    className="absolute -left-1.5 -top-1.5 w-full h-full border-2 border-[#0B3C2D] rounded-lg bg-transparent pointer-events-none transition-transform" 
                  />
                  
                  {isStaffOrAdmin ? (
                    <motion.button
                      variants={{
                        hover: { x: -1.5, y: -1.5 },
                        tap: { x: 0, y: 0 }
                      }}
                      onClick={handleRestrictedAction}
                      className="relative z-10 px-3 py-1.5 bg-[#0B3C2D] text-white font-sans font-black text-[10px] sm:text-xs rounded-lg flex items-center gap-1.5 cursor-pointer border border-[#0B3C2D] hover:bg-[#0c4027] transition-all shrink-0"
                    >
                      {isInApp ? (
                        <>
                          <Send className="w-3.5 h-3.5 text-white shrink-0" />
                          <span>Chat</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 fill-current shrink-0 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span>Chat</span>
                        </>
                      )}
                    </motion.button>
                  ) : isInApp ? (
                    <motion.button
                      variants={{
                        hover: { x: -1.5, y: -1.5 },
                        tap: { x: 0, y: 0 }
                      }}
                      onClick={handleInAppApply}
                      disabled={sendingInApp}
                      className="relative z-10 px-3 py-1.5 bg-[#0B3C2D] text-white font-sans font-black text-[10px] sm:text-xs rounded-lg flex items-center gap-1.5 cursor-pointer border border-[#0B3C2D] hover:bg-[#0c4027] transition-all disabled:opacity-75 shrink-0 animate-none"
                    >
                      <Send className="w-3.5 h-3.5 text-white shrink-0" />
                      <span>{sendingInApp ? "Wait..." : "Chat"}</span>
                    </motion.button>
                  ) : (
                    <motion.a
                      variants={{
                        hover: { x: -1.5, y: -1.5 },
                        tap: { x: 0, y: 0 }
                      }}
                      href={whatsappLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noreferrer"
                      className="relative z-10 px-3 py-1.5 bg-[#0B3C2D] text-white font-sans font-black text-[10px] sm:text-xs rounded-lg flex items-center gap-1.5 cursor-pointer border border-[#0B3C2D] hover:bg-[#0c4027] transition-all inline-flex shrink-0 decoration-none"
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      <span>Chat</span>
                    </motion.a>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.85 }}
            onClick={handleToggle}
            className={`w-8 h-8 rounded-full bg-emerald-950/10 hover:bg-emerald-950/20 border border-emerald-900/10 flex items-center justify-center text-[#0B3C2D] transform transition-transform duration-300 shrink-0 ${isOpen ? "rotate-180" : ""}`}
            title={isOpen ? "Collapse Details" : "Expand Details"}
          >
            <ChevronDown className="w-4.5 h-4.5" />
          </motion.button>
        </div>
      </div>

      {/* Accordion Body */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="border-t border-emerald-200 bg-white/40"
          >
            <div className="p-4 sm:p-5 space-y-4 relative z-10">
              {/* Job Metadata Tags */}
              <div className="flex flex-wrap items-center gap-1.5 border-b border-emerald-100 pb-3">
                <span className="px-2.5 py-0.5 bg-[#0B3C2D] text-white rounded-full text-[9px] font-sans font-extrabold tracking-wide shadow-sm">
                  {job.category}
                </span>
                <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-200 text-emerald-800 font-sans font-extrabold rounded-full text-[9px]">
                  {job.type}
                </span>
                {localImpressions > 50 && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Flame className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                    Popular ({localImpressions} Views)
                  </span>
                )}
              </div>

              {/* Organization & Remuneration Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/80 p-4 rounded-xl border border-emerald-200">
                <div className="space-y-1 text-left">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-emerald-800 uppercase">
                    Hiring Organization
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#0B3C2D] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs">
                      {job.company}
                    </span>
                  </div>
                </div>
                <div className="space-y-1 text-left">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-emerald-800 uppercase">
                    Salary & Compensation
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#0B3C2D] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 text-xs flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-emerald-700" />
                      {formattedSalary}
                    </span>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2 text-left">
                <h4 className="text-[9px] font-mono font-black tracking-widest text-[#0B3C2D] uppercase">
                  Job Description & Scope
                </h4>
                <p className="text-xs font-sans text-emerald-950 font-semibold leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Requirements Bullet Points */}
              <div className="space-y-3 text-left">
                <h4 className="text-[9px] font-mono font-black tracking-widest text-[#0B3C2D] uppercase">
                  Candidate Requirements
                </h4>
                <ul className="space-y-1.5">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 text-xs font-sans text-emerald-950 font-semibold">
                      <div className="w-4.5 h-4.5 rounded-full bg-white text-[#0B3C2D] flex items-center justify-center flex-shrink-0 mt-0.5 border border-emerald-200">
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Engagement Panel */}
              <div className="pt-4 border-t border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-800 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-emerald-700" />
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                  <span className="mx-1.5">•</span>
                  <span>ID: {job.id}</span>
                  <span className="mx-1.5">•</span>
                  <span>{localImpressions} views</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Copy Link Button */}
                  <motion.button
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-white border border-emerald-800 text-[#0B3C2D] rounded-xl text-[10px] font-sans font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:bg-emerald-50"
                    title="Copy WhatsApp Application Link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0 text-[#0B3C2D]" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </motion.button>

                  {/* Standard WhatsApp or In-App Apply button inside dropdown */}
                  {isStaffOrAdmin ? (
                    <button
                      onClick={handleRestrictedAction}
                      className="px-4 py-2 bg-[#0B3C2D] hover:bg-[#06241B] text-white font-sans font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all shadow-sm hover:-translate-y-0.5"
                    >
                      {isInApp ? (
                        <>
                          <Send className="w-3.5 h-3.5 text-white" />
                          <span>Send Message</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5 fill-current shrink-0 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                          <span>WhatsApp</span>
                        </>
                      )}
                    </button>
                  ) : isInApp ? (
                    <button
                      onClick={handleInAppApply}
                      disabled={sendingInApp}
                      className="px-4 py-2 bg-[#0B3C2D] hover:bg-[#06241B] text-white font-sans font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border-0 disabled:opacity-75"
                    >
                      <Send className="w-3.5 h-3.5 text-white" />
                      <span>{sendingInApp ? "Connecting..." : "Send Message"}</span>
                    </button>
                  ) : (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noreferrer"
                      className="px-4 py-2 bg-[#0B3C2D] hover:bg-[#06241B] text-white font-sans font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-emerald-800 hover:-translate-y-0.5 inline-flex"
                    >
                      <svg className="w-3.5 h-3.5 fill-current shrink-0 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      <span>Apply via WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRestrictedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRestrictedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white border-2 border-[#0F5132] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top border decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#0F5132]" />
              
              <div className="space-y-6 pt-2">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                <div className="space-y-3 text-center">
                  <h3 className="text-xl sm:text-2xl font-sans font-black text-black tracking-tight">
                    Action Restricted
                  </h3>
                  <p className="text-sm font-sans font-semibold text-slate-600 leading-relaxed">
                    You are currently logged in as a <span className="text-[#0F5132] font-extrabold uppercase">{currentUser?.role}</span>.
                  </p>
                  <p className="text-sm font-sans font-semibold text-slate-500 leading-relaxed">
                    Staff and Admin accounts are only authorized to manage jobs, supervise communication streams, and check diagnostics. To apply for jobs or send messages, please sign in with a Candidate account.
                  </p>
                </div>
                
                <div className="relative inline-block w-full">
                  {/* Background offset box */}
                  <div className="absolute -left-1 -top-1 w-full h-full border-2 border-[#0F5132] rounded-xl bg-transparent pointer-events-none" />
                  {/* Main button */}
                  <button
                    onClick={() => setShowRestrictedModal(false)}
                    className="relative z-10 w-full px-5 py-3.5 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-sm rounded-xl text-center shadow-md active:translate-x-[-1px] active:translate-y-[-1px] transition-all cursor-pointer border-0"
                  >
                    Understood
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
