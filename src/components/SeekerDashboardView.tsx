import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { JobCard } from "./JobCard";
import { JobCardSkeleton } from "./JobCardSkeleton";
import { getJobs } from "../lib/services";
import { Job } from "../types";
import { 
  Search, 
  Briefcase, 
  Banknote, 
  Sparkles, 
  Cpu, 
  HeartPulse, 
  Sparkle 
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
        iconBg: "bg-blue-50 text-[#2563EB]"
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
        iconBg: "bg-rose-50 text-[#E11D48]"
      };
    case "Finance":
      return {
        name: "Finance",
        label: "Money & Finance",
        icon: Banknote,
        color: "bg-[#059669]",
        borderColor: "border-[#059669]",
        textColor: "text-[#059669]",
        hoverBg: "hover:bg-teal-50/50",
        iconBg: "bg-teal-50 text-[#059669]"
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
        iconBg: "bg-violet-50 text-[#7C3AED]"
      };
    default: {
      const colors = [
        { color: "bg-[#D97706]", text: "text-[#D97706]", border: "border-[#D97706]", iconBg: "bg-amber-50 text-[#D97706]" },
        { color: "bg-[#0891B2]", text: "text-[#0891B2]", border: "border-[#0891B2]", iconBg: "bg-cyan-50 text-[#0891B2]" },
        { color: "bg-[#4F46E5]", text: "text-[#4F46E5]", border: "border-[#4F46E5]", iconBg: "bg-indigo-50 text-[#4F46E5]" },
        { color: "bg-[#DB2777]", text: "text-[#DB2777]", border: "border-[#DB2777]", iconBg: "bg-pink-50 text-[#DB2777]" },
        { color: "bg-[#059669]", text: "text-[#059669]", border: "border-[#059669]", iconBg: "bg-emerald-50 text-[#059669]" }
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
        iconBg: theme.iconBg
      };
    }
  }
};

export const SeekerDashboardView: React.FC = () => {
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
      iconBg: "bg-emerald-50 text-[#0F5132]"
    },
    { 
      name: "Tech", 
      label: "Technology", 
      icon: Cpu,
      color: "bg-[#2563EB]", 
      borderColor: "border-[#2563EB]", 
      textColor: "text-[#2563EB]",
      hoverBg: "hover:bg-blue-50/50",
      iconBg: "bg-blue-50 text-[#2563EB]"
    },
    { 
      name: "Healthcare", 
      label: "Medical & Health", 
      icon: HeartPulse,
      color: "bg-[#E11D48]", 
      borderColor: "border-[#E11D48]", 
      textColor: "text-[#E11D48]",
      hoverBg: "hover:bg-rose-50/50",
      iconBg: "bg-rose-50 text-[#E11D48]"
    },
    { 
      name: "Finance", 
      label: "Money & Finance", 
      icon: Banknote,
      color: "bg-[#059669]", 
      borderColor: "border-[#059669]", 
      textColor: "text-[#059669]",
      hoverBg: "hover:bg-teal-50/50",
      iconBg: "bg-teal-50 text-[#059669]"
    },
    { 
      name: "AI & Analytics", 
      label: "Smart AI Systems", 
      icon: Sparkles,
      color: "bg-[#7C3AED]", 
      borderColor: "border-[#7C3AED]", 
      textColor: "text-[#7C3AED]",
      hoverBg: "hover:bg-violet-50/50",
      iconBg: "bg-violet-50 text-[#7C3AED]"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-8 sm:pb-16 space-y-6">
      
      {/* Personalized Welcome Header Section */}
      <section className="space-y-4 text-slate-900 border-b border-slate-100 pb-3 text-left">
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
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Browse premium open roles, refine listings with smart category filters, and message recruiters in real-time.
          </p>
        </div>
      </section>

      {/* Main Discover Workspace Section */}
      <div id="jobs-explore" className="space-y-6 pt-0">
        {/* Search Input bar - matching exact spec (rounded, thin dark solid border, lighter shadow, dark green search icon) */}
        <div className="relative max-w-2xl bg-white border border-[#0F5132] p-2 rounded-[28px] shadow-none flex items-center gap-2">
          <Search className="w-5 h-5 text-[#0F5132] ml-3 shrink-0" />
          <input
            type="text"
            placeholder="Type any job title, skill, or company name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 bg-transparent text-sm font-medium focus:outline-none text-slate-800 placeholder-slate-400"
          />
          <span className="text-xs font-mono font-bold bg-[#FAFDFB] border border-emerald-150 text-[#0F5132] px-3.5 py-2 rounded-xl uppercase tracking-wider shrink-0 hidden sm:inline">
            {filteredJobs.length} Matches
          </span>
        </div>

        {/* Carousel Categories Container */}
        <div className="space-y-2 text-left">
          <span className="text-[9px] font-mono font-bold text-[#0a3822] uppercase tracking-widest block px-1.5">
            Tap a Category Card to Filter
          </span>
          
          {/* Horizontal Scrolling Carousel - matching cards with thin solid accent borders and no shadow */}
          <div className="overflow-x-auto flex gap-3 pb-4 px-1 scrollbar-none snap-x snap-mandatory">
            {CATEGORIES.map((cat) => {
              const IconComp = cat.icon;
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`w-[28%] min-w-[110px] sm:w-auto sm:flex-1 flex-shrink-0 flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl cursor-pointer transition-all snap-start select-none border text-center space-y-2.5 ${
                    isSelected
                      ? `${cat.color} text-white ${cat.borderColor} shadow-none scale-[1.02]`
                      : `bg-white ${cat.textColor} ${cat.borderColor} hover:bg-slate-50 hover:shadow-none`
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isSelected ? "bg-white/15 text-white" : cat.iconBg
                  }`}>
                    <IconComp className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-sans font-extrabold tracking-tight block">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Job Accordions Feed */}
        <motion.div 
          className="space-y-4 max-w-4xl text-left"
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
