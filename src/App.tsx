import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { JobCard } from "./components/JobCard";
import { JobCardSkeleton } from "./components/JobCardSkeleton";
import { AuthModal } from "./components/AuthModal";
import { ChatInbox } from "./components/ChatInbox";
import { AdminPanel } from "./components/AdminPanel";
import { JobPostingForm } from "./components/JobPostingForm";
import { SeekerDashboardView } from "./components/SeekerDashboardView";
import { SeekerMessagesView } from "./components/SeekerMessagesView";
import { WhatsAppSimulator } from "./components/WhatsAppSimulator";
import { DatabaseSeederModal } from "./components/DatabaseSeederModal";
import { DatabaseTesterModal } from "./components/DatabaseTesterModal";
import { AdminDiagnosticsPage } from "./components/AdminDiagnosticsPage";
import { AdminNotifications } from "./components/AdminNotifications";
import { AdminPostJobPage } from "./components/AdminPostJobPage";
import { JobManagement } from "./components/JobManagement";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { WhatsAppConfigPage } from "./components/WhatsAppConfigPage";
import { NetworkStatusMonitor } from "./components/NetworkStatusMonitor";
import { getJobs, checkAndEnforceSLAs } from "./lib/services";
import { Job } from "./types";
import { 
  Search, 
  MapPin, 
  DollarSign, 
  Briefcase, 
  Layers, 
  Users, 
  ShieldCheck, 
  HelpCircle, 
  Sparkles, 
  UserPlus, 
  ChevronRight, 
  MessageSquare,
  ArrowRight,
  UserCheck,
  Cpu,
  HeartPulse,
  LogIn
} from "lucide-react";
import { motion } from "motion/react";

// ==========================================
// 1. PUBLIC LANDING & JOB DISCOVERY FEED (/)
// ==========================================
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 110,
      damping: 15,
    },
  },
};

const getCategoryConfig = (categoryName: string) => {
  const normalized = categoryName.trim();
  switch (normalized) {
    case "Tech":
      return {
        name: "Tech",
        label: "Technology",
        icon: Cpu,
        color: "bg-[#2563EB]",
        borderColor: "border-[#2563EB]",
        textColor: "text-[#2563EB]",
        hoverBg: "hover:bg-blue-50/50",
        iconBg: "bg-blue-50 text-[#2563EB]",
        shadow: "shadow-blue-950/15"
      };
    case "Healthcare":
      return {
        name: "Healthcare",
        label: "Medical & Health",
        icon: HeartPulse,
        color: "bg-[#E11D48]",
        borderColor: "border-[#E11D48]",
        textColor: "text-[#E11D48]",
        hoverBg: "hover:bg-rose-50/50",
        iconBg: "bg-rose-50 text-[#E11D48]",
        shadow: "shadow-rose-950/15"
      };
    case "Finance":
      return {
        name: "Finance",
        label: "Money & Finance",
        icon: DollarSign,
        color: "bg-[#059669]",
        borderColor: "border-[#059669]",
        textColor: "text-[#059669]",
        hoverBg: "hover:bg-teal-50/50",
        iconBg: "bg-teal-50 text-[#059669]",
        shadow: "shadow-teal-950/15"
      };
    case "AI & Analytics":
      return {
        name: "AI & Analytics",
        label: "Smart AI Systems",
        icon: Sparkles,
        color: "bg-[#7C3AED]",
        borderColor: "border-[#7C3AED]",
        textColor: "text-[#7C3AED]",
        hoverBg: "hover:bg-violet-50/50",
        iconBg: "bg-violet-50 text-[#7C3AED]",
        shadow: "shadow-violet-950/15"
      };
    default: {
      const colors = [
        { color: "bg-[#D97706]", text: "text-[#D97706]", border: "border-[#D97706]", iconBg: "bg-amber-50 text-[#D97706]", shadow: "shadow-amber-950/15" },
        { color: "bg-[#0891B2]", text: "text-[#0891B2]", border: "border-[#0891B2]", iconBg: "bg-cyan-50 text-[#0891B2]", shadow: "shadow-cyan-950/15" },
        { color: "bg-[#4F46E5]", text: "text-[#4F46E5]", border: "border-[#4F46E5]", iconBg: "bg-indigo-50 text-[#4F46E5]", shadow: "shadow-indigo-950/15" },
        { color: "bg-[#DB2777]", text: "text-[#DB2777]", border: "border-[#DB2777]", iconBg: "bg-pink-50 text-[#DB2777]", shadow: "shadow-pink-950/15" },
        { color: "bg-[#059669]", text: "text-[#059669]", border: "border-[#059669]", iconBg: "bg-emerald-50 text-[#059669]", shadow: "shadow-emerald-950/15" }
      ];
      const index = Math.abs(normalized.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)) % colors.length;
      const theme = colors[index];
      return {
        name: normalized,
        label: normalized,
        icon: Briefcase,
        color: theme.color,
        borderColor: theme.border,
        textColor: theme.text,
        hoverBg: "hover:bg-slate-50",
        iconBg: theme.iconBg,
        shadow: theme.shadow
      };
    }
  }
};

const JobSeekerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const loadJobs = async () => {
    setLoading(true);
    const allJobs = await getJobs();
    setJobs(allJobs);
    setLoading(false);
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Dynamically derive categories from current listings in database
  const uniqueCategoryNames: string[] = Array.from(new Set<string>(jobs.map(j => (j.category as string || "")).filter(Boolean)))
    .filter((name: string) => !["Tech", "Healthcare", "Finance", "AI & Analytics"].includes(name));

  const CATEGORIES = [
    { 
      name: "All", 
      label: "All Jobs", 
      icon: Briefcase,
      color: "bg-[#0F5132]", 
      borderColor: "border-[#0F5132]", 
      textColor: "text-[#0F5132]",
      hoverBg: "hover:bg-emerald-50/50",
      iconBg: "bg-emerald-50 text-[#0F5132]",
      shadow: "shadow-emerald-950/15"
    },
    { 
      name: "Tech", 
      label: "Technology", 
      icon: Cpu,
      color: "bg-[#2563EB]", 
      borderColor: "border-[#2563EB]", 
      textColor: "text-[#2563EB]",
      hoverBg: "hover:bg-blue-50/50",
      iconBg: "bg-blue-50 text-[#2563EB]",
      shadow: "shadow-blue-950/15"
    },
    { 
      name: "Healthcare", 
      label: "Medical & Health", 
      icon: HeartPulse,
      color: "bg-[#E11D48]", 
      borderColor: "border-[#E11D48]", 
      textColor: "text-[#E11D48]",
      hoverBg: "hover:bg-rose-50/50",
      iconBg: "bg-rose-50 text-[#E11D48]",
      shadow: "shadow-rose-950/15"
    },
    { 
      name: "Finance", 
      label: "Money & Finance", 
      icon: DollarSign,
      color: "bg-[#059669]", 
      borderColor: "border-[#059669]", 
      textColor: "text-[#059669]",
      hoverBg: "hover:bg-teal-50/50",
      iconBg: "bg-teal-50 text-[#059669]",
      shadow: "shadow-teal-950/15"
    },
    { 
      name: "AI & Analytics", 
      label: "Smart AI Systems", 
      icon: Sparkles,
      color: "bg-[#7C3AED]", 
      borderColor: "border-[#7C3AED]", 
      textColor: "text-[#7C3AED]",
      hoverBg: "hover:bg-violet-50/50",
      iconBg: "bg-violet-50 text-[#7C3AED]",
      shadow: "shadow-violet-950/15"
    },
    ...uniqueCategoryNames.map(name => getCategoryConfig(name))
  ];

  // Filter listings dynamically based on criteria
  const filteredJobs = jobs.filter((job) => {
    const matchesCategory = selectedCategory === "All" || job.category === selectedCategory;
    const matchesSearch = 
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-8 sm:pb-16 space-y-16">
      {/* Sleek Minimalist Header & Information Section matching Image Style */}
      <section className="space-y-6 text-slate-900">
        <div className="space-y-2.5">
          {/* Custom Badged Subtitle with Arrows and Slashes - VERY SMALL, NO SHADOW, BLACK TEXT, BLACK BORDER */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.85, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="inline-flex items-center gap-2 bg-white border border-black rounded-full px-4 py-1.5 shadow-none text-[10px] sm:text-xs font-bold text-black tracking-wider uppercase"
          >
            <span className="text-black font-light font-mono">&lt;</span>
            <span className="text-black">We find you awesome jobs</span>
            <span className="text-black font-light font-mono">/</span>
            <span className="text-black font-light font-mono">&gt;</span>
          </motion.div>
 
          {/* Unique Display Typography: Valley Reigns Recruitment for Everyone */}
          <div className="space-y-3 overflow-visible">
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black tracking-tight leading-tight sm:leading-[1.05] select-none py-1 overflow-visible">
              {/* The text Valley Reigns: bigger, darker, animated, and with padding to prevent clipping */}
              <motion.span 
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  type: "spring",
                  stiffness: 100,
                  damping: 15,
                  delay: 0.1 
                }}
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#021317] bg-clip-text text-transparent inline-block sm:inline cursor-default font-extrabold tracking-tighter py-3 pr-2"
              >
                Valley Reigns
              </motion.span>
              
              <motion.span 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                className="block mt-2 sm:mt-3 text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-sans font-light text-black tracking-tight"
              >
                Recruitment for everyone
              </motion.span>
            </h1>
          </div>
        </div>
 
        {/* 12-Year-Old Level Layman Explanation */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
          className="space-y-4 max-w-2xl text-sm sm:text-base text-black font-normal leading-relaxed"
        >
          <p>
            Welcome to Valley Reigns! We are a friendly group of people who help you find really cool, high-paying jobs in technology, health, finance, and smart computer systems.
          </p>
        </motion.div>
 
        {/* Interactive Action Gateways - Side by side even on mobile, reduced spacing */}
        <div className="flex flex-row justify-center items-center gap-4 sm:gap-8 py-2">
          {currentUser ? (
            /* My Dashboard Button when Logged In with 3D Offset Retro Layering */
            <div className="relative inline-block">
              {/* Background offset box */}
              <div className="absolute -left-2 -top-2 w-full h-full border-2 border-[#0F5132] rounded-xl bg-transparent pointer-events-none" />
              {/* Main Solid Button */}
              <Link
                to={currentUser.role === "admin" || currentUser.role === "staff" ? "/staff" : "/seeker"}
                className="relative z-10 px-6 py-3.5 sm:px-10 sm:py-4 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-sm sm:text-lg rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:translate-x-[-1px] active:translate-y-[-1px] inline-flex"
              >
                <Briefcase className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-white" />
                <span>My Dashboard</span>
              </Link>
            </div>
          ) : (
            /* Sign In Button with 3D Offset Retro Layering */
            <div className="relative inline-block">
              {/* Background offset box */}
              <div className="absolute -left-2 -top-2 w-full h-full border-2 border-[#0F5132] rounded-xl bg-transparent pointer-events-none" />
              {/* Main Solid Button */}
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                className="relative z-10 px-6 py-3.5 sm:px-10 sm:py-4 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-sm sm:text-lg rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all active:translate-x-[-1px] active:translate-y-[-1px]"
              >
                <LogIn className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-white" />
                <span>Sign In</span>
              </button>
            </div>
          )}
 
          {/* Find Jobs Button: Transparent background with a border */}
          <button 
            onClick={() => {
              const element = document.getElementById("jobs-explore");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
            className="px-6 py-3.5 sm:px-10 sm:py-4 bg-transparent hover:bg-[#0B3C49]/5 border-2 border-[#0B3C49] text-[#0B3C49] font-bold text-sm sm:text-lg rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
          >
            <Search className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-[#0B3C49]" />
            <span>Find Jobs</span>
          </button>
        </div>

        {/* Beautiful Bento-Grid Metrics arranged in the requested unique layout, smaller and elegant */}
        <div className="grid grid-cols-6 gap-3 max-w-4xl pt-4">
          {/* Box 1: Plum - Row 1, Left (col-span-3) */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.45 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="col-span-3 bg-[#4A154B] text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[100px] sm:min-h-[110px] shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <span className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
              1,200+
            </span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">
              Cool jobs found for our happy visitors
            </span>
          </motion.div>

          {/* Box 2: Rose/Pink - Row 1, Right (col-span-3) */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.52 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="col-span-3 bg-[#E91E63] text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[100px] sm:min-h-[110px] shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <span className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
              10,000+
            </span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">
              Friendly chats completed on WhatsApp
            </span>
          </motion.div>

          {/* Box 3: Teal - Row 2, Card 1 (col-span-2) */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.59 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="col-span-2 bg-[#005F73] text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[100px] sm:min-h-[110px] shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <span className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
              150+
            </span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">
              Excellent top-paying companies hiring now
            </span>
          </motion.div>

          {/* Box 4: Black - Row 2, Card 2 (col-span-2) */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.66 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="col-span-2 bg-[#000000] text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[100px] sm:min-h-[110px] shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <span className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
              24/7 Live
            </span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">
              Helpful agents ready to guide you anytime
            </span>
          </motion.div>

          {/* Box 5: Charcoal/Gray - Row 2, Card 3 (col-span-2, row-span-2) */}
          {/* Extends downwards through row 2 and row 3 on the right */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.73 }}
            whileHover={{ y: -4, scale: 1.02 }}
            className="col-span-2 row-span-2 bg-[#4F5D75] text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[210px] sm:min-h-[230px] shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <span className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
              100% Free
            </span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">
              We never charge seekers any money to find work
            </span>
          </motion.div>

          {/* Box 6: Magenta - Row 3, Card 1 (col-span-4) */}
          {/* Extends to meet Box 5's vertical extension */}
          <motion.div 
            initial={{ opacity: 0, y: 25, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 80, damping: 12, delay: 0.8 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="col-span-4 bg-[#EC4899] text-white p-4 sm:p-5 rounded-2xl flex flex-col justify-between min-h-[100px] sm:min-h-[110px] shadow-sm hover:shadow-md transition-shadow duration-300"
          >
            <span className="text-xl sm:text-2xl font-display font-extrabold tracking-tight leading-none">
              Instant Connection
            </span>
            <span className="text-[10px] sm:text-xs font-medium opacity-90 leading-tight">
              Talk with real, kind experts—never boring automated robots!
            </span>
          </motion.div>
        </div>
      </section>

      {/* Main Discover Workspace Section */}
      <div id="jobs-explore" className="space-y-6 pt-4">
        {/* Search Input bar */}
        <div className="relative max-w-2xl bg-white border border-slate-900 p-2 rounded-[28px] shadow-[0_16px_36px_-6px_rgba(15,81,50,0.05),0_10px_20px_-10px_rgba(15,81,50,0.03)] flex items-center gap-2">
          <Search className="w-5 h-5 text-[#0F5132] ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Type any job title, skill, or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 bg-transparent text-sm font-medium focus:outline-none text-slate-800 placeholder-slate-400"
          />
          <span className="text-xs font-mono font-bold bg-slate-50 text-[#0F5132] px-3.5 py-2 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline">
            {filteredJobs.length} Vacancies
          </span>
        </div>

        {/* Carousel Categories Container */}
        <div className="space-y-2">
          <span className="text-[9px] font-mono font-bold text-[#0a3822] uppercase tracking-widest block px-1.5">
            Tap a Category Card to Filter
          </span>
          
          {/* Horizontal Scrolling Carousel: 3 visible, 4th partially cut off on mobile */}
          <div className="overflow-x-auto flex gap-3 pb-4 px-1 scrollbar-none snap-x snap-mandatory">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-[28%] min-w-[110px] sm:w-auto sm:flex-1 flex-shrink-0 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl cursor-pointer transition-all snap-start select-none border text-center space-y-2.5 ${
                    isSelected
                      ? `${cat.color} text-white ${cat.borderColor} shadow-none scale-[1.02]`
                      : `bg-white ${cat.textColor} ${cat.borderColor} hover:bg-slate-50 hover:shadow-none`
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-white/15 text-white" : cat.iconBg
                  }`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-sans font-extrabold tracking-tight block">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Job Accordions Feed */}
        <motion.div 
          className="space-y-4 max-w-4xl"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          key={`${selectedCategory}-${searchQuery}`}
        >
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((n) => (
                <JobCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredJobs.length === 0 ? (
            <div className="bg-white border border-slate-150 rounded-3xl p-12 text-center">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="text-sm font-sans font-extrabold text-slate-800">No Jobs Listed Here</h4>
              <p className="text-xs font-sans text-slate-400 max-w-sm mx-auto mt-1 leading-relaxed">
                We couldn't find any jobs matching that description! Try selecting another category card or clearing your search.
              </p>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <motion.div key={job.id} variants={itemVariants}>
                <JobCard job={job} onImpressionsUpdate={loadJobs} />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};

// ==========================================
// 2. STAFF WORKSPACE DASHBOARD VIEW (/staff)
// ==========================================
const StaffDashboardView: React.FC = () => {
  const { currentUser } = useAuth();

  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const [jobs, setJobs] = useState<Job[]>([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const staffTab = (tabParam === "post-job") ? "post-job" : "inbox";
  const [searchQuery, setSearchQuery] = useState("");
  const [hasActiveChat, setHasActiveChat] = useState(false);

  const refreshJobs = async () => {
    const list = await getJobs();
    setJobs(list);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  const isInbox = staffTab === "inbox";

  return (
    <div className={isInbox ? (hasActiveChat ? "w-full h-full flex flex-col bg-white min-h-0" : "w-full min-h-screen bg-white") : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6"}>
      {/* Modern homepage-style search bar at start of the page */}
      {!hasActiveChat && (
        <div className="flex justify-center px-4 sm:px-6 lg:px-8 pt-8 pb-6">
          <div className="relative w-full max-w-md bg-white border border-[#0F5132] p-1.5 rounded-2xl shadow-none flex items-center gap-2">
            <Search className="w-4 h-4 text-[#0F5132] ml-2 shrink-0" />
            <input
              type="text"
              placeholder={isInbox ? "Search live chats or available requests..." : "Search jobs..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-1 bg-transparent text-xs font-medium focus:outline-none text-slate-800 placeholder-slate-400"
            />
            <span className="text-[10px] font-mono font-bold bg-slate-50 text-[#0F5132] px-2.5 py-1 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline border border-slate-100">
              {isInbox ? "Staff" : "Jobs"}
            </span>
          </div>
        </div>
      )}

      {/* Render selected workspace tabs */}
      {isInbox ? (
        <ChatInbox jobsList={jobs} searchQuery={searchQuery} onActiveChatChange={setHasActiveChat} />
      ) : (
        <div className="max-w-3xl mx-auto">
          <JobPostingForm onJobAdded={refreshJobs} />
        </div>
      )}
    </div>
  );
};

// ==========================================
// 3. ADMIN OPERATIONS PANEL VIEW (/admin)
// ==========================================
const AdminDashboardView: React.FC = () => {
  const [jobs, setJobs] = useState<Job[]>([]);

  const refreshJobs = async () => {
    const list = await getJobs();
    setJobs(list);
  };

  useEffect(() => {
    refreshJobs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-sans font-extrabold text-slate-900 tracking-tight">
          System Control Console
        </h1>
        <p className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
          Administrator Command Authority Unlocked
        </p>
      </div>

      <AdminPanel jobsList={jobs} />
    </div>
  );
};

// ==========================================
// 4. HIDDEN RECRUITER REGISTRATION PORTAL ROUTE (/auth/staff-portal-invite)
// ==========================================
const StaffPortalInvite: React.FC = () => {
  const { signupUser, currentUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Register as 'staff'
    await signupUser(email, name, "staff");
    
    setSubmitting(false);
    setComplete(true);
  };

  if (complete || currentUser?.role === "staff") {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-8 max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#0F5132] mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-sans font-bold text-slate-900 tracking-tight">
              Recruiter Account Unlocked!
            </h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed mt-1">
              Your staff credentials have been configured and session authenticated.
            </p>
          </div>
          <Link
            to="/staff"
            className="w-full py-3 bg-[#0F5132] hover:bg-[#0c4027] text-white rounded-xl text-xs font-sans font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-md"
          >
            Enter Staff Dashboard Console <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-[#0F5132] mx-auto mb-3">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight">
            Recruiter Enrollment Portal
          </h2>
          <span className="text-[10px] font-mono text-[#0F5132] font-bold uppercase tracking-wider block mt-1">
            Secure Staff Invite Route
          </span>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-slate-800">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Marcus Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Recruiter Email
            </label>
            <input
              type="email"
              required
              placeholder="e.g. vance@valleyreigns.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Enrollment Token Key
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              defaultValue="VALLEY_STAFF_2026"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#0F5132] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#0F5132] hover:bg-[#0c4027] text-white rounded-xl text-xs font-sans font-extrabold shadow-md shadow-emerald-950/10 flex items-center justify-center cursor-pointer"
          >
            {submitting ? "Registering Credentials..." : "Enroll Recruiter & Log In"}
          </button>
        </form>

        <p className="text-[10px] font-sans text-slate-400 text-center leading-relaxed">
          Enrolling will register your profile, assigning the role of <strong>'staff'</strong>. Your profile will instantly be authorized to route conversation payloads.
        </p>
      </div>
    </div>
  );
};

// ==========================================
// MAIN REUTER LAYOUT CONFIGURATION
// ==========================================
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const isHomePage = location.pathname === "/";
  const [hideFloating, setHideFloating] = useState(false);
  const [isStandaloneOrFs, setIsStandaloneOrFs] = useState(false);

  useEffect(() => {
    const checkMode = () => {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true;
      const isFullscreen = !!document.fullscreenElement;
      setIsStandaloneOrFs(isStandalone || isFullscreen);
    };

    checkMode();

    document.addEventListener("fullscreenchange", checkMode);
    
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", checkMode);
    } else {
      mediaQuery.addListener(checkMode);
    }

    const interval = setInterval(checkMode, 2000);

    return () => {
      document.removeEventListener("fullscreenchange", checkMode);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", checkMode);
      } else {
        mediaQuery.removeListener(checkMode);
      }
      clearInterval(interval);
    };
  }, []);

  // Handle automatic dashboard redirect for logged-in users in standalone/fullscreen mode on homepage
  useEffect(() => {
    if (!loading && currentUser && isHomePage && isStandaloneOrFs) {
      const role = currentUser.role || "seeker";
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "staff") {
        navigate("/staff", { replace: true });
      } else {
        navigate("/seeker", { replace: true });
      }
    }
  }, [currentUser, loading, isHomePage, isStandaloneOrFs, navigate]);

  useEffect(() => {
    // Run SLA check on initial load
    checkAndEnforceSLAs().catch(err => console.warn("SLA check failed:", err));

    // Run SLA check periodically every 30 seconds
    const interval = setInterval(() => {
      checkAndEnforceSLAs().catch(err => console.warn("SLA check failed:", err));
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.visualViewport) {
        const height = window.visualViewport.height;
        document.documentElement.style.setProperty(
          "--visual-viewport-height",
          `${height}px`
        );
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
      handleResize();
    }

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, []);

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ active: boolean }>;
      setHideFloating(customEvent.detail?.active ?? false);
    };
    window.addEventListener("toggle-chat-view", handleToggle);
    return () => window.removeEventListener("toggle-chat-view", handleToggle);
  }, []);

  const noHeaderPaths = [
    "/admin/notifications",
    "/admin/manage-jobs",
    "/admin/post-jobs",
    "/admin/whatsapp-config",
    "/admin/diagnostics",
    "/staff/manage-jobs"
  ];
  const shouldHideHeader = hideFloating || noHeaderPaths.includes(location.pathname);

  return (
    <div 
      className={`bg-[#FAFCFD] flex flex-col font-sans select-text ${hideFloating ? "overflow-hidden" : "min-h-screen"}`}
      style={hideFloating ? { height: "var(--visual-viewport-height, 100dvh)" } : undefined}
    >
      {/* Main Navigation Header - Hidden in chat view or specific admin/management views */}
      {!shouldHideHeader && <Header />}

      {/* Main Workspace Router Feed */}
      <main className={`flex-grow ${hideFloating ? "h-full min-h-0 flex flex-col" : ""}`}>
        <Routes>
          {/* Public route */}
          <Route path="/" element={<JobSeekerDashboard />} />
          
          {/* Staff invited route */}
          <Route path="/auth/staff-portal-invite" element={<StaffPortalInvite />} />

          {/* Private Staff Route Guard */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <StaffDashboardView />
              </ProtectedRoute>
            }
          />

          {/* Private Admin Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboardView />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminNotifications />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/post-jobs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminPostJobPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/whatsapp-config"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <WhatsAppConfigPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/diagnostics"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDiagnosticsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/manage-jobs"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <JobManagement />
              </ProtectedRoute>
            }
          />

          {/* Staff Manage Jobs */}
          <Route
            path="/staff/manage-jobs"
            element={
              <ProtectedRoute allowedRoles={["staff", "admin"]}>
                <JobManagement />
              </ProtectedRoute>
            }
          />

          {/* Private Seeker Route Guard */}
          <Route
            path="/seeker"
            element={
              <ProtectedRoute allowedRoles={["seeker", "staff", "admin"]}>
                <SeekerDashboardView />
              </ProtectedRoute>
            }
          />

          {/* Private Seeker Messages Route Guard */}
          <Route
            path="/seeker/messages"
            element={
              <ProtectedRoute allowedRoles={["seeker", "staff", "admin"]}>
                <SeekerMessagesView />
              </ProtectedRoute>
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Authentication Gateway Portal Popup */}
      <AuthModal forcedOpen={isHomePage && isStandaloneOrFs && !currentUser && !loading} />

      {/* Progressive Web App Install Banner Overlay */}
      <PwaInstallPrompt />

      {/* Real-time Network Connectivity Monitor Toast */}
      <NetworkStatusMonitor />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
