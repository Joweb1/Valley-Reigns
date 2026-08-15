import React, { useState, useEffect } from "react";
import { UserProfile, Job, EmployerRecruitmentRequest } from "../types";
import { 
  getEmployerProfiles, 
  toggleEmployerJobPosting, 
  toggleEmployerSeekerMessaging, 
  toggleEmployerVerification, 
  updateEmployerMaxJobPosts,
  deleteEmployerProfile,
  getJobs,
  getEmployerRecruitmentRequests
} from "../lib/services";
import { 
  Building2, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  FileText, 
  ShieldCheck, 
  ShieldAlert, 
  Search, 
  LayoutGrid, 
  List, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Briefcase, 
  MessageSquare, 
  UserCheck, 
  ArrowLeft,
  Users,
  Layers,
  Check,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface EmployerManagementViewProps {
  onBack?: () => void;
  hideTopTitle?: boolean;
}

export const EmployerManagementView: React.FC<EmployerManagementViewProps> = ({ onBack, hideTopTitle }) => {
  const [employers, setEmployers] = useState<UserProfile[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [requests, setRequests] = useState<EmployerRecruitmentRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filterType, setFilterType] = useState<"all" | "verified" | "unverified" | "canPost" | "restricted">("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [expandedEmployerId, setExpandedEmployerId] = useState<string | null>(null);
  const [deleteConfirmEmployer, setDeleteConfirmEmployer] = useState<UserProfile | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empData, jobsData, reqData] = await Promise.all([
        getEmployerProfiles(),
        getJobs(),
        getEmployerRecruitmentRequests()
      ]);
      setEmployers(empData);
      setJobs(jobsData);
      setRequests(reqData);
    } catch (err) {
      console.warn("Failed to load employer profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Toggle Job Posting Permission
  const handleToggleJobPosting = async (emp: UserProfile) => {
    const nextVal = !emp.canPostJobs;
    // Optimistic UI update
    setEmployers(prev => prev.map(e => e.uid === emp.uid ? { ...e, canPostJobs: nextVal } : e));
    await toggleEmployerJobPosting(emp.uid, nextVal);
    showToast(`Job Posting permission ${nextVal ? "GRANTED" : "REVOKED"} for ${emp.companyName || emp.displayName}`);
  };

  // Toggle Verification Badge
  const handleToggleVerification = async (emp: UserProfile) => {
    const nextVal = !emp.isVerifiedEmployer;
    // Optimistic UI update
    setEmployers(prev => prev.map(e => e.uid === emp.uid ? { ...e, isVerifiedEmployer: nextVal } : e));
    await toggleEmployerVerification(emp.uid, nextVal);
    showToast(`Verification status set to ${nextVal ? "VERIFIED" : "UNVERIFIED"} for ${emp.companyName || emp.displayName}`);
  };

  // Toggle Seeker Messaging Permission
  const handleToggleMessaging = async (emp: UserProfile) => {
    const nextVal = !emp.canMessageSeekers;
    // Optimistic UI update
    setEmployers(prev => prev.map(e => e.uid === emp.uid ? { ...e, canMessageSeekers: nextVal } : e));
    await toggleEmployerSeekerMessaging(emp.uid, nextVal);
    showToast(`Candidate Messaging ${nextVal ? "ENABLED" : "RESTRICTED"} for ${emp.companyName || emp.displayName}`);
  };

  // Change Max Job Posts Quota
  const handleUpdateQuota = async (emp: UserProfile, quota: number) => {
    setEmployers(prev => prev.map(e => e.uid === emp.uid ? { ...e, maxJobPosts: quota } : e));
    await updateEmployerMaxJobPosts(emp.uid, quota);
    showToast(`Listing quota updated to ${quota} vacancies for ${emp.companyName || emp.displayName}`);
  };

  // Delete Employer
  const handleDeleteEmployer = async (uid: string) => {
    try {
      await deleteEmployerProfile(uid);
      setEmployers(prev => prev.filter(e => e.uid !== uid));
      showToast("Employer profile removed successfully.");
    } catch (err) {
      console.error("Delete employer error:", err);
    } finally {
      setDeleteConfirmEmployer(null);
    }
  };

  // Toggle Accordion / Dropdown
  const toggleDropdown = (uid: string) => {
    setExpandedEmployerId(prev => (prev === uid ? null : uid));
  };

  // Filtered List
  const filteredEmployers = employers.filter(emp => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || (
      (emp.companyName && emp.companyName.toLowerCase().includes(query)) ||
      (emp.displayName && emp.displayName.toLowerCase().includes(query)) ||
      (emp.email && emp.email.toLowerCase().includes(query)) ||
      (emp.companyPhone && emp.companyPhone.toLowerCase().includes(query)) ||
      (emp.rcNumber && emp.rcNumber.toLowerCase().includes(query)) ||
      (emp.companyIndustry && emp.companyIndustry.toLowerCase().includes(query)) ||
      (emp.companyAddress && emp.companyAddress.toLowerCase().includes(query))
    );

    if (!matchesSearch) return false;

    if (filterType === "verified") return emp.isVerifiedEmployer === true;
    if (filterType === "unverified") return !emp.isVerifiedEmployer;
    if (filterType === "canPost") return emp.canPostJobs === true;
    if (filterType === "restricted") return !emp.canPostJobs;

    return true;
  });

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return "Active Corporate Partner";
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  // Helper stats for an employer
  const getEmployerJobCount = (emp: UserProfile) => {
    return jobs.filter(j => 
      j.postedByUid === emp.uid || 
      (emp.companyName && j.company.toLowerCase().trim() === emp.companyName.toLowerCase().trim())
    ).length;
  };

  const getEmployerTicketCount = (emp: UserProfile) => {
    return requests.filter(r => r.employerUid === emp.uid).length;
  };

  // High-level KPI counts
  const totalCount = employers.length;
  const verifiedCount = employers.filter(e => e.isVerifiedEmployer).length;
  const canPostCount = employers.filter(e => e.canPostJobs).length;
  const messagingCount = employers.filter(e => e.canMessageSeekers).length;

  return (
    <div className="space-y-4 text-slate-900">
      {/* Top Header Bar (Only if not hidden by standalone page wrapper) */}
      {!hideTopTitle && (
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Go Back
              </button>
            )}
            <h2 className="text-lg font-black text-[#0B1B3D] tracking-tight">Employer Management</h2>
          </div>

          {/* Small Tag at Top Right */}
          <span className="px-2.5 py-0.5 bg-[#0B1B3D] text-white border border-[#0B1B3D] font-mono text-[10px] font-extrabold rounded-full uppercase tracking-wider">
            Employers
          </span>
        </div>
      )}

      {/* KPI Summary Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">Total Employers</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[#0B1B3D]">{totalCount}</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">CAC Verified</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-emerald-900">{verifiedCount}</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-mono font-bold text-blue-700 uppercase tracking-wider">Can Post Jobs</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-blue-900">{canPostCount}</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
        </div>

        <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-3 space-y-1">
          <p className="text-[10px] font-mono font-bold text-purple-700 uppercase tracking-wider">Direct Messages</p>
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-purple-900">{messagingCount}</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Status Message Notification */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Input, Filters & Action Buttons Row (Matching Saved Contacts Layout) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 w-full">
          {/* Search Input occupying remaining width */}
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by company, liaison, email, RC number..."
              className="w-full pl-10 pr-3 py-2 bg-slate-100/80 border border-slate-200 rounded-xl text-sm font-normal text-slate-800 focus:outline-none focus:border-[#1E88E5] focus:ring-1 focus:ring-[#1E88E5]/20 transition-all shadow-none placeholder-gray-400"
            />
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            className="p-2 bg-white border border-[#0B1B3D]/20 hover:border-[#0B1B3D]/50 text-[#0B1B3D] rounded-xl transition-all shadow-none cursor-pointer shrink-0"
            title="Refresh employers"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>

          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-100 border border-[#0B1B3D]/15 rounded-xl p-0.5 shrink-0">
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "card"
                  ? "bg-[#0B1B3D] text-white shadow-none"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Cards</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === "list"
                  ? "bg-[#0B1B3D] text-white shadow-none"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              title="List Table View"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">List</span>
            </button>
          </div>
        </div>

        {/* Filter Badges Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {[
            { id: "all", label: "All Employers" },
            { id: "verified", label: "CAC Verified" },
            { id: "unverified", label: "Unverified" },
            { id: "canPost", label: "Can Post Jobs" },
            { id: "restricted", label: "Posting Restricted" }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id as any)}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer border ${
                filterType === f.id
                  ? "bg-[#0B1B3D] text-white border-[#0B1B3D]"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Employer Content Container */}
      {loading ? (
        /* Skeleton Shimmer Loading UI */
        viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-[#0B1B3D]/15 rounded-xl p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 w-full">
                    <div className="w-9 h-9 rounded-lg bg-slate-200 animate-shimmer shrink-0" />
                    <div className="space-y-1.5 w-full">
                      <div className="h-3.5 bg-slate-200 animate-shimmer rounded-md w-3/4" />
                      <div className="h-2.5 bg-slate-200 animate-shimmer rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-slate-200 animate-shimmer rounded-md shrink-0" />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="h-3 bg-slate-200 animate-shimmer rounded-md w-4/5" />
                  <div className="flex justify-between items-center pt-0.5">
                    <div className="h-4 bg-slate-200 animate-shimmer rounded-md w-14" />
                    <div className="h-3 bg-slate-200 animate-shimmer rounded-md w-16" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="h-7 bg-slate-200 animate-shimmer rounded-lg w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#0B1B3D]/15 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-[#0B1B3D]/15 flex justify-between">
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-24" />
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-32" />
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-16" />
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-20" />
            </div>
            <div className="divide-y divide-slate-100 p-2 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2 gap-3">
                  <div className="flex items-center gap-2 w-1/3">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 animate-shimmer shrink-0" />
                    <div className="space-y-1 w-full">
                      <div className="h-3 bg-slate-200 animate-shimmer rounded w-3/4" />
                      <div className="h-2 bg-slate-200 animate-shimmer rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-200 animate-shimmer rounded w-1/4" />
                  <div className="h-4 bg-slate-200 animate-shimmer rounded w-8" />
                  <div className="h-3 bg-slate-200 animate-shimmer rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        )
      ) : filteredEmployers.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#0B1B3D]/15 rounded-2xl space-y-2">
          <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No employers found</p>
          <p className="text-[11px] font-mono text-slate-400 max-w-xs mx-auto">
            {searchQuery ? "No employer accounts matched your search criteria." : "No registered corporate employers found."}
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* =========================================================
           CARD GRID VIEW (With Expandable Details & Permission Switch)
           ========================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredEmployers.map((emp) => {
            const isExpanded = expandedEmployerId === emp.uid;
            const jobCount = getEmployerJobCount(emp);
            const ticketCount = getEmployerTicketCount(emp);

            return (
              <motion.div
                key={emp.uid}
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className={`bg-white border rounded-2xl p-4 shadow-none transition-all flex flex-col justify-between ${
                  isExpanded 
                    ? "border-[#0084FF] ring-2 ring-[#0084FF]/15 sm:col-span-2 lg:col-span-3" 
                    : "border-[#0B1B3D]/20 hover:border-[#0B1B3D]/50"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Card Header */}
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#0B1B3D] text-white font-mono font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        <Building2 className="w-5 h-5 text-blue-300" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="text-sm font-extrabold text-[#0B1B3D] leading-tight truncate">
                            {emp.companyName || emp.displayName}
                          </h4>
                          {emp.isVerifiedEmployer && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded-md" title="CAC Verified Organization">
                              <ShieldCheck className="w-2.5 h-2.5 text-blue-600" />
                              VERIFIED
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] font-mono font-medium text-slate-500 truncate">
                          {emp.displayName} • {emp.companyIndustry || "Corporate Employer"}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setDeleteConfirmEmployer(emp)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border-0 bg-transparent shrink-0"
                      title="Delete Employer Account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Summary Badges & RC Number */}
                  <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                        {emp.rcNumber || "RC-Pending"}
                      </span>
                      <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                        {jobCount} Job{jobCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                        emp.canPostJobs 
                          ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                          : "bg-rose-50 text-rose-800 border-rose-200"
                      }`}>
                        {emp.canPostJobs ? "Posting Allowed" : "Posting Blocked"}
                      </span>
                    </div>
                  </div>

                  {/* =========================================================
                      DETAILS DROPDOWN ACCORDION CONTENT
                      ========================================================= */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-4 pt-3 border-t border-slate-100 text-xs overflow-hidden"
                      >
                        {/* 1. Full Contact & Corporate Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
                          {/* Official Email */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Official Email</span>
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                              <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <a href={`mailto:${emp.email}`} className="truncate hover:underline text-blue-700">
                                {emp.email}
                              </a>
                            </div>
                          </div>

                          {/* Company Phone & WhatsApp */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Corporate Phone</span>
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{emp.companyPhone || "Not configured"}</span>
                            </div>
                          </div>

                          {/* Address / Location */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Location / HQ</span>
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate">{emp.companyAddress || "Lagos, Nigeria"}</span>
                            </div>
                          </div>

                          {/* Website */}
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Official Website</span>
                            <div className="flex items-center gap-1.5 text-slate-800 font-semibold truncate">
                              <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              {emp.companyWebsite ? (
                                <a 
                                  href={emp.companyWebsite.startsWith("http") ? emp.companyWebsite : `https://${emp.companyWebsite}`}
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-blue-600 hover:underline flex items-center gap-1 truncate"
                                >
                                  <span className="truncate">{emp.companyWebsite.replace(/^https?:\/\//, "")}</span>
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                </a>
                              ) : (
                                <span className="text-slate-400 italic">None provided</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Permission Assignment Controls (Interactive Switches On/Off) */}
                        <div className="bg-white p-3.5 rounded-xl border border-blue-100 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <h5 className="text-xs font-black text-[#0B1B3D] uppercase tracking-wider flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                              Assign Employer Permissions & Access Controls
                            </h5>
                            <span className="text-[10px] font-mono text-slate-400 font-bold">Live Synced to DB</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Switch 1: Direct Job Board Posting */}
                            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-slate-900">Job Board Posting</span>
                                  {/* Custom Switch Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleJobPosting(emp)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      emp.canPostJobs ? "bg-blue-600" : "bg-slate-300"
                                    }`}
                                    title="Toggle job posting permission"
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        emp.canPostJobs ? "translate-x-4" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                  Allow employer to directly publish job openings on the public feed.
                                </p>
                              </div>
                              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md inline-block w-fit ${
                                emp.canPostJobs ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                {emp.canPostJobs ? "ACTIVE: Posting Authorized" : "LOCKED: Requires Staff Post"}
                              </span>
                            </div>

                            {/* Switch 2: Verified Corporate Seal */}
                            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-slate-900">CAC Verified Badge</span>
                                  {/* Custom Switch Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleVerification(emp)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      emp.isVerifiedEmployer ? "bg-emerald-600" : "bg-slate-300"
                                    }`}
                                    title="Toggle verification badge"
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        emp.isVerifiedEmployer ? "translate-x-4" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                  Displays the official Verified Seal on employer profile and vacancies.
                                </p>
                              </div>
                              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md inline-block w-fit ${
                                emp.isVerifiedEmployer ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"
                              }`}>
                                {emp.isVerifiedEmployer ? "SEAL: Official Verified" : "UNVERIFIED: Standard"}
                              </span>
                            </div>

                            {/* Switch 3: Candidate Direct Messaging */}
                            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex flex-col justify-between space-y-2">
                              <div>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-extrabold text-slate-900">Seeker Messaging</span>
                                  {/* Custom Switch Toggle */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMessaging(emp)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                      emp.canMessageSeekers ? "bg-purple-600" : "bg-slate-300"
                                    }`}
                                    title="Toggle candidate direct messaging"
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                        emp.canMessageSeekers ? "translate-x-4" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                                  Permit employer to initiate chats and candidate interview inquiries.
                                </p>
                              </div>
                              <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded-md inline-block w-fit ${
                                emp.canMessageSeekers ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-700"
                              }`}>
                                {emp.canMessageSeekers ? "ENABLED: Direct Chat" : "DISABLED: Recruiter Only"}
                              </span>
                            </div>
                          </div>

                          {/* Active Job Posts Quota Selector */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-700">Max Active Job Posts Limit:</span>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {[3, 5, 10, 25, 50].map((limit) => (
                                <button
                                  key={limit}
                                  type="button"
                                  onClick={() => handleUpdateQuota(emp, limit)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold cursor-pointer transition-all ${
                                    (emp.maxJobPosts || 5) === limit
                                      ? "bg-[#0B1B3D] text-white"
                                      : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {limit} Posts
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 mt-3">
                  {/* Dropdown Toggle Button */}
                  <button
                    onClick={() => toggleDropdown(emp.uid)}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isExpanded 
                        ? "bg-slate-100 text-slate-800 hover:bg-slate-200" 
                        : "bg-[#0B1B3D] text-white hover:bg-[#162A52]"
                    }`}
                  >
                    <span>{isExpanded ? "Hide Details" : "View Details & Permissions"}</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {/* WhatsApp Liaison Link (Matching Saved Contacts) */}
                  {emp.companyPhone && (
                    <a
                      href={`https://wa.me/${emp.companyPhone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-none cursor-pointer no-underline shrink-0"
                      title="Contact Employer on WhatsApp"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* =========================================================
           LIST TABLE VIEW (Matching Saved Contacts Table)
           ========================================================= */
        <div className="bg-white border border-[#0B1B3D]/20 rounded-xl overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-[#0B1B3D]/15 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0B1B3D]">
                <tr>
                  <th className="py-2.5 px-3">Company & Liaison</th>
                  <th className="py-2.5 px-3">RC Registration</th>
                  <th className="py-2.5 px-3">Job Posting</th>
                  <th className="py-2.5 px-3">Verification</th>
                  <th className="py-2.5 px-3">Messaging</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {filteredEmployers.map((emp) => {
                  const isExpanded = expandedEmployerId === emp.uid;
                  return (
                    <React.Fragment key={emp.uid}>
                      <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? "bg-blue-50/30" : ""}`}>
                        {/* Company & Liaison */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#0B1B3D] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4 text-blue-300" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-extrabold text-[#0B1B3D] truncate flex items-center gap-1.5">
                                {emp.companyName || emp.displayName}
                                {emp.isVerifiedEmployer && (
                                  <ShieldCheck className="w-3 h-3 text-blue-600 shrink-0" />
                                )}
                              </div>
                              <div className="font-mono text-[10px] text-slate-500 truncate">
                                {emp.displayName} • {emp.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* RC Registration */}
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          <span className="bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-[10px]">
                            {emp.rcNumber || "Pending"}
                          </span>
                        </td>

                        {/* Job Posting Switch */}
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleJobPosting(emp)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              emp.canPostJobs ? "bg-blue-600" : "bg-slate-300"
                            }`}
                            title="Toggle job posting permission"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                emp.canPostJobs ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Verification Switch */}
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleVerification(emp)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              emp.isVerifiedEmployer ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                            title="Toggle CAC verified seal"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                emp.isVerifiedEmployer ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Candidate Messaging Switch */}
                        <td className="py-2.5 px-3">
                          <button
                            type="button"
                            onClick={() => handleToggleMessaging(emp)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              emp.canMessageSeekers ? "bg-purple-600" : "bg-slate-300"
                            }`}
                            title="Toggle candidate direct messaging"
                          >
                            <span
                              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                emp.canMessageSeekers ? "translate-x-4" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => toggleDropdown(emp.uid)}
                              className="p-1.5 bg-[#0B1B3D] hover:bg-[#162A52] text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 font-bold text-[10px]"
                              title="Toggle dropdown details"
                            >
                              <span>{isExpanded ? "Hide" : "Details"}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {emp.companyPhone && (
                              <a
                                href={`https://wa.me/${emp.companyPhone.replace(/[^0-9]/g, "")}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 font-bold text-[10px] no-underline"
                                title="Open WhatsApp chat"
                              >
                                <Phone className="w-3 h-3" />
                              </a>
                            )}

                            <button
                              onClick={() => setDeleteConfirmEmployer(emp)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                              title="Delete Employer Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Dropdown Accordion Row inside Table */}
                      {isExpanded && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={6} className="p-4 border-b border-slate-200">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border border-slate-200">
                              <div className="space-y-1">
                                <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase">Contact Information</h6>
                                <p className="text-xs font-bold text-slate-800">{emp.displayName}</p>
                                <p className="text-xs font-mono text-slate-600">{emp.email}</p>
                                <p className="text-xs font-mono text-slate-600">{emp.companyPhone || "No phone"}</p>
                              </div>

                              <div className="space-y-1">
                                <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase">Company Profile</h6>
                                <p className="text-xs font-bold text-slate-800">{emp.companyName || "N/A"}</p>
                                <p className="text-xs text-slate-600">{emp.companyIndustry || "Industry not set"}</p>
                                <p className="text-xs text-slate-600">{emp.companyAddress || "Location not set"}</p>
                              </div>

                              <div className="space-y-2">
                                <h6 className="text-[10px] font-mono font-bold text-slate-400 uppercase">Listing Quota</h6>
                                <div className="flex items-center gap-1">
                                  {[3, 5, 10, 25].map((lim) => (
                                    <button
                                      key={lim}
                                      onClick={() => handleUpdateQuota(emp, lim)}
                                      className={`px-2 py-1 rounded text-[11px] font-mono font-bold ${
                                        (emp.maxJobPosts || 5) === lim
                                          ? "bg-[#0B1B3D] text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      {lim}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Matching Saved Contacts Modal) */}
      <AnimatePresence>
        {deleteConfirmEmployer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmEmployer(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 z-10"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">Delete Employer Account</h3>
                  <p className="text-xs font-mono text-slate-500">Irreversible database action</p>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                Are you sure you want to remove the corporate profile for <strong className="text-slate-900">{deleteConfirmEmployer.companyName || deleteConfirmEmployer.displayName}</strong> ({deleteConfirmEmployer.email})? This will revoke their access and deactivate their employer dashboard portal.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmEmployer(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteEmployer(deleteConfirmEmployer.uid)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
