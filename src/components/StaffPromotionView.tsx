import React, { useState, useEffect } from "react";
import { UserProfile } from "../types";
import { 
  getAllUserProfiles, 
  updateUserRole, 
  deleteUserProfile, 
  batchUpdateUserRoles, 
  batchDeleteUserProfiles,
  toggleStaffJobPosting,
  getStaffStatuses,
  seedWhatsAppSessionsInitialData
} from "../lib/services";
import { 
  Shield, 
  UserCheck, 
  Users, 
  Search, 
  LayoutGrid, 
  List, 
  RefreshCw, 
  Trash2, 
  ChevronDown, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Briefcase, 
  Building2, 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowLeft, 
  Check, 
  X, 
  Headphones, 
  ShieldAlert, 
  SlidersHorizontal,
  CheckSquare,
  Square,
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface StaffPromotionViewProps {
  onBack?: () => void;
  hideTopTitle?: boolean;
}

export const StaffPromotionView: React.FC<StaffPromotionViewProps> = ({ onBack, hideTopTitle }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [staffStatuses, setStaffStatuses] = useState<Record<string, "online" | "offline">>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<"all" | "seeker" | "staff" | "admin" | "employer">("all");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ user: UserProfile; newRole: "seeker" | "staff" | "admin" | "employer" } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      // Also ensure WhatsApp sessions metadata is primed
      seedWhatsAppSessionsInitialData().catch(() => {});
      const [allUsers, statuses] = await Promise.all([
        getAllUserProfiles(),
        getStaffStatuses()
      ]);
      setUsers(allUsers);
      setStaffStatuses(statuses);
    } catch (err) {
      console.warn("Failed to load user profiles:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const showToast = (msg: string) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(null), 3500);
  };

  // Role promotion/reassignment
  const handleRoleChange = async (user: UserProfile, newRole: "seeker" | "staff" | "admin" | "employer") => {
    if (user.role === newRole) return;
    
    // High-privilege confirmation warning if promoting to Admin
    if (newRole === "admin" && user.role !== "admin") {
      setPendingRoleChange({ user, newRole });
      return;
    }

    await executeRoleChange(user.uid, newRole, user.displayName || user.email);
  };

  const executeRoleChange = async (uid: string, newRole: "seeker" | "staff" | "admin" | "employer", name: string) => {
    try {
      // Optimistic UI update
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole, ...(newRole === "staff" || newRole === "admin" ? { canPostJobs: true } : {}) } : u));
      await updateUserRole(uid, newRole);
      
      const roleLabel = newRole === "staff" ? "Staff Member" : newRole === "admin" ? "System Admin" : newRole === "employer" ? "Employer" : "Job Seeker";
      showToast(`Updated ${name} to ${roleLabel}`);
    } catch (err) {
      console.error("Failed to update role:", err);
      showToast("Error updating user role");
      await loadData();
    } finally {
      setPendingRoleChange(null);
    }
  };

  // Toggle Job Posting Permission for Staff/Admin
  const handleToggleJobPosting = async (user: UserProfile) => {
    const nextVal = !user.canPostJobs;
    setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, canPostJobs: nextVal } : u));
    await toggleStaffJobPosting(user.uid, nextVal);
    showToast(`${user.displayName || "User"} job posting permission ${nextVal ? "enabled" : "disabled"}`);
  };

  // Single User Deletion
  const handleDeleteUser = async () => {
    if (!deleteConfirmUser) return;
    const { uid, displayName, email } = deleteConfirmUser;
    try {
      setUsers(prev => prev.filter(u => u.uid !== uid));
      setSelectedUids(prev => prev.filter(id => id !== uid));
      await deleteUserProfile(uid);
      showToast(`User ${displayName || email} deleted successfully.`);
    } catch (err) {
      console.error("Failed to delete user:", err);
      showToast("Error deleting user.");
    } finally {
      setDeleteConfirmUser(null);
    }
  };

  // Batch Selection Handlers
  const handleToggleSelectUser = (uid: string) => {
    setSelectedUids(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const handleSelectAll = (filteredList: UserProfile[]) => {
    if (selectedUids.length === filteredList.length) {
      setSelectedUids([]);
    } else {
      setSelectedUids(filteredList.map(u => u.uid));
    }
  };

  // Batch Role Update
  const handleBatchRoleUpdate = async (newRole: "seeker" | "staff" | "admin" | "employer") => {
    if (selectedUids.length === 0) return;
    const count = selectedUids.length;
    try {
      setUsers(prev => prev.map(u => selectedUids.includes(u.uid) ? { ...u, role: newRole, ...(newRole === "staff" || newRole === "admin" ? { canPostJobs: true } : {}) } : u));
      await batchUpdateUserRoles(selectedUids, newRole);
      const roleName = newRole === "staff" ? "Staff" : newRole === "admin" ? "Admin" : newRole === "employer" ? "Employer" : "Job Seeker";
      showToast(`Successfully updated ${count} user(s) to ${roleName}.`);
      setSelectedUids([]);
    } catch (err) {
      console.error("Batch role update error:", err);
      showToast("Failed to perform batch update.");
      await loadData();
    }
  };

  // Batch Deletion
  const handleBatchDelete = async () => {
    if (selectedUids.length === 0) return;
    const count = selectedUids.length;
    try {
      setUsers(prev => prev.filter(u => !selectedUids.includes(u.uid)));
      await batchDeleteUserProfiles(selectedUids);
      showToast(`Successfully deleted ${count} user account(s).`);
      setSelectedUids([]);
    } catch (err) {
      console.error("Batch delete error:", err);
      showToast("Failed to delete selected users.");
      await loadData();
    } finally {
      setIsBatchDeleteModalOpen(false);
    }
  };

  // Filter and Search Logic
  const filteredUsers = users.filter(u => {
    // Role filter
    if (roleFilter !== "all" && u.role !== roleFilter) {
      return false;
    }

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const nameMatch = (u.displayName || "").toLowerCase().includes(q);
    const emailMatch = (u.email || "").toLowerCase().includes(q);
    const phoneMatch = (u.phoneNumber || "").toLowerCase().includes(q) || (u.companyPhone || "").toLowerCase().includes(q);
    const roleMatch = (u.role || "").toLowerCase().includes(q);
    const jobTitleMatch = (u.jobTitle || "").toLowerCase().includes(q);
    const companyMatch = (u.companyName || "").toLowerCase().includes(q);

    return nameMatch || emailMatch || phoneMatch || roleMatch || jobTitleMatch || companyMatch;
  });

  // Calculate Metrics
  const metrics = {
    total: users.length,
    seeker: users.filter(u => u.role === "seeker").length,
    staff: users.filter(u => u.role === "staff").length,
    admin: users.filter(u => u.role === "admin").length,
    employer: users.filter(u => u.role === "employer").length
  };

  const formatRelativeTime = (timestamp?: any) => {
    if (!timestamp) return "today";
    let timeNum = typeof timestamp === "number" ? timestamp : Number(timestamp);
    if (isNaN(timeNum) || timeNum <= 0) {
      if (typeof timestamp === "string") {
        const parsed = Date.parse(timestamp);
        if (!isNaN(parsed)) timeNum = parsed;
      }
    }
    if (!timeNum || isNaN(timeNum)) return "today";

    const now = Date.now();
    const diffMs = Math.max(0, now - timeNum);
    const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDay < 1) return "today";
    if (diffDay === 1) return "yesterday";
    if (diffDay === 2) return "2 days ago";
    if (diffDay === 3) return "3 days ago";
    if (diffDay >= 4 && diffDay <= 6) return `${diffDay} days ago`;
    if (diffDay >= 7 && diffDay <= 13) return "last week";
    if (diffDay >= 14 && diffDay <= 20) return "2 weeks ago";
    if (diffDay >= 21 && diffDay <= 27) return "3 weeks ago";
    if (diffDay >= 28 && diffDay <= 59) return "a month ago";
    if (diffDay >= 60 && diffDay < 365) {
      const months = Math.floor(diffDay / 30);
      return `${months} months ago`;
    }
    if (diffDay >= 365 && diffDay < 730) return "last year";
    const years = Math.floor(diffDay / 365);
    return `${years} years ago`;
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
            <Shield className="w-3 h-3 text-purple-600" />
            Admin
          </span>
        );
      case "staff":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
            <Headphones className="w-3 h-3 text-blue-600" />
            Staff
          </span>
        );
      case "employer":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wider">
            <Building2 className="w-3 h-3 text-indigo-600" />
            Employer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
            <User className="w-3 h-3 text-slate-500" />
            Seeker
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 text-slate-900">
      {/* Top Header Bar (Only if not hidden by standalone page wrapper) */}
      {!hideTopTitle && (
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3.5 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-none hover:-translate-y-0.5"
              >
                <ArrowLeft className="w-4 h-4" /> Go Back
              </button>
            )}
            <h2 className="text-lg sm:text-xl font-black text-[#0B1B3D] tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              User Management
            </h2>
          </div>

          <span className="px-3 py-1 bg-[#0B1B3D] text-white border border-[#0B1B3D] font-mono text-[10px] font-extrabold rounded-full uppercase tracking-wider">
            Admin Matrix
          </span>
        </div>
      )}

      {/* Status Toast Banner */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{statusMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Bar & View Tools in the Same Row */}
      <div className="flex flex-row items-center justify-between gap-2.5 w-full">
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, phone, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-white border border-[#0B1B3D] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#0B1B3D] transition-all text-slate-800 placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 border border-slate-300 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("card")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "card" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="Card Grid Mode"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === "list" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
              title="List Table Mode"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 border border-slate-300 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
          </button>
        </div>
      </div>

      {/* Batch Action Toolbar */}
      <div className="bg-white border border-[#0B1B3D] rounded-2xl p-3 sm:p-3.5 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        {selectedUids.length > 0 ? (
          /* Selected State */
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1.5 bg-[#0B1B3D] text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-blue-400" />
                {selectedUids.length} Selected
              </span>

              <button
                onClick={() => {
                  if (selectedUids.length === filteredUsers.length) {
                    setSelectedUids([]);
                  } else {
                    setSelectedUids(filteredUsers.map(u => u.uid));
                  }
                }}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-2xs"
              >
                {selectedUids.length === filteredUsers.length ? "Deselect All" : "Select All"}
              </button>

              <button
                onClick={() => {
                  setSelectedUids([]);
                  setIsSelectionMode(false);
                }}
                className="px-2.5 py-1.5 text-xs font-extrabold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Done
              </button>
            </div>

            {/* High-Contrast Light Theme Batch Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBatchRoleUpdate("staff")}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white border border-blue-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Promote selected to Staff"
              >
                <Headphones className="w-3.5 h-3.5" />
                <span>Make Staff</span>
              </button>

              <button
                onClick={() => handleBatchRoleUpdate("admin")}
                className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white border border-purple-800 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Promote selected to Admin"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Make Admin</span>
              </button>

              <button
                onClick={() => handleBatchRoleUpdate("seeker")}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white border border-slate-900 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Set selected as Job Seeker"
              >
                <User className="w-3.5 h-3.5" />
                <span>Set Seeker</span>
              </button>

              <button
                onClick={() => setIsBatchDeleteModalOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Delete selected users"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete ({selectedUids.length})</span>
              </button>
            </div>
          </>
        ) : isSelectionMode ? (
          /* Selection Mode Active but nothing selected yet */
          <>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Select users for bulk actions</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedUids(filteredUsers.map(u => u.uid))}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-[#0B1B3D] hover:bg-[#152e66] border border-[#0B1B3D] rounded-xl text-xs font-extrabold text-white transition-all cursor-pointer shadow-xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Select All ({filteredUsers.length})</span>
              </button>

              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedUids([]);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-extrabold text-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                <X className="w-3.5 h-3.5 text-slate-500" />
                <span>Cancel</span>
              </button>
            </div>
          </>
        ) : (
          /* Initial Default State: Text first, then Select All and Select buttons */
          <>
            <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>Select users for bulk actions</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setIsSelectionMode(true);
                  setSelectedUids(filteredUsers.map(u => u.uid));
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0B1B3D] hover:bg-[#152e66] border border-[#0B1B3D] rounded-xl text-xs font-extrabold text-white transition-all cursor-pointer shadow-xs"
              >
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>Select All</span>
              </button>

              <button
                onClick={() => setIsSelectionMode(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-[#0B1B3D] rounded-xl text-xs font-extrabold text-[#0B1B3D] transition-all cursor-pointer shadow-2xs"
              >
                <Square className="w-3.5 h-3.5 text-slate-500" />
                <span>Select</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Main Content Area: Loading / Empty / Grid / List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-600">Loading user database...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="py-16 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-100/80 text-blue-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No users found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery 
              ? `No user records matching "${searchQuery}". Try modifying your search keywords or clearing filters.`
              : `No registered users found in the "${roleFilter}" category.`}
          </p>
          {(searchQuery || roleFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setRoleFilter("all");
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === "card" ? (
        /* CARD GRID MODE */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isSelected = selectedUids.includes(user.uid);
            const isOnline = staffStatuses[user.uid] === "online";
            const userName = user.displayName || user.email?.split("@")[0] || "Anonymous User";
            const initial = userName.trim().charAt(0).toUpperCase();

            return (
              <motion.div
                key={user.uid}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => {
                  if (isSelectionMode) {
                    handleToggleSelectUser(user.uid);
                  }
                }}
                className={`bg-white border border-[#0B1B3D] rounded-2xl p-5 transition-all space-y-4 relative ${
                  isSelected 
                    ? "ring-2 ring-[#0B1B3D]/30 bg-blue-50/15" 
                    : "hover:shadow-md"
                } ${isSelectionMode ? "cursor-pointer" : ""}`}
              >
                {/* Card Top: Checkbox (ONLY if isSelectionMode or selected), Avatar, Name & Status */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {(isSelectionMode || selectedUids.length > 0) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleSelectUser(user.uid);
                        }}
                        className="text-slate-400 hover:text-blue-600 cursor-pointer transition-colors shrink-0"
                        title={isSelected ? "Deselect" : "Select"}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#0B1B3D]" />
                        ) : (
                          <Square className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                        )}
                      </button>
                    )}

                    <div className="relative shrink-0 flex items-center justify-center">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white ${
                        user.role === "admin" 
                          ? "bg-purple-700 shadow-xs" 
                          : user.role === "staff" 
                          ? "bg-blue-600 shadow-xs" 
                          : user.role === "employer"
                          ? "bg-indigo-600 shadow-xs"
                          : "bg-slate-700 shadow-xs"
                      }`}>
                        {initial}
                      </div>
                      {(user.role === "staff" || user.role === "admin") && (
                        <span 
                          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                            isOnline ? "bg-emerald-500" : "bg-slate-400"
                          }`} 
                          title={isOnline ? "Active / Online" : "Offline"}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex flex-col justify-center my-auto">
                      <h4 className="text-sm font-extrabold text-[#0B1B3D] truncate max-w-[140px] sm:max-w-[180px] leading-normal">
                        {userName}
                      </h4>
                      {(user.jobTitle || user.companyName) && (
                        <p className="text-[11px] text-slate-500 font-medium truncate max-w-[180px] mt-0.5">
                          {user.jobTitle || user.companyName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">{getRoleBadge(user.role)}</div>
                </div>

                {/* Contact & Meta Details */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                  {user.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate font-medium text-slate-700">{user.email}</span>
                    </div>
                  )}

                  {(user.phoneNumber || user.companyPhone) && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-slate-700">{user.phoneNumber || user.companyPhone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Registered {formatRelativeTime(user.createdAt)}</span>
                  </div>
                </div>

                {/* Role Switcher Matrix */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-500">Change Role:</span>
                    
                    {/* Job Posting Permission Switch (Staff & Admin) */}
                    {(user.role === "staff" || user.role === "admin" || user.role === "employer") && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleJobPosting(user);
                        }}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border transition-colors cursor-pointer ${
                          user.canPostJobs 
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300" 
                            : "bg-slate-100 text-slate-500 border-slate-300"
                        }`}
                        title="Toggle job posting permission"
                      >
                        {user.canPostJobs ? "✓ Can Post Jobs" : "✕ No Job Posting"}
                      </button>
                    )}
                  </div>

                  {/* 4-way Quick Role Switcher Buttons with Thin Borders */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleChange(user, "seeker");
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        user.role === "seeker"
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                      }`}
                      title="Set as Job Seeker"
                    >
                      <User className="w-3 h-3" />
                      <span className="text-[10px]">Seeker</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleChange(user, "staff");
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        user.role === "staff"
                          ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                          : "bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border-slate-300"
                      }`}
                      title="Promote to Staff"
                    >
                      <Headphones className="w-3 h-3" />
                      <span className="text-[10px]">Staff</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleChange(user, "admin");
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        user.role === "admin"
                          ? "bg-purple-700 text-white border-purple-700 shadow-xs"
                          : "bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border-slate-300"
                      }`}
                      title="Promote to Admin"
                    >
                      <Shield className="w-3 h-3" />
                      <span className="text-[10px]">Admin</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoleChange(user, "employer");
                      }}
                      className={`py-1.5 px-1 rounded-lg text-[11px] font-extrabold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                        user.role === "employer"
                          ? "bg-indigo-700 text-white border-indigo-700 shadow-xs"
                          : "bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-300"
                      }`}
                      title="Assign as Employer"
                    >
                      <Building2 className="w-3 h-3" />
                      <span className="text-[10px]">Employer</span>
                    </button>
                  </div>
                </div>

                {/* Card Footer: Delete Action */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-slate-400">UID: {user.uid.substring(0, 12)}...</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmUser(user);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Delete user profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* LIST TABLE MODE */
        <div className="bg-white border border-[#0B1B3D] rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold">
                  <th className="py-3.5 px-4 w-10">
                    <button
                      onClick={() => handleSelectAll(filteredUsers)}
                      className="cursor-pointer text-slate-400 hover:text-blue-600"
                    >
                      {selectedUids.length > 0 && selectedUids.length === filteredUsers.length ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">User</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Current Role</th>
                  <th className="py-3.5 px-4">Role Reassignment</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUids.includes(user.uid);
                  const isOnline = staffStatuses[user.uid] === "online";
                  const userName = user.displayName || user.email?.split("@")[0] || "Anonymous User";
                  const initial = userName.trim().charAt(0).toUpperCase();

                  return (
                    <tr 
                      key={user.uid}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isSelected ? "bg-blue-50/30" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleSelectUser(user.uid)}
                          className="cursor-pointer text-slate-400 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#0B1B3D]" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative shrink-0 flex items-center justify-center">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white ${
                              user.role === "admin" ? "bg-purple-700" : user.role === "staff" ? "bg-blue-600" : user.role === "employer" ? "bg-indigo-600" : "bg-slate-700"
                            }`}>
                              {initial}
                            </div>
                            {(user.role === "staff" || user.role === "admin") && (
                              <span 
                                className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                                  isOnline ? "bg-emerald-500" : "bg-slate-400"
                                }`} 
                              />
                            )}
                          </div>
                          <div>
                            <div className="font-extrabold text-[#0B1B3D] text-xs">{userName}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{user.jobTitle || user.companyName || `UID: ${user.uid.substring(0, 8)}`}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-600">
                        {user.email && <div>{user.email}</div>}
                        {(user.phoneNumber || user.companyPhone) && (
                          <div className="text-[11px] text-slate-400 font-mono">{user.phoneNumber || user.companyPhone}</div>
                        )}
                        <div className="text-[10px] text-slate-400 pt-0.5">Registered {formatRelativeTime(user.createdAt)}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getRoleBadge(user.role)}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRoleChange(user, "seeker")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              user.role === "seeker"
                                ? "bg-emerald-600 text-white border-emerald-600"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300"
                            }`}
                          >
                            Seeker
                          </button>
                          <button
                            onClick={() => handleRoleChange(user, "staff")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              user.role === "staff"
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-slate-50 hover:bg-blue-50 hover:text-blue-700 text-slate-700 border-slate-300"
                            }`}
                          >
                            Staff
                          </button>
                          <button
                            onClick={() => handleRoleChange(user, "admin")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              user.role === "admin"
                                ? "bg-purple-700 text-white border-purple-700"
                                : "bg-slate-50 hover:bg-purple-50 hover:text-purple-700 text-slate-700 border-slate-300"
                            }`}
                          >
                            Admin
                          </button>
                          <button
                            onClick={() => handleRoleChange(user, "employer")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                              user.role === "employer"
                                ? "bg-indigo-700 text-white border-indigo-700"
                                : "bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-300"
                            }`}
                          >
                            Employer
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setDeleteConfirmUser(user)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete user account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SINGLE DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-left"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0B1B3D]">Delete User Account?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  Are you sure you want to permanently delete the account for <strong className="text-slate-900">{deleteConfirmUser.displayName || deleteConfirmUser.email}</strong>? This action will revoke their access to the system.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirmUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Delete Account
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BATCH DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {isBatchDeleteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-left"
            >
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0B1B3D]">Batch Delete {selectedUids.length} User(s)?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are about to permanently delete <strong className="text-slate-900">{selectedUids.length} selected user account(s)</strong>. This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsBatchDeleteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Confirm Batch Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADMIN ELEVATION CONFIRMATION MODAL */}
      <AnimatePresence>
        {pendingRoleChange && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-left"
            >
              <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#0B1B3D]">Grant System Administrator Privileges?</h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are promoting <strong className="text-slate-900">{pendingRoleChange.user.displayName || pendingRoleChange.user.email}</strong> to a full <strong>System Administrator</strong>. They will gain unrestricted access to global WhatsApp configuration, user management, and developer settings.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setPendingRoleChange(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => executeRoleChange(pendingRoleChange.user.uid, pendingRoleChange.newRole, pendingRoleChange.user.displayName || pendingRoleChange.user.email)}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Grant Admin Role</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
