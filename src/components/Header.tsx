import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { Briefcase, MessageSquare, ShieldCheck, LogOut, Menu, X, UserPlus, User, Bell, Info, Plus, Search, Download, Settings, Cpu, ClipboardList, Users } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { setStaffOnlineStatus, getAllUserProfiles } from "../lib/services";

export const Header: React.FC = () => {
  const { currentUser, firebaseUser, loginWithGoogle, logout, updateUserPreference } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true;
      setIsInstalled(isStandalone);
    };
    checkInstalled();
    window.addEventListener("appinstalled", checkInstalled);
    return () => window.removeEventListener("appinstalled", checkInstalled);
  }, []);
  
  // Custom seeker header states
  const [profilePopupOpen, setProfilePopupOpen] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  useEffect(() => {
    if (currentUser?.role === "admin") {
      const fetchUsers = async () => {
        try {
          const profiles = await getAllUserProfiles();
          setTotalUsers(profiles.length);
        } catch (error) {
          console.error("Failed to load user count for header popup:", error);
        }
      };
      fetchUsers();
    }
  }, [currentUser]);

  // Push notifications configuration state from global context
  const { 
    pushNotificationsEnabled, 
    setPushNotificationsEnabled, 
    requestPermission,
    permission: notificationPermission,
    sendPush
  } = useNotification();

  const handleTogglePushNotifications = async () => {
    if (pushNotificationsEnabled) {
      setPushNotificationsEnabled(false);
    } else {
      await requestPermission();
    }
  };

  // Staff Online State synced across components
  const [isStaffOnlineState, setIsStaffOnlineState] = useState(() => {
    if (currentUser?.uid) {
      const saved = localStorage.getItem(`staff_online_${currentUser.uid}`);
      return saved !== "offline";
    }
    return true;
  });

  useEffect(() => {
    if (currentUser?.uid) {
      const saved = localStorage.getItem(`staff_online_${currentUser.uid}`);
      setIsStaffOnlineState(saved !== "offline");
    }
  }, [currentUser?.uid]);

  useEffect(() => {
    const handleStatusChange = (e: Event) => {
      const customEvent = e as CustomEvent<boolean>;
      setIsStaffOnlineState(customEvent.detail);
    };
    window.addEventListener("staff-status-changed", handleStatusChange);
    return () => window.removeEventListener("staff-status-changed", handleStatusChange);
  }, []);

  const isDashboardPage = location.pathname === "/seeker" || location.pathname === "/seeker/messages" || location.pathname === "/seeker/notifications" || location.pathname === "/staff" || location.pathname === "/admin" || location.pathname === "/staff/manage-jobs" || location.pathname === "/admin/manage-jobs" || location.pathname === "/staff/notifications" || location.pathname === "/admin/notifications";

  const handleFindJobsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (location.pathname !== "/") {
      window.location.href = "/#jobs-explore";
    } else {
      const element = document.getElementById("jobs-explore");
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  if (isDashboardPage) {
    return (
      <header id="app-header" className="sticky top-4 z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-[28px] shadow-[0_24px_55px_-10px_rgba(30, 136, 229, 0.12),0_12px_24px_-12px_rgba(30, 136, 229, 0.08)] px-4 sm:px-6 h-16 flex items-center justify-between relative">
          
          {/* Left: Companies logo and Administration tag */}
          <div className="flex items-center gap-3">
            <Link to={currentUser?.role === "seeker" ? "/seeker" : "/staff"} className="flex items-center group">
              <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-all duration-300">
                <img 
                  src="/icon.svg" 
                  alt="Valley Reigns Logo" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            </Link>
            {currentUser?.role === "admin" && (
              <span className="text-sm font-sans font-black tracking-tight text-slate-800 border-l border-slate-200 pl-3">
                Administration
              </span>
            )}
            {currentUser?.role === "staff" && (
              <span className="text-sm font-sans font-black tracking-tight text-slate-800 border-l border-slate-200 pl-3">
                Staff
              </span>
            )}
            {(!currentUser || currentUser?.role === "seeker") && (
              <span className="text-sm font-sans font-black tracking-tight text-slate-800 border-l border-slate-200 pl-3">
                Find Jobs
              </span>
            )}
          </div>

          {/* Right: Message icon and Profile Avatar */}
          <div className="flex items-center gap-3">
            {/* Seeker Notifications Bell Icon */}
            {currentUser?.role === "seeker" && (
              <Link
                to="/seeker/notifications"
                className="w-10 h-10 flex items-center justify-center text-[#1e3a8a] hover:bg-slate-100 rounded-xl transition-all relative cursor-pointer hover:scale-105 active:scale-95"
                title="Notifications"
                id="seeker-header-notif-btn"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#1E88E5] rounded-full animate-pulse" />
              </Link>
            )}

            {/* Staff Notifications Bell Icon */}
            {currentUser?.role === "staff" && (
              <Link
                to="/staff/notifications"
                className="w-10 h-10 flex items-center justify-center text-[#1e3a8a] hover:bg-slate-100 rounded-xl transition-all relative cursor-pointer hover:scale-105 active:scale-95"
                title="Staff Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
              </Link>
            )}

            {/* Admin System Alert Notification bell Icon */}
            {currentUser?.role === "admin" && (
              <Link
                to="/admin/notifications"
                className="w-10 h-10 flex items-center justify-center text-[#1e3a8a] hover:bg-slate-100 rounded-xl transition-all relative cursor-pointer hover:scale-105 active:scale-95"
                title="System Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-rose-600 rounded-full animate-pulse" />
              </Link>
            )}

            {/* User Profile Avatar - replaced with deep green user icon button with no bg or shadows */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setProfilePopupOpen(!profilePopupOpen)}
                className="p-2 text-[#1E88E5] bg-transparent border-0 shadow-none transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                title="User Menu"
              >
                <User className="w-6 h-6 text-[#1E88E5]" />
              </motion.button>

              {/* Seeker / Staff Tooltip Popup Menu */}
              <AnimatePresence>
                {profilePopupOpen && (
                  <>
                    {createPortal(
                      <div 
                        className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[4px]" 
                        onClick={() => setProfilePopupOpen(false)}
                      />,
                      document.body
                    )}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.92, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.92, y: 10 }}
                      transition={{ type: "spring", duration: 0.3 }}
                      className="absolute right-[-8px] mt-3 w-64 bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-xl shadow-[0_24px_50px_rgba(30, 136, 229, 0.18),0_1px_3px_rgba(0,0,0,0.05)] p-2 z-50 overflow-hidden"
                    >
                    {/* User profile header inside popup */}
                    <div className="px-3.5 py-3 border-b border-slate-100 mb-2 flex items-center gap-3">
                      {firebaseUser?.photoURL || currentUser?.photoURL ? (
                        <img 
                          src={firebaseUser?.photoURL || currentUser?.photoURL} 
                          alt={currentUser?.displayName || "User"} 
                          className="w-9 h-9 rounded-full object-cover shadow-sm select-none"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0B1B3D] text-white flex items-center justify-center font-bold text-sm shadow-sm select-none font-sans">
                          {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : "U"}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate leading-snug">{currentUser?.displayName}</p>
                        <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5 leading-none font-mono">{currentUser?.email}</p>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <span className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-100 uppercase tracking-wider font-mono">
                            {currentUser?.role || "Seeker"}
                          </span>
                          {currentUser?.canPostJobs && (
                            <span className="inline-flex items-center text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-100 uppercase tracking-wider font-mono">
                              Recruiter
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Total User Count for Admin */}
                    {currentUser?.role === "admin" && totalUsers !== null && (
                      <div className="px-1.5 py-1">
                        <div className="px-3 py-2 bg-purple-50/70 border border-purple-100 rounded-2xl mx-1 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-purple-950 font-bold text-xs">
                            <Users className="w-4 h-4 text-purple-700" />
                            <span>Users Registered</span>
                          </div>
                          <span className="font-mono font-black text-purple-950 text-xs bg-white border border-purple-200 px-2 py-0.5 rounded-lg shadow-sm">
                            {totalUsers}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Staff Online Status Switcher */}
                    {(currentUser?.role === "staff" || currentUser?.role === "admin") && (
                      <div className="px-1.5 py-1 space-y-1">
                        <div className="px-3 py-2 bg-slate-50/80 border border-slate-100 rounded-2xl flex items-center justify-between mx-1 mb-1">
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-slate-700">Staff Status</span>
                            <span className="text-[8px] font-mono font-medium text-slate-400">
                              {isStaffOnlineState ? "ONLINE" : "OFFLINE"}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              const nextStatus = !isStaffOnlineState;
                              setIsStaffOnlineState(nextStatus);
                              if (currentUser?.uid) {
                                localStorage.setItem(`staff_online_${currentUser.uid}`, nextStatus ? "online" : "offline");
                                await setStaffOnlineStatus(currentUser.uid, nextStatus);
                                window.dispatchEvent(new CustomEvent("staff-status-changed", { detail: nextStatus }));
                              }
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex items-center cursor-pointer ${
                              isStaffOnlineState ? "bg-blue-500" : "bg-slate-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                                isStaffOnlineState ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Messaging Preference Toggle Switch */}
                    {currentUser && (
                      <div className="px-1.5 py-1">
                        <div className="px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl mx-1 mb-1 flex items-center justify-between">
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-slate-700">Messaging Pipeline</span>
                            <span className="text-[8px] font-mono font-medium text-slate-400">
                              {currentUser.messagingPreference === "in-app" ? "In-App Mode" : "WhatsApp Mode"}
                            </span>
                          </div>
                          <button
                            onClick={async () => {
                              const nextPref = currentUser.messagingPreference === "in-app" ? "whatsapp" : "in-app";
                              if (updateUserPreference) {
                                await updateUserPreference(nextPref);
                              }
                            }}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex items-center cursor-pointer ${
                              currentUser.messagingPreference === "in-app" ? "bg-[#1E88E5]" : "bg-slate-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                                currentUser.messagingPreference === "in-app" ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Push Notifications Toggle Switch */}
                    {currentUser && (
                      <div className="px-1.5 py-1">
                        <div className="px-3 py-2 bg-slate-50/50 border border-slate-100 rounded-2xl mx-1 mb-1 flex items-center justify-between">
                          <div className="flex flex-col text-left">
                            <span className="text-[10px] font-bold text-slate-700">Push Notifications</span>
                            <span className="text-[8px] font-mono font-medium text-slate-400">
                              {pushNotificationsEnabled
                                ? (localStorage.getItem("push_notifications_simulated") === "true" ? "ACTIVE (SIMULATED)" : "ACTIVE")
                                : "DISABLED"}
                            </span>
                          </div>
                          <button
                            onClick={handleTogglePushNotifications}
                            className={`w-10 h-5 rounded-full p-0.5 transition-colors focus:outline-none flex items-center cursor-pointer ${
                              pushNotificationsEnabled
                                ? "bg-[#1E88E5]"
                                : "bg-slate-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white shadow-sm transform duration-200 ${
                                pushNotificationsEnabled ? "translate-x-5" : "translate-x-0"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-100 my-1.5 mx-1"></div>

                    <div className="px-1.5 py-1">
                      <motion.button
                        whileHover={{ scale: 1.02, x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setProfilePopupOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-rose-50/65 text-xs font-bold text-rose-600 transition-all rounded-xl flex items-center gap-3 cursor-pointer group border-0 bg-transparent"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-500 group-hover:bg-rose-500 group-hover:text-white flex items-center justify-center transition-colors">
                          <LogOut className="w-3.5 h-3.5" />
                        </div>
                        <span>Sign Out</span>
                      </motion.button>
                    </div>
                  </motion.div>
                </>
              )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Account Modal */}
        <AnimatePresence>
          {showAccountModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAccountModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white border border-slate-100 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-10 space-y-4 text-left"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">Account Details</h3>
                  <button onClick={() => setShowAccountModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">✕</button>
                </div>
                <div className="space-y-3 font-sans text-xs">
                  <div>
                    <span className="text-slate-400 font-mono text-[9px] block uppercase">User ID</span>
                    <span className="text-slate-800 font-mono text-[10px] bg-slate-50 px-2 py-1 rounded block truncate">{currentUser?.uid}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono text-[9px] block uppercase">Display Name</span>
                    <span className="text-slate-800 font-bold text-sm">{currentUser?.displayName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono text-[9px] block uppercase">Email Address</span>
                    <span className="text-slate-800 font-medium">{currentUser?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-mono text-[9px] block uppercase">Access Role</span>
                    <span className="inline-block bg-[#1E88E5]/10 text-[#1E88E5] font-mono px-2 py-0.5 rounded font-bold">{currentUser?.role.toUpperCase()}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAccountModal(false)}
                  className="w-full py-2.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Close Settings
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Notifications Modal */}
        <AnimatePresence>
          {showNotificationsModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowNotificationsModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white border border-slate-100 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-10 space-y-4 text-left"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">System Alerts</h3>
                  <button onClick={() => setShowNotificationsModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">✕</button>
                </div>
                <div className="space-y-3 font-sans text-xs">
                  <div className="p-3 bg-[#1E88E5]/5 border border-blue-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#1E88E5]">Welcome to Valley Reigns</span>
                      <span className="text-[8px] font-mono text-slate-400">Just Now</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">Your seeker dashboard has been initialized. You have access to real-time search, filters, and chat threads.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">Database Seeding Active</span>
                      <span className="text-[8px] font-mono text-slate-400">10m ago</span>
                    </div>
                    <p className="text-slate-600 leading-relaxed text-[11px]">Seeded 2 recruiters and 1 administrative profile. Security configurations applied successfully.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowNotificationsModal(false)}
                  className="w-full py-2.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Dismiss Notifications
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* About Us Modal */}
        <AnimatePresence>
          {showAboutModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowAboutModal(false)}
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative bg-white border border-slate-100 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-10 space-y-3 text-slate-700 text-left"
              >
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-[#1e3a8a] uppercase tracking-wider">About Our Workspace</h3>
                  <button onClick={() => setShowAboutModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer">✕</button>
                </div>
                <p className="text-[11px] leading-relaxed font-sans">
                  Valley Reigns is a full-cycle recruitment management workspace designed to unite ambitious talent with forward-thinking organizations.
                </p>
                <p className="text-[11px] leading-relaxed font-sans font-semibold text-[#1E88E5]">
                  Recruitment for everyone — streamlined, collaborative, and secure.
                </p>
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="w-full py-2.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white text-xs font-bold rounded-xl cursor-pointer mt-2"
                >
                  Confirm
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </header>
    );
  }

  return (
    <header id="app-header" className="sticky top-4 z-40 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/60 rounded-[28px] shadow-[0_24px_55px_-10px_rgba(30, 136, 229, 0.12),0_12px_24px_-12px_rgba(30, 136, 229, 0.08)] px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand Logo - Designed for high-end aesthetics */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-12 h-12 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
            <img 
              src="/icon.svg" 
              alt="Valley Reigns Logo" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-base sm:text-lg font-display font-black tracking-tight text-black group-hover:text-[#1E88E5] transition-colors">
              Valley Reigns
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-2">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all ${
              location.pathname === "/"
                ? "bg-slate-50 text-[#1E88E5] border border-slate-150"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Find Jobs
          </Link>

          {currentUser?.role === "seeker" && (
            <Link
              to="/seeker"
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 ${
                location.pathname === "/seeker"
                  ? "bg-blue-50 text-[#1E88E5] border border-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              My Dashboard
            </Link>
          )}

          {currentUser?.role === "staff" && (
            <Link
              to="/staff"
              className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 ${
                location.pathname === "/staff"
                  ? "bg-blue-50 text-[#1E88E5] border border-blue-100"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Recruiter Dashboard
            </Link>
          )}

          {currentUser?.role === "admin" && (
            <>
              <Link
                to="/staff"
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 ${
                  location.pathname === "/staff"
                    ? "bg-blue-50 text-[#1E88E5]"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Staff View
              </Link>
              <Link
                to="/admin"
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all flex items-center gap-1.5 ${
                  location.pathname === "/admin"
                    ? "bg-purple-50 text-purple-800 border border-purple-100"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Admin Panel
              </Link>
            </>
          )}
        </nav>

        {/* User Account / Sign In with Google */}
        <div className="hidden md:flex items-center gap-4">
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs font-bold text-slate-800 block leading-tight">
                  {currentUser.displayName}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  {currentUser.role.toUpperCase()}
                </span>
              </div>
              <button
                onClick={() => logout()}
                className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer border border-transparent hover:border-rose-100 hover:scale-105 active:scale-95"
                title="Log Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open-auth-modal"))}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer hover:scale-[1.03] active:scale-97"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Sign In</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center md:hidden gap-2">
          {currentUser && (
            <span className="text-xs font-bold text-[#1e3a8a] max-w-[100px] truncate">
              {currentUser.displayName.split(" ")[0]}
            </span>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#1e3a8a] hover:bg-slate-100 rounded-xl transition-all cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Navigation Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {createPortal(
              <div 
                className="fixed inset-0 z-30 bg-slate-900/20 backdrop-blur-[4px]" 
                onClick={() => setMobileMenuOpen(false)}
              />,
              document.body
            )}
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white/95 backdrop-blur-md border border-slate-200/80 rounded-2xl shadow-lg mt-2 overflow-hidden relative z-40"
            >
            <div className="px-4 pt-2 pb-6 space-y-3">
              <button
                onClick={handleFindJobsClick}
                className="w-full text-left block px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Find Jobs
              </button>

              {currentUser?.role === "staff" && (
                <>
                  <Link
                    to="/staff"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Recruiter Dashboard
                  </Link>
                  <Link
                    to="/staff?tab=report"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Daily Staff Report
                  </Link>
                </>
              )}

              {currentUser?.role === "admin" && (
                <>
                  <Link
                    to="/staff"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Staff View
                  </Link>
                  <Link
                    to="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-4 py-2.5 rounded-xl text-sm font-bold text-purple-800 bg-purple-50 hover:bg-purple-100"
                  >
                    Admin Panel
                  </Link>
                </>
              )}

              {currentUser?.role === "seeker" && (
                <Link
                  to="/seeker"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-2.5 rounded-xl text-sm font-bold text-[#1E88E5] bg-blue-50 hover:bg-blue-100"
                >
                  My Dashboard
                </Link>
              )}

              <div className="border-t border-slate-100 pt-3">
                {currentUser ? (
                  <div className="space-y-3">
                    <div className="px-4">
                      <span className="text-xs font-bold text-slate-800 block">
                        {currentUser.displayName}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {currentUser.email} • {currentUser.role.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { tab: "signin" } }));
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Sign In</span>
                    </button>

                    <button
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent("open-auth-modal", { detail: { tab: "signup" } }));
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2.5 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl text-sm font-bold shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <UserPlus className="w-4 h-4 shrink-0" />
                      <span>Sign Up</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
      </AnimatePresence>
    </header>
  );
};
