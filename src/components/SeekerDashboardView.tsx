import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { JobCard } from "./JobCard";
import { JobCardSkeleton } from "./JobCardSkeleton";
import { getJobs, subscribeToJobs } from "../lib/services";
import { Job } from "../types";
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

export const SeekerDashboardView: React.FC = () => {
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pb-16 space-y-6">
      
      {/* Personalized Welcome Header Section */}
      <section className="space-y-4 text-slate-900 border-b border-slate-100 pb-3 text-left md:text-center md:flex md:flex-col md:items-center">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#0F5132]/10 text-[#0F5132] rounded-lg">
            <Sparkle className="w-4 h-4" />
          </div>
          <span className="text-xs font-mono font-bold text-[#0F5132] uppercase tracking-wider">
            Verified Job Seeker Dashboard
          </span>
        </div>
        
        <div>
          <h1 className="text-3xl sm:text-4xl font-display font-black tracking-tight text-slate-900">
            Welcome back, <span className="text-[#0F5132]">{currentUser?.displayName || "Seeker"}</span>!
          </h1>
        </div>
      </section>

      {/* Main Discover Workspace Section */}
      <div id="jobs-explore" className="space-y-6 pt-0">
        {/* Search Input bar - Hover & Focus scale / shadow enhancements */}
        <div className="relative max-w-lg bg-white border border-[#0F5132] p-1.5 rounded-[24px] shadow-[0_16px_36px_-6px_rgba(15,81,50,0.03)] hover:border-[#0F5132] hover:shadow-[0_16px_40px_rgba(15,81,50,0.06)] focus-within:ring-4 focus-within:ring-[#0F5132]/10 focus-within:scale-[1.015] transition-all duration-300 flex items-center gap-2 md:mx-auto">
          <Search className="w-4.5 h-4.5 text-[#0F5132] ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Type any job title, skill, or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-1 bg-transparent text-xs font-medium focus:outline-none text-slate-800 placeholder-slate-400"
          />
          <span className="text-[10px] font-mono font-bold bg-[#FAFDFB] border border-emerald-150 text-[#0F5132] px-3 py-1.5 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline">
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
            filteredJobs.map((job) => (
              <motion.div key={job.id} variants={itemVariants}>
                <JobCard job={job} />
              </motion.div>
            ))
          )}
        </motion.div>
      </div>
    </div>
  );
};
