import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import { Job } from "../types";
import { subscribeToJobs } from "../lib/services";
import { getCategoryImage } from "../lib/categories";
import { JobCard } from "./JobCard";
import { JobCardSkeleton } from "./JobCardSkeleton";
import { getCategoryStyles } from "./SeekerDashboardView";
import { useInfinitePagination, InfiniteScrollLoader } from "./InfiniteScrollLoader";
import { MorphingParticles3D } from "./MorphingParticles3D";
import { 
  Search, 
  Briefcase, 
  Clock, 
  Cpu, 
  HeartPulse, 
  Banknote, 
  Sparkles, 
  LogIn, 
  Building2, 
  ArrowRight
} from "lucide-react";
import { motion } from "motion/react";

// Anniversary celebration configuration
const ENABLE_ANNIVERSARY_CELEBRATION = false;

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
      type: "spring" as const,
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
    <footer className="relative bg-[#111827] text-white/90 overflow-hidden border-t border-[#1E88E5]/20 font-sans mt-24 select-none">
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
      <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-[#1E88E5]/30 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#005F73]/20 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-10 border-b border-white/10">
          {/* Logo & Headline */}
          <div className="col-span-1 md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-md">
                <img 
                  src="/icon.svg" 
                  alt="Valley Reigns Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <span className="font-display font-extrabold tracking-wider text-xl text-white uppercase">
                Valley Reigns
              </span>
            </div>
            <p className="text-xs text-white/70 max-w-sm leading-relaxed">
              We help you secure the highest paying, most fulfilling opportunities. Friendly local experts guiding you to beautiful careers across technology, healthcare, and finance.
            </p>
            {/* Dynamic visual vector graphic accent */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="w-2.5 h-2.5 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">
                100% Kind human recruitment support
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1 md:col-span-3 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400">
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
                    className="hover:text-blue-300 text-white/75 transition-colors cursor-pointer text-left font-medium"
                  >
                    {sec}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Info */}
          <div className="col-span-1 md:col-span-4 space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-blue-400">
              Immediate Help
            </h4>
            <p className="text-xs text-white/75 leading-relaxed">
              Have questions about open roles or career guidance? Sign in or create a profile to connect with our talent team directly. No credit cards or complex registrations required.
            </p>
            <div className="pt-1">
              <button 
                onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-800 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl transition-all border border-blue-600/30 cursor-pointer"
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
            <span className="hover:text-blue-400 cursor-pointer transition-colors">Privacy Charter</span>
            <span>&bull;</span>
            <span className="hover:text-blue-400 cursor-pointer transition-colors">Terms of Work</span>
            <span>&bull;</span>
            <span className="hover:text-blue-400 cursor-pointer transition-colors">Workspace API</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const JobSeekerDashboard: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Strictly prevent any logged-in user from viewing or entering the homepage
  useEffect(() => {
    if (!authLoading && currentUser) {
      const role = currentUser.role || "seeker";
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "employer") {
        navigate("/employer/dashboard", { replace: true });
      } else {
        navigate("/seeker", { replace: true });
      }
    }
  }, [currentUser, authLoading, navigate]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToJobs((allJobs) => {
      setJobs(allJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Filter listings dynamically based on criteria
  const filteredJobs = (() => {
    const list = jobs.filter((job) => {
      if (job.isUnavailable) return false;
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

  const {
    displayedItems: displayedJobs,
    hasMore,
    isLoadingMore,
    loadMore,
    sentinelRef,
    totalCount,
    displayedCount
  } = useInfinitePagination<Job>(filteredJobs, { pageSize: 8, initialPageSize: 8 }, [selectedCategory, searchQuery]);

  if (currentUser) {
    return null;
  }

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

  return (
    <div className="flex flex-col justify-between bg-[#FAFCFD]">
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-8 sm:pb-16 space-y-6 flex-grow">
        {/* Sleek Minimalist Header & Information Section matching Image Style */}
        <section className="space-y-6 text-slate-900 text-center flex flex-col items-center">
          <div className="space-y-2.5">
            {/* Custom Badged Subtitle with Arrows and Slashes */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <motion.div 
                initial={{ opacity: 0, scale: 0.85, y: -12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="inline-flex items-center gap-2 bg-white border border-black rounded-full px-4 py-1.5 shadow-none text-[10px] sm:text-xs font-bold text-black tracking-wider uppercase"
              >
                <span className="text-black">We find you awesome jobs</span>
              </motion.div>

              {ENABLE_ANNIVERSARY_CELEBRATION && (
                <motion.button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-graffiti-intro"))}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-white font-black text-[10px] sm:text-xs rounded-full shadow-[0_0_20px_rgba(245,158,11,0.35)] cursor-pointer transition-all border border-amber-400/50 uppercase tracking-wider"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: "6s" }} />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-pink-400 to-sky-300">
                    🎉 3 Year Anniversary Intro
                  </span>
                  <span className="bg-gradient-to-r from-amber-500 to-pink-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                    REPLAY
                  </span>
                </motion.button>
              )}
            </div>
    
            {/* Unique Display Typography: Valley Reigns Recruitment for Everyone */}
            <div className="space-y-3 overflow-visible">
              <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-black tracking-tight leading-tight sm:leading-[1.05] select-none py-1 overflow-visible">
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
                  className="bg-gradient-to-r from-slate-950 via-slate-900 to-[#0f172a] bg-clip-text text-transparent inline-block sm:inline cursor-default font-extrabold tracking-tighter py-3 pr-2"
                >
                  Valley Reigns
                </motion.span>
                
                <motion.span 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
                  className="block mt-1.5 sm:mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-sans font-light text-black tracking-tight"
                >
                  Active Recruitment for everyone
                </motion.span>
              </h1>
            </div>
          </div>

          {/* Employer & Seeker Action Cards */}
          <div className="w-full max-w-xl mx-auto space-y-3.5 pt-1">
            {/* Card 1: Seeker Gateway with 3D Morphing Particles */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-white border border-[#0B1B3D]/30 rounded-[24px] p-4 sm:p-5 shadow-none hover:border-[#0B1B3D]/50 transition-all flex flex-row items-center justify-between gap-3 sm:gap-4 overflow-hidden"
            >
              {/* Left Side: 3D Morphing Particles Graphic */}
              <div className="shrink-0 flex items-center justify-center pl-1 sm:pl-2">
                <MorphingParticles3D size={118} />
              </div>

              {/* Right Side: Text with Sign In button placed underneath */}
              <div className="flex-1 min-w-0 flex flex-col items-end text-right space-y-2.5 pr-1">
                <div className="space-y-1.5">
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-display font-black text-slate-900 tracking-tight leading-tight">
                    Get your next job today!
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                    Search for kinds of jobs and apply now!
                  </p>
                </div>

                <div className="pt-1">
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
                    className="w-48 sm:w-60 md:w-64 py-3 sm:py-3.5 bg-[#0B1B3D] hover:bg-[#07132C] text-white font-extrabold text-sm sm:text-base rounded-full flex items-center justify-center gap-2.5 cursor-pointer shadow-md border-0 whitespace-nowrap transition-all"
                  >
                    <LogIn className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    <span>Sign In</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Card 2: Employer Gateway */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="bg-white border border-slate-200/90 rounded-[24px] p-4 sm:p-6 shadow-none hover:border-slate-300 transition-all flex flex-row items-center justify-between gap-3 sm:gap-4 text-left"
            >
              <div className="space-y-1 flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-display font-black text-slate-900 tracking-tight">
                  Employer's, Get you next hire!!
                </h3>
                <p className="text-xs text-slate-500 font-medium truncate sm:whitespace-normal">
                  Connect with qualified candidates ready to work.
                </p>
              </div>
              <div className="shrink-0">
                <motion.div 
                  whileHover="hover"
                  whileTap="tap"
                  className="relative inline-block"
                >
                  <motion.div 
                    variants={{
                      hover: { x: 3, y: 3 },
                      tap: { x: 0, y: 0 }
                    }}
                    className="absolute -left-1.5 -top-1.5 w-full h-full border-2 border-[#0B1B3D] rounded-xl bg-transparent pointer-events-none transition-transform" 
                  />
                  <motion.button 
                    variants={{
                      hover: { x: -3, y: -3 },
                      tap: { x: 0, y: 0 }
                    }}
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { role: "employer", tab: "signup" } }));
                    }}
                    className="relative z-10 px-5 py-2.5 sm:px-7 sm:py-3 bg-[#0B1B3D] text-white hover:bg-[#07132C] font-bold text-xs sm:text-sm rounded-xl flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-md border-0 whitespace-nowrap"
                  >
                    <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    <span>Hire</span>
                  </motion.button>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
  
        {/* Main Discover Workspace Section */}
        <div id="jobs-explore" className="space-y-6 text-left">
          {/* Search Input bar */}
          <div className="relative max-w-lg bg-white/90 border border-[#2d3a4e] p-2.5 rounded-[24px] shadow-none hover:border-[#1a2332] focus-within:ring-2 focus-within:ring-[#0B1B3D]/15 focus-within:border-[#0B1B3D] transition-all duration-300 flex items-center gap-2.5 md:mx-auto">
            <Search className="w-5 h-5 text-slate-500 ml-3 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-1.5 bg-transparent text-sm font-normal focus:outline-none text-slate-800 placeholder-gray-400"
            />
            <span className="text-[10px] font-mono font-bold bg-white text-[#1E88E5] px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline border border-slate-200">
              {filteredJobs.length} Vacancies
            </span>
          </div>

          {/* Popular Searched Job Title Tags */}
          <div className="max-w-xl mx-auto flex flex-wrap items-center justify-center gap-2 pt-0.5 pb-1">
            {[
              "Gate keeper",
              "Gardener",
              "House help",
              "Teacher",
              "POS attendant",
              "Sales girl",
              "Hotel receptionist"
            ].map((tag) => {
              const isActive = searchQuery.toLowerCase() === tag.toLowerCase();
              return (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(isActive ? "" : tag)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                    isActive
                      ? "bg-[#0B1B3D] text-white border-[#0B1B3D] shadow-xs"
                      : "bg-white text-slate-700 border-[#0B1B3D]/30 hover:border-[#0B1B3D]/50 hover:bg-slate-50"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
  
          {/* Carousel Categories Container */}
          <div className="space-y-2">
            <div className="overflow-x-auto flex gap-2 pb-4 px-1 scrollbar-none snap-x snap-mandatory">
              {CATEGORIES.map((cat) => {
                const IconComp = cat.icon;
                const isSelected = selectedCategory === cat.name;
                const styles = getCategoryStyles(cat.name);
                const bgImg = getCategoryImage(cat.name);
                return (
                  <motion.button
                    whileHover={{ 
                      scale: 1.05, 
                      y: -2,
                      boxShadow: isSelected ? `0 8px 20px -8px ${styles.primary}33` : "0 8px 20px -8px rgba(0, 0, 0, 0.15)"
                    }}
                    whileTap={{ scale: 0.95 }}
                    key={cat.name}
                    onClick={() => setSelectedCategory(isSelected ? "All" : cat.name)}
                    className={`w-[18%] min-w-[80px] sm:w-[9%] sm:min-w-[85px] h-16 sm:h-18 flex-shrink-0 flex flex-col items-center justify-center rounded-xl cursor-pointer transition-all snap-start select-none bg-cover bg-center border text-center relative overflow-hidden group`}
                    style={{
                      backgroundImage: `url(${bgImg})`,
                      borderColor: isSelected ? styles.primary : "rgba(226, 232, 240, 0.2)",
                      borderWidth: isSelected ? "3px" : "1px"
                    }}
                  >
                    <div 
                      className={`absolute inset-0 transition-all duration-200 z-0 ${
                        isSelected 
                          ? "opacity-85" 
                          : "opacity-65 group-hover:opacity-45"
                      }`}
                      style={{
                        backgroundColor: styles.primary
                      }}
                    />
                    
                    <div className="relative z-10 flex flex-col items-center justify-center space-y-1.5 w-full h-full p-1 text-white">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? "bg-white text-slate-950 shadow-sm" : "bg-white/20 text-white backdrop-blur-sm"
                      }`}>
                        {IconComp ? (
                          <IconComp className="w-3.5 h-3.5" />
                        ) : (
                          <Briefcase className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span className="text-[9px] sm:text-[11px] font-sans font-black tracking-tight block text-white drop-shadow-sm px-1 line-clamp-2 leading-tight">
                        {cat.label}
                      </span>
                    </div>
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
              <>
                {displayedJobs.map((job) => (
                  <motion.div key={job.id} variants={itemVariants}>
                    <JobCard job={job} />
                  </motion.div>
                ))}
                <InfiniteScrollLoader
                  hasMore={hasMore}
                  isLoadingMore={isLoadingMore}
                  onLoadMore={loadMore}
                  sentinelRef={sentinelRef}
                  totalCount={totalCount}
                  displayedCount={displayedCount}
                  itemLabel="jobs"
                />
              </>
            )}
          </motion.div>
        </div>
      </div>

      <HomepageFooter />
    </div>
  );
};
export default JobSeekerDashboard;
