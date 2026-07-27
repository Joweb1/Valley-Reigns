import React, { useState } from "react";
import { UserProfile, Conversation } from "../types";
import { SLACountdownTimer } from "./SLACountdownTimer";
import { batchDeleteConversations, batchResetConversations, deleteConversation, updateConversationStatus } from "../lib/services";
import { 
  BarChart3, 
  ArrowLeft, 
  Users, 
  UserMinus, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  HelpCircle,
  Inbox,
  ArrowRight,
  Trash2,
  RotateCcw,
  CheckSquare,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface TicketRoutingBoardProps {
  conversationsList: Conversation[];
  staffList: UserProfile[];
  loading: boolean;
  onForceReassign: (chatId: string) => void;
  onMarkAbandoned: (chatId: string) => void;
  onManualReassign: (chatId: string, targetUid: string, targetName: string) => void;
  onBack: () => void;
}

const RecruiterDropdown: React.FC<{
  currentOwnerId?: string | null;
  staffList: UserProfile[];
  getActiveChatsCount: (uid: string) => number;
  onSelect: (uid: string, displayName: string) => void;
  placeholder: string;
  label: string;
  onOpenChange?: (open: boolean) => void;
}> = ({ currentOwnerId, staffList, getActiveChatsCount, onSelect, placeholder, label, onOpenChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const filteredStaff = currentOwnerId 
    ? staffList.filter(s => s.uid !== currentOwnerId)
    : staffList;

  const toggleDropdown = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (onOpenChange) onOpenChange(nextState);
  };

  return (
    <div className={`relative space-y-1 text-left w-full ${isOpen ? "z-50" : "z-10"}`}>
      <label className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
        {label}
      </label>
      
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="w-full text-[10px] font-sans font-bold px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-xl text-slate-700 flex items-center justify-between transition-all cursor-pointer shadow-sm select-none"
      >
        <span className="truncate">{placeholder}</span>
        <span className="text-[10px] text-slate-400 shrink-0 ml-1">▼</span>
      </button>

      {/* Dropdown Menu Overlay */}
      {isOpen && (
        <>
          {/* Backdrop layer to click-out */}
          <div 
            onClick={() => {
              setIsOpen(false);
              if (onOpenChange) onOpenChange(false);
            }}
            className="fixed inset-0 z-30"
          />
          
          <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-40 max-h-48 overflow-y-auto py-1.5 animate-fadeIn">
            {filteredStaff.length === 0 ? (
              <div className="px-3.5 py-2.5 text-[10px] text-slate-400 italic font-medium">
                No other recruiters available
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const activeCount = getActiveChatsCount(staff.uid);
                return (
                  <button
                    key={staff.uid}
                    type="button"
                    onClick={() => {
                      onSelect(staff.uid, staff.displayName);
                      setIsOpen(false);
                      if (onOpenChange) onOpenChange(false);
                    }}
                    className="w-full text-left px-3.5 py-2 text-[10px] font-sans font-bold text-slate-700 hover:bg-blue-50/60 hover:text-slate-900 transition-all flex items-center justify-between border-b border-slate-50 last:border-b-0 cursor-pointer"
                  >
                    <span className="truncate">{staff.displayName}</span>
                    <span className="text-[8px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-extrabold shrink-0 uppercase tracking-wider">
                      {activeCount} active
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
};

export const TicketRoutingBoard: React.FC<TicketRoutingBoardProps> = ({
  conversationsList,
  staffList,
  loading,
  onForceReassign,
  onMarkAbandoned,
  onManualReassign,
  onBack
}) => {
  // Tabs correspond to the 4 status types
  const [activeTab, setActiveTab] = useState<"pending" | "ongoing" | "finished" | "abandoned">("pending");
  const [expandedPendingChatId, setExpandedPendingChatId] = useState<string | null>(null);
  const [activeDropdownChatId, setActiveDropdownChatId] = useState<string | null>(null);

  // Batch actions state
  const [selectedChatIds, setSelectedChatIds] = useState<Set<string>>(new Set());
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Handle tab change and clear selections
  const handleTabChange = (tab: "pending" | "ongoing" | "finished" | "abandoned") => {
    setActiveTab(tab);
    setSelectedChatIds(new Set());
  };

  // Group counts
  const pendingChats = conversationsList.filter(c => c.status === "pending");
  const ongoingChats = conversationsList.filter(c => c.status === "ongoing");
  const finishedChats = conversationsList.filter(c => c.status === "finished");
  const abandonedChats = conversationsList.filter(c => c.status === "abandoned");

  const toggleSelectChat = (chatId: string) => {
    setSelectedChatIds(prev => {
      const next = new Set(prev);
      if (next.has(chatId)) next.delete(chatId);
      else next.add(chatId);
      return next;
    });
  };

  const handleSelectAll = (chats: Conversation[]) => {
    if (selectedChatIds.size === chats.length && chats.length > 0) {
      setSelectedChatIds(new Set());
    } else {
      setSelectedChatIds(new Set(chats.map(c => c.chatId)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedChatIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedChatIds.size} chat(s)?`)) return;
    try {
      await batchDeleteConversations(Array.from(selectedChatIds));
      setActionSuccess(`Successfully deleted ${selectedChatIds.size} chat(s).`);
      setSelectedChatIds(new Set());
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error("Batch delete failed:", err);
    }
  };

  const handleBatchReset = async () => {
    if (selectedChatIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to restore / reset ${selectedChatIds.size} chat(s) back to pending queue?`)) return;
    try {
      await batchResetConversations(Array.from(selectedChatIds));
      setActionSuccess(`Successfully restored ${selectedChatIds.size} chat(s) back to pending queue.`);
      setSelectedChatIds(new Set());
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error("Batch reset failed:", err);
    }
  };

  const handleSingleDelete = async (chatId: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this conversation?")) return;
    try {
      await deleteConversation(chatId);
      setActionSuccess("Chat deleted permanently.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error("Single delete failed:", err);
    }
  };

  const handleSingleRestore = async (chatId: string) => {
    try {
      await updateConversationStatus(chatId, "pending");
      setActionSuccess("Chat restored back to Pending queue.");
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      console.error("Single restore failed:", err);
    }
  };

  const getActiveChatsCount = (staffUid: string) => {
    return conversationsList.filter(
      c => c.status === "ongoing" && c.assignedTo === staffUid
    ).length;
  };

  const getTabCount = (status: typeof activeTab) => {
    switch (status) {
      case "pending": return pendingChats.length;
      case "ongoing": return ongoingChats.length;
      case "finished": return finishedChats.length;
      case "abandoned": return abandonedChats.length;
    }
  };

  const isStaffOnline = (staffUid: string) => {
    // Online statuses baseline
    return true; // Simple utility fallback
  };

  const getActiveList = () => {
    switch (activeTab) {
      case "pending": return pendingChats;
      case "ongoing": return ongoingChats;
      case "finished": return finishedChats;
      case "abandoned": return abandonedChats;
    }
  };

  const activeList = getActiveList();

  const tabsInfo = [
    { id: "pending" as const, label: "Pending Queue", color: "bg-amber-100 text-amber-800 ring-amber-200/50" },
    { id: "ongoing" as const, label: "Ongoing Live", color: "bg-blue-100 text-blue-800 ring-blue-200/50" },
    { id: "finished" as const, label: "Finished", color: "bg-blue-100 text-blue-800 ring-emerald-200/50" },
    { id: "abandoned" as const, label: "Abandoned", color: "bg-rose-100 text-rose-800 ring-rose-200/50" }
  ];

  return (
    <div className="space-y-6">
      {/* Header section with back button */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
          title="Back to Overview"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight leading-none">
            Global Ticket Routing Board
          </h2>
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
            Real-time control console to audit, override, and allocate system conversations
          </span>
        </div>
      </div>

      {/* Main Board Card Container */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] p-6 sm:p-8 shadow-[0_8px_30px_rgba(30, 136, 229, 0.03)] space-y-6">
        {/* Action success toast */}
        {actionSuccess && (
          <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 text-xs font-bold rounded-2xl flex items-center justify-between">
            <span>✓ {actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-blue-600 hover:text-blue-900 font-extrabold cursor-pointer">✕</button>
          </div>
        )}

        {/* TOP TAB CONTROLS (ALIGNED SIDE-BY-SIDE) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-4 select-none">
          {tabsInfo.map((tab) => {
            const isActive = activeTab === tab.id;
            const count = getTabCount(tab.id);
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative px-4 py-2.5 rounded-2xl text-xs font-bold tracking-tight transition-all cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? "bg-[#1E88E5] text-white border-[#1E88E5] shadow-md shadow-blue-950/10"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200/50"
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  isActive 
                    ? tab.id === "pending"
                      ? "bg-amber-900 text-white"
                      : tab.id === "ongoing"
                      ? "bg-blue-900 text-white"
                      : tab.id === "finished"
                      ? "bg-slate-900 text-white"
                      : "bg-rose-900 text-white"
                    : "bg-slate-200 text-slate-700"
                }`}>
                  {count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="routing-active-tab-indicator"
                    className="absolute bottom-[-17px] left-1/2 -translate-x-1/2 w-8 h-1 bg-[#1E88E5] rounded-full hidden sm:block"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Batch Action Toolbar for Finished and Abandoned Tabs */}
        {(activeTab === "finished" || activeTab === "abandoned") && activeList.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-xs">
            <button
              onClick={() => handleSelectAll(activeList)}
              className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-blue-700 transition-colors cursor-pointer border-0 bg-transparent"
            >
              {selectedChatIds.size === activeList.length && activeList.length > 0 ? (
                <CheckSquare className="w-4.5 h-4.5 text-[#1E88E5]" />
              ) : (
                <Square className="w-4.5 h-4.5 text-slate-400" />
              )}
              <span>
                {selectedChatIds.size === activeList.length && activeList.length > 0
                  ? "Deselect All"
                  : `Select All (${activeList.length})`}
              </span>
            </button>

            {selectedChatIds.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-lg">
                  {selectedChatIds.size} Selected
                </span>
                <button
                  onClick={handleBatchReset}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restore Selected
                </button>
                <button
                  onClick={handleBatchDelete}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border-0"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                </button>
              </div>
            )}
          </div>
        )}

        {/* Board Queue Content with Switcher Animations */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map(n => (
              <div key={n} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 h-48 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-1/3 h-3 bg-slate-200 rounded" />
                  <div className="w-2/3 h-5 bg-slate-200 rounded" />
                </div>
                <div className="w-full h-8 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="relative min-h-[300px]">
            <AnimatePresence mode="wait">
              {activeList.length === 0 ? (
                <motion.div
                  key="empty-state"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="py-16 text-center space-y-3 flex flex-col items-center justify-center"
                >
                  <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <Inbox className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-xs font-sans font-bold text-slate-700">No active conversations found</h4>
                    <p className="text-[10px] font-sans text-slate-400 mt-1">This queue is empty. New incoming webhooks will populate here instantly.</p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {activeList.map((c) => {
                    const isExpanded = expandedPendingChatId === c.chatId;
                    const isDropdownActive = activeDropdownChatId === c.chatId;
                    return (
                      <div 
                        key={c.chatId}
                        className={`bg-white border rounded-3xl p-6 space-y-4 transition-all duration-300 flex flex-col justify-between relative ${
                          isDropdownActive
                            ? "border-2 border-[#1E88E5] shadow-lg z-50 bg-[#FAFDFB]"
                            : isExpanded 
                            ? "border-2 border-[#1E88E5] shadow-md z-20 bg-[#FAFDFB]" 
                            : "border border-[#1E88E5]/30 hover:border-[#1E88E5]/80 hover:shadow-md z-10"
                        }`}
                      >
                        {/* Header Details */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {(activeTab === "finished" || activeTab === "abandoned") && (
                                <button
                                  onClick={() => toggleSelectChat(c.chatId)}
                                  className="text-slate-400 hover:text-blue-600 transition-colors cursor-pointer border-0 bg-transparent p-0"
                                >
                                  {selectedChatIds.has(c.chatId) ? (
                                    <CheckSquare className="w-4.5 h-4.5 text-[#1E88E5]" />
                                  ) : (
                                    <Square className="w-4.5 h-4.5 text-slate-300" />
                                  )}
                                </button>
                              )}
                              <span className="text-xs font-mono font-extrabold text-slate-900 bg-slate-50 px-2 py-1 rounded-lg">
                                {c.customerPhone}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-sans font-medium text-slate-400">
                                {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {(activeTab === "finished" || activeTab === "abandoned") && (
                                <button
                                  onClick={() => handleSingleDelete(c.chatId)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                                  title="Delete chat permanently"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                          <div>
                            <h4 className="text-sm font-sans font-extrabold text-slate-800 leading-snug">
                              {c.jobTitle}
                            </h4>
                            <p className="text-[11px] font-sans text-slate-500 line-clamp-2 leading-relaxed mt-1">
                              "{c.text}"
                            </p>
                          </div>
                        </div>

                        {/* Middle status section */}
                        {activeTab === "pending" && (
                          <div className="space-y-2.5 pt-2 border-t border-dashed border-slate-100">
                            <SLACountdownTimer 
                              createdAt={c.createdAt} 
                              label="Claim Countdown" 
                              isInApp={c.isInApp || (c.customerPhone ? !c.customerPhone.startsWith("+") : true)}
                              customerPhone={c.customerPhone}
                            />

                            <div 
                              onClick={() => setExpandedPendingChatId(isExpanded ? null : c.chatId)}
                              className="flex items-center justify-between text-[10px] text-slate-600 font-sans font-bold cursor-pointer hover:opacity-80 select-none"
                            >
                              <span>Routed staff members ({c.sharedWith?.length || 0})</span>
                              <span className="text-[#1E88E5] font-semibold">{isExpanded ? "▲ Hide" : "▼ Expand"}</span>
                            </div>

                            {isExpanded && (
                              <div className="space-y-1.5 max-h-24 overflow-y-auto bg-slate-50 p-2.5 rounded-xl border border-slate-200/50">
                                {c.sharedWith && c.sharedWith.length > 0 ? (
                                  c.sharedWith.map((uid) => {
                                    const staffMember = staffList.find(s => s.uid === uid);
                                    return (
                                      <div key={uid} className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                                        <span className="truncate max-w-[140px] font-bold text-slate-600">
                                          {staffMember ? staffMember.displayName : `Recruiter (${uid.substring(0, 6)})`}
                                        </span>
                                        <span className="text-[8px] font-mono px-1 py-0.2 bg-slate-200/75 text-slate-500 rounded font-bold uppercase shrink-0">
                                          Routed
                                        </span>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <span className="text-[10px] font-mono text-slate-400 italic">No recruiters linked</span>
                                )}
                              </div>
                            )}

                            {/* Manual Allocation Selector */}
                            <RecruiterDropdown
                              staffList={staffList}
                              getActiveChatsCount={getActiveChatsCount}
                              onSelect={(targetUid, displayName) => {
                                onManualReassign(c.chatId, targetUid, displayName);
                              }}
                              placeholder="-- Force claim to staff --"
                              label="Force Assign Recruiter"
                              onOpenChange={(isOpen) => {
                                setActiveDropdownChatId(isOpen ? c.chatId : null);
                              }}
                            />
                          </div>
                        )}

                        {activeTab === "ongoing" && (
                          <div className="space-y-3 pt-2 border-t border-dashed border-slate-100">
                            <SLACountdownTimer 
                              createdAt={c.createdAt} 
                              label="Ongoing SLA Timer" 
                              isInApp={c.isInApp || (c.customerPhone ? !c.customerPhone.startsWith("+") : true)}
                              customerPhone={c.customerPhone}
                            />

                            <div className="flex items-center gap-2 bg-blue-50/75 text-blue-800 p-2.5 rounded-xl text-[10px] font-sans font-bold border border-blue-100/50">
                              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="truncate">
                                Owner: <strong className="font-extrabold text-blue-950">{c.assignedToName || "System Agent"}</strong>
                              </span>
                            </div>

                            {/* Ongoing Transfer Selector */}
                            <RecruiterDropdown
                              currentOwnerId={c.assignedTo}
                              staffList={staffList}
                              getActiveChatsCount={getActiveChatsCount}
                              onSelect={(targetUid, displayName) => {
                                onManualReassign(c.chatId, targetUid, displayName);
                              }}
                              placeholder="-- Reassign to another recruiter... --"
                              label="Reallocate Conversation"
                              onOpenChange={(isOpen) => {
                                setActiveDropdownChatId(isOpen ? c.chatId : null);
                              }}
                            />
                          </div>
                        )}

                        {activeTab === "finished" && (
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[10px] font-mono text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-xl border border-blue-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              ARCHIVED ({c.assignedToName || "System"})
                            </span>
                            <button
                              onClick={() => handleSingleRestore(c.chatId)}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer border-0 bg-transparent text-[11px] font-extrabold hover:underline"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore Queue
                            </button>
                          </div>
                        )}

                        {activeTab === "abandoned" && (
                          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1 text-[10px] font-mono text-rose-700 font-bold bg-rose-50 px-2 py-1 rounded-xl border border-rose-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              SLA ABANDONED
                            </span>
                            <button
                              onClick={() => handleSingleRestore(c.chatId)}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer border-0 bg-transparent text-[11px] font-extrabold hover:underline"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Restore Queue
                            </button>
                          </div>
                        )}

                        {/* Action buttons footer for Pending / Ongoing */}
                        {(activeTab === "pending" || activeTab === "ongoing") && (
                          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-3">
                            {activeTab === "pending" ? (
                              <>
                                <span className="text-[10px] font-sans font-bold text-amber-600 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 shrink-0" /> Awaiting Claim
                                </span>
                                <button
                                  onClick={() => onMarkAbandoned(c.chatId)}
                                  className="text-[10px] font-sans font-extrabold text-red-500 hover:text-red-700 cursor-pointer"
                                  title="Mark as abandoned by staff"
                                >
                                  Mark Abandoned
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => onForceReassign(c.chatId)}
                                className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 text-[10px] font-mono font-extrabold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                title="Barge-in: release claimed chat"
                              >
                                <UserMinus className="w-3.5 h-3.5 shrink-0" />
                                Release back to Pending
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};
