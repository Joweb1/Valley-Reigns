import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  MoreVertical, 
  MessageCircle, 
  Edit3, 
  History, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  FileCheck, 
  ChevronRight, 
  ChevronDown, 
  Download, 
  Share2, 
  Trash2, 
  Check, 
  Plus, 
  UserCheck, 
  Building2,
  Copy,
  UploadCloud,
  ExternalLink,
  ShieldCheck,
  User
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { uploadToImageKit } from "../lib/imagekit";
import { copyToClipboard as copyTextSafe } from "../lib/clipboard";

export const JobSeekerProfileView: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfileData, logout } = useAuth();

  // Ensure header/pill are hidden for immersive profile view, matching CandidateProfileView
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, []);

  const [activeTabSection, setActiveTabSection] = useState<"overview" | "history">("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    personalDetails: true,
    documents: true,
    accountInfo: true
  });

  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [showEditPhoneModal, setShowEditPhoneModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [inputPhone, setInputPhone] = useState(currentUser?.phoneNumber || "");
  const [inputName, setInputName] = useState(currentUser?.displayName || "");
  const [inputJobTitle, setInputJobTitle] = useState(currentUser?.jobTitle || "");
  const [inputLocation, setInputLocation] = useState(currentUser?.location || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // CV Upload state
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [cvUploadProgress, setCvUploadProgress] = useState<string | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep state synced with currentUser changes
  useEffect(() => {
    if (currentUser) {
      setInputPhone(currentUser.phoneNumber || "");
      setInputName(currentUser.displayName || "");
      setInputJobTitle(currentUser.jobTitle || "");
      setInputLocation(currentUser.location || "");
    }
  }, [currentUser]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text?: string) => {
    if (!text) return;
    const success = await copyTextSafe(text);
    if (success) {
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    }
  };

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (phone) return phone.slice(-2);
    return "JS";
  };

  const hasPhone = Boolean(currentUser?.phoneNumber && currentUser.phoneNumber.trim());
  const hasResume = Boolean(currentUser?.cvUrl);
  const isProfileComplete = hasPhone && hasResume;

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
      // Remove any dismissal flag since phone is now stored
      if (currentUser?.uid) {
        sessionStorage.removeItem(`vr_dismissed_phone_prompt_${currentUser.uid}`);
      }
    } catch (err: any) {
      setSaveError(err.message || "Failed to update phone number.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Save General Info (Display Name, Job Title, Location)
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

  // Handle CV File Upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate size (max 15MB)
    if (file.size > 15 * 1024 * 1024) {
      setCvError("File size exceeds 15MB limit. Please upload a smaller document.");
      return;
    }

    setIsUploadingCV(true);
    setCvUploadProgress("Uploading CV document...");
    setCvError(null);

    try {
      const res = await uploadToImageKit(file, "/resumes");
      if (res && res.url) {
        await updateProfileData({
          cvUrl: res.url,
          cvName: res.name || file.name,
          cvUploadedAt: Date.now(),
          cvSize: res.size || file.size
        });
        setCvUploadProgress(null);
      } else {
        throw new Error("Upload did not return a valid document URL.");
      }
    } catch (err: any) {
      console.error("CV upload error:", err);
      // Fallback: create base64/blob storage if ImageKit proxy has server constraint
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const dataUrl = reader.result as string;
          await updateProfileData({
            cvUrl: dataUrl,
            cvName: file.name,
            cvUploadedAt: Date.now(),
            cvSize: file.size
          });
          setCvUploadProgress(null);
          setIsUploadingCV(false);
        };
        reader.readAsDataURL(file);
        return;
      } catch (fallbackErr) {
        setCvError(err.message || "Failed to upload CV. Please try again.");
      }
    } finally {
      setIsUploadingCV(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Remove CV
  const handleRemoveCV = async () => {
    if (!window.confirm("Are you sure you want to remove your uploaded CV?")) return;
    try {
      await updateProfileData({
        cvUrl: undefined,
        cvName: undefined,
        cvUploadedAt: undefined,
        cvSize: undefined
      });
    } catch (err) {
      console.error("Failed to remove CV:", err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || isNaN(bytes)) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAFCFD] flex items-center justify-center p-4 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-sm border border-slate-100 shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <User className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Sign In Required</h2>
          <p className="text-xs text-slate-600">Please sign in to view and manage your job seeker profile.</p>
          <button
            onClick={() => navigate("/")}
            className="w-full py-2.5 bg-[#1E88E5] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-blue-600 transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-screen bg-[#FAFCFD] font-sans flex flex-col pb-24 select-text overflow-y-auto">
      {/* ======================================================== */}
      {/* 1. TOP APP BAR (Identical to CandidateProfileView)        */}
      {/* ======================================================== */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={() => navigate("/seeker")}
          className="p-2 -ml-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Back to Dashboard</span>
        </button>

        <h1 className="text-sm font-bold text-slate-800 tracking-tight">
          Job Seeker Profile
        </h1>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showOptionsMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowOptionsMenu(false)} 
              />
              <div className="absolute right-0 top-10 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 overflow-hidden text-xs">
                {currentUser.phoneNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      copyToClipboard(currentUser.phoneNumber);
                      setShowOptionsMenu(false);
                    }}
                    className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <Copy className="w-4 h-4 text-blue-600" />
                    <span>Copy Phone Number</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    fileInputRef.current?.click();
                  }}
                  className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                >
                  <UploadCloud className="w-4 h-4 text-indigo-600" />
                  <span>Upload / Replace CV</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowOptionsMenu(false);
                    await logout();
                    navigate("/");
                  }}
                  className="w-full px-4 py-2.5 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                >
                  <ArrowLeft className="w-4 h-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-6 space-y-6">
        {/* ======================================================== */}
        {/* 2. HERO PROFILE HEADER (Matches CandidateProfileView)   */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center text-center">
          {/* Centered Large Avatar */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0B1B3D] via-[#1E88E5] to-[#42A5F5] text-white flex items-center justify-center font-bold text-2xl shadow-md border-4 border-white">
              {getInitials(currentUser.displayName, currentUser.phoneNumber)}
            </div>
            {isProfileComplete && (
              <div 
                className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm" 
                title="Profile Complete (Phone & CV Uploaded)"
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Name & Role Subtitle */}
          <div className="flex items-center justify-center gap-1.5 mb-1 flex-wrap">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {currentUser.displayName || "Job Seeker Applicant"}
            </h2>
            <button
              type="button"
              onClick={() => setShowEditNameModal(true)}
              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Edit Name & Details"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium mb-2.5">
            {currentUser.jobTitle ? `${currentUser.jobTitle} • ` : ""}
            {currentUser.email}
          </p>

          {/* Profile Completeness Status Pill */}
          <div className="mb-2.5">
            {isProfileComplete ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Profile Ready for Recruiters</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>
                  Profile Incomplete ({!hasPhone && !hasResume ? "Missing Phone & CV" : !hasPhone ? "Phone Missing" : "CV Pending"})
                </span>
              </span>
            )}
          </div>

          {/* Phone Number Display & Edit */}
          <div className="flex items-center justify-center gap-2 mb-3">
            {hasPhone ? (
              <div className="inline-flex items-center gap-1.5 bg-slate-100/80 hover:bg-blue-50/80 border border-slate-200/70 rounded-full px-3 py-1 transition-colors">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">{currentUser.phoneNumber}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(currentUser.phoneNumber)}
                  className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer ml-1"
                  title="Copy Phone"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copiedPhone && <span className="text-[10px] text-emerald-600 font-bold ml-1">Copied!</span>}
                <button
                  type="button"
                  onClick={() => setShowEditPhoneModal(true)}
                  className="p-0.5 text-slate-400 hover:text-blue-600 cursor-pointer ml-1"
                  title="Edit Phone"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowEditPhoneModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-full text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Phone Number</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. QUICK ACTION BUTTONS (Message, Edit, Upload CV)      */}
        {/* ======================================================== */}
        <div className="flex items-center justify-center gap-8 py-2">
          {/* Edit / Add Phone Button */}
          <button
            type="button"
            onClick={() => setShowEditPhoneModal(true)}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all shadow-xs group-hover:scale-105">
              <Phone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">
              {hasPhone ? "Edit Phone" : "Add Phone"}
            </span>
          </button>

          {/* Upload CV Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-600 flex items-center justify-center transition-all shadow-xs group-hover:scale-105">
              <UploadCloud className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">
              {hasResume ? "Replace CV" : "Upload CV"}
            </span>
          </button>

          {/* Messages Button */}
          <button
            type="button"
            onClick={() => navigate("/seeker/messages")}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shadow-xs group-hover:scale-105">
              <MessageCircle className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              Messages
            </span>
          </button>
        </div>

        {/* Hidden file input for CV upload */}
        <input 
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileUpload(f);
          }}
        />

        {/* ======================================================== */}
        {/* 4. VALLEY REIGNS PROFILE BANNER (Matching Candidate View)*/}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50/40 to-blue-50 border border-blue-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Recruiter Direct Reach
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {isProfileComplete 
                  ? "Your phone number and CV are ready for recruiter outreach." 
                  : "Add your phone number and upload your CV so recruiters can fast-track your applications."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (!hasPhone) setShowEditPhoneModal(true);
              else if (!hasResume) fileInputRef.current?.click();
              else setShowEditNameModal(true);
            }}
            className="px-3 py-1.5 bg-[#1E88E5] hover:bg-blue-600 text-white rounded-full text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            {isProfileComplete ? "Edit Profile" : !hasPhone ? "Add Phone" : "Upload CV"}
          </button>
        </div>

        {/* ======================================================== */}
        {/* 5. THREE STAT CARDS (Phone, Resume, Status)             */}
        {/* ======================================================== */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Phone */}
          <div 
            onClick={() => setShowEditPhoneModal(true)}
            className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs cursor-pointer hover:bg-amber-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
              <Phone className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight truncate w-full">
              {hasPhone ? "Saved" : "Missing"}
            </span>
            <span className="text-[10px] text-amber-700 font-medium mt-0.5">
              Phone Number
            </span>
          </div>

          {/* Card 2: Resume Document */}
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs cursor-pointer hover:bg-blue-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
              <FileCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {hasResume ? "Uploaded" : "Pending"}
            </span>
            <span className="text-[10px] text-blue-700 font-medium mt-0.5">
              CV Document
            </span>
          </div>

          {/* Card 3: Account Status */}
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight capitalize">
              Active Seeker
            </span>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Account Status
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 6. EXPANDABLE DETAILS SECTIONS (Matching Candidate View) */}
        {/* ======================================================== */}
        <div className="space-y-3">
          {/* Section 1: Uploaded Documents / CV (Prominent for seeker) */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("documents")}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-indigo-600" />
                <span className="text-sm font-bold text-slate-800">Curriculum Vitae (CV) & Resume</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  hasResume ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                }`}>
                  {hasResume ? "1 uploaded" : "0 uploaded"}
                </span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.documents ? "rotate-180" : ""}`} />
              </div>
            </button>

            {expandedSections.documents && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-3 text-xs">
                {/* CV Uploaded Card */}
                {hasResume ? (
                  <div className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                          {currentUser.cvName || "Curriculum_Vitae.pdf"}
                        </h4>
                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                          {currentUser.cvUploadedAt && (
                            <span>Uploaded {new Date(currentUser.cvUploadedAt).toLocaleDateString()}</span>
                          )}
                          {currentUser.cvSize && (
                            <>
                              <span>•</span>
                              <span>{formatFileSize(currentUser.cvSize)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {currentUser.cvUrl && (
                        <a
                          href={currentUser.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>View / Download</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveCV}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        title="Remove CV"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Empty State Upload Dropzone */
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragOver(true);
                    }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragOver(false);
                      const dropped = e.dataTransfer.files?.[0];
                      if (dropped) handleFileUpload(dropped);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                      isDragOver 
                        ? "border-blue-500 bg-blue-50/60" 
                        : "border-slate-200 hover:border-blue-400 hover:bg-slate-50/80"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-800">
                      Click to upload or drag & drop your CV
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      PDF, DOC, or DOCX (Max size 15MB)
                    </p>
                  </div>
                )}

                {/* Upload Status / Error */}
                {isUploadingCV && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-700 font-medium">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>{cvUploadProgress || "Uploading CV..."}</span>
                  </div>
                )}

                {cvError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>{cvError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Personal & Contact Information */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("personalDetails")}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-bold text-slate-800">Contact & Candidate Information</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>{expandedSections.personalDetails ? "Hide details" : "See details"}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.personalDetails ? "rotate-180" : ""}`} />
              </div>
            </button>

            {expandedSections.personalDetails && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-2 text-xs divide-y divide-slate-50">
                {/* Phone */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Phone / WhatsApp</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasPhone ? (
                      <span className="text-slate-900 font-bold">{currentUser.phoneNumber}</span>
                    ) : (
                      <span className="text-amber-600 font-semibold italic">Not added</span>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowEditPhoneModal(true)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      {hasPhone ? "Edit" : "Add"}
                    </button>
                  </div>
                </div>

                {/* Email */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Email Address</span>
                  </div>
                  <span className="text-slate-900 font-semibold truncate max-w-[200px]">
                    {currentUser.email}
                  </span>
                </div>

                {/* Display Name */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Full Name</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-900 font-bold">{currentUser.displayName}</span>
                    <button
                      type="button"
                      onClick={() => setShowEditNameModal(true)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 rounded-md text-[11px] font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Target Job Title */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Target Role / Title</span>
                  </div>
                  <span className="text-slate-800 font-semibold">
                    {currentUser.jobTitle || "Job Seeker"}
                  </span>
                </div>

                {/* Location */}
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-500 font-medium">Location</span>
                  </div>
                  <span className="text-slate-800 font-semibold">
                    {currentUser.location || "Remote / On-site"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Account & Membership */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection("accountInfo")}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-bold text-slate-800">Account & Security</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <span>{expandedSections.accountInfo ? "Hide details" : "See details"}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.accountInfo ? "rotate-180" : ""}`} />
              </div>
            </button>

            {expandedSections.accountInfo && (
              <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-2 text-xs divide-y divide-slate-50">
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Account Identifier</span>
                  <span className="text-slate-500 font-mono text-[11px]">{currentUser.uid}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 font-medium">Access Role</span>
                  <span className="text-blue-600 font-bold uppercase">{currentUser.role || "SEEKER"}</span>
                </div>
                {currentUser.createdAt && (
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Member Since</span>
                    <span className="text-slate-800 font-semibold">
                      {new Date(currentUser.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 7. EDIT PHONE NUMBER MODAL                               */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showEditPhoneModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditPhoneModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-sm z-50 text-left overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {hasPhone ? "Edit Phone Number" : "Add Phone Number"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditPhoneModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSavePhone} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Phone / WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    autoFocus
                    value={inputPhone}
                    onChange={(e) => {
                      setInputPhone(e.target.value);
                      if (saveError) setSaveError(null);
                    }}
                    placeholder="e.g. +1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Recruiters use this to message you on WhatsApp or call for interviews.
                  </p>
                </div>

                {saveError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700">
                    {saveError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditPhoneModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Phone"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 8. EDIT PROFILE DETAILS MODAL                            */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showEditNameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditNameModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-full max-w-sm z-50 text-left overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900">Edit Profile Information</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditNameModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveInfo} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={inputName}
                    onChange={(e) => setInputName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Target Job Title / Career Goal
                  </label>
                  <input
                    type="text"
                    value={inputJobTitle}
                    onChange={(e) => setInputJobTitle(e.target.value)}
                    placeholder="e.g. Frontend Developer, Executive Assistant"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Preferred Location / City
                  </label>
                  <input
                    type="text"
                    value={inputLocation}
                    onChange={(e) => setInputLocation(e.target.value)}
                    placeholder="e.g. Lagos, Nigeria or Remote"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                {saveError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-700">
                    {saveError}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditNameModal(false)}
                    className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-2.5 bg-[#1E88E5] hover:bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-60"
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
