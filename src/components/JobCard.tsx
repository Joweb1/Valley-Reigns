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
      
      await simulateIncomingChat(seekerPhoneIdentifier, initialMsg, job.id, job.title);
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
    <div id={`job-card-${job.id}`} className="bg-white border border-[#0F5132] rounded-3xl overflow-hidden shadow-none hover:shadow-none transition-all duration-300">
      {/* Accordion Header */}
      <div
        onClick={handleToggle}
        className="relative w-full text-left p-6 sm:p-8 focus:outline-none cursor-pointer"
      >
        <div className="space-y-4 w-full">
          <div className="flex flex-wrap items-center gap-2 pr-14 sm:pr-16">
            <span className="px-3 py-1 bg-emerald-50 text-[#0F5132] rounded-full text-[10px] font-sans font-bold tracking-wide border border-[#0F5132]/20">
              {job.category}
            </span>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-950 font-sans font-bold rounded-full text-[10px]">
              {job.type}
            </span>
            {localImpressions > 50 && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-800">
                <Flame className="w-3.5 h-3.5 fill-amber-500 stroke-amber-600" />
                Popular ({localImpressions} Views)
              </span>
            )}
          </div>

          <h3 className="text-xl sm:text-2xl md:text-3xl font-sans font-black text-black tracking-tight leading-snug pr-14 sm:pr-16">
            {job.title}
          </h3>

          <div className="flex flex-row items-center justify-between gap-3 text-xs font-sans font-bold text-black w-full pt-1">
            <span className="flex items-center gap-1.5 text-black min-w-0">
              <MapPin className="w-4 h-4 text-[#0F5132] shrink-0" />
              <span className="truncate">{job.location}</span>
            </span>

            {/* Chat on WhatsApp button matching 3D Sign In button design */}
            <div className="relative inline-block shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Background offset box - reduced offset */}
              <div className="absolute -left-1 -top-1 w-full h-full border-2 border-[#0F5132] rounded-xl bg-transparent pointer-events-none" />
              {/* Main Solid Button - slightly bigger */}
              {isInApp ? (
                <button
                  onClick={handleInAppApply}
                  disabled={sendingInApp}
                  className="relative z-10 px-5 py-2.5 sm:px-7 sm:py-3.5 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:translate-x-[-1px] active:translate-y-[-1px] inline-flex whitespace-nowrap shrink-0 border-0 disabled:opacity-75"
                >
                  <Send className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-white" />
                  <span>{sendingInApp ? "Connecting..." : "Send Message"}</span>
                </button>
              ) : (
                <a
                  href={whatsappLink}
                  target="_blank"
                  referrerPolicy="no-referrer"
                  rel="noreferrer"
                  className="relative z-10 px-5 py-2.5 sm:px-7 sm:py-3.5 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:translate-x-[-1px] active:translate-y-[-1px] inline-flex whitespace-nowrap shrink-0"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 fill-current shrink-0 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span>Chat on WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className={`absolute right-6 top-6 sm:right-8 sm:top-8 w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center border border-[#0F5132]/20 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""} text-[#0F5132]`}>
          <ChevronDown className="w-5.5 h-5.5" />
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
            className="border-t border-[#0F5132]/30 bg-[#FAFDFB]"
          >
            <div className="p-6 sm:p-8 space-y-6">
              {/* Organization & Remuneration Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#FAFDFB] p-5 rounded-2xl border border-[#0F5132]/30">
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono font-black tracking-widest text-[#0F5132] uppercase">
                    Hiring Organization
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-extrabold text-[#0F5132] bg-emerald-50 px-3 py-1 rounded-xl border border-[#0F5132]/25 text-xs sm:text-sm">
                      {job.company}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[10px] font-mono font-black tracking-widest text-[#0F5132] uppercase">
                    Salary & Compensation
                  </h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-extrabold text-emerald-950 bg-emerald-100 px-3 py-1 rounded-xl border border-[#0F5132]/20 text-xs sm:text-sm flex items-center gap-1.5">
                      <Banknote className="w-4 h-4 text-[#0F5132]" />
                      {formattedSalary}
                    </span>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono font-black tracking-widest text-[#0F5132] uppercase">
                  Job Description & Scope
                </h4>
                <p className="text-sm font-sans text-black font-semibold leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Requirements Bullet Points */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-mono font-black tracking-widest text-[#0F5132] uppercase">
                  Candidate Requirements
                </h4>
                <ul className="space-y-2">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-sm font-sans text-black font-semibold">
                      <div className="w-5 h-5 rounded-full bg-emerald-150 text-[#0F5132] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#0F5132]/30">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Engagement Panel */}
              <div className="pt-6 border-t border-[#0F5132]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#0F5132] font-bold">
                  <Calendar className="w-4 h-4 text-[#0F5132]" />
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                  <span className="mx-2">•</span>
                  <span>ID: {job.id}</span>
                  <span className="mx-2">•</span>
                  <span>{localImpressions} views</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Copy Link Button */}
                  <button
                    onClick={handleCopyLink}
                    className="px-5 py-2.5 bg-white border border-[#0F5132]/30 hover:border-[#0F5132] text-[#0F5132] rounded-xl text-[11px] font-sans font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    title="Copy WhatsApp Application Link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 shrink-0" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  {/* Standard WhatsApp or In-App Apply button */}
                  {isInApp ? (
                    <button
                      onClick={handleInAppApply}
                      disabled={sendingInApp}
                      className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0c4027] text-white rounded-xl text-[11px] font-sans font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md border-0 disabled:opacity-75"
                    >
                      <Send className="w-4 h-4 shrink-0 text-white" />
                      <span>{sendingInApp ? "Connecting..." : "Send Message"}</span>
                    </button>
                  ) : (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noreferrer"
                      className="px-6 py-2.5 bg-[#0F5132] hover:bg-[#0c4027] text-white rounded-xl text-[11px] font-sans font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
                    >
                      <svg className="w-4.5 h-4.5 fill-current shrink-0 text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                      </svg>
                      Apply via WhatsApp
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
