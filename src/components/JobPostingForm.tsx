import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { addJob, getJobs } from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { Lock, FilePlus2, Plus, Trash2, CheckCircle2, Banknote, ChevronDown, Briefcase, Sparkles, Check, ArrowLeft } from "lucide-react";
import { Job } from "../types";

const SPREAD_PARTICLES = Array.from({ length: 24 }).map((_, i) => ({
  id: i,
  x: (Math.random() - 0.5) * 450,
  y: (Math.random() - 0.5) * 450,
  size: Math.random() * 12 + 6,
  color: ["#F43F5E", "#EC4899", "#A855F7", "#06B6D4", "#10B981", "#F59E0B"][i % 6],
  delay: Math.random() * 0.2,
  duration: Math.random() * 1.5 + 1.2,
}));

const DRIP_COLUMNS = [
  { left: "10%", delay: 0.1, height: "120px", color: "#EC4899" },
  { left: "22%", delay: 0.3, height: "180px", color: "#06B6D4" },
  { left: "78%", delay: 0.2, height: "150px", color: "#F59E0B" },
  { left: "90%", delay: 0.4, height: "220px", color: "#10B981" },
];

interface JobPostingFormProps {
  onJobAdded?: (job: Job) => void;
  hideHeader?: boolean;
}

export const JobPostingForm: React.FC<JobPostingFormProps> = ({ onJobAdded, hideHeader }) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // State for form
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("Tech");
  const [salary, setSalary] = useState("");
  const [location, setLocation] = useState("");
  const [type, setType] = useState("Full-time");
  const [description, setDescription] = useState("");
  const [reqInput, setReqInput] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Custom posting overlay states
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [overlayStatus, setOverlayStatus] = useState<"loading" | "success">("loading");
  const [postedJob, setPostedJob] = useState<Job | null>(null);

  // Dynamic categories list
  const [categoriesList, setCategoriesList] = useState<string[]>(["Tech", "Healthcare", "Finance", "AI & Analytics"]);
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState("");
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const allJobs = await getJobs();
        const unique = Array.from(new Set(allJobs.map(j => j.category).filter(Boolean)));
        const combined = Array.from(new Set(["Tech", "Healthcare", "Finance", "AI & Analytics", ...unique]));
        setCategoriesList(combined);
      } catch (err) {
        console.warn("Failed to load dynamic categories in form", err);
      }
    };
    loadCategories();
  }, []);

  // Check Firestore User profile flag 'canPostJobs'
  const isAuthorized = currentUser?.canPostJobs === true;

  const handleAddRequirement = () => {
    if (reqInput.trim()) {
      setRequirements([...requirements, reqInput.trim()]);
      setReqInput("");
    }
  };

  const handleRemoveRequirement = (index: number) => {
    setRequirements(requirements.filter((_, idx) => idx !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;

    setIsSubmitting(true);
    setIsOverlayVisible(true);
    setOverlayStatus("loading");

    const finalRequirements = requirements.length > 0 ? requirements : ["Competitive salary package", "Dynamic engineering environment"];
    
    // Ensure if they type $ it is cleaned up or kept, but prefix with Naira if not present
    let finalSalary = salary.trim();
    if (finalSalary && !finalSalary.startsWith("₦") && !finalSalary.includes("₦")) {
      // If it starts with $, replace it, or prepend with Naira symbol
      if (finalSalary.startsWith("$")) {
        finalSalary = finalSalary.replace(/^\$/, "₦");
      } else {
        finalSalary = "₦" + finalSalary;
      }
    }

    try {
      const finalCategory = showCustomCategory && customCategoryInput.trim() 
        ? customCategoryInput.trim() 
        : category;

      const newJob = await addJob({
        title,
        company,
        category: finalCategory,
        salary: finalSalary,
        location,
        type,
        requirements: finalRequirements,
        description,
        postedByUid: currentUser?.uid
      });

      // Save job and switch overlay to success animation
      setPostedJob(newJob);
      setOverlayStatus("success");

      // Add to local categories list to avoid extra fetch
      if (showCustomCategory && customCategoryInput.trim() && !categoriesList.includes(customCategoryInput.trim())) {
        setCategoriesList([...categoriesList, customCategoryInput.trim()]);
      }

      // Reset Form
      setTitle("");
      setCompany("");
      setCategory("Tech");
      setSalary("");
      setLocation("");
      setType("Full-time");
      setDescription("");
      setRequirements([]);
      setCustomCategoryInput("");
      setShowCustomCategory(false);

    } catch (error) {
      console.error("Failed to post job:", error);
      setIsOverlayVisible(false);
      setIsSubmitting(false);
    }
  };

  const handleContinueToManagement = () => {
    setIsOverlayVisible(false);
    setIsSubmitting(false);

    if (postedJob) {
      if (onJobAdded) {
        onJobAdded(postedJob);
        setPostedJob(null);
        return;
      }
      setPostedJob(null);
    }

    // Redirect based on role
    if (currentUser?.role === "admin") {
      navigate("/admin/manage-jobs");
    } else {
      navigate("/staff/manage-jobs");
    }
  };

  if (!isAuthorized) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400 mb-4">
          <Lock className="w-5 h-5" />
        </div>
        <h4 className="text-base font-sans font-bold text-slate-900 mb-1">
          Job Posting Privileges Revoked
        </h4>
        <p className="text-xs font-sans text-slate-500 mb-4 leading-relaxed">
          Your staff account profile currently has the <code className="px-1.5 py-0.5 bg-slate-200 rounded text-red-600 font-mono text-[10px]">canPostJobs</code> flag set to <span className="font-semibold text-red-600">false</span> in Firestore. Contact an administrator to toggle your publication rights.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header section with back button and page tag */}
      {!hideHeader && (
        <div className="flex flex-col gap-4 mb-2">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => navigate(-1)}
              className="px-4 py-2 border border-emerald-800 rounded-xl bg-white hover:bg-emerald-50/20 text-[#0B3C2D] hover:text-[#06241B] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </button>
            <div className="flex items-center gap-1.5 bg-[#0B3C2D] border border-emerald-900 text-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
              <FilePlus2 className="w-3.5 h-3.5" /> Job Creation Form
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-emerald-800 rounded-3xl p-6 sm:p-8 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.04)] relative overflow-hidden">
      {/* Vector pattern background overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0">
        <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="95%" cy="5%" r="40" stroke="#0B3C2D" strokeWidth="1" />
          <path d="M-20,100 C40,70 100,120 180,80" stroke="#0B3C2D" strokeWidth="1" />
        </svg>
      </div>

      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-[#0B3C2D] border border-emerald-800/20">
          <FilePlus2 className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-sans font-extrabold text-slate-900 tracking-tight leading-none">
            Post New Job Opening
          </h3>
          <span className="text-[10px] font-mono text-[#0B3C2D] font-bold uppercase tracking-wider block mt-1">
            Firestore-Linked Form
          </span>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-emerald-50 text-[#0B3C2D] rounded-2xl flex items-center gap-3 text-sm font-sans font-semibold border border-emerald-100 relative z-10">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          Job listed successfully! It is now instantly visible on the public seeker board.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 text-slate-800 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Job Title */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
              Job Title
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Backend Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0B3C2D] focus:outline-none"
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
              placeholder="e.g. Valley Reigns Ltd"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0B3C2D] focus:outline-none"
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
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-56 overflow-y-auto py-1.5 animate-fadeIn">
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
                            ? "bg-emerald-50 text-[#0B3C2D]" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0B3C2D]" />}
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
                      showCustomCategory ? "bg-emerald-50 text-[#0B3C2D]" : ""
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> + Add Custom Category...
                    </span>
                    {showCustomCategory && <Check className="w-3.5 h-3.5 text-[#0B3C2D]" />}
                  </button>
                </div>
              </>
            )}

            {showCustomCategory && (
              <div className="space-y-1 mt-2 animate-fadeIn relative z-10">
                <label className="text-[9px] font-mono font-bold text-[#0B3C2D] uppercase tracking-wider block">
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
                  className="w-full px-4 py-2 rounded-xl border border-emerald-300 text-xs font-sans font-medium focus:border-[#0B3C2D] focus:outline-none bg-emerald-50/10"
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
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 py-1.5 animate-fadeIn">
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
                            ? "bg-emerald-50 text-[#0B3C2D]" 
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#0B3C2D]" />}
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
              placeholder="e.g. Lagos (Remote) / Abuja"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0B3C2D] focus:outline-none"
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
            placeholder="e.g. ₦450,000 - ₦600,000 / month"
            value={salary}
            onChange={(e) => setSalary(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0B3C2D] focus:outline-none"
          />
        </div>

        {/* Description */}
        <div className="space-y-1">
          <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
            Job Scope Description
          </label>
          <textarea
            required
            rows={3}
            placeholder="Summarize the core day-to-day responsibilities..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0B3C2D] focus:outline-none resize-none"
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
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-sans font-medium focus:border-[#0B3C2D] focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddRequirement}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-sans font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          <ul className="space-y-1.5 pt-1.5">
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

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#0B3C2D] hover:bg-[#06241B] text-white rounded-xl text-sm font-sans font-extrabold shadow-md shadow-emerald-950/15 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center"
        >
          {isSubmitting ? "Listing Job Openings..." : "Publish Job to Platform"}
        </button>
      </form>

      {/* Premium Loading and Graffiti Success Overlays */}
      <AnimatePresence>
        {isOverlayVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center select-none"
          >
            {overlayStatus === "loading" ? (
              // Glassmorphism Loading Overlay
              <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center">
                <div className="relative flex items-center justify-center mb-6">
                  {/* Outer pulsing ring */}
                  <div className="absolute w-20 h-20 rounded-full border-2 border-emerald-500/20 animate-ping" />
                  {/* Spinning active ring */}
                  <div className="w-14 h-14 rounded-full border-4 border-emerald-100 border-t-[#0B3C2D] animate-spin" />
                </div>
                
                <motion.h4
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-base font-sans font-black text-slate-900 tracking-tight"
                >
                  Forging Career Pipeline...
                </motion.h4>
                <motion.p
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-xs font-mono text-[#0B3C2D] uppercase tracking-wider mt-1.5"
                >
                  Publishing job details to the platform feed
                </motion.p>
              </div>
            ) : (
              // Highly Animated Graffiti Street Art Success Overlay
              <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
                {/* Pulsing Neon Glows */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/25 rounded-full filter blur-[100px] animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/25 rounded-full filter blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
                <div className="absolute top-1/3 right-10 w-64 h-64 bg-cyan-500/20 rounded-full filter blur-[80px] animate-pulse" style={{ animationDelay: "0.5s" }} />
                
                {/* Dripping Paint Columns on sides */}
                {DRIP_COLUMNS.map((d, i) => (
                  <motion.div
                    key={i}
                    className="absolute top-0 w-3 rounded-b-full opacity-60 filter blur-[1px] hidden sm:block"
                    style={{
                      left: d.left,
                      height: d.height,
                      backgroundColor: d.color,
                      boxShadow: `0 0 15px ${d.color}`,
                    }}
                    initial={{ y: -250 }}
                    animate={{ y: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 70,
                      damping: 12,
                      delay: d.delay,
                    }}
                  />
                ))}

                {/* Spray Painting Nozzle animation */}
                <motion.div
                  className="absolute text-pink-500 z-10"
                  initial={{ x: -150, y: -150 }}
                  animate={{ 
                    x: [0, 100, -100, 0], 
                    y: [60, -60, 60, 0],
                    rotate: [0, 20, -20, 0]
                  }}
                  transition={{
                    duration: 2.2,
                    ease: "easeInOut",
                  }}
                >
                  <div className="relative">
                    {/* Spray can body */}
                    <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border-2 border-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
                      <div className="w-3.5 h-3.5 bg-pink-500 rounded-full animate-ping" />
                    </div>
                    {/* Spray mist cone */}
                    <motion.div 
                      className="absolute right-full top-1/2 -translate-y-1/2 w-20 h-16 bg-gradient-to-r from-transparent via-pink-500/10 to-pink-500/30 origin-right"
                      animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
                      transition={{ repeat: Infinity, duration: 0.25 }}
                      style={{ clipPath: "polygon(0 15%, 100% 40%, 100% 60%, 0 85%)" }}
                    />
                  </div>
                </motion.div>

                {/* Paint splatters/burst particles */}
                {SPREAD_PARTICLES.map((p) => (
                  <motion.div
                    key={p.id}
                    className="absolute rounded-full"
                    style={{
                      backgroundColor: p.color,
                      width: p.size,
                      height: p.size,
                      top: "50%",
                      left: "50%",
                      boxShadow: `0 0 12px ${p.color}`,
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{ 
                      x: p.x, 
                      y: p.y, 
                      scale: [0, 1.4, 0.9, 0], 
                      opacity: [1, 1, 0.7, 0] 
                    }}
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      ease: "easeOut",
                    }}
                  />
                ))}

                {/* Center Graffiti Tag */}
                <motion.div
                  initial={{ scale: 0.2, rotate: -30, opacity: 0 }}
                  animate={{ scale: 1, rotate: -3, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 140, damping: 9, delay: 0.15 }}
                  className="relative z-10 flex flex-col items-center"
                >
                  <div className="absolute inset-0 bg-pink-500/30 filter blur-3xl rounded-full scale-125 animate-pulse" />
                  
                  <h2 className="text-6xl sm:text-8xl font-black tracking-tighter uppercase select-none text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 drop-shadow-[0_6px_12px_rgba(236,72,153,0.4)] text-center px-4 font-sans italic">
                    PUBLISHED!
                  </h2>
                  
                  <p className="text-xs font-mono text-lime-400 tracking-widest uppercase mt-4 bg-slate-950/80 px-4 py-2 border border-lime-500/30 rounded-xl shadow-lg">
                    SYS.JOB_STATUS: ONLINE_200
                  </p>
                </motion.div>

                {/* Sticker Badges */}
                <div className="flex flex-wrap items-center justify-center gap-4 mt-10 relative z-10 max-w-lg px-4">
                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: -10 }}
                    transition={{ type: "spring", delay: 0.45 }}
                    className="bg-yellow-400 text-slate-950 px-4 py-2 font-sans font-black text-xs sm:text-sm tracking-wider rounded-xl uppercase shadow-[4px_4px_0px_#000] border-2 border-slate-950 hover:scale-105 transition-transform"
                  >
                    🔥 BOOM!
                  </motion.div>

                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: 6 }}
                    transition={{ type: "spring", delay: 0.55 }}
                    className="bg-slate-900 text-lime-400 px-4 py-2 font-sans font-black text-xs sm:text-sm tracking-wider rounded-xl uppercase border-2 border-lime-400 shadow-[4px_4px_0px_rgba(163,230,53,0.25)] hover:scale-105 transition-transform"
                  >
                    ⚡ JOB IS LIVE!
                  </motion.div>
                  
                  <motion.div
                    initial={{ scale: 0, rotate: 0 }}
                    animate={{ scale: 1, rotate: -4 }}
                    transition={{ type: "spring", delay: 0.65 }}
                    className="bg-pink-500 text-white px-4 py-2 font-sans font-black text-xs sm:text-sm tracking-wider rounded-xl uppercase border-2 border-slate-950 shadow-[4px_4px_0px_#000] hover:scale-105 transition-transform"
                  >
                    🎨 STREET CRED +100
                  </motion.div>
                </div>

                {/* Interactive Continue Button */}
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 150, delay: 1.2 }}
                  className="mt-12 relative z-10"
                >
                  <button
                    onClick={handleContinueToManagement}
                    className="px-8 py-3.5 bg-[#10B981] hover:bg-[#059669] text-slate-950 hover:text-white font-sans font-black text-sm tracking-widest rounded-2xl uppercase shadow-[6px_6px_0px_#EC4899] border-3 border-slate-950 hover:shadow-[4px_4px_0px_#EC4899] active:translate-x-1 active:translate-y-1 transition-all cursor-pointer inline-flex items-center gap-2"
                  >
                    <span>Continue to Management</span>
                    <svg className="w-5 h-5 stroke-current" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </button>
                </motion.div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </div>
  );
};
