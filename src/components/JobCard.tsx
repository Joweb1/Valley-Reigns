import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Job } from "../types";
import { incrementJobImpressions, simulateIncomingChat } from "../lib/services";
import { getCategoryImage, getCategoryThemeColor } from "../lib/categories";
import { 
  ChevronDown, 
  MapPin, 
  Banknote, 
  Calendar, 
  Flame, 
  CheckCircle, 
  Send, 
  Check, 
  Copy,
  Home,
  Scissors,
  UserCheck,
  Laptop,
  Sparkles,
  Utensils,
  Heart,
  Briefcase,
  Clock,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ThemeStyle {
  primary: string;
  bgLight: string;
  textPrimary: string;
  textDark: string;
  borderLight: string;
  badgeBg: string;
  btnBg: string;
  btnHover: string;
  icon: React.ReactNode;
  imageUrl: string;
  workDays: string;
  duration: string;
}

const getJobTheme = (category: string, title: string): ThemeStyle => {
  const normalizedCategory = (category || "").toLowerCase();
  const normalizedTitle = (title || "").toLowerCase();

  if (category && category !== "All" && category !== "New") {
    const primary = getCategoryThemeColor(category);
    const imageUrl = getCategoryImage(category);
    return {
      primary,
      bgLight: "bg-slate-50",
      textPrimary: "text-slate-700",
      textDark: "text-slate-900",
      borderLight: "border-slate-200",
      badgeBg: "bg-slate-500/10",
      btnBg: "",
      btnHover: "hover:opacity-90",
      icon: <Briefcase className="w-5 h-5 text-white" />,
      imageUrl,
      workDays: "5 Days a Week",
      duration: "1 Year"
    };
  }

  if (
    normalizedCategory.includes("house") || 
    normalizedTitle.includes("house") || 
    normalizedTitle.includes("maid") || 
    normalizedTitle.includes("domestic") || 
    normalizedTitle.includes("home help")
  ) {
    return {
      primary: "#2E7D32", // Green
      bgLight: "bg-emerald-50",
      textPrimary: "text-emerald-700",
      textDark: "text-emerald-950",
      borderLight: "border-emerald-100",
      badgeBg: "bg-emerald-500/10",
      btnBg: "bg-[#2E7D32]",
      btnHover: "hover:bg-[#1B5E20]",
      icon: <Home className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "6 Days a Week",
      duration: "1 Year"
    };
  } else if (
    normalizedCategory.includes("hair") || 
    normalizedTitle.includes("hair") || 
    normalizedTitle.includes("barber") || 
    normalizedTitle.includes("dress") || 
    normalizedTitle.includes("stylist") ||
    normalizedTitle.includes("salon")
  ) {
    return {
      primary: "#6A1B9A", // Purple
      bgLight: "bg-purple-50",
      textPrimary: "text-purple-700",
      textDark: "text-purple-950",
      borderLight: "border-purple-100",
      badgeBg: "bg-purple-500/10",
      btnBg: "bg-[#6A1B9A]",
      btnHover: "hover:bg-[#4A148C]",
      icon: <Scissors className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "6 Days a Week",
      duration: "1 Year"
    };
  } else if (
    normalizedCategory.includes("manager") || 
    normalizedTitle.includes("manager") || 
    normalizedTitle.includes("exec") || 
    normalizedTitle.includes("director") || 
    normalizedTitle.includes("supervisor")
  ) {
    return {
      primary: "#C2185B", // Pink/Rose
      bgLight: "bg-rose-50",
      textPrimary: "text-rose-700",
      textDark: "text-rose-950",
      borderLight: "border-rose-100",
      badgeBg: "bg-rose-500/10",
      btnBg: "bg-[#C2185B]",
      btnHover: "hover:bg-[#880E4F]",
      icon: <UserCheck className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "5 Days a Week",
      duration: "2 Years"
    };
  } else if (
    normalizedCategory.includes("office") || 
    normalizedTitle.includes("office") || 
    normalizedTitle.includes("clerk") || 
    normalizedTitle.includes("admin") || 
    normalizedTitle.includes("assist") || 
    normalizedTitle.includes("secretary") || 
    normalizedTitle.includes("desk")
  ) {
    return {
      primary: "#1565C0", // Blue
      bgLight: "bg-blue-50",
      textPrimary: "text-blue-700",
      textDark: "text-blue-950",
      borderLight: "border-blue-100",
      badgeBg: "bg-blue-500/10",
      btnBg: "bg-[#1565C0]",
      btnHover: "hover:bg-[#0D47A1]",
      icon: <Laptop className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "5 Days a Week",
      duration: "1 Year"
    };
  } else if (
    normalizedCategory.includes("clean") || 
    normalizedTitle.includes("cleaner") || 
    normalizedTitle.includes("janitor")
  ) {
    return {
      primary: "#00838F", // Teal
      bgLight: "bg-cyan-50",
      textPrimary: "text-cyan-700",
      textDark: "text-cyan-950",
      borderLight: "border-cyan-100",
      badgeBg: "bg-cyan-500/10",
      btnBg: "bg-[#00838F]",
      btnHover: "hover:bg-[#006064]",
      icon: <Sparkles className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "6 Days a Week",
      duration: "1 Year"
    };
  } else if (
    normalizedCategory.includes("kitchen") || 
    normalizedTitle.includes("kitchen") || 
    normalizedTitle.includes("chef") || 
    normalizedTitle.includes("cook") || 
    normalizedTitle.includes("food") ||
    normalizedTitle.includes("baker")
  ) {
    return {
      primary: "#E65100", // Orange
      bgLight: "bg-orange-50",
      textPrimary: "text-orange-700",
      textDark: "text-orange-950",
      borderLight: "border-orange-100",
      badgeBg: "bg-orange-500/10",
      btnBg: "bg-[#E65100]",
      btnHover: "hover:bg-[#BF360C]",
      icon: <Utensils className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "6 Days a Week",
      duration: "1 Year"
    };
  } else if (
    normalizedCategory.includes("health") || 
    normalizedCategory.includes("medical") ||
    normalizedTitle.includes("nurse") ||
    normalizedTitle.includes("doctor") ||
    normalizedTitle.includes("health")
  ) {
    return {
      primary: "#00897B", // Teal/Mint
      bgLight: "bg-teal-50",
      textPrimary: "text-teal-700",
      textDark: "text-teal-950",
      borderLight: "border-teal-100",
      badgeBg: "bg-teal-500/10",
      btnBg: "bg-[#00897B]",
      btnHover: "hover:bg-[#004D40]",
      icon: <Heart className="w-5 h-5 text-white" />,
      imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=400&h=533",
      workDays: "5 Days a Week",
      duration: "1 Year"
    };
  } else {
    let defaultImg = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=400&h=533";
    let defaultIcon = <Briefcase className="w-5 h-5 text-white" />;
    let defaultColor = "#1565C0";
    let bgLight = "bg-blue-50";
    let textPrimary = "text-blue-700";
    let textDark = "text-blue-950";
    let borderLight = "border-blue-100";
    let btnBg = "bg-[#1565C0]";
    let btnHover = "hover:bg-[#0D47A1]";

    if (normalizedCategory.includes("tech") || normalizedTitle.includes("architect")) {
      defaultImg = "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=400&h=533";
      defaultIcon = <Laptop className="w-5 h-5 text-white" />;
    } else if (normalizedCategory.includes("ai") || normalizedTitle.includes("ai") || normalizedCategory.includes("analytics")) {
      defaultImg = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=400&h=533";
      defaultIcon = <Sparkles className="w-5 h-5 text-white" />;
      defaultColor = "#4A148C";
      bgLight = "bg-purple-50";
      textPrimary = "text-purple-700";
      textDark = "text-purple-950";
      borderLight = "border-purple-100";
      btnBg = "bg-[#4A148C]";
      btnHover = "hover:bg-[#310C5E]";
    } else if (normalizedCategory.includes("finance") || normalizedCategory.includes("pay") || normalizedTitle.includes("engineer")) {
      defaultImg = "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=400&h=533";
      defaultIcon = <Banknote className="w-5 h-5 text-white" />;
      defaultColor = "#00796B";
      bgLight = "bg-teal-50";
      textPrimary = "text-teal-700";
      textDark = "text-teal-950";
      borderLight = "border-teal-100";
      btnBg = "bg-[#00796B]";
      btnHover = "hover:bg-[#004D40]";
    }

    return {
      primary: defaultColor,
      bgLight,
      textPrimary,
      textDark,
      borderLight,
      badgeBg: "bg-slate-500/10",
      btnBg,
      btnHover,
      icon: defaultIcon,
      imageUrl: defaultImg,
      workDays: "5 Days a Week",
      duration: "1 Year"
    };
  }
};

interface JobCardProps {
  job: Job;
  onImpressionsUpdate?: () => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onImpressionsUpdate }) => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [sendingInApp, setSendingInApp] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [webhookSent, setWebhookSent] = useState(false);
  const [localImpressions, setLocalImpressions] = useState(job.impressions);
  const [copied, setCopied] = useState(false);
  const [showRestrictedModal, setShowRestrictedModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize(); // run initially
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const isStaffOrAdmin = currentUser?.role === "staff" || currentUser?.role === "admin";

  const handleRestrictedAction = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowRestrictedModal(true);
  };

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

  const isInApp = currentUser?.messagingPreference === "in-app";

  const handleInAppApply = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!currentUser) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    setSendingInApp(true);
    try {
      const seekerPhoneIdentifier = currentUser.displayName || currentUser.email || "Unknown Seeker";
      const initialMsg = `Hello! I'm interested in applying for the ${job.title} position. Reference ID: ${job.id}`;
      
      await simulateIncomingChat(seekerPhoneIdentifier, initialMsg, job.id, job.title, currentUser.uid);
      navigate(`/seeker/messages?jobId=${job.id}`);
    } catch (err) {
      console.error("Failed to initialize in-app chat:", err);
    } finally {
      setSendingInApp(false);
    }
  };

  // Sync state if job prop changes
  React.useEffect(() => {
    setLocalImpressions(job.impressions);
  }, [job.impressions]);

  const handleToggle = async () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState) {
      // Update views counter locally first
      setLocalImpressions(prev => prev + 1);
      // Fire in the background, don't await or trigger parent re-fetch
      incrementJobImpressions(job.id).catch(console.error);
    }
  };

  // Compile formatted WhatsApp deep link
  const messageText = `I am applying for the ${job.title} position. Reference ID: ${job.id}`;
  const whatsappLink = `https://wa.me/?text=${encodeURIComponent(messageText)}`;

  // Simulates direct application routing
  const triggerMockWebhook = async () => {
    setWebhookSent(true);
    const mockPhones = ["+234 803 123 4567", "+234 812 345 6789", "+234 905 678 9012", "+234 701 234 5678"];
    const randomPhone = mockPhones[Math.floor(Math.random() * mockPhones.length)];
    const mockMessageText = `Hello! I'm interested in the ${job.title} position. Reference ID: ${job.id}`;
    
    await simulateIncomingChat(randomPhone, mockMessageText, job.id, job.title);
    
    setTimeout(() => {
      setWebhookSent(false);
    }, 4000);
  };

  const formattedSalary = job.salary.replace(/\$/g, "₦");

  const theme = getJobTheme(job.category, job.title);

  // Responsive truncation rules for mobile vs desktop
  const shortTitle = isMobile
    ? (job.title.trim().split(/\s+/).length > 2
        ? job.title.trim().split(/\s+/).slice(0, 2).join(" ") + "..."
        : job.title)
    : job.title;

  const shortLocation = isMobile
    ? (job.location.trim().split(/\s+/).length > 2
        ? job.location.trim().split(/\s+/).slice(0, 2).join(" ") + "..."
        : job.location)
    : (job.location.length > 28 ? job.location.substring(0, 25).trim() + "..." : job.location);

  const shortDescription = isMobile
    ? (job.description.length > 40 ? job.description.substring(0, 37).trim() + "..." : job.description)
    : (job.description.length > 120 ? job.description.substring(0, 117).trim() + "..." : job.description);

  return (
    <div 
      id={`job-card-${job.id}`} 
      className={`bg-white border border-slate-200 rounded-[24px] sm:rounded-[32px] overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 text-left relative flex flex-col border-l-4 ${isOpen ? "ring-1" : ""}`}
      style={{ borderLeftColor: theme.primary, borderColor: isOpen ? theme.primary : undefined }}
    >
      {/* Top main split row */}
      <div className="flex flex-row w-full relative">
        {/* Left Section: Rounded image with curve overlay */}
        <div className="relative w-1/4 shrink-0 overflow-hidden bg-slate-50 self-stretch">
          {imageLoading && (
            <div className="absolute inset-0 animate-shimmer" />
          )}
          <img 
            src={theme.imageUrl} 
            alt={job.title} 
            onLoad={() => setImageLoading(false)}
            className={`absolute inset-0 w-full h-full object-cover grayscale-[10%] group-hover/card:scale-105 transition-all duration-500 ${imageLoading ? "opacity-0" : "opacity-100"}`} 
            referrerPolicy="no-referrer"
          />
          {/* Curved Mask Overlay on right of the image (desktop only) */}
          <div className="absolute top-0 right-0 bottom-0 w-8 bg-white pointer-events-none hidden md:block z-10">
            <svg className="h-full w-full" viewBox="0 0 32 100" preserveAspectRatio="none" fill="currentColor">
              <path d="M32,0 L32,100 L0,100 C16,70 16,30 0,0 Z" className="text-white" />
            </svg>
          </div>
        </div>

        {/* OVERLAPPING ROUNDED BADGE EXACTLY SITUATED ON DECORATIVE ARC DIVIDE */}
        <div 
          className="absolute left-[20%] top-[82%] -translate-y-1/2 -translate-x-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-white shadow-md border-2"
          style={{ borderColor: theme.primary }}
        >
          <div 
            className="w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center"
            style={{ backgroundColor: theme.primary }}
          >
            {theme.icon}
          </div>
        </div>

        {/* Right Section: Details */}
        <div className="flex-1 py-2.5 px-3.5 sm:py-4 sm:px-6 flex flex-col justify-between space-y-1.5 sm:space-y-2 pl-5 sm:pl-7 bg-white rounded-tl-[20px] sm:rounded-tl-[24px] -ml-4 relative z-10">
          {/* Top Header Row */}
          <div className="flex items-center justify-between gap-4 w-full">
            {/* Vacancy Badge */}
            <span 
              className="text-[8px] sm:text-[9px] font-sans font-black tracking-widest text-white px-2 py-0.5 rounded uppercase"
              style={{ backgroundColor: theme.primary }}
            >
              Vacancy
            </span>

            {/* Location pill */}
            <div 
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full border border-opacity-30 ${theme.bgLight}`}
              style={{ borderColor: theme.primary }}
            >
              <MapPin className="w-3 h-3 shrink-0" style={{ color: theme.primary }} />
              <span className="text-[9px] sm:text-[10px] font-sans font-bold leading-none" style={{ color: theme.primary }}>
                {shortLocation}
              </span>
            </div>
          </div>

          {/* Title */}
          <div className="text-left">
            <h3 
              className="text-sm sm:text-base font-sans font-black tracking-wide leading-snug uppercase cursor-pointer hover:opacity-85 transition-opacity"
              style={{ color: theme.primary }}
              onClick={handleToggle}
            >
              {shortTitle}
            </h3>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 border-t border-b border-slate-100 py-1.5 my-0.5">
            <div className="text-left">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
              <div className="flex items-center gap-1 mt-0.5 font-sans font-extrabold text-[10px] sm:text-[11px] text-slate-700">
                <Calendar className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primary }} />
                <span className="truncate">{theme.duration}</span>
              </div>
            </div>
            
            <div className="text-left">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Salary</span>
              <div className="flex items-center gap-1 mt-0.5 font-sans font-extrabold text-[10px] sm:text-[11px] text-slate-700">
                <Banknote className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primary }} />
                <span className="truncate">{formattedSalary.split(" ")[0]}</span>
              </div>
            </div>

            <div className="text-left">
              <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Work Days</span>
              <div className="flex items-center gap-1 mt-0.5 font-sans font-extrabold text-[10px] sm:text-[11px] text-slate-700">
                <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primary }} />
                <span className="truncate">{theme.workDays}</span>
              </div>
            </div>
          </div>

          {/* Description & Action Trigger block */}
          <div className="text-left space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between gap-4 pt-1 sm:pt-1.5">
              {/* Show/Hide requirements toggle */}
              <button 
                onClick={handleToggle}
                className="text-[9px] sm:text-[10px] font-sans font-black hover:opacity-80 flex items-center gap-1 uppercase tracking-wider transition-all"
                style={{ color: theme.primary }}
              >
                <span>{isOpen ? "Hide Details" : "Show Details"}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Core Apply Action Button */}
              <div onClick={(e) => e.stopPropagation()}>
                <motion.div whileHover="hover" whileTap="tap">
                  {isStaffOrAdmin ? (
                    <motion.button
                      variants={{ hover: { scale: 1.03 }, tap: { scale: 0.97 } }}
                      onClick={handleCopyLink}
                      className="relative z-10 px-3 py-1.5 sm:px-4 sm:py-2 text-white font-sans font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider border-0"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <div className="flex items-center justify-center shrink-0">
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-white" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                      <span>{copied ? "Copied!" : "Copy Link"}</span>
                    </motion.button>
                  ) : isInApp ? (
                    <motion.button
                      variants={{ hover: { scale: 1.03 }, tap: { scale: 0.97 } }}
                      onClick={handleInAppApply}
                      disabled={sendingInApp}
                      className="relative z-10 px-3 py-1.5 sm:px-4 sm:py-2 text-white font-sans font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider border-0 disabled:opacity-75"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <div className="flex items-center justify-center shrink-0">
                        <Send className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span>{sendingInApp ? "Wait..." : "Apply Now"}</span>
                    </motion.button>
                  ) : (
                    <motion.a
                      variants={{ hover: { scale: 1.03 }, tap: { scale: 0.97 } }}
                      href={whatsappLink}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      rel="noreferrer"
                      className="relative z-10 px-3 py-1.5 sm:px-4 sm:py-2 text-white font-sans font-black text-[10px] sm:text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider inline-flex decoration-none border-0"
                      style={{ backgroundColor: theme.primary }}
                    >
                      <div className="flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.458 5.704 1.459h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                      </div>
                      <span>Apply Now</span>
                    </motion.a>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion Expandable details - rendered cleanly in card flow */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="w-full border-t border-slate-100 bg-slate-50/50 rounded-b-[24px] sm:rounded-b-[32px] overflow-hidden"
          >
            <div className="p-5 sm:p-6 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-3">
                <span 
                  className="px-2.5 py-0.5 text-white rounded-full text-[9px] font-sans font-extrabold tracking-wide shadow-sm"
                  style={{ backgroundColor: theme.primary }}
                >
                  {job.category}
                </span>
                <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 font-sans font-extrabold rounded-full text-[9px] border border-slate-200">
                  {job.type}
                </span>
                {localImpressions > 50 && (
                  <span className="flex items-center gap-1 text-[9px] font-mono font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    <Flame className="w-3 h-3 fill-amber-500 stroke-amber-500" />
                    Popular ({localImpressions} Views)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-150">
                <div className="space-y-1">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-slate-400 uppercase">
                    Hiring Organization
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#111827] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs block truncate w-full">
                      {job.company}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-slate-400 uppercase">
                    Salary Details
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#111827] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5 w-full">
                      <Banknote className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primary }} />
                      <span className="truncate">{formattedSalary}</span>
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <h4 className="text-[9px] font-mono font-black tracking-widest text-slate-400 uppercase">
                    Full Address
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-extrabold text-[#111827] bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs flex items-center gap-1.5 w-full">
                      <MapPin className="w-3.5 h-3.5 shrink-0" style={{ color: theme.primary }} />
                      <span className="truncate" title={job.location}>{job.location}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Full Job Description & Scope */}
              <div className="space-y-2 text-left bg-white p-4 rounded-xl border border-slate-150">
                <h4 className="text-[9px] font-mono font-black tracking-widest text-slate-400 uppercase">
                  Full Job Description & Scope
                </h4>
                <p className="text-xs font-sans text-slate-700 font-medium leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* Requirements */}
              <div className="space-y-2.5">
                <h4 className="text-[9px] font-mono font-black tracking-widest text-slate-400 uppercase">
                  Candidate Requirements
                </h4>
                <ul className="space-y-1.5">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs font-sans text-slate-700 font-medium">
                      <div 
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white"
                        style={{ backgroundColor: theme.primary }}
                      >
                        <Check className="w-2.5 h-2.5" />
                      </div>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Utility Panel */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[9px] font-mono text-slate-400">
                  <Calendar className="w-3.5 h-3.5" />
                  Posted {new Date(job.createdAt).toLocaleDateString()}
                  <span className="mx-1.5">•</span>
                  <span>ID: {job.id}</span>
                  <span className="mx-1.5">•</span>
                  <span>{localImpressions} views</span>
                </div>

                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopyLink}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 text-[#111827] rounded-lg text-[10px] font-sans font-black flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:bg-slate-50"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Copied Link!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 shrink-0" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showRestrictedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRestrictedModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-white border-2 border-[#1E88E5] rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Top border decoration */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#1E88E5]" />
              
              <div className="space-y-6 pt-2">
                <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 mx-auto">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                
                <div className="space-y-3 text-center">
                  <h3 className="text-xl sm:text-2xl font-sans font-black text-black tracking-tight">
                    Action Restricted
                  </h3>
                  <p className="text-sm font-sans font-semibold text-slate-600 leading-relaxed">
                    You are currently logged in as a <span className="text-[#1E88E5] font-extrabold uppercase">{currentUser?.role}</span>.
                  </p>
                  <p className="text-sm font-sans font-semibold text-slate-500 leading-relaxed">
                    Staff and Admin accounts are only authorized to manage jobs, supervise communication streams, and check diagnostics. To apply for jobs or send messages, please sign in with a Candidate account.
                  </p>
                </div>
                
                <div className="relative inline-block w-full">
                  {/* Background offset box */}
                  <div className="absolute -left-1 -top-1 w-full h-full border-2 border-[#1E88E5] rounded-xl bg-transparent pointer-events-none" />
                  {/* Main button */}
                  <button
                    onClick={() => setShowRestrictedModal(false)}
                    className="relative z-10 w-full px-5 py-3.5 bg-[#1E88E5] text-white hover:bg-[#1565C0] font-bold text-sm rounded-xl text-center shadow-md active:translate-x-[-1px] active:translate-y-[-1px] transition-all cursor-pointer border-0"
                  >
                    Understood
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
