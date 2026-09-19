import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  MoreVertical, 
  MessageSquare, 
  Edit3, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  ChevronRight, 
  ChevronDown, 
  Copy, 
  Check, 
  ShieldCheck, 
  User, 
  Clock, 
  Calendar, 
  LogOut,
  Sparkles,
  Award,
  Share2,
  Link2,
  Send
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAppSettings, subscribeToAppSettings } from "../lib/services";
import { AppSettings } from "../types";
import { copyToClipboard as copyTextSafe } from "../lib/clipboard";

export const StaffProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfileData, logout, firebaseUser } = useAuth();

  // Ensure header/pill are hidden for immersive profile view, matching CandidateProfileView
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, []);

  const [activeTabSection, setActiveTabSection] = useState<"overview" | "performance">("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personalDetails: true,
    workOverview: true,
    accountInfo: true
  });

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  // Edit Phone Modal State
  const [showEditPhoneModal, setShowEditPhoneModal] = useState(false);
  const [inputPhone, setInputPhone] = useState(currentUser?.phoneNumber || "");

  // Edit Name/Role Modal State
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [inputName, setInputName] = useState(currentUser?.displayName || "");
  const [inputJobTitle, setInputJobTitle] = useState(currentUser?.jobTitle || "Recruitment Specialist");
  const [inputLocation, setInputLocation] = useState(currentUser?.location || "Headquarters");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Online status state
  const [isOnline, setIsOnline] = useState(() => {
    if (currentUser?.uid) {
      const saved = localStorage.getItem(`staff_online_${currentUser.uid}`);
      return saved !== "offline";
    }
    return true;
  });

  // App settings for SLA Target Time
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    getAppSettings().then(setAppSettings);
    const unsub = subscribeToAppSettings(setAppSettings);
    return () => unsub();
  }, []);

  // Keep state synced with currentUser changes
  useEffect(() => {
    if (currentUser) {
      setInputPhone(currentUser.phoneNumber || "");
      setInputName(currentUser.displayName || "");
      setInputJobTitle(currentUser.jobTitle || "Recruitment Specialist");
      setInputLocation(currentUser.location || "Headquarters");
    }
  }, [currentUser]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text?: string, key: string = "default") => {
    if (!text) return;
    const success = await copyTextSafe(text);
    if (success) {
      setCopiedItem(key);
      setTimeout(() => setCopiedItem(null), 2000);
    }
  };

  const toggleOnlineStatus = () => {
    if (!currentUser?.uid) return;
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    localStorage.setItem(`staff_online_${currentUser.uid}`, nextStatus ? "online" : "offline");
    window.dispatchEvent(new CustomEvent("staff-status-changed", { detail: nextStatus }));
  };

  const getInitials = (name?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    return "ST";
  };

  // Handle Save Phone
  const handleSavePhone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputPhone.trim();
    if (!clean) {
      setSaveError("Please enter a valid phone number.");
      return;
    }
    const digits = clean.replace(/[^0-9]/g, "");
    if (digits.length < 7) {
      setSaveError("Phone number must contain at least 7 digits.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProfileData({ phoneNumber: clean });
      setShowEditPhoneModal(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update phone number.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save General Info (Display Name, Department/Role, Location)
  const handleSaveInfo = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputName.trim()) {
      setSaveError("Display name cannot be empty.");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      await updateProfileData({ 
        displayName: inputName.trim(),
        jobTitle: inputJobTitle.trim() || undefined,
        location: inputLocation.trim() || undefined
      });
      setShowEditNameModal(false);
    } catch (err: any) {
      setSaveError(err.message || "Failed to update profile information.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFCFD] flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-sm border border-slate-100 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Sign In Required</h2>
          <p className="text-xs text-slate-600">Please sign in to view and manage your staff profile.</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 bg-[#1E88E5] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const roleLabel = currentUser.role === "admin" ? "System Administrator" : "Staff Recruiter";
  const deadlineDisplay = appSettings?.staffReportDeadlineLabel || "9:00 PM Daily";

  return (
    <div className="w-full h-full min-h-screen bg-[#FAFCFD] font-sans flex flex-col pb-24 select-text overflow-y-auto">
      {/* Top App Bar */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={() => navigate(currentUser.role === "admin" ? "/admin" : "/staff")}
          className="p-2 -ml-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Back to Dashboard</span>
        </button>

        <h1 className="text-sm font-bold text-slate-800 tracking-tight">
          Staff Profile
        </h1>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-2 -mr-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          <AnimatePresence>
            {showOptionsMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowOptionsMenu(false)} 
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 overflow-hidden"
                >
                  <button
                    onClick={() => {
                      const dmUrl = `${window.location.origin}/?dm=${currentUser.uid}`;
                      copyToClipboard(dmUrl, "dmLink");
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-blue-50/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span>Copy Direct DM Link</span>
                  </button>
                  <button
                    onClick={() => {
                      copyToClipboard(currentUser.uid, "uid");
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-blue-50/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-blue-500" />
                    <span>Copy Staff UID</span>
                  </button>
                  <button
                    onClick={() => {
                      toggleOnlineStatus();
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-xs text-left text-slate-700 hover:bg-blue-50/60 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>Toggle Online Status</span>
                  </button>
                  <div className="h-px bg-slate-100 my-1" />
                  <button
                    onClick={() => {
                      setShowOptionsMenu(false);
                      logout();
                      navigate("/");
                    }}
                    className="w-full px-4 py-2.5 text-xs text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-6 text-left">
        {/* Profile Header Card */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 sm:p-7 relative overflow-hidden">
          {/* Subtle Vector Background Accent */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-52 h-52 rounded-full bg-blue-50/50 pointer-events-none blur-2xl" />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 relative z-10">
            {/* Avatar with Status Dot */}
            <div className="relative shrink-0">
              {firebaseUser?.photoURL || currentUser.photoURL ? (
                <img 
                  src={firebaseUser?.photoURL || currentUser.photoURL} 
                  alt={currentUser.displayName || "Staff"}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-blue-100 shadow-sm"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-[#0B1B3D] to-blue-900 text-white font-mono font-extrabold text-2xl flex items-center justify-center shadow-sm">
                  {getInitials(currentUser.displayName)}
                </div>
              )}
              {/* Online indicator badge */}
              <button
                onClick={toggleOnlineStatus}
                title={isOnline ? "Status: Online (Click to toggle)" : "Status: Offline (Click to toggle)"}
                className={`absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-white flex items-center gap-1 shadow-xs cursor-pointer ${
                  isOnline 
                    ? "bg-emerald-500 text-white" 
                    : "bg-slate-400 text-white"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{isOnline ? "Online" : "Offline"}</span>
              </button>
            </div>

            {/* Staff Info Details */}
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                  {currentUser.displayName || "Staff Member"}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-100 tracking-wide uppercase">
                  {roleLabel}
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1 font-medium text-slate-600">
                  <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                  <span>{currentUser.jobTitle || "Recruitment Specialist"}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1 font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-blue-500" />
                  <span>{currentUser.location || "Headquarters"}</span>
                </div>
              </div>

              <p className="text-xs font-mono text-slate-500 truncate pt-0.5">
                {currentUser.email}
              </p>
            </div>

            {/* Quick Action Button */}
            <div className="sm:self-center shrink-0 w-full sm:w-auto pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => setShowEditNameModal(true)}
                className="w-full sm:w-auto px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-100 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation (Overview / Performance) */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-2">
          <button
            onClick={() => setActiveTabSection("overview")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTabSection === "overview"
                ? "bg-[#0B1B3D] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            Account & Contact Details
          </button>
          <button
            onClick={() => setActiveTabSection("performance")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTabSection === "performance"
                ? "bg-[#0B1B3D] text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>SLA Target & Operations</span>
          </button>
        </div>

        {/* Overview Tab Content */}
        {activeTabSection === "overview" && (
          <div className="space-y-4">
            {/* Direct Inquiry DM Link Card */}
            <div className="bg-gradient-to-br from-blue-900 to-[#0B1B3D] text-white rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
              
              <div className="relative z-10 space-y-3.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-blue-300">
                      <Link2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white tracking-tight">Direct Recruiter DM Link</h3>
                      <p className="text-[11px] text-blue-200/80">Direct inquiries routing automatically to your active queue</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Auto-Assigned
                  </span>
                </div>

                <p className="text-xs text-blue-100/90 leading-relaxed">
                  Share this personalized link with candidates for general inquiries. When they visit and sign in or sign up, a chat will automatically open with <span className="font-semibold text-white">"I want to make inquiries"</span> and be directly assigned to you.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1">
                  <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/10 text-xs font-mono text-blue-100 truncate select-all">
                    {`${window.location.origin}/?dm=${currentUser.uid}`}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(`${window.location.origin}/?dm=${currentUser.uid}`, "dmCard")}
                      className="flex-1 sm:flex-initial px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                    >
                      {copiedItem === "dmCard" ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-300" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy DM Link</span>
                        </>
                      )}
                    </button>
                    {typeof navigator !== "undefined" && navigator.share && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.share({
                              title: `Inquire with ${currentUser.displayName || "Valley Reigns Recruiter"}`,
                              text: `Direct candidate inquiry channel with ${currentUser.displayName || "Recruiter"} on Valley Reigns.`,
                              url: `${window.location.origin}/?dm=${currentUser.uid}`
                            });
                          } catch (e) {
                            copyToClipboard(`${window.location.origin}/?dm=${currentUser.uid}`, "dmCard");
                          }
                        }}
                        className="px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        title="Share Link"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1: Contact Information */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("personalDetails")}
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors text-left cursor-pointer border-0 bg-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Personal & Contact Details</h3>
                    <p className="text-[11px] text-slate-500">Contact telephone, verified email, and office location</p>
                  </div>
                </div>
                {expandedSections.personalDetails ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.personalDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-50 space-y-3">
                      {/* Phone Number Row */}
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <Phone className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                              Phone Number
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800 truncate block">
                              {currentUser.phoneNumber || "Not provided yet"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {currentUser.phoneNumber && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(currentUser.phoneNumber, "phone")}
                              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedItem === "phone" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowEditPhoneModal(true)}
                            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>{currentUser.phoneNumber ? "Edit" : "Add"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Email Row */}
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                              Email Address
                            </span>
                            <span className="text-xs font-mono font-bold text-slate-800 truncate block">
                              {currentUser.email}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentUser.email, "email")}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Copy Email"
                        >
                          {copiedItem === "email" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {/* Department / Title Row */}
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <Briefcase className="w-4 h-4 text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                              Assigned Role / Job Title
                            </span>
                            <span className="text-xs font-semibold text-slate-800 truncate block">
                              {currentUser.jobTitle || "Recruitment Specialist"}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowEditNameModal(true)}
                          className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Change</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section 2: Account & Security */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("accountInfo")}
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/70 transition-colors text-left cursor-pointer border-0 bg-transparent"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Security & Credentials</h3>
                    <p className="text-[11px] text-slate-500">Internal UID, access role, and session credentials</p>
                  </div>
                </div>
                {expandedSections.accountInfo ? (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.accountInfo && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 sm:p-5 pt-0 border-t border-slate-50 space-y-3">
                      <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                            Staff UID
                          </span>
                          <span className="text-xs font-mono font-bold text-slate-800">
                            {currentUser.uid}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentUser.uid, "uid2")}
                          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Copy Staff UID"
                        >
                          {copiedItem === "uid2" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                            Platform Access Role
                          </span>
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                            {currentUser.role || "STAFF"}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold">
                          Active & Authorized
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Performance & SLA Tab Content */}
        {activeTabSection === "performance" && (
          <div className="space-y-4">
            {/* SLA Compliance Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Staff Report Daily SLA Target</h3>
                    <p className="text-[11px] text-slate-500">Scheduled submission deadline configured in App Settings</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-mono font-bold">
                  {deadlineDisplay}
                </span>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Configured SLA Deadline:</span>
                  <span className="font-bold text-slate-900">{deadlineDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-500">Submission Route:</span>
                  <button
                    type="button"
                    onClick={() => navigate("/staff/report")}
                    className="text-blue-600 font-bold hover:underline cursor-pointer"
                  >
                    Submit Daily Staff Report →
                  </button>
                </div>
              </div>
            </div>

            {/* Recruitment Chat Management Guidelines Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Candidate SLA & Routing Guidelines</h3>
              </div>
              <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                <li>Active chats are filtered by default in the Staff Chat Inbox for immediate responsiveness.</li>
                <li>Unclaimed pending tickets automatically notify recruiters to maintain rapid turnaround.</li>
                <li>Once claimed, ongoing conversations remain protected and are never archived as abandoned.</li>
                <li>Submit your daily recruitment report before {deadlineDisplay} to maintain 100% punctuality.</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* EDIT PHONE NUMBER MODAL                                  */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showEditPhoneModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditPhoneModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-md z-[90] text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Staff Phone Number</h3>
                  <p className="text-xs text-slate-500">Provide direct phone or WhatsApp contact number</p>
                </div>
              </div>

              {saveError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSavePhone} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    value={inputPhone}
                    onChange={(e) => setInputPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    disabled={isSaving}
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditPhoneModal(false)}
                    disabled={isSaving}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Phone Number"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* EDIT PROFILE INFO MODAL                                  */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showEditNameModal && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditNameModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-md z-[90] text-left"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Staff Details</h3>
                  <p className="text-xs text-slate-500">Update your public staff display name and role</p>
                </div>
              </div>

              {saveError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSaveInfo} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    disabled={isSaving}
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Job Title / Department
                  </label>
                  <input
                    type="text"
                    value={inputJobTitle}
                    onChange={(e) => setInputJobTitle(e.target.value)}
                    placeholder="e.g. Senior Talent Acquisition Specialist"
                    disabled={isSaving}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Office / Location
                  </label>
                  <input
                    type="text"
                    value={inputLocation}
                    onChange={(e) => setInputLocation(e.target.value)}
                    placeholder="e.g. Headquarters / Remote"
                    disabled={isSaving}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditNameModal(false)}
                    disabled={isSaving}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
