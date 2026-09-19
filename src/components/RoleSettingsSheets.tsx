import React, { useState, useEffect } from "react";
import { 
  Briefcase, 
  Users, 
  UserPlus, 
  UserCheck,
  Cpu,
  Home, 
  Settings, 
  User, 
  MessageSquare, 
  ClipboardList, 
  Info, 
  Download, 
  LogOut, 
  BookUser,
  Building2, 
  FileText,
  SlidersHorizontal,
  MessagesSquare,
  Ticket,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  Check
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  getEmployerRecruitmentRequests, 
  submitEmployerRecruitmentRequest,
  addSystemNotification,
  saveUserProfile,
  memoryStore
} from "../lib/services";
import { EmployerRecruitmentRequest } from "../types";

interface RoleSettingsSheetsProps {
  currentUser: any;
  firebaseUser: any;
  shouldHideHeader: boolean;
  isAppInstalled: boolean;
  isAdminSettingsOpen: boolean;
  setIsAdminSettingsOpen: (open: boolean) => void;
  isStaffSettingsOpen: boolean;
  setIsStaffSettingsOpen: (open: boolean) => void;
  isSeekerSettingsOpen: boolean;
  setIsSeekerSettingsOpen: (open: boolean) => void;
  isEmployerSettingsOpen: boolean;
  setIsEmployerSettingsOpen: (open: boolean) => void;
  isEmployerTicketOpen?: boolean;
  setIsEmployerTicketOpen?: (open: boolean) => void;
  setShowAdminAccountModal: (show: boolean) => void;
  setShowAdminAboutModal: (show: boolean) => void;
  logout: () => Promise<void>;
  onNavigate: (to: string) => void;
}

export function RoleSettingsSheets({
  currentUser,
  firebaseUser,
  shouldHideHeader,
  isAppInstalled,
  isAdminSettingsOpen,
  setIsAdminSettingsOpen,
  isStaffSettingsOpen,
  setIsStaffSettingsOpen,
  isSeekerSettingsOpen,
  setIsSeekerSettingsOpen,
  isEmployerSettingsOpen,
  setIsEmployerSettingsOpen,
  isEmployerTicketOpen,
  setIsEmployerTicketOpen,
  setShowAdminAccountModal,
  setShowAdminAboutModal,
  logout,
  onNavigate,
}: RoleSettingsSheetsProps) {
  const [isBusinessProfileOpen, setIsBusinessProfileOpen] = useState(false);
  if (shouldHideHeader) return null;

  return (
    <>
      {/* Admin Bottom Settings Sheet Modal */}
      <AnimatePresence>
        {currentUser && currentUser.role === "admin" && isAdminSettingsOpen && (
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
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-blue-200/50 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
            >
              {/* Vector graphic design background pattern matching admin dashboard chats card */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-blue-600">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              {/* Handle bar */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />

              {/* Profile Summary Section */}
              <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-slate-100">
                {firebaseUser?.photoURL || currentUser?.photoURL ? (
                  <img 
                    src={firebaseUser?.photoURL || currentUser?.photoURL} 
                    alt={currentUser?.displayName || "User"} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/20 shadow-sm select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg font-mono shadow-sm">
                    {currentUser?.displayName ? (
                      currentUser.displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                    ) : (
                      "AD"
                    )}
                  </div>
                )}
                <div className="space-y-0.5 text-left">
                  <h4 className="text-base font-sans font-extrabold text-[#0B1B3D] tracking-tight">
                    {currentUser?.displayName || "System Administrator"}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 font-medium">
                    {currentUser?.email}
                  </p>
                  <span className="inline-block text-[9px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                    {currentUser?.role || "ADMIN"}
                  </span>
                </div>
              </div>

              {/* Bottom Navigation List Buttons */}
              <div className="px-6 py-4 space-y-1 relative z-10 text-left">
                {/* 1. Office Chat Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/office-chat");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Office Chat</span>
                  <MessageSquare className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 2. Group Chat (Team) Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/group-chat");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Team Group Chat</span>
                  <Users className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 3. User Management Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/staff-promotion");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">User Management</span>
                  <UserCheck className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 4. Employer Management Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/employers");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Employer Management</span>
                  <Building2 className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 5. Saved Customer Contacts Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/contacts");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Saved Contacts</span>
                  <BookUser className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Dev & Diagnostics Center Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/diagnostics");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Dev & Diagnostics Center</span>
                  <Cpu className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* App Settings Row */}
                <button
                  onClick={() => {
                    setIsAdminSettingsOpen(false);
                    onNavigate("/admin/settings");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">App Settings</span>
                  <SlidersHorizontal className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Sign Out Row */}
                <button
                  onClick={async () => {
                    setIsAdminSettingsOpen(false);
                    await logout();
                    onNavigate("/");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-rose-50 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-rose-600 group-hover:text-rose-700 transition-colors">Sign Out</span>
                  <LogOut className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Staff Bottom Settings Sheet Modal */}
      <AnimatePresence>
        {currentUser && currentUser.role === "staff" && isStaffSettingsOpen && (
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
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-blue-200/50 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-blue-600">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              {/* Handle bar */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />

              {/* Profile Summary Section */}
              <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-slate-100">
                {firebaseUser?.photoURL || currentUser?.photoURL ? (
                  <img 
                    src={firebaseUser?.photoURL || currentUser?.photoURL} 
                    alt={currentUser?.displayName || "User"} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/20 shadow-sm select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg font-mono shadow-sm">
                    {currentUser?.displayName ? (
                      currentUser.displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                    ) : (
                      "ST"
                    )}
                  </div>
                )}
                <div className="space-y-0.5 text-left">
                  <h4 className="text-base font-sans font-extrabold text-[#0B1B3D] tracking-tight">
                    {currentUser?.displayName || "Valley Recruiter"}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 font-medium">
                    {currentUser?.email}
                  </p>
                  <span className="inline-block text-[9px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                    {currentUser?.role || "STAFF"}
                  </span>
                </div>
              </div>

              {/* Bottom Navigation List Buttons */}
              <div className="px-6 py-4 space-y-1 relative z-10 text-left">
                {/* 1. My Account Row */}
                <button
                  onClick={() => {
                    setIsStaffSettingsOpen(false);
                    onNavigate("/staff/profile");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">My Account</span>
                  <User className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 2. Office Chat Row */}
                <button
                  onClick={() => {
                    setIsStaffSettingsOpen(false);
                    onNavigate("/staff/office-chat");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Office Chat</span>
                  <MessageSquare className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 3. Group Chat (Team) Row */}
                <button
                  onClick={() => {
                    setIsStaffSettingsOpen(false);
                    onNavigate("/staff/group-chat");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Team Group Chat</span>
                  <Users className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* 4. Sign Out Row */}
                <button
                  onClick={async () => {
                    setIsStaffSettingsOpen(false);
                    await logout();
                    onNavigate("/");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-rose-50 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-rose-600 group-hover:text-rose-700 transition-colors">Sign Out</span>
                  <LogOut className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Employer Bottom Settings Sheet Modal */}
      <AnimatePresence>
        {currentUser && currentUser.role === "employer" && isEmployerSettingsOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEmployerSettingsOpen(false)}
              className="fixed inset-0 z-[45] bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />

            {/* Bottom Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-blue-200/50 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-blue-600">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              {/* Handle bar */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />

              {/* Profile Summary Section */}
              <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-slate-100">
                {firebaseUser?.photoURL || currentUser?.photoURL ? (
                  <img 
                    src={firebaseUser?.photoURL || currentUser?.photoURL} 
                    alt={currentUser?.displayName || "User"} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/20 shadow-sm select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg font-mono shadow-sm">
                    <Building2 className="w-6 h-6" />
                  </div>
                )}
                <div className="space-y-0.5 text-left">
                  <h4 className="text-base font-sans font-extrabold text-[#0B1B3D] tracking-tight">
                    {currentUser?.companyName || currentUser?.displayName || "Corporate Employer"}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 font-medium">
                    {currentUser?.email}
                  </p>
                  <span className="inline-block text-[9px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
                    EMPLOYER • {currentUser?.rcNumber || "VERIFIED PARTNER"}
                  </span>
                </div>
              </div>

              {/* Bottom Navigation List Buttons */}
              <div className="px-6 py-4 space-y-1 relative z-10 text-left">
                {/* Business Profile Row */}
                <button
                  onClick={() => {
                    setIsEmployerSettingsOpen(false);
                    setIsBusinessProfileOpen(true);
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Business Profile</span>
                  <Building2 className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>
                
                <div className="border-t border-slate-100 my-1" />

                {/* Staffing Tickets Row */}
                <button
                  onClick={() => {
                    setIsEmployerSettingsOpen(false);
                    setIsEmployerTicketOpen?.(true);
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Staffing Tickets</span>
                  <Ticket className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* About Valley Reigns Row */}
                <button
                  onClick={() => {
                    setIsEmployerSettingsOpen(false);
                    setShowAdminAboutModal(true);
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">About Valley Reigns</span>
                  <Info className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Install App Row */}
                {!isAppInstalled && (
                  <>
                    <button
                      onClick={() => {
                        setIsEmployerSettingsOpen(false);
                        window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                      }}
                      className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                    >
                      <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Install App</span>
                      <Download className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}

                {/* Sign Out Row */}
                <button
                  onClick={async () => {
                    setIsEmployerSettingsOpen(false);
                    await logout();
                    onNavigate("/");
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-rose-50 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-rose-600 group-hover:text-rose-700 transition-colors">Sign Out</span>
                  <LogOut className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Seeker/User Bottom Settings Sheet Modal */}
      <AnimatePresence>
        {(!currentUser || currentUser.role === "seeker") && isSeekerSettingsOpen && (
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
              className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-blue-200/50 shadow-2xl overflow-hidden pb-8 flex flex-col animate-none"
            >
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-blue-600">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              {/* Handle bar */}
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3" />

              {/* Profile Summary Section */}
              <div className="px-6 pb-5 flex items-center gap-4 relative z-10 border-b border-slate-100">
                {firebaseUser?.photoURL || currentUser?.photoURL ? (
                  <img 
                    src={firebaseUser?.photoURL || currentUser?.photoURL} 
                    alt={currentUser?.displayName || "User"} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-blue-500/20 shadow-sm select-none"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg font-mono shadow-sm">
                    {currentUser?.displayName ? (
                      currentUser.displayName.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                    ) : (
                      "GU"
                    )}
                  </div>
                )}
                <div className="space-y-0.5 text-left">
                  <h4 className="text-base font-sans font-extrabold text-[#0B1B3D] tracking-tight">
                    {currentUser?.displayName || "Guest User"}
                  </h4>
                  <p className="text-xs font-mono text-slate-500 font-medium">
                    {currentUser?.email || "Browse job postings in real-time"}
                  </p>
                  <span className="inline-block text-[9px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-md uppercase tracking-wider mt-1">
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
                      id="seeker-settings-my-account-btn"
                      onClick={() => {
                        setIsSeekerSettingsOpen(false);
                        onNavigate("/seeker/profile");
                      }}
                      className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                    >
                      <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">My Account</span>
                      <User className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}

                {/* About Valley Reigns Row */}
                <button
                  onClick={() => {
                    setIsSeekerSettingsOpen(false);
                    setShowAdminAboutModal(true);
                  }}
                  className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">About Valley Reigns</span>
                  <Info className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                </button>

                <div className="border-t border-slate-100 my-1" />

                {/* Install App Row */}
                {!isAppInstalled && (
                  <>
                    <button
                      onClick={() => {
                        setIsSeekerSettingsOpen(false);
                        window.dispatchEvent(new CustomEvent("trigger-pwa-install"));
                      }}
                      className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                    >
                      <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Install App</span>
                      <Download className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                    </button>
                    <div className="border-t border-slate-100 my-1" />
                  </>
                )}

                {/* Sign Out or Log In Row */}
                {currentUser ? (
                  <button
                    onClick={async () => {
                      setIsSeekerSettingsOpen(false);
                      await logout();
                      onNavigate("/");
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-rose-50 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-rose-600 group-hover:text-rose-700 transition-colors">Sign Out</span>
                    <LogOut className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsSeekerSettingsOpen(false);
                      window.dispatchEvent(new CustomEvent("open-auth-modal"));
                    }}
                    className="w-full flex items-center justify-between py-3.5 px-2.5 hover:bg-blue-50/55 rounded-xl transition-all duration-200 group border-0 bg-transparent cursor-pointer"
                  >
                    <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">Sign In / Join</span>
                    <UserPlus className="w-4 h-4 text-blue-500 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Employer Ticket Sheet Modal (Slide in from bottom, top corners rounded) */}
      <AnimatePresence>
        {currentUser && currentUser.role === "employer" && isEmployerTicketOpen && (
          <EmployerTicketSheet
            currentUser={currentUser}
            onClose={() => setIsEmployerTicketOpen?.(false)}
            onNavigate={onNavigate}
          />
        )}
      </AnimatePresence>

      {/* Employer Business Profile Modal */}
      <AnimatePresence>
        {currentUser && currentUser.role === "employer" && isBusinessProfileOpen && (
          <EmployerBusinessProfileModal
            currentUser={currentUser}
            onClose={() => setIsBusinessProfileOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

interface EmployerTicketSheetProps {
  currentUser: any;
  onClose: () => void;
  onNavigate: (to: string) => void;
}

function EmployerTicketSheet({ currentUser, onClose, onNavigate }: EmployerTicketSheetProps) {
  const [tab, setTab] = useState<"list" | "create">("list");
  const [tickets, setTickets] = useState<EmployerRecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [form, setForm] = useState({
    jobTitle: "",
    jobCategory: "Information Technology",
    numberOfWorkers: 1,
    salaryBudget: "",
    jobLocation: "",
    requirements: "",
    urgency: "immediate" as "immediate" | "within_1_week" | "within_1_month" | "flexible",
    notes: ""
  });

  const loadTickets = async () => {
    try {
      setLoading(true);
      const reqs = await getEmployerRecruitmentRequests(currentUser?.uid);
      setTickets(reqs || []);
    } catch (err) {
      console.warn("Error loading recruitment requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, [currentUser?.uid]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.jobTitle.trim()) return;

    setSubmitting(true);
    try {
      const newReq = await submitEmployerRecruitmentRequest({
        employerUid: currentUser?.uid || "employer-demo",
        companyName: currentUser?.companyName || currentUser?.displayName || "Corporate Employer",
        contactPerson: currentUser?.displayName || "HR Directorate",
        email: currentUser?.email || "employer@company.com",
        phone: currentUser?.companyPhone || "+234 800 000 0000",
        jobTitle: form.jobTitle.trim(),
        jobCategory: form.jobCategory,
        salaryBudget: form.salaryBudget.trim() || "Standard / Negotiable",
        numberOfWorkers: Number(form.numberOfWorkers) || 1,
        jobLocation: form.jobLocation.trim() || "Lagos / Remote / Hybrid",
        requirements: form.requirements.trim() || "Standard qualifications required.",
        urgency: form.urgency,
        notes: form.notes.trim()
      });

      // Send real-time notification to recruiters and admins
      await addSystemNotification({
        type: "recruitment_request_submitted",
        title: "New Staffing Ticket Created",
        message: `${currentUser?.companyName || currentUser?.displayName || "Employer"} submitted a request for ${form.numberOfWorkers}x ${form.jobTitle.trim()} (${form.jobCategory}).`,
        metadata: {
          requestId: newReq.id,
          employerUid: currentUser?.uid,
          jobTitle: form.jobTitle.trim()
        }
      }).catch(err => console.warn("Failed to notify:", err));

      setTickets(prev => [newReq, ...prev]);
      setSuccessMessage("Staffing ticket created successfully! Valley Reigns recruiters have been dispatched.");
      setForm({
        jobTitle: "",
        jobCategory: "Information Technology",
        numberOfWorkers: 1,
        salaryBudget: "",
        jobLocation: "",
        requirements: "",
        urgency: "immediate",
        notes: ""
      });

      setTimeout(() => {
        setSuccessMessage(null);
        setTab("list");
      }, 1500);
    } catch (err) {
      console.error("Failed to submit ticket:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3 h-3" /> Fulfilled</span>;
      case "sourcing":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"><Sparkles className="w-3 h-3" /> Sourcing</span>;
      case "reviewing":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200"><Clock className="w-3 h-3" /> Reviewing</span>;
      case "cancelled":
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200"><AlertCircle className="w-3 h-3" /> Closed</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[45] bg-slate-950/60 backdrop-blur-xs cursor-pointer"
      />

      {/* Bottom Sheet Modal */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="fixed bottom-0 left-0 right-0 z-50 w-full max-w-lg mx-auto bg-white text-[#0B1B3D] rounded-t-[32px] border-t border-blue-200/50 shadow-2xl overflow-hidden pb-8 flex flex-col max-h-[85vh] animate-none"
      >
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] text-blue-600">
          <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
            <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </div>

        {/* Handle bar */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-3 shrink-0" />

        {/* Header */}
        <div className="px-6 pb-4 flex items-center justify-between relative z-10 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3 text-left">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-sans font-extrabold text-[#0B1B3D] tracking-tight">Staffing Tickets</h3>
              <p className="text-xs text-slate-500 font-medium">Request & manage recruiter talent sourcing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors border-0"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch pills */}
        <div className="px-6 pt-3 pb-2 relative z-10 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setTab("list")}
              className={`py-2 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer ${
                tab === "list"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "bg-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              My Tickets ({tickets.length})
            </button>
            <button
              onClick={() => setTab("create")}
              className={`py-2 text-xs font-bold rounded-lg transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5 ${
                tab === "create"
                  ? "bg-white text-blue-600 shadow-xs"
                  : "bg-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              New Ticket
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="px-6 py-3 overflow-y-auto flex-1 relative z-10 text-left">
          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {tab === "list" ? (
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Loading tickets...
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                    <Ticket className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-slate-800">No Staffing Tickets Yet</h4>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto">
                      Delegate hiring to Valley Reigns recruiters. Create a staffing ticket and our team will source verified candidates for you.
                    </p>
                  </div>
                  <button
                    onClick={() => setTab("create")}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border-0"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create First Ticket
                  </button>
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-bold text-[#0B1B3D]">{t.jobTitle}</h4>
                        <p className="text-xs text-slate-500 font-medium">{t.jobCategory}</p>
                      </div>
                      {getStatusBadge(t.status)}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[11px] text-slate-600">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Workers</span>
                        <span className="font-semibold text-slate-700">{t.numberOfWorkers} needed</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Budget</span>
                        <span className="font-semibold text-slate-700 truncate block">{t.salaryBudget || "Negotiable"}</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-slate-400 block">Urgency</span>
                        <span className="font-semibold text-slate-700 capitalize">{t.urgency.replace(/_/g, " ")}</span>
                      </div>
                    </div>

                    {t.assignedStaffName && (
                      <div className="text-[11px] text-blue-600 font-medium bg-blue-50/70 px-2.5 py-1 rounded-lg">
                        Assigned Recruiter: <span className="font-bold">{t.assignedStaffName}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5 pb-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Job Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. House Help, Gate Keeper, POS Attendant, Developer"
                  value={form.jobTitle}
                  onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Job Category</label>
                  <select
                    value={form.jobCategory}
                    onChange={(e) => setForm({ ...form, jobCategory: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                  >
                    <option value="Information Technology">Information Technology</option>
                    <option value="Sales & Marketing">Sales & Marketing</option>
                    <option value="Customer Support">Customer Support</option>
                    <option value="Hospitality">Hospitality & Hotel</option>
                    <option value="Domestic / Facility">Domestic / Facility</option>
                    <option value="Healthcare">Healthcare</option>
                    <option value="Education / Teaching">Education / Teaching</option>
                    <option value="Accounting & Finance">Accounting & Finance</option>
                    <option value="Logistics & Security">Logistics & Security</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Headcount Needed</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={form.numberOfWorkers}
                    onChange={(e) => setForm({ ...form, numberOfWorkers: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Salary Budget</label>
                  <input
                    type="text"
                    placeholder="e.g. ₦150,000 / month"
                    value={form.salaryBudget}
                    onChange={(e) => setForm({ ...form, salaryBudget: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                  >
                    <option value="immediate">Immediate (Within 48h)</option>
                    <option value="within_1_week">Within 1 Week</option>
                    <option value="within_1_month">Within 1 Month</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                <input
                  type="text"
                  placeholder="e.g. Lagos Island / Ikeja / Remote / On-site"
                  value={form.jobLocation}
                  onChange={(e) => setForm({ ...form, jobLocation: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Candidate Requirements & Notes</label>
                <textarea
                  rows={2}
                  placeholder="Specify key skills, age bracket, experience level, or work schedule..."
                  value={form.requirements}
                  onChange={(e) => setForm({ ...form, requirements: e.target.value })}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 bg-white resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTab("list")}
                  className="flex-1 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer border-0"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !form.jobTitle.trim()}
                  className="flex-1 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-all shadow-sm cursor-pointer border-0 flex items-center justify-center gap-1.5"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </>
  );
}

interface EmployerBusinessProfileModalProps {
  currentUser: any;
  onClose: () => void;
}

function EmployerBusinessProfileModal({ currentUser, onClose }: EmployerBusinessProfileModalProps) {
  const [profile, setProfile] = useState({
    companyName: currentUser?.companyName || "",
    rcNumber: currentUser?.rcNumber || "",
    companyIndustry: currentUser?.companyIndustry || "",
    companyWebsite: currentUser?.companyWebsite || "",
    displayName: currentUser?.displayName || "",
    companyPhone: currentUser?.companyPhone || "",
    companyAddress: currentUser?.companyAddress || ""
  });

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser?.uid) return;

    setSaving(true);
    try {
      const updatedUser = {
        ...currentUser,
        ...profile
      };

      await saveUserProfile(updatedUser);

      // Immediately sync local in-memory store
      if (memoryStore.users[currentUser.uid]) {
        memoryStore.users[currentUser.uid] = {
          ...memoryStore.users[currentUser.uid],
          ...profile
        };
      }
      if (memoryStore.currentUser) {
        memoryStore.currentUser = {
          ...memoryStore.currentUser,
          ...profile
        };
      }
      memoryStore.save();

      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1200);
    } catch (err) {
      console.error("Failed to update employer business profile:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-xs cursor-pointer"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ type: "spring", damping: 25, stiffness: 260 }}
        className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[65] max-w-xl mx-auto bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">Business Profile</h3>
              <p className="text-xs text-slate-500 font-mono">Manage verified corporate credentials and contact details</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4 flex-1">
          {savedSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Business profile updated successfully!</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Company Legal Name</label>
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setProfile({ ...profile, companyName: e.target.value })}
                placeholder="e.g. Apex Systems Global Ltd"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Registration Number (RC)</label>
              <input
                type="text"
                value={profile.rcNumber}
                onChange={(e) => setProfile({ ...profile, rcNumber: e.target.value })}
                placeholder="e.g. RC-892341"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Type of Business / Industry</label>
              <input
                type="text"
                value={profile.companyIndustry}
                onChange={(e) => setProfile({ ...profile, companyIndustry: e.target.value })}
                placeholder="e.g. Technology, Retail, Hospitality"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Official Website</label>
              <input
                type="text"
                value={profile.companyWebsite}
                onChange={(e) => setProfile({ ...profile, companyWebsite: e.target.value })}
                placeholder="https://company.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Primary Contact Officer</label>
              <input
                type="text"
                value={profile.displayName}
                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                placeholder="Full Name"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Contact Phone Number</label>
              <input
                type="text"
                value={profile.companyPhone}
                onChange={(e) => setProfile({ ...profile, companyPhone: e.target.value })}
                placeholder="+234 ..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-slate-700">Corporate Head Office Address</label>
              <input
                type="text"
                value={profile.companyAddress}
                onChange={(e) => setProfile({ ...profile, companyAddress: e.target.value })}
                placeholder="Street address, City, State"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#0084FF] hover:bg-[#0070DA] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {saving ? (
                <span>Saving...</span>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </>
  );
}
