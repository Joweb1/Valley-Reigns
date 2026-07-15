import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
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
import { SeekerNotifications } from "./components/SeekerNotifications";
import { WhatsAppSimulator } from "./components/WhatsAppSimulator";
import { DatabaseSeederModal } from "./components/DatabaseSeederModal";
import { DatabaseTesterModal } from "./components/DatabaseTesterModal";
import { AdminDiagnosticsPage } from "./components/AdminDiagnosticsPage";
import { AdminNotifications } from "./components/AdminNotifications";
import { StaffNotifications } from "./components/StaffNotifications";
import { AdminPostJobPage } from "./components/AdminPostJobPage";
import { JobManagement } from "./components/JobManagement";
import { PwaInstallPrompt } from "./components/PwaInstallPrompt";
import { WhatsAppConfigPage } from "./components/WhatsAppConfigPage";
import { NetworkStatusMonitor } from "./components/NetworkStatusMonitor";
import { StaffReportForm } from "./components/StaffReportForm";
import { getJobs, subscribeToJobs, checkAndEnforceSLAs } from "./lib/services";
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
  ArrowRight,
  UserCheck,
  Cpu,
  HeartPulse,
  Banknote,
  LogIn,
  Home,
  Settings,
  User,
  MessageCircle,
  MessageSquare,
  ClipboardList,
  Plus,
  Info,
  Download,
  LogOut,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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

const getCategoryIcon = (categoryName: string) => {
  const normalized = categoryName.trim();
  switch (normalized) {
    case "Tech":
      return Cpu;
    case "Healthcare":
      return HeartPulse;
    case "Finance":
      return Banknote;
    case "AI & Analytics":
      return Sparkles;
    default:
      return Briefcase;
  }
};

const HomepageFooter: React.FC = () => {
  return (
    <footer className="relative bg-[#052216] text-white/90 overflow-hidden border-t border-[#0F5132]/20 font-sans mt-24 select-none">
      {/* Geometric / Vector Wave Pattern Overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="footer-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#footer-grid)" />
        </svg>
      </div>

      {/* Modern Wave Divider at the top */}
      <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-[#FAFCFD] to-transparent opacity-10" />

      {/* Vector lines glowing effect */}
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#0F5132]/30 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#005F73]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-10 border-b border-white/10">
          {/* Logo & Headline */}
          <div className="col-span-1 md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 bg-white text-[#052216] rounded-xl flex items-center justify-center font-bold shadow-md">
                <Briefcase className="w-5 h-5 text-[#052216]" />
              </div>
              <span className="font-serif italic font-bold text-xl text-white tracking-tight">
                Valley Reigns
              </span>
            </div>
            <p className="text-xs text-white/70 max-w-sm leading-relaxed">
              We help you secure the highest paying, most fulfilling opportunities. Friendly local experts guiding you to beautiful careers across technology, healthcare, and finance.
            </p>
            {/* Dynamic visual vector graphic accent */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                100% Kind human recruitment support
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1 md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Browse Sectors
            </h4>
            <ul className="space-y-2 text-xs">
              {["Technology", "Medical & Health", "Money & Finance", "Smart AI Systems"].map((sec) => (
                <li key={sec}>
                  <button 
                    onClick={() => {
                      const el = document.getElementById("jobs-explore");
                      if (el) el.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="hover:text-emerald-300 text-white/75 transition-colors cursor-pointer text-left font-medium"
                  >
                    {sec}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Info */}
          <div className="col-span-1 md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Immediate Help
            </h4>
            <p className="text-xs text-white/75 leading-relaxed">
              Have questions? Click the WhatsApp launcher or start a conversation in our live workspace sandbox below. No credit cards or complex registrations required.
            </p>
            <div className="pt-1">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-800 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all border border-emerald-600/30"
              >
                <span>Get Started Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer bottom bar */}
        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-[11px] text-white/50 font-mono">
          <div>
            &copy; {new Date().getFullYear()} Valley Reigns Recruitment. Designed with meticulous human care.
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-emerald-400 cursor-pointer transition-colors">Privacy Charter</span>
            <span>&bull;</span>
            <span className="hover:text-emerald-400 cursor-pointer transition-colors">Terms of Work</span>
            <span>&bull;</span>
            <span className="hover:text-emerald-400 cursor-pointer transition-colors">Workspace API</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

const JobSeekerDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToJobs((allJobs) => {
      setJobs(allJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Dynamically derive categories from current listings in database
  const uniqueCategoryNames: string[] = Array.from(new Set<string>(jobs.map(j => (j.category as string || "")).filter(Boolean)))
    .filter((name: string) => !["Tech", "Healthcare", "Finance", "AI & Analytics", "New"].includes(name));

  const CATEGORIES = [
    { 
      name: "All", 
      label: "All Jobs", 
      icon: Briefcase,
    },
    { 
      name: "New", 
      label: "New", 
      icon: Clock,
    },
    { 
      name: "Tech", 
      label: "Technology", 
      icon: Cpu,
    },
    { 
      name: "Healthcare", 
      label: "Medical & Health", 
      icon: HeartPulse,
    },
    { 
      name: "Finance", 
      label: "Money & Finance", 
      icon: Banknote,
    },
    { 
      name: "AI & Analytics", 
      label: "Smart AI Systems", 
      icon: Sparkles,
    },
    ...uniqueCategoryNames.map(name => ({
      name,
      label: name,
      icon: getCategoryIcon(name)
    }))
  ];

  // Filter listings dynamically based on criteria
  const filteredJobs = (() => {
    const list = jobs.filter((job) => {
      let matchesCategory = false;
      if (selectedCategory === "All") {
        matchesCategory = true;
      } else if (selectedCategory === "New") {
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const hasRecent = jobs.some(j => j.createdAt && j.createdAt >= sevenDaysAgo);
        if (hasRecent) {
          matchesCategory = !!(job.createdAt && job.createdAt >= sevenDaysAgo);
        } else {
          const sortedByNewest = [...jobs].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
          const top5Ids = sortedByNewest.slice(0, 5).map(j => j.id);
          matchesCategory = top5Ids.includes(job.id);
        }
      } else {
        matchesCategory = job.category === selectedCategory;
      }

      const matchesSearch = 
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

    if (selectedCategory === "New") {
      return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return list;
  })();

  return (
    <div className="flex flex-col justify-between bg-[#FAFCFD]">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24 pb-8 sm:pb-16 space-y-16 flex-grow">
        {/* Sleek Minimalist Header & Information Section matching Image Style */}
        <section className="space-y-6 text-slate-900 text-center flex flex-col items-center">
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
            className="space-y-4 max-w-2xl mx-auto text-sm sm:text-base text-black font-normal leading-relaxed text-center"
          >
            <p>
              Welcome to Valley Reigns! We are a friendly group of people who help you find really cool, high-paying jobs in technology, health, finance, and smart computer systems.
            </p>
          </motion.div>
    
          {/* Interactive Action Gateways with Cool Compressed/Lifting Animations */}
          <div className="flex flex-row justify-center items-center gap-4 sm:gap-8 py-2 w-full">
            {currentUser ? (
              /* My Dashboard Button when Logged In with Animated Offset Retro Layering */
              <motion.div 
                whileHover="hover"
                whileTap="tap"
                className="relative inline-block"
              >
                {/* Background offset box */}
                <motion.div 
                  variants={{
                    hover: { x: 3, y: 3 },
                    tap: { x: 0, y: 0 }
                  }}
                  className="absolute -left-2 -top-2 w-full h-full border-2 border-[#0F5132] rounded-xl bg-transparent pointer-events-none transition-transform" 
                />
                {/* Main Solid Button */}
                <Link
                  to={currentUser.role === "admin" || currentUser.role === "staff" ? "/staff" : "/seeker"}
                  className="inline-flex"
                >
                  <motion.div
                    variants={{
                      hover: { x: -3, y: -3 },
                      tap: { x: 0, y: 0 }
                    }}
                    className="relative z-10 px-6 py-3.5 sm:px-10 sm:py-4 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-sm sm:text-lg rounded-xl flex items-center gap-2 cursor-pointer shadow-md inline-flex"
                  >
                    <Briefcase className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-white" />
                    <span>My Dashboard</span>
                  </motion.div>
                </Link>
              </motion.div>
            ) : (
              /* Sign In Button with Animated Offset Retro Layering */
              <motion.div 
                whileHover="hover"
                whileTap="tap"
                className="relative inline-block"
              >
                {/* Background offset box */}
                <motion.div 
                  variants={{
                    hover: { x: 3, y: 3 },
                    tap: { x: 0, y: 0 }
                  }}
                  className="absolute -left-2 -top-2 w-full h-full border-2 border-[#0F5132] rounded-xl bg-transparent pointer-events-none transition-transform" 
                />
                {/* Main Solid Button */}
                <motion.button 
                  variants={{
                    hover: { x: -3, y: -3 },
                    tap: { x: 0, y: 0 }
                  }}
                  onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                  className="relative z-10 px-6 py-3.5 sm:px-10 sm:py-4 bg-[#0F5132] text-white hover:bg-[#0c4027] font-bold text-sm sm:text-lg rounded-xl flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <LogIn className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-white" />
                  <span>Sign In</span>
                </motion.button>
              </motion.div>
            )}
    
            {/* Find Jobs Button: Transparent background with micro bounce and subtle highlight */}
            <motion.button 
              whileHover={{ scale: 1.05, y: -2, backgroundColor: "rgba(11, 60, 73, 0.04)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                const element = document.getElementById("jobs-explore");
                if (element) {
                  element.scrollIntoView({ behavior: "smooth" });
                }
              }}
              className="px-6 py-3.5 sm:px-10 sm:py-4 bg-transparent border-2 border-[#0B3C49] text-[#0B3C49] font-bold text-sm sm:text-lg rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              <Search className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-[#0B3C49]" />
              <span>Find Jobs</span>
            </motion.button>
          </div>
  
          {/* Beautiful Bento-Grid Metrics arranged in the requested unique layout, smaller and elegant */}
          <div className="grid grid-cols-6 gap-3 max-w-4xl mx-auto pt-4">
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
        <div id="jobs-explore" className="space-y-6 pt-4 text-left">
          {/* Search Input bar - Hover & Focus scale / shadow enhancements */}
          <div className="relative max-w-lg bg-white border border-slate-900 p-1.5 rounded-[24px] shadow-[0_16px_36px_-6px_rgba(15,81,50,0.05),0_10px_20px_-10px_rgba(15,81,50,0.03)] hover:border-[#0F5132] hover:shadow-[0_16px_40px_rgba(15,81,50,0.08)] focus-within:ring-4 focus-within:ring-[#0F5132]/10 focus-within:border-[#0F5132] focus-within:scale-[1.015] transition-all duration-300 flex items-center gap-2 md:mx-auto">
            <Search className="w-4.5 h-4.5 text-[#0F5132] ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Type any job title, skill, or company name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-1 bg-transparent text-xs font-medium focus:outline-none text-slate-800 placeholder-slate-400"
            />
            <span className="text-[10px] font-mono font-bold bg-slate-50 text-[#0F5132] px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline border border-slate-200/50">
              {filteredJobs.length} Vacancies
            </span>
          </div>
  
          {/* Carousel Categories Container */}
          <div className="space-y-2">
            <span className="text-[9px] font-mono font-bold text-[#0a3822] uppercase tracking-widest block px-1.5">
              Tap a Category Card to Filter
            </span>
            
            {/* Horizontal Scrolling Carousel with Cool springy motion category buttons */}
            <div className="overflow-x-auto flex gap-2 pb-4 px-1 scrollbar-none snap-x snap-mandatory">
              {CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = selectedCategory === cat.name;
                return (
                  <motion.button
                    whileHover={{ 
                      scale: 1.05, 
                      y: -2,
                      boxShadow: isSelected ? "none" : "0 8px 20px -8px rgba(11, 60, 45, 0.2)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    key={cat.name}
                    onClick={() => setSelectedCategory(isSelected ? "All" : cat.name)}
                    className={`w-[20%] min-w-[80px] sm:w-auto sm:flex-1 flex-shrink-0 flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-lg cursor-pointer transition-all snap-start select-none border text-center space-y-1.5 ${
                      isSelected
                        ? "bg-[#0B3C2D] text-white border-[#0B3C2D] shadow-none"
                        : "bg-white text-[#0B3C2D] border-[#0B3C2D]/40 hover:bg-slate-50"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-white text-[#0B3C2D]" : "bg-[#0B3C2D] text-white"
                    }`}>
                      <IconComp className="w-3 h-3" />
                    </div>
                    <span className="text-[9px] sm:text-[11px] font-sans font-extrabold tracking-tight block">
                      {cat.label}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
  
          {/* Job Accordions Feed */}
          <motion.div 
            className="space-y-4 max-w-4xl mx-auto"
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
                  <JobCard job={job} />
                </motion.div>
              ))
            )}
          </motion.div>
        </div>
      </div>

      {/* Deep Green Vector Design Footer (Home page only) */}
      <HomepageFooter />
    </div>
  );
};

// ==========================================
// 2. STAFF WORKSPACE DASHBOARD VIEW (/staff)
// ==========================================
const StaffDashboardView: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const [jobs, setJobs] = useState<Job[]>([]);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get("tab");
  const staffTab = (tabParam === "post-job") ? "post-job" : (tabParam === "report" ? "report" : "inbox");
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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={isInbox ? (hasActiveChat ? "w-full h-full flex flex-col bg-white min-h-0 md:max-w-7xl md:mx-auto md:px-4 sm:md:px-6 lg:md:px-8 md:pt-12 md:pb-12 md:h-auto" : "w-full min-h-screen bg-white pb-12 md:max-w-7xl md:mx-auto md:px-4 sm:md:px-6 lg:md:px-8 md:pt-12 md:pb-12") : "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6"}
    >
      
      {/* Modern homepage-style navigation and headers */}
      {!hasActiveChat && staffTab !== "report" && staffTab !== "post-job" && (
        <div className="flex flex-col items-center gap-4 pt-6 pb-6">
          <div className="relative w-full max-w-md bg-white border border-slate-200/80 p-1.5 rounded-2xl flex items-center gap-2 shadow-sm mt-2 select-text">
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
      <AnimatePresence mode="wait">
        <motion.div
          key={staffTab}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={isInbox && hasActiveChat ? "w-full h-full flex flex-col min-h-0" : "w-full"}
        >
          {staffTab === "inbox" && (
            <ChatInbox jobsList={jobs} searchQuery={searchQuery} onActiveChatChange={setHasActiveChat} />
          )}
          
          {staffTab === "post-job" && (
            <div className="max-w-3xl mx-auto">
              <JobPostingForm onJobAdded={refreshJobs} />
            </div>
          )}

          {staffTab === "report" && (
            <div className="py-2">
              <StaffReportForm />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
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
    <div className="max-w-7xl mx-auto px-2.5 sm:px-4 lg:px-6 pt-10 sm:pt-14 pb-8 sm:pb-12 space-y-8">
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
  const { currentUser, firebaseUser, loading, logout } = useAuth();
  const isHomePage = location.pathname === "/";
  const [hideFloating, setHideFloating] = useState(false);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isStaffSettingsOpen, setIsStaffSettingsOpen] = useState(false);
  const [isSeekerSettingsOpen, setIsSeekerSettingsOpen] = useState(false);
  const [showAdminAccountModal, setShowAdminAccountModal] = useState(false);
  const [showAdminAboutModal, setShowAdminAboutModal] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true;
      setIsAppInstalled(isStandalone);
    };
    checkInstalled();
    window.addEventListener("appinstalled", checkInstalled);
    return () => window.removeEventListener("appinstalled", checkInstalled);
  }, []);

  const [isStandaloneOrFs, setIsStandaloneOrFs] = useState(() => {
    if (typeof window === "undefined") return false;
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;
    const isFullscreen = !!document.fullscreenElement;
    return isStandalone || isFullscreen;
  });

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

  // Handle automatic dashboard redirect for users in standalone/fullscreen mode on homepage
  useEffect(() => {
    if (!loading && isHomePage && isStandaloneOrFs) {
      if (currentUser) {
        const role = currentUser.role || "seeker";
        if (role === "admin") {
          navigate("/admin", { replace: true });
        } else if (role === "staff") {
          navigate("/staff", { replace: true });
        } else {
          navigate("/seeker", { replace: true });
        }
      } else {
        navigate("/seeker", { replace: true });
      }
    }
  }, [currentUser, loading, isHomePage, isStandaloneOrFs, navigate]);

  // Dynamic high-quality SEO meta updates per-route
  useEffect(() => {
    let title = "Valley Reigns | High-Fidelity Tech Recruitment & Communication Routing";
    let desc = "Valley Reigns is a premier high-fidelity recruitment routing platform bridging exceptional tech talent with top-tier companies through interactive, real-time communication channels.";
    let keywords = "Valley Reigns, tech recruitment, developer jobs, recruitment routing, real-time communication routing, hire engineers, elite tech talent, interactive hiring platform";

    switch (location.pathname) {
      case "/":
        title = "Valley Reigns | High-Fidelity Tech Recruitment & Communication Routing";
        desc = "Valley Reigns is a premier high-fidelity recruitment routing platform bridging exceptional tech talent with top-tier companies through interactive, real-time communication channels.";
        break;
      case "/seeker":
        title = "My Job Search Dashboard | Valley Reigns Recruitment";
        desc = "Manage your job search, check application routing pipelines, view response SLA counters, and explore premium tech jobs on Valley Reigns.";
        break;
      case "/seeker/messages":
        title = "My Chat & Communications | Valley Reigns Routing";
        desc = "Chat in real-time with hiring managers and recruiters. Experience instantaneous communication routing and status tracking on Valley Reigns.";
        break;
      case "/staff":
        title = "Live Recruiter Routing Inbox | Valley Reigns Staff";
        desc = "Monitor active candidate chat logs, check SLAs, post new roles, and coordinate candidate communication streams.";
        break;
      case "/admin":
        title = "System Administration | Valley Reigns Control Console";
        desc = "Configure global communication settings, manage job postings, supervise staff and active candidate chat channels.";
        break;
      case "/admin/notifications":
        title = "System Alerts & Status | Valley Reigns Admin";
        desc = "Track high-priority system alerts, background worker logs, and communication health updates.";
        break;
      case "/admin/post-jobs":
        title = "Publish Tech Jobs & Careers | Valley Reigns";
        desc = "Create and publish fresh technology openings, configure automatic communication routing pipelines for candidates.";
        break;
      case "/admin/whatsapp-config":
        title = "WhatsApp Webhook Integration Console | Valley Reigns";
        desc = "Supervise and link live WhatsApp Webhooks, verify verification tokens, and configure Meta Business WhatsApp APIs.";
        break;
      case "/admin/diagnostics":
        title = "Engineering Diagnostics Center | Valley Reigns Admin";
        desc = "Verify live database status, test communications routing pipelines, and audit API health.";
        break;
      case "/admin/manage-jobs":
      case "/staff/manage-jobs":
        title = "Job Postings & Active Roles | Valley Reigns Management";
        desc = "Track active tech listings, update job requirements, and supervise candidate communication channels.";
        break;
      case "/auth/staff-portal-invite":
        title = "Enroll as Valley Reigns Recruiter | Candidate Routing";
        desc = "Sign up and register for our recruiter dashboard to start communicating with top-tier technical applicants.";
        break;
      default:
        break;
    }

    // Set document title
    document.title = title;

    // Set or create Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", desc);

    // Set or create Meta Keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement("meta");
      metaKeywords.setAttribute("name", "keywords");
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute("content", keywords);

    // Update Open Graph Metadata elements
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute("content", title);
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) ogDesc.setAttribute("content", desc);
    
    // Update Twitter Metadata elements
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute("content", title);
    const twitterDesc = document.querySelector('meta[name="twitter:description"]');
    if (twitterDesc) twitterDesc.setAttribute("content", desc);

    // Update Canonical URL
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", window.location.href);

  }, [location.pathname]);

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
    "/admin/whatsapp-config",
    "/admin/diagnostics",
  ];
  const shouldHideHeader = (hideFloating && !isDesktop) || noHeaderPaths.includes(location.pathname);

  return (
    <>
      {/* Nice cool loading overlay checking authentication status from Firebase */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-tr from-[#021317] via-[#0F5132] to-[#0B3C49] text-white"
          >
            <div className="relative flex flex-col items-center justify-center space-y-6 max-w-sm px-6 text-center">
              {/* Spinning and pulsing loader structure */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-400/20 animate-ping duration-1000" />
                <div className="absolute w-16 h-16 rounded-full bg-emerald-400/10 animate-pulse duration-700" />
                <div className="relative w-12 h-12 rounded-full border-2 border-white/20 border-t-emerald-300 animate-spin" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-black tracking-tight text-white uppercase tracking-wider">
                  Valley Reigns
                </h2>
                <p className="text-xs font-mono text-emerald-300 font-bold uppercase tracking-widest animate-pulse">
                  Verifying Workspace Session...
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={`bg-[#FAFCFD] flex flex-col font-sans select-text ${(hideFloating && !isDesktop) ? "overflow-hidden" : "min-h-screen"}`}
        style={(hideFloating && !isDesktop) ? { height: "var(--visual-viewport-height, 100dvh)" } : undefined}
      >
        {/* Main Navigation Header - Hidden in chat view or specific admin/management views */}
        {!shouldHideHeader && <Header />}

        {/* Main Workspace Router Feed */}
        <main className={`flex-grow ${(hideFloating && !isDesktop) ? "h-full min-h-0 flex flex-col" : ""} ${(!shouldHideHeader && !isHomePage) ? "pb-24" : ""}`}>
          <Routes>
            {/* Public route - Render a clean transition background if we are in PWA/Fullscreen mode and redirecting to the dashboard */}
            <Route 
              path="/" 
              element={
                isStandaloneOrFs ? (
                  <div className="min-h-screen bg-[#FAFCFD]" />
                ) : (
                  <JobSeekerDashboard />
                )
              } 
            />
            
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
            <Route
              path="/staff/notifications"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffNotifications />
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

            {/* Private Seeker Notifications Route Guard */}
            <Route
              path="/seeker/notifications"
              element={
                <ProtectedRoute allowedRoles={["seeker", "staff", "admin"]}>
                  <SeekerNotifications />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Authentication Gateway Portal Popup - forced open in standalone/fullscreen mode if unauthenticated */}
        <AuthModal forcedOpen={isStandaloneOrFs && !currentUser && !loading} />

        {/* Progressive Web App Install Banner Overlay */}
        <PwaInstallPrompt />

        {/* Real-time Network Connectivity Monitor Toast */}
        <NetworkStatusMonitor />

        {/* Admin Sticky Fixed Bottom Navigation Pill */}
        {currentUser && currentUser.role === "admin" && !shouldHideHeader && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-[200px] px-2 animate-none">
            <div className="bg-[#0B3C2D]/70 backdrop-blur-lg border border-[#0F5132] shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-full px-4 py-1.5 flex items-center justify-around transition-all duration-300">
              {/* Search Icon Component (Left) */}
              <button
                onClick={() => {
                  setIsAdminSettingsOpen(false);
                  navigate("/seeker");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname === "/seeker"
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Search Jobs"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Home Icon Component (Center) */}
              <button
                onClick={() => {
                  setIsAdminSettingsOpen(false);
                  navigate("/admin?view=overview");
                  window.dispatchEvent(new CustomEvent("admin-home-click"));
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname.startsWith("/admin")
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Admin Dashboard"
              >
                <Home className="w-5 h-5" />
              </button>

              {/* Settings Icon Component (Right) */}
              <button
                onClick={() => {
                  setIsAdminSettingsOpen(!isAdminSettingsOpen);
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  isAdminSettingsOpen
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Admin Settings"
              >
                <Settings className={`w-5 h-5 transition-transform duration-500 ${isAdminSettingsOpen ? "rotate-90" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {/* Staff Sticky Fixed Bottom Navigation Pill */}
        {currentUser && currentUser.role === "staff" && !shouldHideHeader && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-[300px] px-2 animate-none">
            <div className="bg-[#0B3C2D]/70 backdrop-blur-lg border border-[#0F5132] shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-full px-3 py-1.5 flex items-center justify-around transition-all duration-300">
              {/* Search Jobs (Seeker View) */}
              <button
                onClick={() => {
                  setIsStaffSettingsOpen(false);
                  navigate("/seeker");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname === "/seeker"
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Find Jobs"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Chat Inbox */}
              <button
                onClick={() => {
                  setIsStaffSettingsOpen(false);
                  navigate("/staff?tab=inbox");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname === "/staff" && (new URLSearchParams(location.search).get("tab") === "inbox" || !new URLSearchParams(location.search).get("tab"))
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Chat Inbox"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Job Management (Plus Icon) */}
              <button
                onClick={() => {
                  setIsStaffSettingsOpen(false);
                  navigate("/staff/manage-jobs");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname === "/staff/manage-jobs"
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Manage Jobs"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Daily Report */}
              <button
                onClick={() => {
                  setIsStaffSettingsOpen(false);
                  navigate("/staff?tab=report");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname === "/staff" && new URLSearchParams(location.search).get("tab") === "report"
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Daily Staff Report"
              >
                <ClipboardList className="w-5 h-5" />
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  setIsStaffSettingsOpen(!isStaffSettingsOpen);
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  isStaffSettingsOpen
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Recruiter Settings"
              >
                <Settings className={`w-5 h-5 transition-transform duration-500 ${isStaffSettingsOpen ? "rotate-90" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {/* Seeker/User Sticky Fixed Bottom Navigation Pill */}
        {(currentUser && currentUser.role === "seeker") && !shouldHideHeader && (
          <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-full max-w-[200px] px-2 animate-none">
            <div className="bg-[#0B3C2D]/70 backdrop-blur-lg border border-[#0F5132] shadow-[0_2px_8px_rgba(0,0,0,0.1)] rounded-full px-4 py-1.5 flex items-center justify-around transition-all duration-300">
              {/* Find Jobs / Search */}
              <button
                onClick={() => {
                  setIsSeekerSettingsOpen(false);
                  navigate(currentUser ? "/seeker" : "/");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  location.pathname === "/" || location.pathname === "/seeker"
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Find Jobs"
              >
                <Search className="w-5 h-5" />
              </button>

              {/* Messages */}
              <button
                onClick={() => {
                  setIsSeekerSettingsOpen(false);
                  navigate("/seeker/messages");
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center relative ${
                  location.pathname === "/seeker/messages"
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="My Chats"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Settings */}
              <button
                onClick={() => {
                  setIsSeekerSettingsOpen(!isSeekerSettingsOpen);
                }}
                className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                  isSeekerSettingsOpen
                    ? "bg-[#0F5132]/35 border-emerald-400/20 text-white rounded-full"
                    : "bg-transparent border-transparent text-emerald-400 hover:text-white rounded-full"
                }`}
                title="Account Settings"
              >
                <Settings className={`w-5 h-5 transition-transform duration-500 ${isSeekerSettingsOpen ? "rotate-90" : ""}`} />
              </button>
            </div>
          </div>
        )}

        {/* Admin Bottom Settings Sheet Modal */}
        <AnimatePresence>
          {currentUser && currentUser.role === "admin" && !shouldHideHeader && isAdminSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAdminSettingsOpen(false)}
                className="fixed inset-0 z-[45] bg-slate-950/60 backdrop-blur-xs cursor-pointer"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-[#051812] text-white rounded-t-[32px] border-t border-emerald-800/40 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
              >
                {/* Vector graphic design background pattern matching admin dashboard chats card */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.06] text-emerald-400">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>

                {/* Handle bar */}
                <div className="w-12 h-1.5 bg-emerald-950/80 rounded-full mx-auto my-3 opacity-60" />

                {/* Profile Summary Section */}
                <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-emerald-900/10">
                  {firebaseUser?.photoURL || currentUser?.photoURL ? (
                    <img 
                      src={firebaseUser?.photoURL || currentUser?.photoURL} 
                      alt={currentUser?.displayName || "User"} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30 shadow-sm select-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-lg font-mono shadow-sm">
                      {currentUser?.displayName ? (
                        currentUser.displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                      ) : (
                        "AD"
                      )}
                    </div>
                  )}
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-base font-sans font-extrabold text-white tracking-tight">
                      {currentUser?.displayName || "System Administrator"}
                    </h4>
                    <p className="text-xs font-mono text-emerald-400/80 font-medium">
                      {currentUser?.email}
                    </p>
                    <span className="inline-block text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                      {currentUser?.role || "ADMIN"}
                    </span>
                  </div>
                </div>

                {/* Bottom Navigation List Buttons */}
                <div className="px-6 py-4 space-y-1 relative z-10 text-left">
                  {/* My Account Row */}
                  <button
                    onClick={() => {
                      setShowAdminAccountModal(true);
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">My Account</span>
                    <User className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>
                  
                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* WhatsApp Config Row */}
                  <button
                    onClick={() => {
                      setIsAdminSettingsOpen(false);
                      navigate("/admin/whatsapp-config");
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">WhatsApp Config</span>
                    <MessageCircle className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* Dev & Diagnostics Center Row */}
                  <button
                    onClick={() => {
                      setIsAdminSettingsOpen(false);
                      navigate("/admin/diagnostics");
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">Dev & Diagnostics Center</span>
                    <Cpu className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* About Valley Reigns Row */}
                  <button
                    onClick={() => {
                      setShowAdminAboutModal(true);
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">About Valley Reigns</span>
                    <Info className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* Install App Row */}
                  {!isAppInstalled && (
                    <>
                      <button
                        onClick={() => {
                          setIsAdminSettingsOpen(false);
                          window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                        }}
                        className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                      >
                        <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">Install App</span>
                        <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      </button>
                      <div className="border-t border-emerald-900/15 my-1" />
                    </>
                  )}

                  {/* Sign Out Row */}
                  <button
                    onClick={async () => {
                      setIsAdminSettingsOpen(false);
                      await logout();
                      navigate("/");
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-rose-950/30 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-rose-300 group-hover:text-rose-200 transition-colors">Sign Out</span>
                    <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Staff Bottom Settings Sheet Modal */}
        <AnimatePresence>
          {currentUser && currentUser.role === "staff" && !shouldHideHeader && isStaffSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsStaffSettingsOpen(false)}
                className="fixed inset-0 z-[45] bg-slate-950/60 backdrop-blur-xs cursor-pointer"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-[#051812] text-white rounded-t-[32px] border-t border-emerald-800/40 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
              >
                {/* Vector graphic design background pattern matching admin dashboard chats card */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.06] text-emerald-400">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>

                {/* Handle bar */}
                <div className="w-12 h-1.5 bg-emerald-950/80 rounded-full mx-auto my-3 opacity-60" />

                {/* Profile Summary Section */}
                <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-emerald-900/10">
                  {firebaseUser?.photoURL || currentUser?.photoURL ? (
                    <img 
                      src={firebaseUser?.photoURL || currentUser?.photoURL} 
                      alt={currentUser?.displayName || "User"} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30 shadow-sm select-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-lg font-mono shadow-sm">
                      {currentUser?.displayName ? (
                        currentUser.displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                      ) : (
                        "ST"
                      )}
                    </div>
                  )}
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-base font-sans font-extrabold text-white tracking-tight">
                      {currentUser?.displayName || "Valley Recruiter"}
                    </h4>
                    <p className="text-xs font-mono text-emerald-400/80 font-medium">
                      {currentUser?.email}
                    </p>
                    <span className="inline-block text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                      {currentUser?.role || "STAFF"}
                    </span>
                  </div>
                </div>

                {/* Bottom Navigation List Buttons */}
                <div className="px-6 py-4 space-y-1 relative z-10 text-left">
                  {/* My Account Row */}
                  <button
                    onClick={() => {
                      setIsStaffSettingsOpen(false);
                      setShowAdminAccountModal(true);
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">My Account</span>
                    <User className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>
                  
                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* About Valley Reigns Row */}
                  <button
                    onClick={() => {
                      setIsStaffSettingsOpen(false);
                      setShowAdminAboutModal(true);
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">About Valley Reigns</span>
                    <Info className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* Install App Row */}
                  {!isAppInstalled && (
                    <>
                      <button
                        onClick={() => {
                          setIsStaffSettingsOpen(false);
                          window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                        }}
                        className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                      >
                        <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">Install App</span>
                        <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      </button>
                      <div className="border-t border-emerald-900/15 my-1" />
                    </>
                  )}

                  {/* Sign Out Row */}
                  <button
                    onClick={async () => {
                      setIsStaffSettingsOpen(false);
                      await logout();
                      navigate("/");
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-rose-950/30 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-rose-300 group-hover:text-rose-200 transition-colors">Sign Out</span>
                    <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Seeker/User Bottom Settings Sheet Modal */}
        <AnimatePresence>
          {(!currentUser || currentUser.role === "seeker") && !shouldHideHeader && isSeekerSettingsOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSeekerSettingsOpen(false)}
                className="fixed inset-0 z-[45] bg-slate-950/60 backdrop-blur-xs cursor-pointer"
              />

              {/* Bottom Sheet */}
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 220 }}
                className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-[#051812] text-white rounded-t-[32px] border-t border-emerald-800/40 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
              >
                {/* Vector graphic design background pattern matching other sheets */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.06] text-emerald-400">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>

                {/* Handle bar */}
                <div className="w-12 h-1.5 bg-emerald-950/80 rounded-full mx-auto my-3 opacity-60" />

                {/* Profile Summary Section */}
                <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-emerald-900/10">
                  {firebaseUser?.photoURL || currentUser?.photoURL ? (
                    <img 
                      src={firebaseUser?.photoURL || currentUser?.photoURL} 
                      alt={currentUser?.displayName || "User"} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/30 shadow-sm select-none"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center text-emerald-300 font-bold text-lg font-mono shadow-sm">
                      {currentUser?.displayName ? (
                        currentUser.displayName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()
                      ) : (
                        "GU"
                      )}
                    </div>
                  )}
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-base font-sans font-extrabold text-white tracking-tight">
                      {currentUser?.displayName || "Guest User"}
                    </h4>
                    <p className="text-xs font-mono text-emerald-400/80 font-medium">
                      {currentUser?.email || "Browse job postings in real-time"}
                    </p>
                    <span className="inline-block text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                      {currentUser?.role ? currentUser.role.toUpperCase() : "GUEST"}
                    </span>
                  </div>
                </div>

                {/* Bottom Navigation List Buttons */}
                <div className="px-6 py-4 space-y-1 relative z-10 text-left">
                  {/* My Account Row (Only when logged in) */}
                  {currentUser && (
                    <>
                      <button
                        onClick={() => {
                          setIsSeekerSettingsOpen(false);
                          setShowAdminAccountModal(true);
                        }}
                        className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                      >
                        <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">My Account</span>
                        <User className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      </button>
                      <div className="border-t border-emerald-900/15 my-1" />
                    </>
                  )}

                  {/* About Valley Reigns Row */}
                  <button
                    onClick={() => {
                      setIsSeekerSettingsOpen(false);
                      setShowAdminAboutModal(true);
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">About Valley Reigns</span>
                    <Info className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </button>

                  <div className="border-t border-emerald-900/15 my-1" />

                  {/* Install App Row */}
                  {!isAppInstalled && (
                    <>
                      <button
                        onClick={() => {
                          setIsSeekerSettingsOpen(false);
                          window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                        }}
                        className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/40 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                      >
                        <span className="text-sm font-bold text-emerald-100 group-hover:text-white transition-colors">Install App</span>
                        <Download className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      </button>
                      <div className="border-t border-emerald-900/15 my-1" />
                    </>
                  )}

                  {/* Sign Out or Log In Row */}
                  {currentUser ? (
                    <button
                      onClick={async () => {
                        setIsSeekerSettingsOpen(false);
                        await logout();
                        navigate("/");
                      }}
                      className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-rose-950/30 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                    >
                      <span className="text-sm font-bold text-rose-300 group-hover:text-rose-200 transition-colors">Sign Out</span>
                      <LogOut className="w-4 h-4 text-rose-400 group-hover:scale-110 transition-transform" />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsSeekerSettingsOpen(false);
                        // Trigger auth modal (auth modal checks if user is logged out and opens modal)
                        window.dispatchEvent(new CustomEvent("open-auth-modal"));
                      }}
                      className="w-full flex items-center justify-between py-3.5 px-2 hover:bg-emerald-950/45 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                    >
                      <span className="text-sm font-bold text-emerald-300 group-hover:text-emerald-200 transition-colors">Sign In / Join</span>
                      <UserPlus className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                    </button>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Custom Admin Account Details Modal */}
        <AnimatePresence>
          {showAdminAccountModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAdminAccountModal(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-[#051812] text-white border border-emerald-800/40 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-[70] space-y-4 text-left overflow-hidden"
              >
                {/* Cool vector background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] text-emerald-400">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-emerald-900/10 relative z-10">
                  <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">Account Details</h3>
                  <button 
                    onClick={() => setShowAdminAccountModal(false)} 
                    className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer border-0 bg-transparent"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="space-y-3 font-sans text-xs relative z-10">
                  <div>
                    <span className="text-emerald-500/80 font-mono text-[9px] block uppercase">User ID</span>
                    <span className="text-emerald-100 font-mono text-[10px] bg-emerald-950/40 border border-emerald-900/30 px-2 py-1 rounded block truncate">{currentUser?.uid}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500/80 font-mono text-[9px] block uppercase">Display Name</span>
                    <span className="text-emerald-300 font-bold text-sm">{currentUser?.displayName}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500/80 font-mono text-[9px] block uppercase">Email Address</span>
                    <span className="text-emerald-100 font-medium">{currentUser?.email}</span>
                  </div>
                  <div>
                    <span className="text-emerald-500/80 font-mono text-[9px] block uppercase">Access Role</span>
                    <span className="inline-block bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold border border-emerald-500/30">{currentUser?.role?.toUpperCase()}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowAdminAccountModal(false)}
                  className="w-full py-2.5 bg-[#0F5132] hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer mt-2 relative z-10 transition-colors border-0"
                >
                  Close Settings
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Custom Admin About Modal */}
        <AnimatePresence>
          {showAdminAboutModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAdminAboutModal(false)}
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-[#051812] text-white border border-emerald-800/40 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-[70] space-y-3 text-left overflow-hidden"
              >
                {/* Cool vector background */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.05] text-emerald-400">
                  <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                    <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                    <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-emerald-900/10 relative z-10">
                  <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider">About Our Workspace</h3>
                  <button 
                    onClick={() => setShowAdminAboutModal(false)} 
                    className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer border-0 bg-transparent"
                  >
                    ✕
                  </button>
                </div>
                
                <p className="text-[11px] leading-relaxed font-sans text-emerald-100 relative z-10">
                  Valley Reigns is a full-cycle recruitment management workspace designed to unite ambitious talent with forward-thinking organizations.
                </p>
                <p className="text-[11px] leading-relaxed font-sans font-semibold text-emerald-400 relative z-10">
                  Recruitment for everyone — streamlined, collaborative, and secure.
                </p>
                
                <button
                  onClick={() => setShowAdminAboutModal(false)}
                  className="w-full py-2.5 bg-[#0F5132] hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer mt-2 relative z-10 transition-colors border-0"
                >
                  Confirm
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}
