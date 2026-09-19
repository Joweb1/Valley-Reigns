import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { 
  Briefcase, 
  MapPin, 
  Banknote, 
  Calendar, 
  Building2, 
  Check, 
  Share2, 
  ArrowLeft, 
  Send,
  Sparkles
} from "lucide-react";
import { getJobById, incrementJobImpressions, simulateIncomingChat } from "../lib/services";
import { Job } from "../types";
import { applyJobSEOTags, resetPlatformSEOTags, generateJobSEOMetadata } from "../lib/seo";
import { getCategoryImage } from "../lib/categories";
import { useAuth } from "../context/AuthContext";
import { copyToClipboard } from "../lib/clipboard";
import { PreparingMessageOverlay } from "./PreparingMessageOverlay";

export const PublicJobView: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const refStaffId = searchParams.get("ref") || "";

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [appliedSuccess, setAppliedSuccess] = useState(false);
  const [isPreparingMessage, setIsPreparingMessage] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadJob() {
      if (!jobId) {
        setError("Invalid Job Identifier");
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const found = await getJobById(jobId);
        if (!isMounted) return;

        if (found) {
          setJob(found);
          // Apply dynamic SEO, OpenGraph tags and Google JobPosting structured data to document head
          applyJobSEOTags(found);
          // Register public view impression
          incrementJobImpressions(found.id);
        } else {
          setError("This job opening could not be found or has expired.");
        }
      } catch (err) {
        console.error("Failed to load job:", err);
        if (isMounted) setError("Error fetching job details.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadJob();

    // Clean up SEO tags when unmounting to preserve platform default metadata
    return () => {
      isMounted = false;
      resetPlatformSEOTags();
    };
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-[#1E88E5] rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-slate-800">Loading Job Opening...</h2>
        <p className="text-xs text-slate-500 mt-1">Retrieving verified vacancy details.</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mb-4 border border-rose-100">
          <Briefcase className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Job Opening Not Found</h1>
        <p className="text-sm text-slate-600 max-w-md mt-2">
          {error || "The requested job position is unavailable or may have been closed."}
        </p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Explore All Active Vacancies</span>
        </Link>
      </div>
    );
  }

  const categoryImage = getCategoryImage(job.category);
  const seoData = job.seo || generateJobSEOMetadata(job);
  
  const isStaffOrAdmin = currentUser && (currentUser.role === "staff" || currentUser.role === "admin");
  const effectiveRef = isStaffOrAdmin ? currentUser.uid : refStaffId;
  const refQuery = effectiveRef ? `?ref=${effectiveRef}` : "";
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/jobs/${job.id}${refQuery}` 
    : `https://valley-reigns.onrender.com/jobs/${job.id}${refQuery}`;

  const handleCopyLink = async () => {
    try {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {
      console.debug("Copy error:", e);
    }
  };

  const handleShareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: seoData.metaTitle,
          text: seoData.metaDescription,
          url: shareUrl
        });
      } catch (e) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDirectApply = async () => {
    if (!currentUser) {
      // User is not signed in: store pending application intent and trigger Auth Modal
      sessionStorage.setItem("vr_pending_job_apply", JSON.stringify({
        jobId: job.id,
        jobTitle: job.title,
        company: job.company,
        salary: job.salary,
        refStaffId: effectiveRef || undefined
      }));

      window.dispatchEvent(new CustomEvent("open-auth-modal", {
        detail: {
          tab: "signin",
          role: "seeker",
          pendingJob: { jobId: job.id, jobTitle: job.title, refStaffId: effectiveRef || undefined }
        }
      }));
      return;
    }

    // User is signed in: directly send the initial chat message and navigate to chat
    setApplying(true);
    setIsPreparingMessage(true);
    try {
      const seekerPhoneIdentifier = currentUser.displayName || currentUser.email || "Candidate";
      const initialMsg = `Hello! I'm interested in applying for the ${job.title} position at ${job.company}. Reference ID: ${job.id}`;

      await Promise.all([
        simulateIncomingChat(seekerPhoneIdentifier, initialMsg, job.id, job.title, currentUser.uid, effectiveRef || undefined),
        new Promise((resolve) => setTimeout(resolve, 1000))
      ]);
      setAppliedSuccess(true);
      setIsPreparingMessage(false);
      navigate(`/seeker/messages?jobId=${job.id}`);
    } catch (err) {
      console.error("Direct application error:", err);
      setIsPreparingMessage(false);
      navigate(`/seeker/messages?jobId=${job.id}`);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 antialiased pb-20">
      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        
        {/* Navigation / Share Breadcrumb Bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            title="Back to All Jobs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Vacancies</span>
          </button>

          <button
            onClick={handleShareNative}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
            title="Share Job Opening"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">Link Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Share Job</span>
              </>
            )}
          </button>
        </div>

        {/* Main Job Hero Card */}
        <section className="bg-white border border-slate-200/90 rounded-[28px] sm:rounded-[36px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative">
          
          {/* Top Banner Image with Gradient */}
          <div className="relative h-48 sm:h-64 w-full overflow-hidden bg-slate-900">
            <img
              src={categoryImage}
              alt={`${job.title} - ${job.category}`}
              className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
            
            {/* Category tag on category image background - bluishly transparent with blur backdrop */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span 
                className="px-3.5 py-1 rounded-full text-xs font-sans font-bold text-white bg-blue-900/60 backdrop-blur-md border border-blue-400/30 uppercase tracking-wider shadow-sm"
              >
                {job.category}
              </span>
            </div>

            {/* Bottom Title in Hero */}
            <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 right-4 sm:right-8 text-white">
              <h1 className="text-xl sm:text-3xl font-sans font-black tracking-tight uppercase leading-snug drop-shadow-md">
                {job.title}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs sm:text-sm font-semibold text-slate-200">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-white/80" />
                  {job.company}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-white/80" />
                  {job.location}
                </span>
                <span>•</span>
                <span className="px-2 py-0.5 rounded bg-white/20 text-[11px] font-mono font-bold">
                  {job.type}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar - 3 Columns without Indexed Status */}
          <div className="grid grid-cols-3 divide-x divide-slate-150 bg-slate-50/80 border-b border-slate-200 p-4 sm:p-5">
            <div className="px-3 py-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Compensation</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Banknote className="w-4 h-4 text-emerald-600" />
                {job.salary}
              </span>
            </div>

            <div className="px-3 py-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Job Type</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-blue-600" />
                {job.type}
              </span>
            </div>

            <div className="px-3 py-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">Date Listed</span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-600" />
                {new Date(job.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Job Details Body */}
          <div className="p-6 sm:p-8 space-y-8">
            {/* Description */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-black tracking-widest text-slate-400 uppercase">
                Job Overview & Scope
              </h2>
              <div className="text-sm sm:text-base font-sans text-slate-700 leading-relaxed font-normal whitespace-pre-line bg-slate-50/50 p-5 rounded-2xl border border-slate-150">
                {job.description}
              </div>
            </div>

            {/* Candidate Requirements */}
            <div className="space-y-3">
              <h2 className="text-xs font-mono font-black tracking-widest text-slate-400 uppercase">
                Key Requirements & Qualifications
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {job.requirements.map((req, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-xl shadow-xs"
                  >
                    <div 
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white shadow-xs bg-[#1E88E5]"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <span className="text-xs sm:text-sm font-sans font-medium text-slate-800 leading-snug">
                      {req}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Application or Recruiter Action Bar */}
            {isStaffOrAdmin ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                      {currentUser.role === "admin" ? "Admin Access" : "Staff Recruiter View"}
                    </span>
                    <h3 className="text-base sm:text-lg font-bold">Referral Candidate Link</h3>
                  </div>
                  <p className="text-xs text-slate-300 max-w-lg">
                    Share this job opening with candidates. Inquiries from candidates who apply through your link will be automatically routed and assigned directly to you.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Referral Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-4 h-4" />
                        <span>Copy Referral Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-[#1565C0] to-[#1E88E5] rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
                <div className="space-y-1 text-center sm:text-left">
                  <h3 className="text-lg font-bold">Ready to apply for this position?</h3>
                  <p className="text-xs text-blue-100 max-w-lg">
                    Direct routing connects your candidate profile straight with the hiring manager without middleman delays.
                  </p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={handleDirectApply}
                    disabled={applying || appliedSuccess}
                    className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-100 text-[#1565C0] text-xs font-black rounded-xl shadow-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer disabled:opacity-75"
                  >
                    <Send className="w-4 h-4 text-[#1E88E5]" />
                    <span>{appliedSuccess ? "Application Submitted!" : applying ? "Connecting..." : "Submit Direct Application"}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Fixed Floating Apply Now CTA Button (Hidden for Authenticated Staff and Admin) */}
      {!isStaffOrAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ 
            opacity: 1,
            y: [0, -10, 0, -4, 0]
          }}
          transition={{
            opacity: { duration: 0.3, ease: "easeOut" },
            y: {
              duration: 1.2,
              repeat: Infinity,
              repeatDelay: 3.5,
              ease: "easeInOut",
              times: [0, 0.3, 0.6, 0.8, 1]
            }
          }}
          className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50"
        >
          <motion.button
            id="floating-apply-now-btn"
            type="button"
            onClick={handleDirectApply}
            disabled={applying || appliedSuccess}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            aria-label="Apply Now for this job"
            className="flex items-center gap-2.5 px-5 py-3.5 sm:px-6 sm:py-3.5 bg-[#0B1B3D] hover:bg-[#07132c] text-white rounded-full border border-slate-700/60 transition-colors cursor-pointer disabled:opacity-85"
          >
            {appliedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                <span className="font-bold text-sm tracking-wide">
                  Applied!
                </span>
              </>
            ) : applying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span className="font-bold text-sm tracking-wide">
                  Connecting...
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
                </span>
                <span className="font-bold text-sm tracking-wide">
                  Apply Now
                </span>
                <Send className="w-3.5 h-3.5 text-blue-300" />
              </>
            )}
          </motion.button>
        </motion.div>
      )}

      {/* Fullscreen Preparing Message Overlay with Animated Loading Dots */}
      <PreparingMessageOverlay
        isVisible={isPreparingMessage}
        title="Preparing Message..."
        subtitle={`Submitting direct inquiry for ${job.title} and assigning your conversation...`}
        jobTitle={job.title}
      />
    </div>
  );
};

export default PublicJobView;
