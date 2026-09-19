import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ArrowLeft, 
  MoreVertical, 
  MessageCircle, 
  Edit3, 
  History, 
  ListPlus, 
  FileText, 
  CheckCircle2, 
  Clock, 
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
  Users,
  RotateCcw
} from "lucide-react";
import { Conversation, UserProfile, Job, CandidateListLog } from "../types";
import { toggleCandidateListTag, updateConversationStatus, forceReassignConversation, getAllUserProfiles, addSystemNotification } from "../lib/services";
import { copyToClipboard as copyTextSafe } from "../lib/clipboard";

interface CandidateProfileViewProps {
  conversation: Conversation;
  currentUser: UserProfile | null;
  jobsList: Job[];
  onBack: () => void;
  onOpenChat: (chatId: string) => void;
  onStatusChange?: (newStatus: "pending" | "ongoing" | "finished" | "abandoned") => void;
}

const CANDIDATE_LIST_OPTIONS = [
  "Registered Candidates",
  "Pending Resume(CV)",
  "Submitted Resume(CV)",
  "Address Given",
  "Verified",
  "Pending Commission Retrieval"
];

export const CandidateProfileView: React.FC<CandidateProfileViewProps> = ({
  conversation,
  currentUser,
  jobsList,
  onBack,
  onOpenChat,
  onStatusChange
}) => {
  // Ensure main header and bottom pill navigation are hidden when viewing candidate profile
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent("toggle-chat-view", { detail: { active: false } }));
    };
  }, []);

  const [activeTabSection, setActiveTabSection] = useState<"overview" | "history">("overview");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    appDetails: true,
    documents: true,
    employment: true
  });
  const [showListModal, setShowListModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [colleagues, setColleagues] = useState<UserProfile[]>([]);
  const [isReassigning, setIsReassigning] = useState(false);
  const [candidateNotes, setCandidateNotes] = useState<Array<{ id: string; text: string; staffName: string; timestamp: number }>>([
    {
      id: "note-1",
      text: "Candidate contacted via Valley Reigns recruitment portal. Expressed strong interest in the role.",
      staffName: conversation.assignedToName || currentUser?.displayName || "Recruiter",
      timestamp: conversation.createdAt || Date.now()
    }
  ]);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      getAllUserProfiles().then(users => {
        const team = users.filter(u => u.role === "staff" || u.role === "admin");
        setColleagues(team);
      }).catch(() => {});
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

  const activeLists = conversation.candidateLists 
    ? Object.keys(conversation.candidateLists)
    : [];

  const handleToggleList = async (listName: string) => {
    if (!currentUser) return;
    try {
      await toggleCandidateListTag(
        conversation.chatId,
        listName,
        currentUser.uid,
        currentUser.displayName || "Staff Member"
      );
    } catch (err) {
      console.error("Failed to toggle candidate list:", err);
    }
  };

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    const note = {
      id: `note-${Date.now()}`,
      text: newNoteText.trim(),
      staffName: currentUser?.displayName || "Staff Member",
      timestamp: Date.now()
    };
    setCandidateNotes(prev => [note, ...prev]);
    setNewNoteText("");
    setShowNotesModal(false);
  };

  const associatedJob = jobsList.find(j => 
    j.id === conversation.jobId || 
    (conversation.text && conversation.text.toLowerCase().includes(j.id.toLowerCase()))
  );

  const getInitials = (name?: string, phone?: string) => {
    if (name) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (phone) return phone.slice(-2);
    return "VR";
  };

  const isVerified = activeLists.includes("Verified");
  const hasResume = activeLists.includes("Submitted Resume(CV)");
  const hasAddress = activeLists.includes("Address Given");

  return (
    <div className="w-full h-full min-h-screen bg-[#FAFCFD] font-sans flex flex-col pb-20 select-text overflow-y-auto">
      {/* ======================================================== */}
      {/* 1. TOP APP BAR                                          */}
      {/* ======================================================== */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-100 px-4 py-3.5 flex items-center justify-between shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-xs font-semibold text-slate-600 hidden sm:inline">Back to Chat</span>
        </button>

        <h1 className="text-sm font-bold text-slate-800 tracking-tight">
          Candidate Profile
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
                <button
                  type="button"
                  onClick={() => {
                    copyToClipboard(conversation.customerPhone);
                    setShowOptionsMenu(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Copy className="w-4 h-4 text-blue-600" />
                  <span>Copy Phone Number</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOptionsMenu(false);
                    setShowListModal(true);
                  }}
                  className="w-full px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium border-t border-slate-100"
                >
                  <ListPlus className="w-4 h-4 text-emerald-600" />
                  <span>Manage Candidate Lists</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 pt-6 space-y-6">
        {/* ======================================================== */}
        {/* 2. HERO PROFILE HEADER (Matches Sample Image 1)         */}
        {/* ======================================================== */}
        <div className="flex flex-col items-center text-center">
          {/* Centered Large Avatar */}
          <div className="relative mb-3">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#0B1B3D] via-[#1E88E5] to-[#42A5F5] text-white flex items-center justify-center font-bold text-2xl shadow-md border-4 border-white">
              {getInitials(conversation.name, conversation.customerPhone)}
            </div>
            {isVerified && (
              <div className="absolute bottom-0 right-0 w-7 h-7 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm" title="Verified Candidate">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Name & Role Subtitle */}
          <div className="flex items-center justify-center gap-1.5 mb-1.5 flex-wrap">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {conversation.name || conversation.customerPhone || "Candidate Applicant"}
            </h2>
          </div>

          {/* Verification Status Pill */}
          <div className="mb-2">
            {isVerified ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Candidate (Full Profile)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/80">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Screening Pending ({activeLists.length}/6 criteria met)</span>
              </span>
            )}
          </div>

          {/* Phone Number */}
          {conversation.customerPhone && (
            <button
              type="button"
              onClick={() => copyToClipboard(conversation.customerPhone)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors mb-3 cursor-pointer group"
            >
              <span>{conversation.customerPhone}</span>
              <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600" />
              {copiedPhone && <span className="text-xs text-emerald-600 font-bold ml-1">Copied!</span>}
            </button>
          )}

          {/* Candidate Lists / Badges Row */}
          <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-md">
            {activeLists.length > 0 ? (
              activeLists.map(tag => (
                <span 
                  key={tag}
                  className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-100/80"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                No custom lists assigned
              </span>
            )}
            <button
              type="button"
              onClick={() => setShowListModal(true)}
              className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center gap-0.5"
            >
              <Plus className="w-3 h-3" />
              <span>Tag</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. QUICK ACTION BUTTONS (Message, Edit, History)        */}
        {/* ======================================================== */}
        <div className="flex items-center justify-center gap-8 py-2">
          {/* Message Button */}
          <button
            type="button"
            onClick={() => onOpenChat(conversation.chatId)}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className="w-13 h-13 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition-all shadow-xs group-hover:scale-105">
              <MessageCircle className="w-6 h-6 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-600">Message</span>
          </button>

          {/* Edit Stage Button - Only Admin sees this */}
          {currentUser?.role === "admin" && (
            <button
              type="button"
              onClick={() => setShowStageModal(true)}
              className="flex flex-col items-center gap-1.5 group cursor-pointer"
            >
              <div className="w-13 h-13 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all shadow-xs group-hover:scale-105">
                <Edit3 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">Stage</span>
            </button>
          )}

          {/* History / Notes Button */}
          <button
            type="button"
            onClick={() => setActiveTabSection(activeTabSection === "history" ? "overview" : "history")}
            className="flex flex-col items-center gap-1.5 group cursor-pointer"
          >
            <div className={`w-13 h-13 rounded-full flex items-center justify-center transition-all shadow-xs group-hover:scale-105 ${
              activeTabSection === "history" 
                ? "bg-[#0B1B3D] text-white" 
                : "bg-slate-100 hover:bg-slate-200 text-slate-700"
            }`}>
              <History className="w-5 h-5 stroke-[2.2]" />
            </div>
            <span className="text-xs font-semibold text-slate-700 group-hover:text-slate-900">
              {activeTabSection === "history" ? "Details" : "History"}
            </span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 4. INTERACTIVE ACTION ROWS (Add to lists, Add notes)    */}
        {/* ======================================================== */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs divide-y divide-slate-100 overflow-hidden">
          {/* Add to lists Row */}
          <button
            type="button"
            onClick={() => setShowListModal(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <ListPlus className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Add to candidate lists</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                {activeLists.length} lists
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>

          {/* Add notes Row */}
          <button
            type="button"
            onClick={() => setShowNotesModal(true)}
            className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">Recruiter screening notes</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
                {candidateNotes.length} notes
              </span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
          </button>
        </div>

        {/* ======================================================== */}
        {/* 5. VALLEY REIGNS SCREENING BANNER                       */}
        {/* ======================================================== */}
        <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-rose-50 border border-rose-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                Candidate Screening — Job & Skill Check
              </h3>
              <p className="text-[11px] text-slate-600 mt-0.5 truncate">
                {isVerified ? "Candidate fully screened & verified." : "Verify resume, contact number and target job fit."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleToggleList("Verified")}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            {isVerified ? "Verified" : "Verify Fit"}
          </button>
        </div>

        {/* ======================================================== */}
        {/* 6. THREE STAT CARDS (Role, Resume, Stage)               */}
        {/* ======================================================== */}
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {/* Card 1: Applied Role */}
          <div className="bg-amber-50/50 border border-amber-200/70 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mb-1.5">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight truncate w-full">
              {conversation.jobTitle || "Job Inquiry"}
            </span>
            <span className="text-[10px] text-amber-700 font-medium mt-0.5">
              Applied Role
            </span>
          </div>

          {/* Card 2: Resume Document */}
          <div className="bg-blue-50/50 border border-blue-200/70 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mb-1.5">
              <FileCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight">
              {hasResume ? "CV Attached" : "Pending CV"}
            </span>
            <span className="text-[10px] text-blue-700 font-medium mt-0.5">
              Document Status
            </span>
          </div>

          {/* Card 3: Stage */}
          <div className="bg-emerald-50/50 border border-emerald-200/70 rounded-2xl p-3 flex flex-col items-center text-center shadow-2xs">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-1.5">
              <UserCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800 leading-tight capitalize">
              {conversation.status}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium mt-0.5">
              Routing Status
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 7. EXPANDABLE DETAILS SECTIONS (Matching Sample 2)      */}
        {/* ======================================================== */}
        {activeTabSection === "overview" ? (
          <div className="space-y-3">
            {/* Section 1: Application Details */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("appDetails")}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-bold text-slate-800">Application Details</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>{expandedSections.appDetails ? "Hide details" : "See details"}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${expandedSections.appDetails ? "rotate-180" : ""}`} />
                </div>
              </button>

              {expandedSections.appDetails && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-2 text-xs">
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Target Job</span>
                    <span className="text-slate-800 font-bold">{conversation.jobTitle || "General Inquiry"}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Application Date</span>
                    <span className="text-slate-800 font-semibold">{new Date(conversation.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Assigned Recruiter</span>
                    <span className="text-slate-800 font-semibold">{conversation.assignedToName || "Unassigned"}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-500 font-medium">Chat Identifier</span>
                    <span className="text-slate-500 font-mono text-[11px]">{conversation.chatId}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 2: Uploaded Documents */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection("documents")}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <span className="text-sm font-bold text-slate-800">Uploaded Documents</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <span>{hasResume ? "1 verified" : "0 verified"}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>

              {expandedSections.documents && (
                <div className="px-4 pb-4 pt-1 border-t border-slate-50 space-y-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileCheck className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-bold text-slate-800">Curriculum Vitae (CV)</div>
                        <div className="text-[10px] text-slate-500">Submitted in candidate chat</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      hasResume ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"
                    }`}>
                      {hasResume ? "Uploaded" : "Pending"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Contact & Branch Information */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-3.5 text-xs">
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-slate-400 font-medium">Candidate Email</div>
                  {(() => {
                    const identifier = String(conversation.customerPhone || conversation.chatId || "candidate");
                    const cleanDigits = identifier.replace(/[^0-9]/g, "");
                    const emailUser = cleanDigits.slice(-6) || "applicant";
                    const emailAddr = `candidate.${cleanDigits || emailUser}@valleyreigns.com`;
                    return (
                      <a 
                        href={`mailto:${emailAddr}`}
                        className="text-blue-600 hover:underline font-medium text-xs truncate block"
                      >
                        candidate.{emailUser}@valleyreigns.com
                      </a>
                    );
                  })()}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-slate-400 font-medium">Phone / WhatsApp</div>
                  {conversation.customerPhone ? (
                    <a 
                      href={`tel:${conversation.customerPhone}`}
                      className="text-slate-800 font-bold text-xs hover:underline"
                    >
                      {conversation.customerPhone}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-medium text-xs">Direct In-App Chat</span>
                  )}
                </div>
              </div>

              {/* Branch */}
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-slate-400 font-medium">Assigned Branch & Location</div>
                  <div className="text-slate-800 font-semibold text-xs">
                    Valley Reigns — Lagos Main Branch & Headquarters
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ======================================================== */
          /* 8. CANDIDATE ACTIVITY & LOGS TIMELINE                   */
          /* ======================================================== */
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Recruiter Notes & Timeline</h3>
              <button
                type="button"
                onClick={() => setShowNotesModal(true)}
                className="px-2.5 py-1 bg-[#0B1B3D] text-white rounded-full text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="space-y-3">
              {candidateNotes.map(n => (
                <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-800">{n.staffName}</span>
                    <span className="text-slate-400">{new Date(n.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">{n.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* BOTTOM SHEET: MANAGE CANDIDATE LISTS                    */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showListModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowListModal(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-slate-200 shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[85vh]"
            >
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2 shrink-0" />

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListPlus className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-base font-extrabold text-slate-900">Manage Candidate Lists</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowListModal(false)}
                    className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  Tag {conversation.name || "this candidate"} to update screening metrics and candidate folders:
                </p>

                <div className="space-y-2">
                  {CANDIDATE_LIST_OPTIONS.map(opt => {
                    const isSelected = activeLists.includes(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleToggleList(opt)}
                        className={`w-full p-3 rounded-2xl border text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && <Check className="w-4 h-4 text-blue-600 stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setShowListModal(false)}
                  className="w-full py-3 bg-[#0B1B3D] hover:bg-[#11244e] text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* BOTTOM SHEET: ADD RECRUITER NOTE                         */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showNotesModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotesModal(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-slate-200 shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[85vh]"
            >
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2 shrink-0" />

              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="text-base font-extrabold text-slate-900">Add Recruiter Note</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(false)}
                    className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder="e.g. Completed initial phone screening. Candidate has 3 years React experience and is ready for client interview."
                  className="w-full h-32 p-3 text-xs border border-slate-200 rounded-2xl focus:border-blue-400 focus:ring-2 focus:ring-blue-100 focus:outline-none"
                />

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowNotesModal(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNote}
                    className="flex-1 py-3 bg-[#0B1B3D] hover:bg-[#11244e] text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition-colors"
                  >
                    Save Note
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* BOTTOM SHEET: ADMIN REASSIGN & CHAT STAGE                */}
      {/* (Only accessible by Admin)                               */}
      {/* ======================================================== */}
      <AnimatePresence>
        {showStageModal && currentUser?.role === "admin" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowStageModal(false)}
              className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-slate-200 shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[90vh]"
            >
              {/* Drag handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mt-3 mb-2 shrink-0" />

              <div className="p-5 space-y-5 overflow-y-auto">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-indigo-600" />
                    <div>
                      <h3 className="text-base font-extrabold text-slate-900 leading-none">Reassign & Stage Control</h3>
                      <p className="text-[11px] text-slate-500 mt-1">Admin oversight and staff routing</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowStageModal(false)}
                    className="w-8 h-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full flex items-center justify-center cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Abandoned Chat Recovery Banner */}
                {conversation.status === "abandoned" && (
                  <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                      <RotateCcw className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>This chat is currently Abandoned (Unclaimed timeout)</span>
                    </div>
                    <p className="text-[11px] text-amber-700">
                      You can reactivate it back to the pending queue or assign it directly to a staff member.
                    </p>
                    <button
                      type="button"
                      disabled={isReassigning}
                      onClick={async () => {
                        setIsReassigning(true);
                        try {
                          await forceReassignConversation(conversation.chatId, null, null);
                          if (onStatusChange) onStatusChange("pending");
                          setShowStageModal(false);
                        } finally {
                          setIsReassigning(false);
                        }
                      }}
                      className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      Reactivate to Pending (Unclaimed Queue)
                    </button>
                  </div>
                )}

                {/* Reassign Recruiter Section */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      Assign Staff / Admin (Sets to Ongoing)
                    </span>
                    <span className="text-[10px] font-normal text-slate-400">
                      Current: {conversation.assignedToName || "Unassigned"}
                    </span>
                  </label>

                  {/* Make Unclaimed Button */}
                  <button
                    type="button"
                    disabled={isReassigning}
                    onClick={async () => {
                      setIsReassigning(true);
                      try {
                        await forceReassignConversation(conversation.chatId, null, null);
                        if (onStatusChange) onStatusChange("pending");
                        setShowStageModal(false);
                      } finally {
                        setIsReassigning(false);
                      }
                    }}
                    className={`w-full p-2.5 rounded-xl border text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      conversation.status === "pending" && !conversation.assignedTo
                        ? "bg-blue-50 border-blue-300 text-blue-800"
                        : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <span>Unassigned / Pending (Open to Staff Claim)</span>
                    {conversation.status === "pending" && !conversation.assignedTo && (
                      <Check className="w-4 h-4 text-blue-600 stroke-[3]" />
                    )}
                  </button>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {colleagues.map(colleague => {
                      const isAssigned = conversation.assignedTo === colleague.uid;
                      return (
                        <button
                          key={colleague.uid}
                          type="button"
                          disabled={isReassigning}
                          onClick={async () => {
                            setIsReassigning(true);
                            try {
                              await forceReassignConversation(
                                conversation.chatId,
                                colleague.uid,
                                colleague.displayName || colleague.email
                              );
                              if (onStatusChange) onStatusChange("ongoing");
                              setShowStageModal(false);
                            } finally {
                              setIsReassigning(false);
                            }
                          }}
                          className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                            isAssigned
                              ? "bg-indigo-50 border-indigo-300 text-indigo-900 font-bold"
                              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-[10px] shrink-0">
                              {(colleague.displayName || colleague.email || "S")[0].toUpperCase()}
                            </span>
                            <span className="truncate">{colleague.displayName || colleague.email}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                              colleague.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                            }`}>
                              {colleague.role}
                            </span>
                          </div>
                          {isAssigned && <Check className="w-4 h-4 text-indigo-600 stroke-[3] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Status Selection Buttons */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800">
                    Workflow Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["pending", "ongoing", "finished", "abandoned"] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={async () => {
                          await updateConversationStatus(conversation.chatId, st);
                          if (onStatusChange) onStatusChange(st);
                          setShowStageModal(false);
                        }}
                        className={`p-2.5 rounded-xl border text-xs font-bold capitalize flex items-center justify-between cursor-pointer transition-colors ${
                          conversation.status === st
                            ? "bg-blue-50 border-blue-300 text-blue-800 shadow-xs"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <span>{st}</span>
                        {conversation.status === st && <Check className="w-3.5 h-3.5 text-blue-600 stroke-[3]" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
