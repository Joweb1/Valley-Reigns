import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  submitDailyReport, 
  subscribeToDailyReports,
  getStaffResumption,
  recordStaffResumption,
  isTimestampOnTime,
  formatTimeStr,
  isReportSubmissionReopened,
  subscribeToReportReopens
} from "../lib/services";
import { StaffDailyReport, StaffResumptionRecord } from "../types";
import { CandidateListSummarySection } from "./CandidateListSummarySection";
import { uploadToImageKit } from "../lib/imagekit";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, FileText, Upload, Calendar, Clock, Smile, Sparkles, Send, MapPin, Users, HeartHandshake, PhoneCall, ShieldCheck, Rocket, FolderDown, DollarSign, Image, Video, Briefcase, Building2, ListFilter, ArrowLeft, X, Info, Loader2, File, Lock, Unlock } from "lucide-react";

const getLocalTodayString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const StaffReportForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const { currentUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [allReports, setAllReports] = useState<StaffDailyReport[]>([]);

  // Form states
  const [date, setDate] = useState(() => getLocalTodayString());
  
  const [newReachOuts, setNewReachOuts] = useState<number | "">("");
  const [resumptions, setResumptions] = useState<number | "">("");
  const [cvsCollected, setCvsCollected] = useState<number | "">("");
  const [candidatesRegistered, setCandidatesRegistered] = useState<number | "">("");
  const [addressesGiven, setAddressesGiven] = useState<number | "">("");
  const [commissionRetrieved, setCommissionRetrieved] = useState<string>("");
  const [flyersMade, setFlyersMade] = useState<number | "">("");
  const [videosMade, setVideosMade] = useState<number | "">("");
  const [jobsGotten, setJobsGotten] = useState<number | "">("");
  const [newJobsGottenClientRelations, setNewJobsGottenClientRelations] = useState<string>("");
  const [challenges, setChallenges] = useState<string>("");
  const [plansTomorrow, setPlansTomorrow] = useState<string>("");
  const [chatsClearedConfirmed, setChatsClearedConfirmed] = useState<boolean>(false);
  
  // Custom mock file upload states
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [chatsClearedProofUrl, setChatsClearedProofUrl] = useState<string>("");
  const [showReportListModal, setShowReportListModal] = useState<boolean>(false);
  const [showSlaTooltip, setShowSlaTooltip] = useState<boolean>(false);

  // Staff Resumption (9:00 AM Resumption SLA) & Reopen Override states
  const [resumptionRecord, setResumptionRecord] = useState<StaffResumptionRecord | null>(null);
  const [reopenInfo, setReopenInfo] = useState<{
    isReopened: boolean;
    remainingMs: number;
    expiresAt: number | null;
    reopenedAt: number | null;
  }>({ isReopened: false, remainingMs: 0, expiresAt: null, reopenedAt: null });

  useEffect(() => {
    const unsub = subscribeToDailyReports((reports) => {
      setAllReports(reports);
    });
    return () => unsub();
  }, []);

  // Fetch/Record Staff Morning Resumption
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;
    getStaffResumption(currentUser.uid, date).then((rec) => {
      if (!isMounted) return;
      if (rec) {
        setResumptionRecord(rec);
      } else if (date === getLocalTodayString()) {
        recordStaffResumption(currentUser.uid, currentUser.displayName || "Staff Member").then((newRec) => {
          if (isMounted) setResumptionRecord(newRec);
        });
      } else {
        setResumptionRecord(null);
      }
    });
    return () => { isMounted = false; };
  }, [currentUser, date]);

  // Subscribe and monitor Admin Reopen window
  useEffect(() => {
    if (!currentUser) return;
    const checkReopen = () => {
      setReopenInfo(isReportSubmissionReopened(currentUser.uid, date));
    };
    checkReopen();
    const unsub = subscribeToReportReopens(checkReopen);
    const timer = setInterval(checkReopen, 5000);
    return () => { unsub(); clearInterval(timer); };
  }, [currentUser, date]);

  const existingReportForDate = allReports.find(
    (r) => r.uid === currentUser?.uid && r.date === date
  );

  const localTodayStr = getLocalTodayString();

  const deadlinePassed = (() => {
    if (date < localTodayStr) {
      return true;
    }
    if (date === localTodayStr) {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= 21) {
        return true;
      }
    }
    return false;
  })();

  // If 9:00 PM deadline passed, read-only EXCEPT if admin reopened submission for this staff
  const isReadOnly = deadlinePassed && !reopenInfo.isReopened;

  // Morning Resumption SLA (9:00 AM)
  const targetOnTimeMet = existingReportForDate
    ? (existingReportForDate.targetOnTimeMet ?? true)
    : (resumptionRecord ? isTimestampOnTime(resumptionRecord.timestamp) : true);

  const resumptionTimeStr = resumptionRecord
    ? formatTimeStr(resumptionRecord.timestamp)
    : (existingReportForDate?.resumptionTimeStr || "9:00 AM");

  // Targets status
  const targetReachOutsMet = isReadOnly && existingReportForDate
    ? !!existingReportForDate?.targetReachOutsMet
    : (typeof newReachOuts === "number" ? newReachOuts : Number(newReachOuts || 0)) >= 20;

  const targetAddressesMet = isReadOnly && existingReportForDate
    ? !!existingReportForDate?.targetAddressesMet
    : (typeof addressesGiven === "number" ? addressesGiven : Number(addressesGiven || 0)) >= 4;

  const [submitTimeStr, setSubmitTimeStr] = useState("");

  useEffect(() => {
    if (existingReportForDate) {
      setNewReachOuts(existingReportForDate.newReachOuts);
      setResumptions(existingReportForDate.resumptions);
      setCvsCollected(existingReportForDate.cvsCollected);
      setCandidatesRegistered(existingReportForDate.candidatesRegistered);
      setAddressesGiven(existingReportForDate.addressesGiven);
      setCommissionRetrieved(existingReportForDate.commissionRetrieved || "");
      setFlyersMade(existingReportForDate.flyersMade);
      setVideosMade(existingReportForDate.videosMade);
      setJobsGotten(existingReportForDate.jobsGotten);
      setNewJobsGottenClientRelations(existingReportForDate.newJobsGottenClientRelations || "");
      setChallenges(existingReportForDate.challenges || "");
      setPlansTomorrow(existingReportForDate.plansTomorrow || "");
      setChatsClearedConfirmed(existingReportForDate.chatsClearedConfirmed || false);
      setChatsClearedProofUrl(existingReportForDate.chatsClearedProofUrl || "");
      setUploadProgress(existingReportForDate.chatsClearedProofUrl ? 100 : 0);
      
      if (existingReportForDate.timestamp) {
        setSubmitTimeStr(formatTimeStr(existingReportForDate.timestamp));
      }
    } else {
      setNewReachOuts("");
      setResumptions("");
      setCvsCollected("");
      setCandidatesRegistered("");
      setAddressesGiven("");
      setCommissionRetrieved("");
      setFlyersMade("");
      setVideosMade("");
      setJobsGotten("");
      setNewJobsGottenClientRelations("");
      setChallenges("");
      setPlansTomorrow("");
      setChatsClearedConfirmed(false);
      setChatsClearedProofUrl("");
      setUploadProgress(0);
      setSubmitTimeStr(formatTimeStr(Date.now()));
    }
  }, [date, existingReportForDate]);

  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRealProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingProof(true);
      setUploadError(null);
      const result = await uploadToImageKit(file, "/staff_report_proofs");
      setChatsClearedProofUrl(result.url);
    } catch (err: any) {
      console.error("[Proof Upload Error]", err);
      setUploadError(err.message || "Failed to upload proof image to ImageKit");
    } finally {
      setIsUploadingProof(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleResetProof = () => {
    setChatsClearedProofUrl("");
    setUploadError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!chatsClearedConfirmed) {
      alert("Please confirm that all chats are cleared before submitting.");
      return;
    }

    setSubmitting(true);

    const reportData = {
      uid: currentUser.uid,
      staffName: currentUser.displayName || "Valley Reigns Staff",
      date,
      newReachOuts: typeof newReachOuts === "number" ? newReachOuts : 0,
      resumptions: typeof resumptions === "number" ? resumptions : 0,
      cvsCollected: typeof cvsCollected === "number" ? cvsCollected : 0,
      candidatesRegistered: typeof candidatesRegistered === "number" ? candidatesRegistered : 0,
      addressesGiven: typeof addressesGiven === "number" ? addressesGiven : 0,
      commissionRetrieved: commissionRetrieved || "None",
      flyersMade: typeof flyersMade === "number" ? flyersMade : 0,
      videosMade: typeof videosMade === "number" ? videosMade : 0,
      jobsGotten: typeof jobsGotten === "number" ? jobsGotten : 0,
      newJobsGottenClientRelations: newJobsGottenClientRelations || "None",
      challenges: challenges.trim() || "No major challenges encountered.",
      plansTomorrow: plansTomorrow.trim() || "Continue regular recruitment operations.",
      chatsClearedConfirmed,
      chatsClearedProofUrl,
      targetReachOutsMet,
      targetAddressesMet,
      targetOnTimeMet,
      resumptionTimeStr
    };

    try {
      await submitDailyReport(reportData);
      setSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error("Failed to submit daily report:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-blue-100 rounded-[32px] p-8 text-center shadow-[0_24px_55px_-10px_rgba(30, 136, 229, 0.08)] max-w-xl mx-auto space-y-6"
      >
        <div className="w-16 h-16 bg-blue-50 text-[#1E88E5] rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-800">Report Submitted Successfully</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Your daily activity logs have been recorded in the Firestore system. The client relations and administrative teams have been notified.
          </p>
        </div>

        {/* Targets Summary Badge */}
        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-2.5 max-w-md mx-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Targets Check</span>
          <div className="grid grid-cols-1 gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Minimum 20 reach-outs:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${targetReachOutsMet ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                {targetReachOutsMet ? "MET (✓)" : "UNMET"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Minimum 4 addresses given:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${targetAddressesMet ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                {targetAddressesMet ? "MET (✓)" : "UNMET"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Submitted before 9:00 PM:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded text-[10px] ${targetOnTimeMet ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}`}>
                {targetOnTimeMet ? `MET (${submitTimeStr})` : `UNMET (${submitTimeStr})`}
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setSubmitted(false);
            if (!existingReportForDate) {
              setNewReachOuts("");
              setResumptions("");
              setCvsCollected("");
              setCandidatesRegistered("");
              setAddressesGiven("");
              setCommissionRetrieved("");
              setFlyersMade("");
              setVideosMade("");
              setJobsGotten("");
              setNewJobsGottenClientRelations("");
              setChallenges("");
              setPlansTomorrow("");
              setChatsClearedConfirmed(false);
              setChatsClearedProofUrl("");
              setUploadProgress(0);
            }
          }}
          className="px-6 py-2.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
        >
          {existingReportForDate ? "Return to Report Form" : "Submit Another Report"}
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        
        {reopenInfo.isReopened && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center justify-between gap-3 text-left shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Unlock className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">Submission Reopened by Admin (6-Hour Window Active)</p>
                <p className="text-[10px] text-emerald-800 mt-0.5">
                  An administrator has granted a 6-hour extension to submit your daily report. Please complete and submit your report before the extension expires.
                </p>
              </div>
            </div>
            <div className="px-3 py-1 bg-emerald-600 text-white rounded-full text-[10px] font-mono font-bold shrink-0">
              6h Extension
            </div>
          </motion.div>
        )}

        {existingReportForDate && isReadOnly ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm"
          >
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-900">Submitted Report (Read-Only Mode)</p>
              <p className="text-[10px] text-blue-700 mt-0.5">
                You already submitted a daily report for this day ({date}). The fields are filled with the recorded metrics and cannot be edited.
              </p>
            </div>
          </motion.div>
        ) : existingReportForDate && !isReadOnly ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-sky-50 border border-sky-200 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm"
          >
            <Sparkles className="w-5 h-5 text-sky-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-sky-900">Submitted Report (Editable Mode)</p>
              <p className="text-[10px] text-sky-700 mt-0.5">
                You already submitted a daily report for today. Since submission is open, you can modify any field below and click "Update Daily Report" to save your updates.
              </p>
            </div>
          </motion.div>
        ) : deadlinePassed && !reopenInfo.isReopened ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                {date < localTodayStr ? "Past Day (Read-Only Mode)" : "9:00 PM Deadline Reached (Read-Only Mode)"}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                {date < localTodayStr
                  ? "Daily report submissions for past days are closed. Ask an admin to reopen submission if required."
                  : "The 9:00 PM daily deadline has passed. Contact an admin to reopen submission for your account."}
              </p>
            </div>
          </motion.div>
        ) : null}
        
        {/* Top Header Card */}
        <div className="bg-[#0B1B3D] border border-[#0B1B3D]/40 rounded-2xl text-white p-5 sm:p-7 shadow-sm relative overflow-hidden flex flex-col justify-between gap-4">
          {/* Subtle vector graphics / green pattern representing communication/chats */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
            <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M-10,30 Q80,10 170,50 T350,20" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
              <path d="M-10,40 Q80,20 170,60 T350,30" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="3 3" />
              <path d="M20,100 Q110,80 200,120 T380,90" stroke="currentColor" strokeWidth="1.5" className="text-white/35" />
              <circle cx="15%" cy="75%" r="40" stroke="currentColor" strokeWidth="1.2" className="text-white/25" strokeDasharray="2 2" />
            </svg>
          </div>

          <div className="space-y-3 z-10 text-left">
            {/* Same Row Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-[#07132C] border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider text-white">
                Staff Report
              </span>

              {/* Report Date Small Tag */}
              <div className="bg-[#112A5C] border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 text-white/90">
                <Calendar className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                <input 
                  type="date"
                  value={date}
                  max={localTodayStr}
                  onChange={(e) => {
                    const selectedVal = e.target.value;
                    if (selectedVal <= localTodayStr) {
                      setDate(selectedVal);
                    }
                  }}
                  className="bg-transparent border-0 text-white font-bold text-[10px] sm:text-xs focus:ring-0 p-0 cursor-pointer font-mono min-w-[135px] sm:min-w-[150px] outline-none"
                />
              </div>

              {/* Current Time Small Tag */}
              <div className="bg-[#112A5C] border border-white/10 px-2.5 py-1 rounded-full text-[10px] font-mono font-bold flex items-center gap-1.5 text-white/90">
                <Clock className="w-3 h-3 text-blue-300 shrink-0" />
                <span className="text-white text-[10px] font-bold">{submitTimeStr}</span>
              </div>
            </div>

            <p className="text-xs text-white/80 max-w-lg leading-relaxed pt-0.5">
              Hello, <span className="font-bold text-white underline">{currentUser?.displayName}</span>. Complete and submit your targets, candidate registrations, address logs, and chats status on or before <span className="underline font-bold">9:00 PM</span>.
            </p>
          </div>
        </div>

        {/* Targets Monitoring Panel */}
        <div className="bg-white border border-slate-200/60 rounded-2xl p-4 sm:p-5 text-left">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daily Target</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowReportListModal(true)}
                className="px-2.5 py-1 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 text-[10px] font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs hover:scale-[1.02] active:scale-95"
              >
                <ListFilter className="w-3.5 h-3.5 text-blue-600" />
                <span>Report List</span>
              </button>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSlaTooltip(!showSlaTooltip)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-extrabold flex items-center gap-1 border shrink-0 transition-all cursor-pointer hover:scale-[1.03] active:scale-95 ${
                    targetOnTimeMet ? "bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100" : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                  }`}
                  title="Click to view SLA details"
                >
                  <Clock className="w-3 h-3" />
                  <span>SLA: 9:00 PM</span>
                  <Info className="w-3 h-3 text-blue-600 shrink-0 ml-0.5" />
                </button>

                <AnimatePresence>
                  {showSlaTooltip && (
                    <>
                      {/* Invisible backdrop overlay */}
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setShowSlaTooltip(false)} 
                      />
                      
                      {/* Animated Tooltip Popup */}
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-2 z-50 w-64 sm:w-72 bg-slate-900 text-white rounded-2xl p-3.5 shadow-2xl border border-slate-700 text-left space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1 rounded-lg bg-blue-500/20 text-blue-400">
                              <Clock className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white tracking-wide">SLA Target Time</h4>
                              <p className="text-[10px] text-slate-400 font-mono">9:00 PM Daily</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowSlaTooltip(false)}
                            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[11px] text-slate-300 leading-snug">
                          Daily staff reports must be submitted on or before 9:00 PM to meet compliance.
                        </p>

                        <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2 space-y-1 text-[10px]">
                          <div className="flex items-center gap-1.5 text-emerald-300">
                            <CheckCircle2 className="w-3 h-3 shrink-0" />
                            <span>Before 9:00 PM: On-Time</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-amber-300">
                            <AlertCircle className="w-3 h-3 shrink-0" />
                            <span>After 9:00 PM: SLA Exception</span>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            
            {/* Target 1 */}
            <div className={`p-3 rounded-2xl border transition-all ${targetReachOutsMet ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200/80"}`}>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase truncate">Reach-outs Target</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${targetReachOutsMet ? "bg-blue-500 animate-pulse" : "bg-amber-400"}`} />
              </div>
              <p className="text-base font-mono font-bold text-slate-800 mt-1">
                {newReachOuts || 0} <span className="text-[10px] text-slate-400">/ 20</span>
              </p>
              <span className="text-[9px] text-slate-500 block mt-0.5 font-medium truncate">
                {targetReachOutsMet ? "✓ Target Met" : "Minimum 20"}
              </span>
            </div>

            {/* Target 2 */}
            <div className={`p-3 rounded-2xl border transition-all ${targetAddressesMet ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200/80"}`}>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-mono text-slate-500 font-bold uppercase truncate">Address Target</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${targetAddressesMet ? "bg-blue-500 animate-pulse" : "bg-amber-400"}`} />
              </div>
              <p className="text-base font-mono font-bold text-slate-800 mt-1">
                {addressesGiven || 0} <span className="text-[10px] text-slate-400">/ 4</span>
              </p>
              <span className="text-[9px] text-slate-500 block mt-0.5 font-medium truncate">
                {targetAddressesMet ? "✓ Target Met" : "Minimum 4"}
              </span>
            </div>

          </div>
        </div>

        {/* Numerical Performance Metrics */}
        <div className="bg-transparent p-6 sm:p-8 text-left">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Performance Metrics</h3>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            
            {/* 1. New Reach-Outs */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="New Reach-Outs">
                <PhoneCall className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">New Reach-Outs</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={newReachOuts}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewReachOuts(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">Min: 20+</p>
            </div>

            {/* 2. Resumptions */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Resumptions">
                <Rocket className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Resumptions</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={resumptions}
                onChange={(e) => {
                  const val = e.target.value;
                  setResumptions(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 3. CVs Collected */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="CVs Collected">
                <FolderDown className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">CVs Collected</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={cvsCollected}
                onChange={(e) => {
                  const val = e.target.value;
                  setCvsCollected(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 4. Cand. Registered */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Candidates Registered">
                <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Cand. Registered</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={candidatesRegistered}
                onChange={(e) => {
                  const val = e.target.value;
                  setCandidatesRegistered(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">Rule: Within 2 days</p>
            </div>

            {/* 5. Addresses Given */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Addresses Given">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Addresses Given</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={addressesGiven}
                onChange={(e) => {
                  const val = e.target.value;
                  setAddressesGiven(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">Min: 4+</p>
            </div>

            {/* 6. Comm. Retrieved */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Commission Retrieved">
                <DollarSign className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Comm. Retrieved</span>
              </label>
              <input
                type="text"
                placeholder="e.g. $250 or N50,000"
                disabled={isReadOnly}
                value={commissionRetrieved}
                onChange={(e) => setCommissionRetrieved(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 7. Flyers Made */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Flyers Made">
                <Image className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Flyers Made</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={flyersMade}
                onChange={(e) => {
                  const val = e.target.value;
                  setFlyersMade(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 8. Videos Made */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Videos Made">
                <Video className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Videos Made</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={videosMade}
                onChange={(e) => {
                  const val = e.target.value;
                  setVideosMade(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 9. Jobs Gotten */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans truncate" title="Jobs Gotten">
                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span className="truncate">Jobs Gotten</span>
              </label>
              <input
                type="number"
                min="0"
                required
                disabled={isReadOnly}
                value={jobsGotten}
                onChange={(e) => {
                  const val = e.target.value;
                  setJobsGotten(val === "" ? "" : Math.max(0, parseInt(val) || 0));
                }}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 10. Client Relations Jobs */}
            <div className="col-span-3">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans" title="Client Relations Jobs">
                <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" /> <span>Client Relations Jobs</span>
              </label>
              <input
                type="text"
                placeholder="List new jobs assigned or enter None"
                disabled={isReadOnly}
                value={newJobsGottenClientRelations}
                onChange={(e) => setNewJobsGottenClientRelations(e.target.value)}
                className="w-full px-3 sm:px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

          </div>
        </div>

        {/* Qualitative Responses */}
        <div className="bg-transparent p-6 sm:p-8 text-left space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Smile className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Qualitative Report</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Challenges Encountered Today
            </label>
            <textarea
              rows={3}
              placeholder="Detail any client communication errors, database failures, or candidate issues..."
              disabled={isReadOnly}
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs leading-relaxed disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Plans for Tomorrow
            </label>
            <textarea
              rows={3}
              placeholder="What targets are you prioritizing? Any client follow ups planned?"
              disabled={isReadOnly}
              value={plansTomorrow}
              onChange={(e) => setPlansTomorrow(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs leading-relaxed disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
            />
          </div>
        </div>

        {/* Screen Confirmation & Proof Verification */}
        <div className="bg-transparent p-6 sm:p-8 text-left space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HeartHandshake className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Proof of Work</h3>
          </div>

          {/* chatsClearedConfirmed Checkbox */}
          <label className={`flex items-start gap-3 p-4 bg-blue-50/40 border border-blue-100 rounded-2xl select-none ${isReadOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
            <input
              type="checkbox"
              checked={chatsClearedConfirmed}
              disabled={isReadOnly}
              onChange={(e) => setChatsClearedConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-[#1E88E5] border-slate-300 rounded focus:ring-[#1E88E5] disabled:opacity-50"
            />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-800">Confirm chats are fully cleared</span>
              <span className="text-[10px] text-slate-500 leading-relaxed mt-0.5">
                I hereby confirm that I have responded to and cleared all assigned seeker chat rooms before signing off for today.
              </span>
            </div>
          </label>

          {/* Screenshot Proof Uploader */}
          <div className="space-y-2">
            <span className="block text-xs font-bold text-slate-700">Screenshot / File Proof Upload (ImageKit CDN)</span>
            <span className="block text-[10px] text-slate-400">Provide image, PDF or document proof that all WhatsApp/In-app candidate channels have been cleared.</span>
            
            <input 
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf,.doc,.docx"
              onChange={handleRealProofUpload}
              className="hidden"
            />

            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              {chatsClearedProofUrl ? (
                <div className="relative flex flex-col items-center space-y-2">
                  {chatsClearedProofUrl.toLowerCase().endsWith(".pdf") ? (
                    <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs font-bold">
                      <File className="w-5 h-5 text-blue-600" />
                      <a href={chatsClearedProofUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        View Attached Proof Document (PDF)
                      </a>
                    </div>
                  ) : (
                    <img 
                      src={chatsClearedProofUrl} 
                      alt="Workspace Proof" 
                      className="h-28 rounded-xl object-cover shadow-md border border-slate-200" 
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex gap-2 items-center">
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">✓ Proof Uploaded (ImageKit)</span>
                    {!isReadOnly && (
                      <button 
                        type="button" 
                        onClick={handleResetProof}
                        className="text-[10px] text-rose-600 hover:underline font-bold bg-transparent border-0 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  {isUploadingProof ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading file to ImageKit CDN...</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isReadOnly}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Select File or Screenshot</span>
                      </button>
                      <span className="block text-[9px] text-slate-400 mt-1">Supports PNG, JPG, PDF, DOCX (Uploaded to ImageKit)</span>
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[10px] text-rose-600 font-bold bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
                      {uploadError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submit Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {isReadOnly ? (
            existingReportForDate ? (
              <div className="flex items-center gap-1.5 text-blue-700 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-200 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>Daily Report Submitted</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-700 bg-amber-50 px-5 py-2.5 rounded-2xl border border-amber-200 font-bold text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Submission Closed (Read-Only)</span>
              </div>
            )
          ) : (
            <button
              type="submit"
              disabled={submitting || !chatsClearedConfirmed}
              className={`px-8 py-3 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold rounded-2xl shadow-md transition-all flex items-center gap-2 cursor-pointer ${
                (!chatsClearedConfirmed || submitting) ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.02]"
              }`}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Recording Report...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{existingReportForDate ? "Update Daily Report" : "Submit Daily Report"}</span>
                </>
              )}
            </button>
          )}
        </div>

      </form>

      {/* Candidate Progress Lists Full-Screen Popup Modal */}
      <AnimatePresence>
        {showReportListModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-[9999] bg-slate-50 overflow-y-auto flex flex-col min-h-screen"
          >
            {/* Header bar covering full width top */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportListModal(false)}
                  className="p-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer flex items-center gap-2 font-bold text-xs border border-slate-200/60"
                  title="Return to Staff Report"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-800" />
                  <span>Back</span>
                </button>
                <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                <h2 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ListFilter className="w-4 h-4 text-blue-600" />
                  <span>Candidate Progress Lists Report</span>
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowReportListModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content area containing CandidateListSummarySection */}
            <div className="p-4 sm:p-8 max-w-7xl w-full mx-auto flex-1">
              <CandidateListSummarySection />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
