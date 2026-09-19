import React from "react";
import { 
  Search, 
  Briefcase, 
  Home, 
  Settings, 
  MessageSquare, 
  ClipboardList, 
  Plus,
  Ticket
} from "lucide-react";

interface RoleBottomNavigationProps {
  currentUser: any;
  shouldHideHeader: boolean;
  locationPathname: string;
  locationSearch: string;
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
  onNavigate: (to: string) => void;
}

export function RoleBottomNavigation({
  currentUser,
  shouldHideHeader,
  locationPathname,
  locationSearch,
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
  onNavigate,
}: RoleBottomNavigationProps) {
  if (shouldHideHeader) return null;

  return (
    <>
      {/* Admin Sticky Fixed Bottom Navigation Pill */}
      {currentUser && currentUser.role === "admin" && (
        <div id="admin-bottom-nav" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-[260px] px-2 animate-none">
          <div className="bg-[#0b1b3d]/85 backdrop-blur-lg border border-[#0084FF] shadow-[0_10px_30px_rgba(0,132,255,0.15)] rounded-full px-3 py-1.5 flex items-center justify-around transition-all duration-300">
            {/* Search Icon Component (Left) */}
            <button
              id="admin-nav-search-btn"
              onClick={() => {
                setIsAdminSettingsOpen(false);
                onNavigate("/seeker");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/seeker"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Search Jobs"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Home Icon Component */}
            <button
              id="admin-nav-home-btn"
              onClick={() => {
                setIsAdminSettingsOpen(false);
                onNavigate("/admin/dashboard?view=overview");
                window.dispatchEvent(new CustomEvent("admin-home-click"));
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname.startsWith("/admin")
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Admin Dashboard"
            >
              <Home className="w-5 h-5" />
            </button>

            {/* Chat Inbox Button */}
            <button
              id="admin-nav-inbox-btn"
              onClick={() => {
                setIsAdminSettingsOpen(false);
                onNavigate("/staff?tab=inbox");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/staff" && (new URLSearchParams(locationSearch).get("tab") === "inbox" || !new URLSearchParams(locationSearch).get("tab"))
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Live Chat Inbox"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Settings Icon Component (Right) */}
            <button
              id="admin-nav-settings-btn"
              onClick={() => {
                setIsAdminSettingsOpen(!isAdminSettingsOpen);
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                isAdminSettingsOpen
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Admin Settings"
            >
              <Settings className={`w-5 h-5 transition-transform duration-500 ${isAdminSettingsOpen ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Staff Sticky Fixed Bottom Navigation Pill */}
      {currentUser && currentUser.role === "staff" && (
        <div id="staff-bottom-nav" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-[300px] px-2 animate-none">
          <div className="bg-[#0b1b3d]/85 backdrop-blur-lg border border-[#0084FF] shadow-[0_10px_30px_rgba(0,132,255,0.15)] rounded-full px-3 py-1.5 flex items-center justify-around transition-all duration-300">
            {/* Search Jobs (Seeker View) */}
            <button
              id="staff-nav-search-btn"
              onClick={() => {
                setIsStaffSettingsOpen(false);
                onNavigate("/seeker");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/seeker"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Find Jobs"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Chat Inbox */}
            <button
              id="staff-nav-inbox-btn"
              onClick={() => {
                setIsStaffSettingsOpen(false);
                onNavigate("/staff?tab=inbox");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/staff" && (new URLSearchParams(locationSearch).get("tab") === "inbox" || !new URLSearchParams(locationSearch).get("tab"))
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Chat Inbox"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Job Management (Plus Icon) */}
            <button
              id="staff-nav-post-job-btn"
              onClick={() => {
                setIsStaffSettingsOpen(false);
                onNavigate("/staff/manage-jobs");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/staff/manage-jobs"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Manage Jobs"
            >
              <Plus className="w-5 h-5" />
            </button>

            {/* Daily Report */}
            <button
              id="staff-nav-report-btn"
              onClick={() => {
                setIsStaffSettingsOpen(false);
                onNavigate("/staff?tab=report");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/staff" && new URLSearchParams(locationSearch).get("tab") === "report"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Daily Staff Report"
            >
              <ClipboardList className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              id="staff-nav-settings-btn"
              onClick={() => {
                setIsStaffSettingsOpen(!isStaffSettingsOpen);
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                isStaffSettingsOpen
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Recruiter Settings"
            >
              <Settings className={`w-5 h-5 transition-transform duration-500 ${isStaffSettingsOpen ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Seeker/User Sticky Fixed Bottom Navigation Pill */}
      {(currentUser && currentUser.role === "seeker") && (
        <div id="seeker-bottom-nav" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-[200px] px-2 animate-none">
          <div className="bg-[#0b1b3d]/85 backdrop-blur-lg border border-[#0084FF] shadow-[0_10px_30px_rgba(0,132,255,0.15)] rounded-full px-4 py-1.5 flex items-center justify-around transition-all duration-300">
            {/* Find Jobs / Search */}
            <button
              id="seeker-nav-search-btn"
              onClick={() => {
                setIsSeekerSettingsOpen(false);
                onNavigate(currentUser ? "/seeker" : "/");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                locationPathname === "/" || locationPathname === "/seeker"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Find Jobs"
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Messages */}
            <button
              id="seeker-nav-messages-btn"
              onClick={() => {
                setIsSeekerSettingsOpen(false);
                onNavigate("/seeker/messages");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center relative ${
                locationPathname === "/seeker/messages"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="My Chats"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* Settings */}
            <button
              id="seeker-nav-settings-btn"
              onClick={() => {
                setIsSeekerSettingsOpen(!isSeekerSettingsOpen);
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                isSeekerSettingsOpen
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Account Settings"
            >
              <Settings className={`w-5 h-5 transition-transform duration-500 ${isSeekerSettingsOpen ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>
      )}

      {/* Employer Sticky Fixed Bottom Navigation Pill */}
      {currentUser && currentUser.role === "employer" && (
        <div id="employer-bottom-nav" className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-[210px] px-2 animate-none">
          <div className="bg-[#0b1b3d]/85 backdrop-blur-lg border border-[#0084FF] shadow-[0_10px_30px_rgba(0,132,255,0.15)] rounded-full px-3 py-1.5 flex items-center justify-around transition-all duration-300">
            {/* 1. Employer Chat */}
            <button
              id="employer-nav-chat-btn"
              onClick={() => {
                setIsEmployerSettingsOpen(false);
                setIsEmployerTicketOpen?.(false);
                onNavigate("/employer/chat");
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center relative ${
                locationPathname === "/employer/chat" || locationPathname === "/employer" || locationPathname === "/employer/dashboard"
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Employer Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>

            {/* 2. Ticket Modal */}
            <button
              id="employer-nav-ticket-btn"
              onClick={() => {
                setIsEmployerSettingsOpen(false);
                setIsEmployerTicketOpen?.(!isEmployerTicketOpen);
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                isEmployerTicketOpen
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Staffing Tickets"
            >
              <Ticket className="w-5 h-5" />
            </button>

            {/* 3. Settings */}
            <button
              id="employer-nav-settings-btn"
              onClick={() => {
                setIsEmployerTicketOpen?.(false);
                setIsEmployerSettingsOpen(!isEmployerSettingsOpen);
              }}
              className={`p-2 border cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center ${
                isEmployerSettingsOpen
                  ? "bg-[#0084FF]/30 border-[#0084FF]/25 text-white rounded-full"
                  : "bg-transparent border-transparent text-blue-300 hover:text-white rounded-full"
              }`}
              title="Employer Settings"
            >
              <Settings className={`w-5 h-5 transition-transform duration-500 ${isEmployerSettingsOpen ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
