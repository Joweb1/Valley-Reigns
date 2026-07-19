import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { submitDailyReport, subscribeToDailyReports } from "../lib/services";
import { StaffDailyReport } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, AlertCircle, FileText, Upload, Calendar, Clock, Smile, Sparkles, Send, MapPin, Users, HeartHandshake, PhoneCall, ShieldCheck } from "lucide-react";

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

  useEffect(() => {
    const unsub = subscribeToDailyReports((reports) => {
      setAllReports(reports);
    });
    return () => unsub();
  }, []);

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

  const isReadOnly = deadlinePassed;

  // Targets status
  const targetReachOutsMet = isReadOnly && existingReportForDate
    ? !!existingReportForDate?.targetReachOutsMet
    : (typeof newReachOuts === "number" ? newReachOuts : Number(newReachOuts || 0)) >= 20;

  const targetAddressesMet = isReadOnly && existingReportForDate
    ? !!existingReportForDate?.targetAddressesMet
    : (typeof addressesGiven === "number" ? addressesGiven : Number(addressesGiven || 0)) >= 4;
  
  const [targetOnTimeMet, setTargetOnTimeMet] = useState(true);
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
      setTargetOnTimeMet(existingReportForDate.targetOnTimeMet ?? true);
      
      if (existingReportForDate.timestamp) {
        const d = new Date(existingReportForDate.timestamp);
        const currentHour = d.getHours();
        const currentMinutes = d.getMinutes();
        const ampm = currentHour >= 12 ? "PM" : "AM";
        const hours12 = currentHour % 12 || 12;
        const minStr = currentMinutes < 10 ? `0${currentMinutes}` : currentMinutes;
        setSubmitTimeStr(`${hours12}:${minStr} ${ampm}`);
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
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinutes = now.getMinutes();
      setTargetOnTimeMet(currentHour < 21);
      
      const ampm = currentHour >= 12 ? "PM" : "AM";
      const hours12 = currentHour % 12 || 12;
      const minStr = currentMinutes < 10 ? `0${currentMinutes}` : currentMinutes;
      setSubmitTimeStr(`${hours12}:${minStr} ${ampm}`);
    }
  }, [date, existingReportForDate]);

  const handleSimulateProofUpload = () => {
    if (uploadProgress > 0) return;
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          // Set a premium styled chat workspace image
          setChatsClearedProofUrl("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80");
          return 100;
        }
        return prev + 30;
      });
    }, 200);
  };

  const handleResetProof = () => {
    setUploadProgress(0);
    setChatsClearedProofUrl("");
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
      targetOnTimeMet
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
                You already submitted a daily report for today. Since the 9:00 PM deadline has not been reached, you can modify any field below and click "Update Daily Report" to save your updates.
              </p>
            </div>
          </motion.div>
        ) : deadlinePassed ? (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-left shadow-sm"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-xs font-bold text-amber-900">
                {date < localTodayStr ? "Past Day (Read-Only Mode)" : "Deadline Reached (Read-Only Mode)"}
              </p>
              <p className="text-[10px] text-amber-700 mt-0.5">
                {date < localTodayStr
                  ? "Staff members are not allowed to submit or edit daily reports for past days."
                  : "The 9:00 PM daily deadline has been reached for today. You can no longer submit or edit fields."}
              </p>
            </div>
          </motion.div>
        ) : null}
        
        {/* Top Header Card */}
        <div className="bg-[#0B1B3D] border border-[#0B1B3D]/40 rounded-[32px] text-white p-6 sm:p-8 shadow-sm relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* Subtle vector graphics / green pattern representing communication/chats */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
            <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M-10,30 Q80,10 170,50 T350,20" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
              <path d="M-10,40 Q80,20 170,60 T350,30" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="3 3" />
              <path d="M20,100 Q110,80 200,120 T380,90" stroke="currentColor" strokeWidth="1.5" className="text-white/35" />
              <circle cx="15%" cy="75%" r="40" stroke="currentColor" strokeWidth="1.2" className="text-white/25" strokeDasharray="2 2" />
            </svg>
          </div>

          <div className="space-y-2 z-10 text-left">
            <span className="bg-[#07132C] border border-white/10 px-3 py-1 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider">
              Daily Staff Report Template
            </span>
            <p className="text-xs text-white/80 max-w-lg leading-relaxed pt-2">
              Hello, <span className="font-bold text-white underline">{currentUser?.displayName}</span>. Complete and submit your targets, candidate registrations, address logs, and chats status on or before <span className="underline font-bold">9:00 PM</span>.
            </p>
          </div>
          
          <div className="flex gap-3 text-left">
            <div className="bg-[#112A5C] border border-white/10 rounded-2xl p-3 flex flex-col justify-center min-w-[120px] font-mono">
              <span className="text-[9px] text-white/60 uppercase font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-300" /> Report Date
              </span>
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
                className="bg-transparent border-0 text-white font-bold text-xs focus:ring-0 p-0 mt-1 cursor-pointer w-full select-all"
              />
            </div>
            
            <div className="bg-[#112A5C] border border-white/10 rounded-2xl p-3 flex flex-col justify-center min-w-[120px] font-mono">
              <span className="text-[9px] text-white/60 uppercase font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-300" /> Current Time
              </span>
              <span className="text-xs font-bold text-white mt-1">
                {submitTimeStr}
              </span>
            </div>
          </div>
        </div>

        {/* Targets Monitoring Panel */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm text-left">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Daily Target Checklist</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Target 1 */}
            <div className={`p-4 rounded-2xl border transition-all ${targetReachOutsMet ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200/80"}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">1. Reach-outs Target</span>
                <span className={`w-2 h-2 rounded-full ${targetReachOutsMet ? "bg-blue-500 animate-pulse" : "bg-amber-400"}`} />
              </div>
              <p className="text-lg font-mono font-bold text-slate-800 mt-2">
                {newReachOuts || 0} <span className="text-xs text-slate-400">/ 20</span>
              </p>
              <span className="text-[10px] text-slate-500 block mt-1">
                {targetReachOutsMet ? "✓ Target Met successfully" : "Minimum 20 reach-outs required"}
              </span>
            </div>

            {/* Target 2 */}
            <div className={`p-4 rounded-2xl border transition-all ${targetAddressesMet ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200/80"}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">2. Address Target</span>
                <span className={`w-2 h-2 rounded-full ${targetAddressesMet ? "bg-blue-500 animate-pulse" : "bg-amber-400"}`} />
              </div>
              <p className="text-lg font-mono font-bold text-slate-800 mt-2">
                {addressesGiven || 0} <span className="text-xs text-slate-400">/ 4</span>
              </p>
              <span className="text-[10px] text-slate-500 block mt-1">
                {targetAddressesMet ? "✓ Target Met successfully" : "Minimum 4 addresses must be given"}
              </span>
            </div>

            {/* Target 3 */}
            <div className={`p-4 rounded-2xl border transition-all ${targetOnTimeMet ? "bg-blue-50/50 border-blue-200" : "bg-slate-50 border-slate-200/80"}`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">3. SLA Deadline</span>
                <span className={`w-2 h-2 rounded-full ${targetOnTimeMet ? "bg-blue-500 animate-pulse" : "bg-amber-400"}`} />
              </div>
              <p className="text-lg font-mono font-bold text-slate-800 mt-2">
                9:00 PM
              </p>
              <span className="text-[10px] text-slate-500 block mt-1">
                {targetOnTimeMet ? "✓ Submitted within SLA time" : "Submitted past 9:00 PM limit"}
              </span>
            </div>

          </div>
        </div>

        {/* Numerical Performance Metrics */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm text-left">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Performance Metrics</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* 1. Number of New Reach-Outs */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2 font-sans">
                <PhoneCall className="w-3.5 h-3.5 text-blue-600" /> Number of New Reach-Outs
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Targets: 20+ daily</p>
            </div>

            {/* 2. Number of Resumptions */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                🚀 Number of Resumptions
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 3. Number of CVs Collected */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                📁 Number of CVs Collected
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 4. Number of Candidates Registered */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-blue-600" /> Number of Candidates Registered
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Rule: Must register within 2 days</p>
            </div>

            {/* 5. Number of Addresses Given */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                <MapPin className="w-3.5 h-3.5 text-blue-600" /> Number of Addresses Given
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">Targets: 4+ daily</p>
            </div>

            {/* 6. Commission Retrieved */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                💰 Commission Retrieved
              </label>
              <input
                type="text"
                placeholder="e.g. $250 or N50,000"
                disabled={isReadOnly}
                value={commissionRetrieved}
                onChange={(e) => setCommissionRetrieved(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 7. Number of Flyers Made */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                🎨 Number of Flyers Made
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 8. Number of Videos Made */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                📹 Number of Videos Made
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 9. Number of Jobs Gotten */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                💼 Number of Jobs Gotten
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
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs font-mono disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

            {/* 10. Number of New Jobs Gotten/Assigned from Client Relations Department */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-2">
                🏢 New Jobs Gotten / Client Relations
              </label>
              <input
                type="text"
                placeholder="List new jobs assigned or enter None"
                disabled={isReadOnly}
                value={newJobsGottenClientRelations}
                onChange={(e) => setNewJobsGottenClientRelations(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E88E5]/20 focus:border-[#1E88E5] text-xs disabled:bg-slate-50 disabled:text-slate-500 disabled:border-slate-100"
              />
            </div>

          </div>
        </div>

        {/* Qualitative Responses */}
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm text-left space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Smile className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Qualitative Report</h3>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-2">
              ⚠️ Challenges Encountered Today
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
              🎯 Plans for Tomorrow
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
        <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm text-left space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <HeartHandshake className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Proof of Work</h3>
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
            <span className="block text-xs font-bold text-slate-700">📸 Screenshot Proof Upload</span>
            <span className="block text-[10px] text-slate-400">Provide an image proof that all WhatsApp/In-app candidate channels have been cleared.</span>
            
            <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center space-y-3 bg-slate-50/50 hover:bg-slate-50 transition-colors">
              {chatsClearedProofUrl ? (
                <div className="relative flex flex-col items-center space-y-2">
                  <img 
                    src={chatsClearedProofUrl} 
                    alt="Workspace Proof" 
                    className="h-28 rounded-xl object-cover shadow-md border border-slate-200" 
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex gap-2">
                    <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-bold">✓ Proof Attached</span>
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
                  <div className="w-10 h-10 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  {uploadProgress > 0 ? (
                    <div className="w-48 space-y-1.5">
                      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 block text-center">Uploading simulated proof ({uploadProgress}%)</span>
                    </div>
                  ) : (
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleSimulateProofUpload}
                        disabled={isReadOnly}
                        className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Simulate Screenshot Upload
                      </button>
                      <span className="block text-[9px] text-slate-400 mt-1">Accepts PNG, JPG mock screenshot files</span>
                    </div>
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
    </div>
  );
};
