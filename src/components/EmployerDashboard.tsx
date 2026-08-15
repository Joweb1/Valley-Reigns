import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  Job, 
  UserProfile, 
  EmployerRecruitmentRequest, 
  EmployerApplicant, 
  Conversation, 
  ChatMessage 
} from "../types";
import { 
  getJobs, 
  addJob, 
  updateJob, 
  getEmployerRecruitmentRequests, 
  submitEmployerRecruitmentRequest, 
  getEmployerApplicants, 
  updateEmployerApplicantStatus, 
  subscribeToConversations, 
  sendChatMessage, 
  addSystemNotification,
  memoryStore
} from "../lib/services";
import { 
  Building2, 
  Briefcase, 
  Users, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  ExternalLink, 
  Send, 
  ShieldCheck, 
  ShieldAlert, 
  FileText, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Phone, 
  Mail, 
  Globe, 
  UserCheck, 
  Lock, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  Check, 
  X,
  ChevronRight,
  TrendingUp,
  Inbox,
  Settings,
  Eye,
  BarChart3,
  RefreshCw,
  Edit3,
  Trash2,
  Paperclip,
  CheckCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

export const EmployerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation State
  const [activeView, setActiveView] = useState<"overview" | "jobs" | "recruitment" | "applicants" | "messages" | "profile">("overview");

  // Sync activeView with URL search params and CustomEvent
  useEffect(() => {
    const handleHomeClick = () => {
      setActiveView("overview");
    };
    window.addEventListener("employer-home-click", handleHomeClick);
    return () => window.removeEventListener("employer-home-click", handleHomeClick);
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const viewParam = searchParams.get("view");
    if (viewParam === "overview") {
      setActiveView("overview");
    } else if (viewParam === "jobs") {
      setActiveView("jobs");
    } else if (viewParam === "recruitment") {
      setActiveView("recruitment");
    } else if (viewParam === "applicants") {
      setActiveView("applicants");
    } else if (viewParam === "messages") {
      setActiveView("messages");
    } else if (viewParam === "profile") {
      setActiveView("profile");
    }
  }, [location.search]);

  const setViewAndUrl = (view: "overview" | "jobs" | "recruitment" | "applicants" | "messages" | "profile") => {
    setActiveView(view);
    navigate(`/employer?view=${view}`, { replace: true });
  };

  // State
  const [jobs, setJobs] = useState<Job[]>([]);
  const [recruitmentRequests, setRecruitmentRequests] = useState<EmployerRecruitmentRequest[]>([]);
  const [applicants, setApplicants] = useState<EmployerApplicant[]>([]);
  const [conversations, setConversations] = useState<Record<string, Conversation>>({});
  const [selectedChatId, setSelectedChatId] = useState<string>("employer-admin-support");
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Chart filter state
  const [chartFilter, setChartFilter] = useState<"daily" | "weekly" | "monthly" | "yearly">("daily");

  // New Job Modal State
  const [showNewJobModal, setShowNewJobModal] = useState(false);
  const [newJobData, setNewJobData] = useState({
    title: "",
    department: "",
    category: "Tech",
    type: "Full-time",
    workplaceType: "On-site",
    salary: "",
    location: "",
    experienceLevel: "Mid Level",
    description: "",
    requirements: "",
    benefits: ""
  });

  // Recruitment Request Form State
  const [showRecruitmentModal, setShowRecruitmentModal] = useState(false);
  const [recruitmentForm, setRecruitmentForm] = useState({
    jobTitle: "",
    jobCategory: "Information Technology",
    salaryBudget: "",
    numberOfWorkers: 1,
    jobLocation: "",
    requirements: "",
    urgency: "immediate" as "immediate" | "within_1_week" | "within_1_month" | "flexible",
    notes: ""
  });

  // Applicant filter & detail state
  const [applicantFilter, setApplicantFilter] = useState<string>("all");
  const [selectedApplicant, setSelectedApplicant] = useState<EmployerApplicant | null>(null);
  const [interviewScheduleDate, setInterviewScheduleDate] = useState("");
  const [applicantNotesInput, setApplicantNotesInput] = useState("");

  // Company Profile Form State
  const [companyProfile, setCompanyProfile] = useState({
    companyName: currentUser?.companyName || "Apex Systems Global",
    companyIndustry: currentUser?.companyIndustry || "Technology & Cloud Computing",
    companyWebsite: currentUser?.companyWebsite || "https://apexsystems.example.com",
    companyPhone: currentUser?.companyPhone || "+234 802 345 6789",
    companyAddress: currentUser?.companyAddress || "Victoria Island, Lagos, Nigeria",
    rcNumber: currentUser?.rcNumber || "RC-892341",
    displayName: currentUser?.displayName || "Apex HR Directorate",
    email: currentUser?.email || "employer@apexsystems.com"
  });

  // Sync profile when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setCompanyProfile({
        companyName: currentUser.companyName || "Apex Systems Global",
        companyIndustry: currentUser.companyIndustry || "Technology & Cloud Computing",
        companyWebsite: currentUser.companyWebsite || "https://apexsystems.example.com",
        companyPhone: currentUser.companyPhone || "+234 802 345 6789",
        companyAddress: currentUser.companyAddress || "Victoria Island, Lagos, Nigeria",
        rcNumber: currentUser.rcNumber || "RC-892341",
        displayName: currentUser.displayName || "Apex HR Directorate",
        email: currentUser.email || "employer@apexsystems.com"
      });
    }
  }, [currentUser]);

  // Load data
  useEffect(() => {
    async function loadEmployerData() {
      setLoading(true);
      try {
        const allJobs = await getJobs();
        // Filter jobs posted by this employer (or company name matches)
        const myJobs = allJobs.filter(j => 
          j.postedByUid === currentUser?.uid || 
          (currentUser?.companyName && j.company?.toLowerCase() === currentUser.companyName.toLowerCase())
        );
        setJobs(myJobs.length > 0 ? myJobs : allJobs.slice(0, 4));

        const reqs = await getEmployerRecruitmentRequests(currentUser?.uid);
        setRecruitmentRequests(reqs);

        const apps = await getEmployerApplicants(currentUser?.uid);
        setApplicants(apps);
      } catch (err) {
        console.error("Error loading employer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    loadEmployerData();

    // Subscribe to conversations for messaging
    const unsub = subscribeToConversations((convMap) => {
      setConversations(convMap);
    });

    return () => unsub();
  }, [currentUser?.uid, currentUser?.companyName]);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Submit new job
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.canPostJobs) {
      showToast("Posting permission required. Please request approval from Admin.", "error");
      return;
    }
    if (!newJobData.title.trim()) {
      showToast("Job title is required", "error");
      return;
    }

    try {
      const created = await addJob({
        title: newJobData.title.trim(),
        company: currentUser.companyName || companyProfile.companyName || "Apex Systems",
        category: newJobData.category,
        type: newJobData.type,
        salary: newJobData.salary || "Competitive",
        location: newJobData.location || "Remote / Hybrid",
        description: newJobData.description || `We are hiring a ${newJobData.title}.`,
        requirements: newJobData.requirements ? newJobData.requirements.split("\n").filter(Boolean) : ["Relevant industry experience"],
        postedByUid: currentUser.uid,
        isUnavailable: false
      });

      setJobs(prev => [created, ...prev]);
      setShowNewJobModal(false);
      setNewJobData({
        title: "",
        department: "",
        category: "Tech",
        type: "Full-time",
        workplaceType: "On-site",
        salary: "",
        location: "",
        experienceLevel: "Mid Level",
        description: "",
        requirements: "",
        benefits: ""
      });
      showToast("Job opening successfully published!");
    } catch (err) {
      showToast("Failed to publish job. Please try again.", "error");
    }
  };

  // Submit recruitment request ticket
  const handleSubmitRecruitment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruitmentForm.jobTitle.trim()) {
      showToast("Job title is required", "error");
      return;
    }

    try {
      const newReq = await submitEmployerRecruitmentRequest({
        employerUid: currentUser?.uid || "employer-demo",
        companyName: currentUser?.companyName || companyProfile.companyName || "Apex Systems",
        contactPerson: currentUser?.displayName || companyProfile.displayName || "HR Directorate",
        email: currentUser?.email || companyProfile.email || "employer@apexsystems.com",
        phone: currentUser?.companyPhone || companyProfile.companyPhone || "+234 802 345 6789",
        jobTitle: recruitmentForm.jobTitle.trim(),
        jobCategory: recruitmentForm.jobCategory,
        salaryBudget: recruitmentForm.salaryBudget || "Standard / Negotiable",
        numberOfWorkers: Number(recruitmentForm.numberOfWorkers) || 1,
        jobLocation: recruitmentForm.jobLocation || "Lagos / Hybrid",
        requirements: recruitmentForm.requirements || "Verified professional qualifications.",
        urgency: recruitmentForm.urgency,
        notes: recruitmentForm.notes
      });

      setRecruitmentRequests(prev => [newReq, ...prev]);
      setShowRecruitmentModal(false);
      setRecruitmentForm({
        jobTitle: "",
        jobCategory: "Information Technology",
        salaryBudget: "",
        numberOfWorkers: 1,
        jobLocation: "",
        requirements: "",
        urgency: "immediate",
        notes: ""
      });
      showToast("Staffing ticket created! Dedicated Valley Reigns recruiters have been dispatched.");
    } catch (err) {
      showToast("Failed to submit recruitment request.", "error");
    }
  };

  // Request Posting Permission
  const handleRequestPostingPermission = async () => {
    await addSystemNotification({
      type: "permission_request",
      title: "Employer Posting Access Request",
      message: `${currentUser?.companyName || currentUser?.displayName || "Employer"} requested direct job board publishing permission.`,
      metadata: { uid: currentUser?.uid, companyName: currentUser?.companyName }
    });
    showToast("Request submitted to Admin! Our operations team will review your account shortly.");
  };

  // Toggle Job Availability
  const handleToggleJobStatus = async (jobId: string, currentUnavailable: boolean) => {
    const nextVal = !currentUnavailable;
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, isUnavailable: nextVal } : j));
    try {
      await updateJob(jobId, { isUnavailable: nextVal });
      showToast(`Job listing is now ${nextVal ? "paused" : "active"}.`);
    } catch (e) {
      showToast("Could not update listing status", "error");
    }
  };

  // Update applicant status
  const handleUpdateApplicantStatus = async (
    id: string, 
    status: EmployerApplicant["status"],
    interviewDate?: string,
    notes?: string
  ) => {
    await updateEmployerApplicantStatus(id, status, interviewDate, notes);
    setApplicants(prev => prev.map(a => a.id === id ? { ...a, status, interviewDate, notes } : a));
    if (selectedApplicant?.id === id) {
      setSelectedApplicant(prev => prev ? { ...prev, status, interviewDate, notes } : null);
    }
    showToast(`Applicant status updated to: ${status.replace("_", " ").toUpperCase()}`);
  };

  // Save Profile
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser?.uid && memoryStore.users[currentUser.uid]) {
      memoryStore.users[currentUser.uid] = {
        ...memoryStore.users[currentUser.uid],
        companyName: companyProfile.companyName,
        companyIndustry: companyProfile.companyIndustry,
        companyWebsite: companyProfile.companyWebsite,
        companyPhone: companyProfile.companyPhone,
        companyAddress: companyProfile.companyAddress,
        rcNumber: companyProfile.rcNumber,
        displayName: companyProfile.displayName
      };
      memoryStore.save();
    }
    showToast("Company profile details updated successfully!");
  };

  // Send message in communication hub
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    const textToSend = messageInput.trim();
    setMessageInput("");

    try {
      await sendChatMessage(
        selectedChatId,
        "customer",
        textToSend
      );
      showToast("Message dispatched!");
    } catch (err) {
      showToast("Could not deliver message.", "error");
    }
  };

  // Derived metrics for KPI cards
  const activeJobsCount = jobs.filter(j => !j.isUnavailable).length;
  const totalApplicantsCount = applicants.length;
  const activeRequestsCount = recruitmentRequests.filter(r => r.status !== "fulfilled" && r.status !== "closed").length;
  const newApplicantsCount = applicants.filter(a => a.status === "new").length;
  const screeningCount = applicants.filter(a => a.status === "screening").length;
  const interviewCount = applicants.filter(a => a.status === "interview").length;
  const offeredCount = applicants.filter(a => a.status === "offered").length;

  // Filtered applicants
  const filteredApplicants = applicants.filter(a => {
    if (applicantFilter === "all") return true;
    return a.status === applicantFilter;
  });

  // Chart data for employer metrics
  const getChartData = () => {
    if (chartFilter === "daily") {
      const days = [
        { name: "Mon (07/06)", views: 42, applied: 9, sourced: 14, interviews: 3 },
        { name: "Tue (07/07)", views: 68, applied: 15, sourced: 22, interviews: 5 },
        { name: "Wed (07/08)", views: 85, applied: 18, sourced: 28, interviews: 8 },
        { name: "Thu (07/09)", views: 110, applied: 24, sourced: 35, interviews: 11 },
        { name: "Fri (07/10)", views: 135, applied: 31, sourced: 42, interviews: 14 },
        { name: "Sat (07/11)", views: 95, applied: 20, sourced: 26, interviews: 7 },
        { name: "Sun (07/12)", views: 72, applied: 16, sourced: 19, interviews: 4 }
      ];
      return days;
    }
    if (chartFilter === "weekly") {
      return [
        { name: "Week 1", views: 240, applied: 48, sourced: 70, interviews: 18 },
        { name: "Week 2", views: 320, applied: 65, sourced: 95, interviews: 26 },
        { name: "Week 3", views: 410, applied: 82, sourced: 120, interviews: 35 },
        { name: "Week 4", views: 480, applied: 98, sourced: 145, interviews: 42 }
      ];
    }
    if (chartFilter === "monthly") {
      return [
        { name: "Apr", views: 920, applied: 180, sourced: 260, interviews: 75 },
        { name: "May", views: 1150, applied: 230, sourced: 340, interviews: 98 },
        { name: "Jun", views: 1380, applied: 290, sourced: 420, interviews: 124 },
        { name: "Jul", views: 1650, applied: 345, sourced: 510, interviews: 156 }
      ];
    }
    return [
      { name: "2024", views: 8400, applied: 1600, sourced: 2400, interviews: 680 },
      { name: "2025", views: 14200, applied: 2900, sourced: 4100, interviews: 1240 },
      { name: "2026", views: 21800, applied: 4600, sourced: 6800, interviews: 1980 }
    ];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/80 p-3 rounded-2xl shadow-xl text-left">
          <p className="text-[11px] font-mono font-bold text-slate-300 mb-1.5 border-b border-slate-700/60 pb-1">
            {label}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={`tooltip-${index}`} className="flex items-center justify-between gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-bold text-white">
                  {entry.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div id="employer-dashboard-container" className={`space-y-8 select-text ${activeView === "overview" ? "pt-6 sm:pt-8" : "pt-1"}`}>
      {/* Toast notifications */}
      <AnimatePresence>
        {feedbackMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: -20, x: "-50%" }}
            className={`fixed top-6 left-1/2 transform text-white px-5 py-3 rounded-2xl shadow-2xl z-50 text-xs font-mono font-semibold flex items-center gap-2.5 max-w-md ${
              feedbackMsg.type === "success"
                ? "bg-slate-900 border border-slate-700/50"
                : "bg-rose-950 border border-rose-800"
            }`}
          >
            {feedbackMsg.type === "success" ? (
              <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Workspace Render Engine */}
      {loading ? (
        <div className="space-y-8" key="employer-loading">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 animate-pulse">
            <div className="h-32 bg-slate-200/60 rounded-3xl" />
            <div className="h-32 bg-slate-200/60 rounded-3xl" />
            <div className="h-32 bg-slate-200/60 rounded-3xl col-span-2" />
          </div>
          <div className="grid grid-cols-4 gap-4 animate-pulse">
            <div className="h-20 bg-slate-200/60 rounded-2xl" />
            <div className="h-20 bg-slate-200/60 rounded-2xl" />
            <div className="h-20 bg-slate-200/60 rounded-2xl" />
            <div className="h-20 bg-slate-200/60 rounded-2xl" />
          </div>
          <div className="h-80 bg-slate-200/60 rounded-3xl animate-pulse" />
        </div>
      ) : activeView === "overview" ? (
        <div key="overview" className="space-y-8">
          
          {/* Top Employer Status Header Banner */}
          <div className="bg-white border border-blue-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-none">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#0084FF] text-white flex items-center justify-center shadow-md shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-sans font-black text-[#0B1B3D] tracking-tight">
                    {companyProfile.companyName}
                  </h2>
                  {currentUser?.isVerifiedEmployer ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-300/60 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Verified Corporate Partner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-300/60 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      Standard Corporate Account
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#0B1B3D]/70 font-mono mt-0.5">
                  RC: <span className="font-bold text-[#0B1B3D]">{companyProfile.rcNumber}</span> • {companyProfile.companyIndustry} • {companyProfile.displayName}
                </p>
              </div>
            </div>

            {/* Quick Action Top Buttons */}
            <div className="flex items-center gap-2 w-full md:w-auto">
              <button
                onClick={() => setShowRecruitmentModal(true)}
                className="flex-1 md:flex-none px-4 py-2.5 bg-[#0084FF] hover:bg-[#0070DA] active:scale-95 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Hire Workers Ticket</span>
              </button>
              <button
                onClick={() => {
                  if (!currentUser?.canPostJobs) {
                    handleRequestPostingPermission();
                  } else {
                    setShowNewJobModal(true);
                  }
                }}
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 border cursor-pointer active:scale-95 ${
                  currentUser?.canPostJobs 
                    ? "bg-[#0B1B3D] hover:bg-[#112a5c] text-white border-transparent" 
                    : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                }`}
              >
                {currentUser?.canPostJobs ? <Briefcase className="w-4 h-4" /> : <Lock className="w-4 h-4 text-amber-600" />}
                <span>{currentUser?.canPostJobs ? "Post Vacancy" : "Request Post Access"}</span>
              </button>
            </div>
          </div>

          {/* 1. KPI Grid Dashboard (Matching Admin Dashboard) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Candidate Impressions / Views */}
            <div className="bg-white border border-black hover:border-black/80 rounded-3xl p-4 sm:p-6 shadow-none hover:shadow-[0_12px_30px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between col-span-1">
              <div className="space-y-2">
                <p className="text-xs font-sans text-[#0B1B3D]/70 font-medium leading-tight tracking-wide">
                  Candidate Views
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl sm:text-3xl font-mono font-bold text-[#0B1B3D] tracking-tight">
                    {647 + activeJobsCount * 85}
                  </h4>
                  <span className="text-[10px] font-mono font-extrabold text-emerald-600 flex items-center gap-0.5">
                    ▲ +14%
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewAndUrl("jobs")}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-[#0B1B3D] hover:bg-[#112a5c] active:scale-95 text-white rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:shadow-sm"
                title="Manage Vacancies"
              >
                <Eye className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Card 2: Active Vacancies & Sourced Pool (With Vector Graphic Background) */}
            <div className="bg-[#0084FF] border border-[#0084FF]/40 hover:border-[#0084FF] rounded-3xl p-4 sm:p-6 shadow-none hover:shadow-[0_12px_30px_rgba(0,132,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between col-span-1 relative overflow-hidden text-white">
              {/* Subtle vector graphics pattern matching admin dashboard */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
                  <circle cx="95%" cy="25%" r="120" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="4 4" />
                  <path d="M-20,120 C40,60 120,150 220,100" stroke="currentColor" strokeWidth="1.5" className="text-white/35" />
                  <path d="M-10,130 C50,70 130,160 230,110" stroke="currentColor" strokeWidth="1" className="text-white/20" />
                </svg>
              </div>

              <div className="space-y-2 relative z-10">
                <p className="text-xs font-sans text-white font-medium leading-tight tracking-wide">
                  Open Vacancies
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                    {activeJobsCount}
                  </h4>
                  <span className="text-[10px] font-mono font-bold text-blue-100/80">
                    → Active
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewAndUrl("jobs")}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-100/40 text-[#0B1B3D] rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:shadow-md relative z-10"
                title="View All Vacancies"
              >
                <Briefcase className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Card 3: Candidate Pipeline & Staffing Tickets (With Vector Graphic Background) */}
            <div className="bg-[#0084FF] border border-[#0084FF]/40 hover:border-[#0084FF] rounded-3xl p-4 sm:p-6 shadow-none hover:shadow-[0_12px_30px_rgba(0,132,255,0.06)] hover:-translate-y-0.5 transition-all duration-300 flex items-start justify-between col-span-2 md:col-span-2 relative overflow-hidden text-white">
              {/* Vector graphics pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.55]">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M-10,30 Q80,10 170,50 T350,20" stroke="currentColor" strokeWidth="1.5" className="text-white/40" />
                  <path d="M-10,40 Q80,20 170,60 T350,30" stroke="currentColor" strokeWidth="1" className="text-white/30" strokeDasharray="3 3" />
                  <path d="M20,100 Q110,80 200,120 T380,90" stroke="currentColor" strokeWidth="1.5" className="text-white/35" />
                  <circle cx="15%" cy="75%" r="40" stroke="currentColor" strokeWidth="1.2" className="text-white/25" strokeDasharray="2 2" />
                </svg>
              </div>

              <div className="space-y-2 flex-1 min-w-0 mr-1 relative z-10">
                <p className="text-xs font-sans text-white font-medium leading-tight tracking-wide">
                  Candidate Pipeline & Staffing
                </p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                    {totalApplicantsCount}
                  </h4>
                  <span className="text-[10px] font-mono font-extrabold text-white flex items-center gap-0.5">
                    ▲ +{activeRequestsCount} Staffing Tickets
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-2 text-[10px] sm:text-[11px] font-sans font-extrabold tracking-tight">
                  <span className="text-amber-800 bg-white px-1.5 py-0.5 rounded-lg border border-amber-200/50" title="New Candidates">
                    New: {newApplicantsCount}
                  </span>
                  <span className="text-blue-800 bg-white px-1.5 py-0.5 rounded-lg border border-blue-200/50" title="Screening Stage">
                    Screening: {screeningCount}
                  </span>
                  <span className="text-purple-800 bg-white px-1.5 py-0.5 rounded-lg border border-purple-200/50" title="Interview Stage">
                    Interview: {interviewCount}
                  </span>
                  <span className="text-emerald-800 bg-white px-1.5 py-0.5 rounded-lg border border-emerald-200/50" title="Offered Stage">
                    Offered: {offeredCount}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setViewAndUrl("applicants")}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-50 hover:bg-blue-100 active:scale-95 border border-blue-100/40 text-[#0B1B3D] rounded-2xl flex items-center justify-center shrink-0 cursor-pointer transition-all hover:shadow-md relative z-10"
                title="Manage Candidate Pipeline"
              >
                <Users className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* 2. Bento Navigation Quick Links (Matching Admin Panel) */}
          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            {/* Card 1: Vacancies */}
            <button
              onClick={() => setViewAndUrl("jobs")}
              className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                Vacancies
              </span>
            </button>

            {/* Card 2: Staffing Tickets */}
            <button
              onClick={() => setViewAndUrl("recruitment")}
              className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="text-center">
                <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                  Staffing Tickets
                </span>
                <p className="text-[8px] sm:text-[9px] font-mono font-bold text-[#0B1B3D]/70 uppercase tracking-wider block leading-none mt-0.5 sm:mt-1">
                  {activeRequestsCount} Active
                </p>
              </div>
            </button>

            {/* Card 3: Applicants */}
            <button
              onClick={() => setViewAndUrl("applicants")}
              className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                Applicants
              </span>
            </button>

            {/* Card 4: Messages */}
            <button
              onClick={() => setViewAndUrl("messages")}
              className="group flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 ease-out select-none border border-[#0B1B3D]/30 hover:border-[#0084FF] text-center space-y-1 sm:space-y-2 bg-blue-50/20 hover:bg-blue-50/70 shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_50px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1 hover:scale-[1.03]"
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center bg-[#0084FF] text-white group-hover:bg-[#0070DA] transition-all duration-300 ease-out shrink-0 group-hover:scale-110">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="text-[10px] sm:text-xs font-sans font-extrabold tracking-tight text-[#0B1B3D] group-hover:text-[#0084FF] transition-colors block leading-tight">
                Messages
              </span>
            </button>
          </div>

          {/* 3. Performance Timeline Chart (Matching Admin Panel) */}
          <div className="bg-white border border-blue-800 rounded-3xl pt-3.5 pb-6 px-6 sm:pt-4 sm:pb-8 sm:px-8 shadow-none space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Recruitment & Application Velocity
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Live candidate views, applicant inflow, and interview milestones
                  </p>
                </div>
              </div>

              {/* Filter pills */}
              <div className="flex items-center bg-[#0B1B3D] p-1 rounded-2xl self-start sm:self-auto overflow-x-auto max-w-full">
                {(["daily", "weekly", "monthly", "yearly"] as const).map((filter) => {
                  const isActive = chartFilter === filter;
                  return (
                    <button
                      key={filter}
                      onClick={() => setChartFilter(filter)}
                      className={`px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold tracking-tight cursor-pointer uppercase transition-all whitespace-nowrap ${
                        isActive 
                          ? "bg-white text-black shadow-sm border border-transparent font-black" 
                          : "text-blue-100/80 hover:text-white"
                      }`}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="w-full h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={getChartData()}
                  margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0/60" />
                  <XAxis 
                    dataKey="name" 
                    stroke="#94A3B8" 
                    fontSize={9} 
                    fontWeight={700}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                    dy={8}
                  />
                  <YAxis 
                    stroke="#94A3B8" 
                    fontSize={9} 
                    fontWeight={700}
                    fontFamily="var(--font-mono)"
                    tickLine={false}
                    axisLine={false}
                    dx={-8}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={6}
                    wrapperStyle={{ fontSize: "10px", fontWeight: 700, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.05em" }}
                  />
                  
                  {/* Views */}
                  <Line 
                    name="Candidate Views" 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#1E88E5" 
                    strokeWidth={2.5} 
                    activeDot={{ r: 6 }} 
                    dot={{ r: 4, strokeWidth: 1.5, fill: "#FFF" }} 
                  />

                  {/* Sourced */}
                  <Line 
                    name="Recruiter Sourced" 
                    type="monotone" 
                    dataKey="sourced" 
                    stroke="#1e3a8a" 
                    strokeWidth={2} 
                    activeDot={{ r: 5 }} 
                    dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                  />

                  {/* Applied */}
                  <Line 
                    name="Direct Applications" 
                    type="monotone" 
                    dataKey="applied" 
                    stroke="#2563EB" 
                    strokeWidth={2} 
                    activeDot={{ r: 5 }} 
                    dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                  />

                  {/* Interviews */}
                  <Line 
                    name="Interviews Scheduled" 
                    type="monotone" 
                    dataKey="interviews" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    activeDot={{ r: 5 }} 
                    dot={{ r: 3, strokeWidth: 1.5, fill: "#FFF" }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : activeView === "jobs" ? (
        /* ========================================== */
        /* SUBVIEW: MY VACANCIES & OPENINGS */
        /* ========================================== */
        <div key="jobs" className="space-y-6">
          {/* Header with Back Button (Matching Admin Subviews) */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewAndUrl("overview")}
              className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Vacancy Manager
            </div>
          </div>

          <div className="bg-white border border-blue-800 rounded-3xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Corporate Vacancies ({jobs.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Manage active postings, update job parameters, and pause expired roles
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  if (currentUser?.canPostJobs) setShowNewJobModal(true);
                  else handleRequestPostingPermission();
                }}
                className="px-4 py-2 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Publish New Role</span>
              </button>
            </div>

            {/* Vacancies List */}
            <div className="p-6 sm:p-8 space-y-4">
              {jobs.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-mono text-xs">
                  No active vacancy listings found. Click "Publish New Role" above to create one.
                </div>
              ) : (
                jobs.map((job) => (
                  <div 
                    key={job.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-blue-50/20 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{job.title}</h4>
                        <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                          {job.category || "Tech"}
                        </span>
                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                          {job.type}
                        </span>
                        {job.isUnavailable ? (
                          <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md">
                            Paused
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Active Listing
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {job.location || "Remote"}</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3.5 h-3.5 text-slate-400" /> {job.salary || "Competitive"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleJobStatus(job.id, !!job.isUnavailable)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          job.isUnavailable 
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                            : "bg-slate-200 hover:bg-slate-300 text-slate-700"
                        }`}
                      >
                        {job.isUnavailable ? "Resume Listing" : "Pause Role"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeView === "recruitment" ? (
        /* ========================================== */
        /* SUBVIEW: RECRUITMENT & STAFFING TICKETS */
        /* ========================================== */
        <div key="recruitment" className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewAndUrl("overview")}
              className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Staffing Service
            </div>
          </div>

          <div className="bg-white border border-blue-800 rounded-3xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Recruiter Staffing Tickets ({recruitmentRequests.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Managed recruitment requests delegated to Valley Reigns talent scouts
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowRecruitmentModal(true)}
                className="px-4 py-2 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>New Staffing Request</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              {recruitmentRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-mono text-xs">
                  No staffing tickets submitted yet. Click "New Staffing Request" to delegate candidate sourcing to our recruiters.
                </div>
              ) : (
                recruitmentRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{req.jobTitle}</h4>
                        <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md">
                          {req.jobCategory}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                          req.status === "fulfilled"
                            ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            : req.status === "in_progress"
                            ? "bg-blue-50 text-blue-800 border border-blue-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}>
                          {req.status.replace("_", " ").toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        {new Date(req.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-white p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Headcount</span>
                        <span className="font-bold text-slate-800">{req.numberOfWorkers} Worker(s)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Budget</span>
                        <span className="font-bold text-slate-800">{req.salaryBudget}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Urgency</span>
                        <span className="font-bold text-slate-800 capitalize">{req.urgency.replace(/_/g, " ")}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Assigned Recruiter</span>
                        <span className="font-bold text-blue-600">
                          {req.assignedStaffName || "Valley Reigns Lead Scout"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeView === "applicants" ? (
        /* ========================================== */
        /* SUBVIEW: CANDIDATE PIPELINE */
        /* ========================================== */
        <div key="applicants" className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewAndUrl("overview")}
              className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Pipeline View
            </div>
          </div>

          <div className="bg-white border border-blue-800 rounded-3xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Candidate Applications ({applicants.length})
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Review resumes, schedule interviews, and update candidate evaluation stages
                  </p>
                </div>
              </div>

              {/* Stage Filter Buttons */}
              <div className="flex items-center gap-1 overflow-x-auto max-w-full">
                {(["all", "reviewing", "shortlisted", "interview_scheduled", "hired", "rejected"] as const).map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setApplicantFilter(stage)}
                    className={`px-3 py-1 rounded-xl text-[10px] font-extrabold tracking-tight uppercase cursor-pointer transition-all ${
                      applicantFilter === stage
                        ? "bg-[#0B1B3D] text-white shadow-sm font-black"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {stage.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-4">
              {filteredApplicants.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-mono text-xs">
                  No applicants found under the selected "{applicantFilter}" filter.
                </div>
              ) : (
                filteredApplicants.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-2xl border border-slate-200/80 bg-slate-50/40 hover:bg-blue-50/20 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-[#0B1B3D] font-bold text-xs shrink-0 font-mono">
                        {(app.seekerName || "Candidate").split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-slate-900">{app.seekerName}</h4>
                          <span className="text-[10px] font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                            {app.jobTitle}
                          </span>
                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                            app.status === "hired" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" :
                            app.status === "interview_scheduled" ? "bg-purple-50 text-purple-800 border border-purple-200" :
                            app.status === "shortlisted" ? "bg-blue-50 text-blue-800 border border-blue-200" :
                            app.status === "rejected" ? "bg-rose-50 text-rose-800 border border-rose-200" :
                            "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {app.status.replace("_", " ").toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          {app.seekerEmail || "Verified Seeker"} • Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <select
                        value={app.status}
                        onChange={(e) => handleUpdateApplicantStatus(app.id, e.target.value as any)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-2xs"
                      >
                        <option value="reviewing">Status: Reviewing</option>
                        <option value="shortlisted">Status: Shortlisted</option>
                        <option value="interview_scheduled">Status: Interview</option>
                        <option value="hired">Status: Hired</option>
                        <option value="rejected">Status: Rejected</option>
                      </select>

                      <button
                        onClick={() => {
                          setSelectedApplicant(app);
                          setInterviewScheduleDate(app.interviewDate || "");
                          setApplicantNotesInput(app.notes || "");
                        }}
                        className="px-3 py-1.5 bg-[#0B1B3D] hover:bg-[#112a5c] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs"
                      >
                        Review / Schedule
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : activeView === "messages" ? (
        /* ========================================== */
        /* SUBVIEW: COMMUNICATION HUB */
        /* ========================================== */
        <div key="messages" className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewAndUrl("overview")}
              className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Support Channel
            </div>
          </div>

          <div className="bg-white border border-blue-800 rounded-3xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col h-[600px]">
            <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                    Recruiter & Operations Liaison
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    Direct real-time channel with Valley Reigns recruitment leads
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages Feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-slate-50/30">
              {(() => {
                const conv = conversations[selectedChatId];
                const msgs: ChatMessage[] = conv?.messages || [
                  {
                    id: "init-1",
                    chatId: selectedChatId,
                    sender: "staff",
                    text: `Hello ${companyProfile.displayName}! I am your dedicated recruitment lead from Valley Reigns. We are actively coordinating your vacancy candidate sourcing. Feel free to send us any specifications here.`,
                    timestamp: Date.now() - 3600000
                  }
                ];

                return msgs.map((m: ChatMessage, idx: number) => {
                  const isMe = m.sender === "customer" || m.sender === "guest";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? "bg-[#0084FF] text-white rounded-br-none shadow-sm"
                            : "bg-white border border-slate-200 text-slate-900 rounded-bl-none shadow-2xs"
                        }`}
                      >
                        <p>{m.text}</p>
                        <span className={`text-[9px] font-mono block mt-1.5 ${isMe ? "text-blue-100 text-right" : "text-slate-400"}`}>
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message to your assigned recruitment manager..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ========================================== */
        /* SUBVIEW: COMPANY PROFILE & VERIFICATION */
        /* ========================================== */
        <div key="profile" className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewAndUrl("overview")}
              className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="flex items-center gap-1.5 bg-[#1E88E5] border border-blue-600/40 text-white px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> Corporate Credentials
            </div>
          </div>

          <div className="bg-white border border-blue-800 rounded-3xl shadow-[0_15px_35px_-5px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1E88E5] border border-blue-600/40 rounded-xl flex items-center justify-center text-white">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                  Corporate Profile & Verification Details
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1">
                  Manage registered business credentials and recruiter contact lines
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 sm:p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Company Legal Name</label>
                  <input
                    type="text"
                    value={companyProfile.companyName}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">CAC / RC Registration Number</label>
                  <input
                    type="text"
                    value={companyProfile.rcNumber}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, rcNumber: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Industry / Sector</label>
                  <input
                    type="text"
                    value={companyProfile.companyIndustry}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyIndustry: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Official Website</label>
                  <input
                    type="text"
                    value={companyProfile.companyWebsite}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyWebsite: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Primary Contact Officer</label>
                  <input
                    type="text"
                    value={companyProfile.displayName}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, displayName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800">Contact Phone Number</label>
                  <input
                    type="text"
                    value={companyProfile.companyPhone}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyPhone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-800">Corporate Head Office Address</label>
                  <input
                    type="text"
                    value={companyProfile.companyAddress}
                    onChange={(e) => setCompanyProfile({ ...companyProfile, companyAddress: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-sm active:scale-95 flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Corporate Details</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Job Vacancy Form */}
      <AnimatePresence>
        {showNewJobModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-slate-900">Post Vacancy Opening</h3>
                <button onClick={() => setShowNewJobModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Frontend Engineer"
                    value={newJobData.title}
                    onChange={(e) => setNewJobData({ ...newJobData, title: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Category</label>
                    <select
                      value={newJobData.category}
                      onChange={(e) => setNewJobData({ ...newJobData, category: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="Tech">Tech / Engineering</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Finance">Finance & Accounting</option>
                      <option value="Operations">Operations</option>
                      <option value="Sales">Sales & Marketing</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Employment Type</label>
                    <select
                      value={newJobData.type}
                      onChange={(e) => setNewJobData({ ...newJobData, type: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="Full-time">Full-time</option>
                      <option value="Part-time">Part-time</option>
                      <option value="Contract">Contract</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Salary / Compensation</label>
                    <input
                      type="text"
                      placeholder="e.g. ₦450,000 - ₦700,000 / mo"
                      value={newJobData.salary}
                      onChange={(e) => setNewJobData({ ...newJobData, salary: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Lagos, Hybrid"
                      value={newJobData.location}
                      onChange={(e) => setNewJobData({ ...newJobData, location: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Role Requirements (One per line)</label>
                  <textarea
                    rows={3}
                    placeholder="3+ years React / Node experience&#10;TypeScript fluency&#10;Strong communication skills"
                    value={newJobData.requirements}
                    onChange={(e) => setNewJobData({ ...newJobData, requirements: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowNewJobModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0084FF] hover:bg-[#0070DA] text-white text-xs font-black rounded-xl cursor-pointer"
                  >
                    Publish Opening
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Staffing Ticket Request Form */}
      <AnimatePresence>
        {showRecruitmentModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0084FF] text-white flex items-center justify-center font-bold">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Hire Workers with Recruiter Support</h3>
                    <p className="text-[11px] text-slate-500">Dedicated Valley Reigns recruitment specialists will source candidates</p>
                  </div>
                </div>
                <button onClick={() => setShowRecruitmentModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitRecruitment} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Target Role Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Senior Mobile Engineer (Flutter)"
                    value={recruitmentForm.jobTitle}
                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, jobTitle: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Job Field / Sector</label>
                    <select
                      value={recruitmentForm.jobCategory}
                      onChange={(e) => setRecruitmentForm({ ...recruitmentForm, jobCategory: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="Information Technology">Information Technology</option>
                      <option value="Healthcare & Nursing">Healthcare & Nursing</option>
                      <option value="Banking & Finance">Banking & Finance</option>
                      <option value="Logistics & Operations">Logistics & Operations</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Required Number of Staff</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={recruitmentForm.numberOfWorkers}
                      onChange={(e) => setRecruitmentForm({ ...recruitmentForm, numberOfWorkers: Number(e.target.value) })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Salary Budget / Worker</label>
                    <input
                      type="text"
                      placeholder="e.g. ₦600,000 - ₦900,000"
                      value={recruitmentForm.salaryBudget}
                      onChange={(e) => setRecruitmentForm({ ...recruitmentForm, salaryBudget: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-800">Hiring Urgency</label>
                    <select
                      value={recruitmentForm.urgency}
                      onChange={(e) => setRecruitmentForm({ ...recruitmentForm, urgency: e.target.value as any })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                    >
                      <option value="immediate">Immediate (1-3 Days)</option>
                      <option value="within_1_week">Within 1 Week</option>
                      <option value="within_1_month">Within 1 Month</option>
                      <option value="flexible">Flexible</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Specific Competency Expectations</label>
                  <textarea
                    rows={3}
                    placeholder="Provide specific technical stacks, certifications, or past project experience required..."
                    value={recruitmentForm.requirements}
                    onChange={(e) => setRecruitmentForm({ ...recruitmentForm, requirements: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowRecruitmentModal(false)}
                    className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#0084FF] hover:bg-[#0070DA] text-white text-xs font-black rounded-xl cursor-pointer shadow-sm"
                  >
                    Submit Staffing Request
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Applicant Interview Scheduler & Notes */}
      <AnimatePresence>
        {selectedApplicant && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-black text-slate-900">{selectedApplicant.seekerName}</h3>
                  <p className="text-xs text-slate-500 font-mono">Applied for: {selectedApplicant.jobTitle}</p>
                </div>
                <button onClick={() => setSelectedApplicant(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Interview Date & Time</label>
                  <input
                    type="datetime-local"
                    value={interviewScheduleDate}
                    onChange={(e) => setInterviewScheduleDate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800">Recruiter / Internal Evaluation Notes</label>
                  <textarea
                    rows={4}
                    value={applicantNotesInput}
                    onChange={(e) => setApplicantNotesInput(e.target.value)}
                    placeholder="Enter assessment scores, interview questions, candidate feedback..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedApplicant(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateApplicantStatus(
                      selectedApplicant.id,
                      selectedApplicant.status === "reviewing" ? "shortlisted" : selectedApplicant.status,
                      interviewScheduleDate,
                      applicantNotesInput
                    );
                    setSelectedApplicant(null);
                  }}
                  className="px-5 py-2 bg-[#0084FF] hover:bg-[#0070DA] text-white text-xs font-black rounded-xl"
                >
                  Save Evaluation
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
