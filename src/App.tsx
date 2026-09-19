import React, { useState, useEffect, Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { NotificationProvider } from "./context/NotificationContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Header } from "./components/Header";
import { NetworkStatusMonitor } from "./components/NetworkStatusMonitor";
import { RouteLoadingFallback } from "./components/RouteLoadingFallback";
import { RoleBottomNavigation } from "./components/RoleBottomNavigation";
import { RoleSettingsSheets } from "./components/RoleSettingsSheets";
import { AdminModals } from "./components/AdminModals";
import { PreparingMessageOverlay } from "./components/PreparingMessageOverlay";

// Lazy-loaded auxiliary modals & overlays
const AuthModal = lazy(() => import("./components/AuthModal").then(m => ({ default: m.AuthModal })));
const PwaInstallPrompt = lazy(() => import("./components/PwaInstallPrompt").then(m => ({ default: m.PwaInstallPrompt })));
const AnniversaryGraffitiIntro = lazy(() => import("./components/AnniversaryGraffitiIntro").then(m => ({ default: m.AnniversaryGraffitiIntro })));

// ==========================================
// ANNIVERSARY CELEBRATION CONFIGURATION
// Set to true to re-enable the anniversary celebration intro, animations, and banner for next year's anniversary.
// Keep set to false during regular operation.
export const ENABLE_ANNIVERSARY_CELEBRATION = false;
// ==========================================

// Lazy-loaded route components for high performance route-level code splitting
const JobSeekerDashboard = lazy(() => import("./components/JobSeekerDashboard"));
const StaffDashboardView = lazy(() => import("./components/StaffDashboardView"));
const AdminDashboardView = lazy(() => import("./components/AdminDashboardView"));
const StaffPortalInvite = lazy(() => import("./components/StaffPortalInvite"));
const SeekerDashboardView = lazy(() => import("./components/SeekerDashboardView").then(m => ({ default: m.SeekerDashboardView })));
const SeekerMessagesView = lazy(() => import("./components/SeekerMessagesView").then(m => ({ default: m.SeekerMessagesView })));
const SeekerNotifications = lazy(() => import("./components/SeekerNotifications").then(m => ({ default: m.SeekerNotifications })));
const StaffNotifications = lazy(() => import("./components/StaffNotifications").then(m => ({ default: m.StaffNotifications })));
const AdminNotifications = lazy(() => import("./components/AdminNotifications").then(m => ({ default: m.AdminNotifications })));
const AdminPostJobPage = lazy(() => import("./components/AdminPostJobPage").then(m => ({ default: m.AdminPostJobPage })));
const ContactsPage = lazy(() => import("./components/ContactsPage").then(m => ({ default: m.ContactsPage })));
const EmployerManagementPage = lazy(() => import("./components/EmployerManagementPage").then(m => ({ default: m.EmployerManagementPage })));
const StaffPromotionPage = lazy(() => import("./components/StaffPromotionPage").then(m => ({ default: m.StaffPromotionPage })));
const AdminDiagnosticsPage = lazy(() => import("./components/AdminDiagnosticsPage").then(m => ({ default: m.AdminDiagnosticsPage })));
const JobManagement = lazy(() => import("./components/JobManagement").then(m => ({ default: m.JobManagement })));
const EmployerMessagesView = lazy(() => import("./components/EmployerMessagesView").then(m => ({ default: m.EmployerMessagesView })));
const OfficeChatView = lazy(() => import("./components/OfficeChatView").then(m => ({ default: m.OfficeChatView })));
const GroupChatView = lazy(() => import("./components/GroupChatView").then(m => ({ default: m.GroupChatView })));
const AppSettingsPage = lazy(() => import("./components/AppSettingsPage").then(m => ({ default: m.AppSettingsPage })));
const JobSeekerProfileView = lazy(() => import("./components/JobSeekerProfileView").then(m => ({ default: m.JobSeekerProfileView })));
const StaffProfileView = lazy(() => import("./components/StaffProfileView").then(m => ({ default: m.StaffProfileView })));
const SeekerPhonePromptModal = lazy(() => import("./components/SeekerPhonePromptModal").then(m => ({ default: m.SeekerPhonePromptModal })));
const PublicJobView = lazy(() => import("./components/PublicJobView").then(m => ({ default: m.PublicJobView })));

import { checkAndEnforceSLAs, simulateIncomingChat } from "./lib/services";
import { AnimatePresence, motion } from "motion/react";

// ==========================================
// MAIN REUTER LAYOUT CONFIGURATION
// ==========================================
function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, firebaseUser, loading, logout } = useAuth();
  const isHomePage = location.pathname === "/";
  const [hideFloating, setHideFloating] = useState(false);
  const [showGraffitiIntro, setShowGraffitiIntro] = useState(() => {
    if (!ENABLE_ANNIVERSARY_CELEBRATION) return false;
    if (typeof window === "undefined") return false;
    return window.location.pathname === "/";
  });

  useEffect(() => {
    if (!ENABLE_ANNIVERSARY_CELEBRATION) return;
    const handleOpenIntro = () => {
      setShowGraffitiIntro(true);
    };
    window.addEventListener("open-graffiti-intro", handleOpenIntro);
    return () => window.removeEventListener("open-graffiti-intro", handleOpenIntro);
  }, []);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const [isStaffSettingsOpen, setIsStaffSettingsOpen] = useState(false);
  const [isSeekerSettingsOpen, setIsSeekerSettingsOpen] = useState(false);
  const [isEmployerSettingsOpen, setIsEmployerSettingsOpen] = useState(false);
  const [isEmployerTicketOpen, setIsEmployerTicketOpen] = useState(false);
  const [showAdminAccountModal, setShowAdminAccountModal] = useState(false);
  const [showAdminAboutModal, setShowAdminAboutModal] = useState(false);
  const [showSeekerPhonePrompt, setShowSeekerPhonePrompt] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Trigger phone prompt on sign in for job seekers without stored phone number
  useEffect(() => {
    if (!currentUser) {
      setShowSeekerPhonePrompt(false);
      return;
    }

    const isSeeker = currentUser.role === "seeker" || (!currentUser.role && !["admin", "staff", "employer"].includes(currentUser.role as any));
    const isMissingPhone = !currentUser.phoneNumber || !currentUser.phoneNumber.trim();

    if (isSeeker && isMissingPhone) {
      const isDismissed = sessionStorage.getItem(`vr_dismissed_phone_prompt_${currentUser.uid}`);
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setShowSeekerPhonePrompt(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } else {
      setShowSeekerPhonePrompt(false);
    }
  }, [currentUser]);
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

  const [isPreparingDm, setIsPreparingDm] = useState(false);

  // Handle URL query parameters for direct DM (?dm=STAFF_ID) and direct Job view (?jobId=JOB_ID)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const dmParam = searchParams.get("dm");
    const jobIdParam = searchParams.get("jobId");
    const refParam = searchParams.get("ref");

    if (jobIdParam) {
      navigate(`/jobs/${jobIdParam}${refParam ? `?ref=${refParam}` : ""}`, { replace: true });
      return;
    }

    if (dmParam) {
      sessionStorage.setItem("vr_pending_dm_inquiry", JSON.stringify({ staffId: dmParam }));
      if (!loading) {
        if (!currentUser) {
          window.dispatchEvent(new CustomEvent("open-auth-modal", {
            detail: {
              tab: "signin",
              role: "seeker",
              title: "Direct Recruiter Inquiry"
            }
          }));
        } else {
          const triggerDm = async () => {
            sessionStorage.removeItem("vr_pending_dm_inquiry");
            setIsPreparingDm(true);
            const seekerPhoneIdentifier = currentUser.displayName || currentUser.email || "Candidate";
            const initialMsg = "I want to make inquiries";
            try {
              await Promise.all([
                simulateIncomingChat(
                  seekerPhoneIdentifier,
                  initialMsg,
                  "general-inquiry",
                  "General Inquiry",
                  currentUser.uid,
                  dmParam
                ),
                new Promise((resolve) => setTimeout(resolve, 1000))
              ]);
            } catch (err) {
              console.warn("Direct DM initialization error:", err);
            }
            setIsPreparingDm(false);
            navigate("/seeker/messages", { replace: true });
          };
          triggerDm();
        }
      }
    }
  }, [location.search, currentUser, loading, navigate]);

  // Handle automatic dashboard redirect for all authenticated users away from homepage (/)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get("dm") || searchParams.get("jobId")) {
      return;
    }

    if (!loading && isHomePage && currentUser) {
      const role = currentUser.role || "seeker";
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "employer") {
        navigate("/employer/chat", { replace: true });
      } else {
        // Seeker and staff go to /seeker
        navigate("/seeker", { replace: true });
      }
    }
  }, [currentUser, loading, isHomePage, location.search, navigate]);

  // Dynamic high-quality SEO meta updates per-route
  useEffect(() => {
    // If viewing a specific job page, let PublicJobView manage custom rich dynamic SEO tags
    if (location.pathname.startsWith("/jobs/")) {
      return;
    }

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
      case "/admin/dashboard":
        title = "System Administration | Valley Reigns Control Console";
        desc = "Configure global communication settings, manage job postings, supervise staff and active candidate chat channels.";
        break;
      case "/employer":
      case "/employer/dashboard":
        title = "Employer Dashboard & Talent Console | Valley Reigns";
        desc = "Manage company vacancies, review talent pipelines, and communicate directly with applicants.";
        break;
      case "/admin/notifications":
        title = "System Alerts & Status | Valley Reigns Admin";
        desc = "Track high-priority system alerts, background worker logs, and communication health updates.";
        break;
      case "/admin/post-jobs":
        title = "Publish Tech Jobs & Careers | Valley Reigns";
        desc = "Create and publish fresh technology openings, configure automatic communication routing pipelines for candidates.";
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
      case "/seeker/profile":
      case "/profile":
        title = "My Job Seeker Profile & CV | Valley Reigns Recruitment";
        desc = "Manage your job seeker profile, edit your phone number, and upload your CV document.";
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

  // Reset hideFloating and scroll position on route change so header/layout state never gets stuck across navigations
  useEffect(() => {
    setHideFloating(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const noHeaderPaths = [
    "/admin/notifications",
    "/admin/contacts",
    "/admin/diagnostics",
    "/admin/employers",
    "/admin/staff-promotion",
    "/admin/users",
    "/admin/settings",
    "/seeker/profile",
    "/profile",
  ];
  const isExcludedView = 
    location.pathname.startsWith("/admin/settings") ||
    location.pathname.includes("office-chat") ||
    location.pathname.includes("group-chat");
  const shouldHideHeader = hideFloating || noHeaderPaths.includes(location.pathname) || isExcludedView;
  const shouldHideBottomNav = hideFloating || shouldHideHeader || isExcludedView;
  const isInboxRoute = location.pathname === "/seeker/messages" || 
    (location.pathname === "/staff" && (!location.search || location.search.includes("tab=inbox") || location.search === "")) ||
    location.pathname.includes("office-chat") ||
    location.pathname.includes("group-chat");

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
            className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#F0F7FF] via-[#FAFCFD] to-[#FFFFFF]"
          >
            <div className="relative flex flex-col items-center justify-center max-w-sm px-6 text-center">
              {/* Cool loading blue curve rotating with a pulser around the brand logo */}
              <div className="relative flex items-center justify-center">
                {/* Pulsers */}
                <div className="absolute w-32 h-32 rounded-full bg-[#1E88E5]/10 border border-[#1E88E5]/10 animate-ping duration-[1800ms]" />
                <div className="absolute w-24 h-24 rounded-full bg-[#1E88E5]/8 animate-pulse duration-[1200ms]" />
                
                {/* Rotating blue loading curve (perfectly circular) */}
                <div className="absolute w-22 h-22 rounded-full border-[3px] border-slate-100/50 border-t-[#1E88E5] animate-spin duration-[1000ms]" />
                
                {/* Main Static Logo Container */}
                <div className="relative w-16 h-16 bg-white rounded-2xl shadow-lg border border-blue-50/50 overflow-hidden flex items-center justify-center p-1.5">
                  <img 
                    src="/icon.svg" 
                    alt="Valley Reigns Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        className={`bg-[#FAFCFD] flex flex-col font-sans select-text ${hideFloating ? "h-[100dvh] max-h-[100dvh] overflow-hidden fixed inset-0 z-30" : isInboxRoute ? "h-[100dvh] max-h-[100dvh] overflow-hidden" : "min-h-screen"}`}
        style={hideFloating ? { height: "var(--visual-viewport-height, 100dvh)", maxHeight: "var(--visual-viewport-height, 100dvh)" } : isInboxRoute ? { height: "100dvh", maxHeight: "100dvh" } : undefined}
      >
        {/* Main Navigation Header - Hidden in active messaging view or specific admin/management views */}
        {!shouldHideHeader && <Header />}

        {/* Main Workspace Router Feed */}
        <main className={`flex-grow flex-1 min-h-0 ${hideFloating || isInboxRoute ? "h-full flex flex-col overflow-hidden p-0 m-0" : "w-full min-h-[calc(100vh-80px)]"} ${(!shouldHideHeader && !isHomePage && !hideFloating && !isInboxRoute) ? "pb-24" : ""}`}>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
            {/* Public routes */}
            <Route 
              path="/" 
              element={<JobSeekerDashboard />} 
            />

            {/* Public dedicated job view page with SEO and Google Rich Cards */}
            <Route 
              path="/jobs/:jobId" 
              element={<PublicJobView />} 
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
              path="/admin/dashboard"
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
              path="/admin/contacts"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <ContactsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/employers"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <EmployerManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/staff-promotion"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <StaffPromotionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <StaffPromotionPage />
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

            {/* Office Chat (1-on-1 staff & admin messages) */}
            <Route
              path="/staff/office-chat"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <OfficeChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/office-chat"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <OfficeChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/office-chat"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <OfficeChatView />
                </ProtectedRoute>
              }
            />

            {/* Team Group Chat (All staff & admin) */}
            <Route
              path="/staff/group-chat"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <GroupChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/group-chat"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <GroupChatView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/group-chat"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <GroupChatView />
                </ProtectedRoute>
              }
            />

            {/* Admin App Settings & SLA Thresholds */}
            <Route
              path="/admin/settings"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AppSettingsPage />
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

            {/* Private Staff Profile Route */}
            <Route
              path="/staff/profile"
              element={
                <ProtectedRoute allowedRoles={["staff", "admin"]}>
                  <StaffProfileView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/profile"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <StaffProfileView />
                </ProtectedRoute>
              }
            />

            {/* Private Seeker Profile Route */}
            <Route
              path="/seeker/profile"
              element={
                <ProtectedRoute allowedRoles={["seeker", "staff", "admin"]}>
                  <JobSeekerProfileView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allowedRoles={["seeker", "staff", "admin"]}>
                  <JobSeekerProfileView />
                </ProtectedRoute>
              }
            />

            {/* Private Employer Chat Route Guard */}
            <Route
              path="/employer"
              element={
                <ProtectedRoute allowedRoles={["employer", "admin"]}>
                  <EmployerMessagesView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/dashboard"
              element={
                <ProtectedRoute allowedRoles={["employer", "admin"]}>
                  <EmployerMessagesView />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employer/chat"
              element={
                <ProtectedRoute allowedRoles={["employer", "admin"]}>
                  <EmployerMessagesView />
                </ProtectedRoute>
              }
            />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>

        {/* Annual Anniversary Graffiti Intro Screen (Feature preserved for next year) */}
        <AnimatePresence>
          {ENABLE_ANNIVERSARY_CELEBRATION && showGraffitiIntro && (
            <AnniversaryGraffitiIntro
              onComplete={() => {
                sessionStorage.setItem("vr_seen_3yr_graffiti_intro", "true");
                setShowGraffitiIntro(false);
              }}
            />
          )}
        </AnimatePresence>

        {/* Authentication Gateway Portal Popup */}
        <Suspense fallback={null}>
          <AuthModal forcedOpen={false} />
        </Suspense>

        {/* Job Seeker Missing Phone Number Prompt Modal */}
        <Suspense fallback={null}>
          <SeekerPhonePromptModal
            isOpen={showSeekerPhonePrompt}
            onClose={() => setShowSeekerPhonePrompt(false)}
          />
        </Suspense>

        {/* Progressive Web App Install Banner Overlay */}
        <Suspense fallback={null}>
          <PwaInstallPrompt />
        </Suspense>

        {/* Real-time Network Connectivity Monitor Toast */}
        <NetworkStatusMonitor />

        {/* Role-based Sticky Bottom Navigation Pills */}
        <RoleBottomNavigation
          currentUser={currentUser}
          shouldHideHeader={shouldHideHeader}
          locationPathname={location.pathname}
          locationSearch={location.search}
          isAdminSettingsOpen={isAdminSettingsOpen}
          setIsAdminSettingsOpen={setIsAdminSettingsOpen}
          isStaffSettingsOpen={isStaffSettingsOpen}
          setIsStaffSettingsOpen={setIsStaffSettingsOpen}
          isSeekerSettingsOpen={isSeekerSettingsOpen}
          setIsSeekerSettingsOpen={setIsSeekerSettingsOpen}
          isEmployerSettingsOpen={isEmployerSettingsOpen}
          setIsEmployerSettingsOpen={setIsEmployerSettingsOpen}
          isEmployerTicketOpen={isEmployerTicketOpen}
          setIsEmployerTicketOpen={setIsEmployerTicketOpen}
          onNavigate={(to) => navigate(to)}
        />

        {/* Role-based Bottom Settings Sheets */}
        <RoleSettingsSheets
          currentUser={currentUser}
          firebaseUser={firebaseUser}
          shouldHideHeader={shouldHideHeader}
          isAppInstalled={isAppInstalled}
          isAdminSettingsOpen={isAdminSettingsOpen}
          setIsAdminSettingsOpen={setIsAdminSettingsOpen}
          isStaffSettingsOpen={isStaffSettingsOpen}
          setIsStaffSettingsOpen={setIsStaffSettingsOpen}
          isSeekerSettingsOpen={isSeekerSettingsOpen}
          setIsSeekerSettingsOpen={setIsSeekerSettingsOpen}
          isEmployerSettingsOpen={isEmployerSettingsOpen}
          setIsEmployerSettingsOpen={setIsEmployerSettingsOpen}
          isEmployerTicketOpen={isEmployerTicketOpen}
          setIsEmployerTicketOpen={setIsEmployerTicketOpen}
          setShowAdminAccountModal={setShowAdminAccountModal}
          setShowAdminAboutModal={setShowAdminAboutModal}
          logout={logout}
          onNavigate={(to) => navigate(to)}
        />

        {/* Custom Admin Account & About Modals */}
        <AdminModals
          showAdminAccountModal={showAdminAccountModal}
          setShowAdminAccountModal={setShowAdminAccountModal}
          showAdminAboutModal={showAdminAboutModal}
          setShowAdminAboutModal={setShowAdminAboutModal}
          currentUser={currentUser}
          logout={logout}
          onNavigate={(to) => navigate(to)}
        />

        {/* Preparing Message Overlay */}
        <PreparingMessageOverlay
          isVisible={isPreparingDm}
          title="Preparing Message..."
          subtitle="Connecting you directly with your recruiter & opening your conversation..."
        />
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
