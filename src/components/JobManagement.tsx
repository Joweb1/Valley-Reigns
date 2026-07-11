import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getJobs, updateJob, deleteJob } from "../lib/services";
import { Job } from "../types";
import { 
  Briefcase, 
  ArrowLeft, 
  Edit2, 
  Trash2, 
  Plus, 
  X, 
  CheckCircle2, 
  MapPin, 
  Eye, 
  DollarSign, 
  AlertTriangle,
  ChevronDown,
  Check,
  Copy,
  Calendar,
  Flame,
  Banknote
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { JobCardSkeleton } from "./JobCardSkeleton";

interface JobManagementCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
}

export const JobManagementCard: React.FC<JobManagementCardProps> = ({ job, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compile formatted WhatsApp deep link for copying
  const messageText = `I am applying for the ${job.title} position. Reference ID: ${job.id}`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(messageText)}`;

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

  const formattedSalary = job.salary.replace(/\$/g, "₦");

  return (
    <div className="bg-white border border-[#0F5132] rounded-3xl overflow-hidden shadow-none hover:shadow-none transition-all duration-300 text-left">
      {/* Accordion Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
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
            {((job.impressions || 0) > 50) && (
              <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-800">
                <Flame className="w-3.5 h-3.5 fill-amber-500 stroke-amber-600" />
                Popular ({job.impressions} Views)
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

            {/* Edit / Delete Buttons Row - matching the placement of apply button */}
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => onEdit(job)}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-emerald-50 hover:bg-emerald-100 text-[#0F5132] font-sans font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-[#0F5132]/30 transition-all active:translate-y-px"
                title="Edit Job Listing"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDelete(job)}
                className="px-3.5 py-2 sm:px-4 sm:py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-sans font-extrabold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-rose-300/30 transition-all active:translate-y-px"
                title="Delete Job"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
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
              {job.requirements && job.requirements.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-[10px] font-mono font-black tracking-widest text-[#0F5132] uppercase">
                    Candidate Requirements
                  </h4>
                  <ul className="space-y-2">
                    {job.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm font-sans text-black font-semibold">
                        <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#0F5132] flex items-center justify-center flex-shrink-0 mt-0.5 border border-[#0F5132]/30">
                          <Check className="w-3 h-3" />
                        </div>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Engagement Panel */}
              <div className="pt-6 border-t border-[#0F5132]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#0F5132] font-bold">
                  <Calendar className="w-4 h-4 text-[#0F5132]" />
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                  <span className="mx-2">•</span>
                  <span>ID: {job.id}</span>
                  <span className="mx-2">•</span>
                  <span>{job.impressions || 0} views</span>
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
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const JobManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal / Edit state
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Edit form states
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("Tech");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Full-time");
  const [description, setDescription] = useState("");
  const [reqInput, setReqInput] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic categories list
  const [categoriesList, setCategoriesList] = useState<string[]>(["Tech", "Healthcare", "Finance", "AI & Analytics"]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const unique = Array.from(new Set(jobs.map(j => j.category).filter(Boolean)));
        const combined = Array.from(new Set(["Tech", "Healthcare", "Finance", "AI & Analytics", ...unique]));
        setCategoriesList(combined);
      } catch (err) {
        console.warn("Failed to load categories in management", err);
      }
    };
    if (jobs.length > 0) {
      loadCategories();
    }
  }, [jobs]);

  const fetchJobs = async () => {
    try {
      const allJobs = await getJobs();
      if (currentUser?.role === "admin") {
        setJobs(allJobs);
      } else {
        // Staff only see jobs they posted
        setJobs(allJobs.filter(j => j.postedByUid === currentUser?.uid));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchJobs();
    }
  }, [currentUser]);

  const handleOpenEdit = (job: Job) => {
    setEditingJob(job);
    setTitle(job.title);
    setCompany(job.company);
    setCategory(job.category);
    setSalary(job.salary);
    setLocation(job.location);
    setType(job.type);
    setDescription(job.description);
    setRequirements(job.requirements || []);
    setShowCustomCategory(false);
    setCustomCategoryInput("");
  };

  const handleAddRequirement = () => {
    if (reqInput.trim()) {
      setRequirements([...requirements, reqInput.trim()]);
      setReqInput("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, idx) => idx !== index));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingJob || !currentUser) return;

    setIsSaving(true);
    try {
      let finalSalary = salary.trim();
      if (finalSalary && !finalSalary.startsWith("₦") && !finalSalary.includes("₦")) {
        if (finalSalary.startsWith("$")) {
          finalSalary = finalSalary.replace(/^\$/, "₦");
        } else {
          finalSalary = "₦" + finalSalary;
        }
      }

      const finalCategory = showCustomCategory && customCategoryInput.trim()
        ? customCategoryInput.trim()
        : category;

      await updateJob(editingJob.id, {
        title,
        company,
        category: finalCategory,
        salary: finalSalary,
        location,
        type,
        requirements,
        description
      }, currentUser.uid);

      setSuccessMsg("Job listing updated successfully!");
      setEditingJob(null);
      await fetchJobs();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingJob || !currentUser) return;

    try {
      await deleteJob(deletingJob.id, currentUser.uid);
      setSuccessMsg("Job listing deleted successfully!");
      setDeletingJob(null);
      await fetchJobs();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Briefcase className="w-6 h-6 text-emerald-700" />
              Job Openings Management
            </h1>
            <p className="text-xs font-sans text-slate-500 mt-1">
              {currentUser?.role === "admin" 
                ? "Full administrative control over all job listings in the system." 
                : "Manage and edit job listings published by your recruiter account."}
            </p>
          </div>
        </div>

        <div>
          <Link
            to={currentUser?.role === "admin" ? "/admin/post-jobs" : "/staff?tab=post-job"}
            className="px-4 py-2.5 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-sans font-bold flex items-center gap-2 cursor-pointer shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Publish New Job
          </Link>
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-850 rounded-2xl flex items-center gap-3 text-xs font-sans font-semibold border border-emerald-100">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Main List */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6">
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
            <Briefcase className="w-8 h-8" />
          </div>
          <h3 className="text-base font-sans font-bold text-slate-900">No Job Listings</h3>
          <p className="text-xs font-sans text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
            {currentUser?.role === "admin"
              ? "The database doesn't contain any job records."
              : "You haven't posted any jobs under this account yet."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {jobs.map((job) => (
            <JobManagementCard 
              key={job.id} 
              job={job}
              onEdit={handleOpenEdit}
              onDelete={setDeletingJob}
            />
          ))}
        </div>
      )}

      {/* Edit Job Modal */}
      <AnimatePresence>
        {editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingJob(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-100 rounded-[32px] shadow-2xl p-6 sm:p-8 w-full max-w-2xl z-10 max-h-[90vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 shrink-0">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                      Edit Job Listing
                    </h3>
                    <span className="text-[10px] font-mono text-[#0F5132] font-bold uppercase tracking-wider block mt-1">
                      ID: {editingJob.id}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setEditingJob(null)} 
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-5 text-slate-850">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Job Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Job Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
                    />
                  </div>

                  {/* Company */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Hiring Company
                    </label>
                    <input
                      type="text"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Category */}
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Job Category
                    </label>
                    
                    {/* Custom Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                      className="w-full text-[11px] font-sans font-bold px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 flex items-center justify-between transition-all cursor-pointer shadow-sm select-none"
                    >
                      <span className="truncate">
                        {showCustomCategory ? (category ? `Custom: ${category}` : "Enter Custom...") : (category || "Select Category")}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Custom Category Dropdown Overlay */}
                    {isCategoryDropdownOpen && (
                      <>
                        <div 
                          onClick={() => setIsCategoryDropdownOpen(false)}
                          className="fixed inset-0 z-30"
                        />
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-56 overflow-y-auto py-1.5 animate-fadeIn text-left">
                          {categoriesList.map((cat) => {
                            const isSelected = !showCustomCategory && category === cat;
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => {
                                  setShowCustomCategory(false);
                                  setCategory(cat);
                                  setIsCategoryDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 text-[11px] font-sans font-bold transition-all flex items-center justify-between border-b border-slate-50 last:border-b-0 cursor-pointer ${
                                  isSelected 
                                    ? "bg-[#0F5132]/[0.05] text-[#0F5132]" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className="truncate">{cat}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#0F5132]" />}
                              </button>
                            );
                          })}
                          
                          <button
                            type="button"
                            onClick={() => {
                              setShowCustomCategory(true);
                              setCategory("");
                              setIsCategoryDropdownOpen(false);
                            }}
                            className={`w-full text-left px-3.5 py-2 text-[11px] font-sans font-bold transition-all flex items-center justify-between cursor-pointer border-t border-slate-100 text-emerald-700 hover:bg-emerald-50/50 ${
                              showCustomCategory ? "bg-[#0F5132]/[0.05] text-[#0F5132]" : ""
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <Plus className="w-3.5 h-3.5" /> + Add Custom Category...
                            </span>
                            {showCustomCategory && <Check className="w-3.5 h-3.5 text-[#0F5132]" />}
                          </button>
                        </div>
                      </>
                    )}

                    {showCustomCategory && (
                      <div className="space-y-1 mt-2 animate-fadeIn relative z-10 text-left">
                        <label className="text-[9px] font-mono font-bold text-[#0F5132] uppercase tracking-wider block">
                          New Category Name
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Sales, Construction"
                          value={customCategoryInput}
                          onChange={(e) => {
                            setCustomCategoryInput(e.target.value);
                            setCategory(e.target.value);
                          }}
                          className="w-full px-4 py-2 rounded-xl border border-emerald-300 text-xs font-sans font-medium focus:border-[#0F5132] focus:outline-none bg-emerald-50/10"
                        />
                      </div>
                    )}
                  </div>

                  {/* Type */}
                  <div className="space-y-1 relative">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Contract Type
                    </label>
                    
                    {/* Custom Dropdown Trigger Button */}
                    <button
                      type="button"
                      onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                      className="w-full text-[11px] font-sans font-bold px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 flex items-center justify-between transition-all cursor-pointer shadow-sm select-none"
                    >
                      <span className="truncate">{type || "Select Type"}</span>
                      <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ml-1 ${isTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </button>

                    {/* Custom Type Dropdown Overlay */}
                    {isTypeDropdownOpen && (
                      <>
                        <div 
                          onClick={() => setIsTypeDropdownOpen(false)}
                          className="fixed inset-0 z-30"
                        />
                        <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 py-1.5 animate-fadeIn text-left">
                          {["Full-time", "Contract"].map((opt) => {
                            const isSelected = type === opt;
                            return (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => {
                                  setType(opt);
                                  setIsTypeDropdownOpen(false);
                                }}
                                className={`w-full text-left px-3.5 py-2 text-[11px] font-sans font-bold transition-all flex items-center justify-between border-b border-slate-50 last:border-b-0 cursor-pointer ${
                                  isSelected 
                                    ? "bg-[#0F5132]/[0.05] text-[#0F5132]" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className="truncate">{opt}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#0F5132]" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                      Location
                    </label>
                    <input
                      type="text"
                      required
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Salary */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Salary Range (₦)
                  </label>
                  <input
                    type="text"
                    required
                    value={salary}
                    onChange={(e) => setSalary(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Job Scope Description
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none resize-none"
                  />
                </div>

                {/* Dynamic Requirements */}
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                    Candidate Requirements (List)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add key requirement bullet..."
                      value={reqInput}
                      onChange={(e) => setReqInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddRequirement())}
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-sans font-medium focus:border-[#0F5132] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddRequirement}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add
                    </button>
                  </div>

                  <ul className="space-y-1.5 pt-1.5 max-h-36 overflow-y-auto">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="flex items-center justify-between gap-3 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs font-sans text-slate-600">
                        <span className="truncate">{req}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveRequirement(idx)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setEditingJob(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold cursor-pointer transition-all text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 py-3 bg-emerald-900 hover:bg-emerald-950 text-white rounded-xl text-xs font-sans font-extrabold cursor-pointer transition-all shadow-md"
                  >
                    {isSaving ? "Saving changes..." : "Save Modifications"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingJob(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-100 rounded-[28px] shadow-2xl p-6 w-full max-w-md z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-sans font-bold text-slate-900 leading-tight">
                  Remove Job Listing?
                </h3>
                <p className="text-xs font-sans text-slate-500 leading-relaxed mt-2">
                  Are you sure you want to delete the opening for <strong className="text-slate-800">"{deletingJob.title}"</strong> at <strong className="text-slate-800">{deletingJob.company}</strong>? This listing will be immediately deleted from the search board.
                </p>
                <p className="text-[10px] font-sans font-semibold text-rose-600 mt-2">
                  ⚠️ This action is irreversible.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingJob(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors"
                >
                  No, Keep it
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors shadow-sm"
                >
                  Yes, Delete Listing
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
