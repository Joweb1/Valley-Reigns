import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWhatsAppConfig } from "../hooks/useWhatsAppConfig";
import { getJobs, updateJob, deleteJob, getAllUserProfiles, subscribeToJobs, toggleJobAvailability, batchSetJobAvailability } from "../lib/services";
import { Job, UserProfile } from "../types";
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
  EyeOff,
  Ban,
  DollarSign, 
  AlertTriangle,
  ChevronDown,
  Check,
  Copy,
  Calendar,
  Flame,
  Banknote,
  Search,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { JobCardSkeleton } from "./JobCardSkeleton";

interface JobManagementCardProps {
  job: Job;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onToggleAvailability?: (job: Job) => void;
  postedByProfile?: UserProfile;
  isSelected?: boolean;
  onToggleSelect?: (jobId: string) => void;
}

export const JobManagementCard: React.FC<JobManagementCardProps> = ({ 
  job, 
  onEdit, 
  onDelete, 
  onToggleAvailability,
  postedByProfile,
  isSelected,
  onToggleSelect
}) => {
  const { currentUser } = useAuth();
  const { getWhatsAppLink } = useWhatsAppConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compile formatted WhatsApp deep link for copying with connected phone number
  const messageText = `I am applying for the ${job.title} position. Reference ID: ${job.id}`;
  const whatsappLink = getWhatsAppLink(messageText);

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
    <div className={`bg-white border rounded-2xl overflow-hidden shadow-[0_2px_8px_rgba(11,60,45,0.03)] hover:shadow-[0_4px_12px_rgba(11,60,45,0.05)] transition-all duration-300 text-left relative ${
      job.isUnavailable 
        ? "border-rose-300 bg-rose-50/20" 
        : isSelected 
          ? "border-blue-600 ring-2 ring-blue-100 shadow-md" 
          : "border-black"
    } ${isOpen ? "ring-1 ring-[#111827]" : ""}`}>
      {/* Accordion Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full text-left p-4 sm:p-5 focus:outline-none cursor-pointer z-10 flex items-start gap-3"
      >
        {/* Selection Checkbox */}
        {onToggleSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(job.id);
            }}
            className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors cursor-pointer shrink-0 border-0 bg-transparent p-0"
            title={isSelected ? "Deselect Job Listing" : "Select Job Listing"}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-slate-300 hover:text-slate-500" />
            )}
          </button>
        )}

        <div className="space-y-1.5 w-full pr-48 sm:pr-56 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base sm:text-lg font-sans font-black text-[#111827] tracking-tight leading-snug">
              {job.title}
            </h3>
            {job.isUnavailable ? (
              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 font-sans font-black rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0">
                <EyeOff className="w-2.5 h-2.5 text-rose-600" />
                Unavailable
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-sans font-black rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1 shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Available
              </span>
            )}
          </div>

          <div className="flex flex-wrap sm:flex-row sm:items-center gap-2 text-[11px] sm:text-xs font-sans font-bold text-blue-800 w-full pt-0.5">
            <span className="flex items-center gap-1 text-blue-800 min-w-0">
              <MapPin className="w-3.5 h-3.5 text-[#111827] shrink-0" />
              <span className="truncate">{job.location}</span>
            </span>
          </div>
        </div>

        {/* Toggle Availability, Edit and Dropdown Action Buttons Side-by-Side */}
        <div className="absolute right-4 top-4 sm:right-5 sm:top-5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {/* Availability Toggle Icon Button */}
          {onToggleAvailability && (
            <button
              type="button"
              onClick={() => onToggleAvailability(job)}
              className={`px-2.5 py-1.5 font-sans font-black text-[10px] sm:text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs border hover:-translate-y-0.5 ${
                job.isUnavailable 
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700" 
                  : "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600"
              }`}
              title={job.isUnavailable ? "Mark Job as Available" : "Mark Job as Unavailable"}
            >
              {job.isUnavailable ? (
                <>
                  <Eye className="w-3 h-3 text-white shrink-0" />
                  <span className="hidden xs:inline">Make Available</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3 h-3 text-slate-950 shrink-0" />
                  <span className="hidden xs:inline">Make Unavailable</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={() => onEdit(job)}
            className="px-2.5 py-1.5 bg-[#111827] hover:bg-[#1f2937] text-white font-sans font-black text-[10px] sm:text-xs rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-sm hover:-translate-y-0.5"
            title="Edit Job Listing"
          >
            <Edit2 className="w-3 h-3 text-white" />
            <span className="hidden xs:inline">Edit</span>
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`w-8 h-8 rounded-full bg-slate-900/10 hover:bg-slate-900/20 border border-slate-800/10 flex items-center justify-center text-[#111827] transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
            title={isOpen ? "Collapse Details" : "Expand Details"}
          >
            <ChevronDown className="w-4.5 h-4.5" />
          </button>
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
            className="border-t border-blue-200 bg-white/40"
          >
            <div className="p-4 sm:p-5 space-y-4 relative z-10">
              {/* Job Metadata Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pb-3 border-b border-blue-200">
                {job.isUnavailable ? (
                  <span className="px-2.5 py-0.5 bg-rose-100 border border-rose-300 text-rose-900 font-sans font-black rounded-full text-[9px] flex items-center gap-1">
                    <EyeOff className="w-3 h-3 text-rose-700" />
                    Hidden from Job Seekers (Unavailable)
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-900 font-sans font-black rounded-full text-[9px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                    Visible to Job Seekers (Available)
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-[#111827] text-white rounded-full text-[9px] font-sans font-extrabold tracking-wide shadow-sm">
                  {job.category}
                </span>
                <span className="px-2.5 py-0.5 bg-blue-100 border border-blue-200 text-blue-800 font-sans font-extrabold rounded-full text-[9px]">
                  {job.type}
                </span>
                {((job.impressions || 0) > 50) && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Flame className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                    Popular ({job.impressions} Views)
                  </span>
                )}
                <span className="px-2.5 py-0.5 bg-blue-100/50 text-blue-800 border border-blue-200 rounded-full text-[9px] font-sans font-semibold">
                  Posted by: {postedByProfile?.displayName || postedByProfile?.email || (job.postedByUid === "admin-seed" || job.postedByUid === "admin-demo" ? "Admin" : "Unknown Staff")}
                </span>
              </div>

              {/* Organization & Remuneration Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/80 p-4 rounded-xl border border-blue-200">
                <div className="space-y-1">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-blue-800 uppercase">
                    Hiring Organization
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#111827] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-xs">
                      {job.company}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-blue-800 uppercase">
                    Salary & Compensation
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#111827] bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 text-xs flex items-center gap-1.5">
                      <Banknote className="w-3.5 h-3.5 text-blue-700" />
                      {formattedSalary}
                    </span>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div className="space-y-2 text-left">
                <h4 className="text-[9px] font-mono font-black tracking-widest text-[#111827] uppercase">
                  Job Description & Scope
                </h4>
                <p className="text-xs font-sans text-slate-900 font-semibold leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Requirements Bullet Points */}
              {job.requirements && job.requirements.length > 0 && (
                <div className="space-y-3 text-left">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-[#111827] uppercase">
                    Candidate Requirements
                  </h4>
                  <ul className="space-y-1.5">
                    {job.requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs font-sans text-slate-900 font-semibold">
                        <div className="w-4.5 h-4.5 rounded-full bg-white text-[#111827] flex items-center justify-center flex-shrink-0 mt-0.5 border border-blue-200">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Engagement Panel */}
              <div className="pt-4 border-t border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-blue-800 font-bold">
                  <Calendar className="w-3.5 h-3.5 text-blue-700" />
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                  <span className="mx-1.5">•</span>
                  <span>ID: {job.id}</span>
                  <span className="mx-1.5">•</span>
                  <span>{job.impressions || 0} views</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Availability Toggle Button inside accordion footer */}
                  {onToggleAvailability && (
                    <button
                      type="button"
                      onClick={() => onToggleAvailability(job)}
                      className={`px-4 py-2 font-sans font-extrabold text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border shadow-2xs hover:-translate-y-0.5 ${
                        job.isUnavailable
                          ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300"
                          : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                      }`}
                      title={job.isUnavailable ? "Mark Job as Available" : "Mark Job as Unavailable"}
                    >
                      {job.isUnavailable ? (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Mark Available</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-amber-700" />
                          <span>Mark Unavailable</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Delete Button inside the dropdown */}
                  <button
                    onClick={() => onDelete(job)}
                    className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-sans font-extrabold text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all border border-rose-200 hover:-translate-y-0.5"
                    title="Delete Job"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete</span>
                  </button>

                  {/* Copy Link Button */}
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-white border border-blue-800 text-[#111827] rounded-xl text-[10px] font-sans font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:bg-blue-50"
                    title="Copy WhatsApp Application Link"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0 text-[#111827]" />
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

interface JobManagementProps {
  onBack?: () => void;
  onPostJob?: () => void;
}

export const JobManagement: React.FC<JobManagementProps> = ({ onBack, onPostJob }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Edit state
  const [deletingJob, setDeletingJob] = useState<Job | null>(null);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  // Selection & Batch Delete States
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState<boolean>(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState<boolean>(false);

  const handleToggleSelectJob = (jobId: string) => {
    setSelectedJobIds(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const handleToggleSingleJobAvailability = async (job: Job) => {
    if (!currentUser) return;
    const nextState = !job.isUnavailable;
    try {
      await toggleJobAvailability(job.id, nextState, currentUser.uid);
      setSuccessMsg(`Job "${job.title}" is now marked as ${nextState ? "unavailable" : "available"}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed to toggle availability:", err);
      alert("Failed to update job availability status.");
    }
  };

  const handleBatchSetAvailability = async (isUnavailable: boolean) => {
    if (selectedJobIds.length === 0 || !currentUser) return;
    try {
      await batchSetJobAvailability(selectedJobIds, isUnavailable, currentUser.uid);
      setSuccessMsg(`Successfully marked ${selectedJobIds.length} job listing(s) as ${isUnavailable ? "unavailable" : "available"}!`);
      setSelectedJobIds([]);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed batch set availability:", err);
      alert("An error occurred while updating job availability.");
    }
  };

  const handleSelectAllJobs = (filteredJobsList: Job[]) => {
    const filteredIds = filteredJobsList.map(j => j.id);
    const isAllSelected = filteredIds.length > 0 && filteredIds.every(id => selectedJobIds.includes(id));
    if (isAllSelected) {
      setSelectedJobIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedJobIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleConfirmBatchDelete = async () => {
    if (selectedJobIds.length === 0 || !currentUser) return;
    setIsBatchDeleting(true);
    try {
      for (const id of selectedJobIds) {
        await deleteJob(id, currentUser.uid);
      }
      setSuccessMsg(`Successfully deleted ${selectedJobIds.length} job listing(s)!`);
      setSelectedJobIds([]);
      setShowBatchDeleteModal(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error("Failed batch delete:", err);
      alert("An error occurred while deleting selected job listings.");
    } finally {
      setIsBatchDeleting(false);
    }
  };

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

  useEffect(() => {
    if (!currentUser) return;
    
    setLoading(true);

    // Fetch user profiles once for admin user mapping
    if (currentUser.role === "admin") {
      getAllUserProfiles().then(profiles => {
        const pMap: Record<string, UserProfile> = {};
        profiles.forEach(p => {
          pMap[p.uid] = p;
        });
        setUsersMap(pMap);
      }).catch(err => {
        console.warn("Failed to fetch user profiles for mapping:", err);
      });
    } else {
      // Map current user profile for staff or other roles to show correct "Posted by" info
      setUsersMap({ [currentUser.uid]: currentUser });
    }

    const unsubscribe = subscribeToJobs((allJobs) => {
      if (currentUser.role === "admin") {
        setJobs(allJobs);
      } else {
        setJobs(allJobs.filter(j => j.postedByUid === currentUser.uid));
      }
      setLoading(false);
    });

    return () => unsubscribe();
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
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-24 space-y-6"
    >
      {/* Header section */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack || (() => navigate(-1))}
            className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
          <div className="flex items-center gap-1.5 bg-[#111827] border border-slate-800 text-blue-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5" /> Job Openings Management
          </div>
        </div>

        <div className="w-full">
          {onPostJob ? (
            <button
              onClick={onPostJob}
              className="w-full px-4 py-3.5 border border-blue-800 rounded-2xl bg-blue-50/10 hover:bg-blue-50/35 text-[#111827] text-xs font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_35px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 group"
            >
              <span className="bg-[#111827] text-blue-200 p-1.5 rounded-xl transition-transform group-hover:scale-110">
                <Plus className="w-4 h-4" />
              </span>
              <span>Publish New Job</span>
            </button>
          ) : (
            <Link
              to={currentUser?.role === "admin" ? "/admin/post-jobs" : "/staff?tab=post-job"}
              className="w-full px-4 py-3.5 border border-blue-800 rounded-2xl bg-blue-50/10 hover:bg-blue-50/35 text-[#111827] text-xs font-extrabold transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_15px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_35px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 group"
            >
              <span className="bg-[#111827] text-blue-200 p-1.5 rounded-xl transition-transform group-hover:scale-110">
                <Plus className="w-4 h-4" />
              </span>
              <span>Publish New Job</span>
            </Link>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-blue-50 text-blue-900 rounded-2xl flex items-center gap-3 text-xs font-sans font-semibold border border-blue-100">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Filter search queries */}
      {(() => {
        const filteredJobs = jobs.filter((job) => {
          if (!searchQuery.trim()) return true;
          const query = searchQuery.toLowerCase();
          
          const titleMatch = job.title?.toLowerCase().includes(query) || false;
          const locationMatch = job.location?.toLowerCase().includes(query) || false;
          
          const profile = job.postedByUid ? usersMap[job.postedByUid] : undefined;
          const displayName = profile?.displayName?.toLowerCase() || "";
          const email = profile?.email?.toLowerCase() || "";
          const isSpecialAdmin = job.postedByUid === "admin-seed" || job.postedByUid === "admin-demo";
          const postedByName = isSpecialAdmin ? "admin" : (profile ? `${displayName} ${email}` : "unknown staff");
          
          const postedByMatch = postedByName.toLowerCase().includes(query);
          
          return titleMatch || locationMatch || postedByMatch;
        });

        return (
          <>
            {/* Search Bar & Batch Selection Toolbar */}
            {jobs.length > 0 && (
              <div className="mb-6 space-y-3">
                <div className="relative flex items-center">
                  <Search className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search job listings by title, location, staff..."
                    className="w-full pl-11 pr-10 py-3 bg-slate-100/80 border border-slate-200 hover:border-slate-300 focus:border-[#1E88E5] focus:ring-1 focus:ring-[#1E88E5]/20 text-slate-800 placeholder-gray-400 rounded-xl text-sm font-normal transition-all shadow-none outline-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Batch Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => handleSelectAllJobs(filteredJobs)}
                    className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-700 transition-colors cursor-pointer border-0 bg-transparent"
                  >
                    {filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.includes(j.id)) ? (
                      <CheckSquare className="w-4.5 h-4.5 text-blue-600" />
                    ) : (
                      <Square className="w-4.5 h-4.5 text-slate-400" />
                    )}
                    <span>
                      {filteredJobs.length > 0 && filteredJobs.every(j => selectedJobIds.includes(j.id))
                        ? "Deselect All"
                        : `Select All (${filteredJobs.length})`}
                    </span>
                  </button>

                  {selectedJobIds.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100/80 px-2.5 py-1 rounded-lg">
                        {selectedJobIds.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBatchSetAvailability(true)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-amber-600 hover:scale-[1.02] active:scale-95"
                        title="Mark Selected Jobs as Unavailable"
                      >
                        <EyeOff className="w-3.5 h-3.5 text-slate-950" />
                        <span>Make Unavailable</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleBatchSetAvailability(false)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border border-emerald-700 hover:scale-[1.02] active:scale-95"
                        title="Mark Selected Jobs as Available"
                      >
                        <Eye className="w-3.5 h-3.5 text-white" />
                        <span>Make Available</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowBatchDeleteModal(true)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0 hover:scale-[1.02] active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Batch Delete ({selectedJobIds.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedJobIds([])}
                        className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-bold hover:bg-slate-200/60 rounded-xl transition-all cursor-pointer border-0 bg-transparent"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
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
            ) : filteredJobs.length === 0 ? (
              <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center shadow-sm">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
                  <Search className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-base font-sans font-bold text-slate-900">No Matches Found</h3>
                <p className="text-xs font-sans text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                  We couldn't find any job listings matching &ldquo;{searchQuery}&rdquo;. Try checking the spelling or searching for another term.
                </p>
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-4 px-4 py-2 bg-[#111827] text-white hover:bg-[#1f2937] rounded-xl text-xs font-sans font-bold transition-all shadow-sm cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredJobs.map((job) => (
                  <JobManagementCard 
                    key={job.id} 
                    job={job}
                    onEdit={handleOpenEdit}
                    onDelete={setDeletingJob}
                    onToggleAvailability={handleToggleSingleJobAvailability}
                    postedByProfile={job.postedByUid ? usersMap[job.postedByUid] : undefined}
                    isSelected={selectedJobIds.includes(job.id)}
                    onToggleSelect={handleToggleSelectJob}
                  />
                ))}
              </div>
            )}
          </>
        );
      })()}

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
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-800 shrink-0">
                    <Edit2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-sans font-extrabold text-slate-900 tracking-tight leading-none">
                      Edit Job Listing
                    </h3>
                    <span className="text-[10px] font-mono text-[#111827] font-bold uppercase tracking-wider block mt-1">
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
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#111827] focus:outline-none"
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
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#111827] focus:outline-none"
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
                                    ? "bg-[#111827]/[0.05] text-[#111827]" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className="truncate">{cat}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#111827]" />}
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
                            className={`w-full text-left px-3.5 py-2 text-[11px] font-sans font-bold transition-all flex items-center justify-between cursor-pointer border-t border-slate-100 text-blue-700 hover:bg-blue-50/50 ${
                              showCustomCategory ? "bg-[#111827]/[0.05] text-[#111827]" : ""
                            }`}
                          >
                            <span className="truncate flex items-center gap-1.5">
                              <Plus className="w-3.5 h-3.5" /> + Add Custom Category...
                            </span>
                            {showCustomCategory && <Check className="w-3.5 h-3.5 text-[#111827]" />}
                          </button>
                        </div>
                      </>
                    )}

                    {showCustomCategory && (
                      <div className="space-y-1 mt-2 animate-fadeIn relative z-10 text-left">
                        <label className="text-[9px] font-mono font-bold text-[#111827] uppercase tracking-wider block">
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
                          className="w-full px-4 py-2 rounded-xl border border-blue-300 text-xs font-sans font-medium focus:border-[#111827] focus:outline-none bg-blue-50/10"
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
                                    ? "bg-[#111827]/[0.05] text-[#111827]" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                }`}
                              >
                                <span className="truncate">{opt}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#111827]" />}
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
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#111827] focus:outline-none"
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
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
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
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none resize-none"
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
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
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
                    className="flex-1 py-3 bg-slate-900 hover:bg-slate-900 text-white rounded-xl text-xs font-sans font-extrabold cursor-pointer transition-all shadow-md"
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

      {/* Batch Delete Confirmation Modal */}
      <AnimatePresence>
        {showBatchDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isBatchDeleting && setShowBatchDeleteModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-white border border-slate-100 rounded-[28px] shadow-2xl p-6 w-full max-w-md z-10 text-center space-y-4"
            >
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-center text-rose-600 mx-auto">
                <Trash2 className="w-6 h-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-sans font-extrabold text-slate-900 leading-tight">
                  Batch Delete {selectedJobIds.length} Job Listing(s)?
                </h3>
                <p className="text-xs font-sans text-slate-600 leading-relaxed mt-2">
                  You are about to permanently remove <strong className="text-slate-900">{selectedJobIds.length} selected job openings</strong>. They will be immediately removed from the active search board.
                </p>
                <p className="text-[10px] font-sans font-bold text-rose-600 mt-2">
                  ⚠️ This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={() => setShowBatchDeleteModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isBatchDeleting}
                  onClick={handleConfirmBatchDelete}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-sans font-extrabold cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {isBatchDeleting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete ({selectedJobIds.length})</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
