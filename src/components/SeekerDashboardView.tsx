import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { JobCard } from "./JobCard";
import { JobCardSkeleton } from "./JobCardSkeleton";
import { getJobs, subscribeToJobs } from "../lib/services";
import { Job } from "../types";
import { getCategoryImage, getCategoryThemeColor } from "../lib/categories";
import { 
  Search, 
  Briefcase, 
  Banknote, 
  Sparkles, 
  Cpu, 
  HeartPulse, 
  Sparkle,
  ArrowRight,
  Clock
} from "lucide-react";
import { motion } from "motion/react";

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

export const getCategoryStyles = (catName: string) => {
  const name = catName.trim().toLowerCase();
  
  if (name === "all") {
    return {
      primary: "#334155",
      bgSelected: "bg-slate-100 text-slate-900 border-slate-400 font-semibold",
      bgUnselected: "bg-slate-800 text-white border-slate-800 hover:bg-slate-700/90",
      iconBgSelected: "bg-slate-800 text-white",
      iconBgUnselected: "bg-white text-slate-800",
      style: undefined
    };
  }
  
  if (name === "new") {
    return {
      primary: "#1E88E5",
      bgSelected: "bg-blue-50 text-blue-950 border-blue-300 font-semibold",
      bgUnselected: "bg-[#1E88E5] text-white border-[#1E88E5] hover:bg-blue-600",
      iconBgSelected: "bg-[#1E88E5] text-white",
      iconBgUnselected: "bg-white text-[#1E88E5]",
      style: undefined
    };
  }

  const categoryColor = getCategoryThemeColor(catName);
  return {
    primary: categoryColor,
    bgSelected: "bg-slate-50 text-slate-900 border-slate-300 font-semibold",
    bgUnselected: "text-white hover:opacity-95",
    iconBgSelected: "bg-white text-slate-800",
    iconBgUnselected: "bg-white/20 text-white",
    style: {
      backgroundColor: categoryColor,
      borderColor: categoryColor
    }
  };
};

export const SeekerDashboardView: React.FC = () => {
  const { currentUser } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(10);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(10);
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToJobs((allJobs) => {
      setJobs(allJobs);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Dynamically derive categories from current listings in database
  const uniqueCategoryNames: string[] = Array.from(new Set<string>(jobs.map(j => (j.category as string || "")).filter(Boolean)));

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
    ...uniqueCategoryNames.map(name => ({
      name,
      label: name,
      icon: getCategoryIcon(name)
    }))
  ];

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

      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        (job.title || "").toLowerCase().includes(q) ||
        (job.company || "").toLowerCase().includes(q) ||
        (job.description || "").toLowerCase().includes(q);
      return matchesCategory && matchesSearch;
    });

    if (selectedCategory === "New") {
      return [...list].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
    return list;
  })();

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 10);
      }
    }, {
      rootMargin: "250px"
    });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [sentinelRef, filteredJobs.length]);

  const displayedJobs = filteredJobs.slice(0, visibleCount);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pb-16 space-y-6">
      
      {/* Personalized Welcome Header Section */}
      <section className="space-y-4 text-slate-900 border-b border-slate-100 pb-3 text-left md:text-center md:flex md:flex-col md:items-center">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-slate-900">
            Welcome back, <span className="text-[#1E88E5]">{currentUser?.displayName || "Seeker"}</span>!
          </h1>
        </div>
      </section>

      {/* Main Discover Workspace Section */}
      <div id="jobs-explore" className="space-y-6 pt-0">
        {/* Search Input bar */}
        <div className="relative max-w-lg bg-slate-100/80 border border-slate-200 p-2.5 rounded-[24px] shadow-none hover:border-slate-300 focus-within:ring-2 focus-within:ring-[#1E88E5]/20 focus-within:border-[#1E88E5] transition-all duration-300 flex items-center gap-2.5 md:mx-auto">
          <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-1.5 bg-transparent text-sm font-normal focus:outline-none text-slate-800 placeholder-gray-400"
          />
          <span className="text-[10px] font-mono font-bold bg-white border border-slate-200 text-[#1E88E5] px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline">
            {filteredJobs.length} Matches
          </span>
        </div>

        {/* Carousel Categories Container */}
        <div className="space-y-2 text-left">
          <span className="text-[9px] font-mono font-bold text-[#0a3822] uppercase tracking-widest block px-1.5">
            Tap a Category Card to Filter
          </span>
          
          {/* Horizontal Scrolling Carousel with springy hover animations */}
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
                  {/* Category accent color transparent overlay */}
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
                  
                  {/* Overlay content */}
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
          className="space-y-4 max-w-4xl text-left mx-auto"
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
              {filteredJobs.length > visibleCount && (
                <div ref={sentinelRef} className="h-14 flex items-center justify-center pt-4">
                  <div className="w-6 h-6 border-2 border-[#1E88E5] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
