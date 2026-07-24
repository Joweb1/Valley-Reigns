import React from "react";
import { UserProfile, Conversation } from "../types";
import { 
  Users, 
  RefreshCw, 
  ArrowLeft,
  Settings 
} from "lucide-react";
import { motion } from "motion/react";

interface StaffManagementProps {
  staffList: UserProfile[];
  staffStatuses: Record<string, "online" | "offline">;
  conversationsList: Conversation[];
  loading: boolean;
  onRefresh: () => void;
  onTogglePermission: (uid: string, currentVal: boolean) => void;
  onBack: () => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  staffStatuses,
  conversationsList,
  loading,
  onRefresh,
  onTogglePermission,
  onBack
}) => {
  const getActiveChatsCount = (staffUid: string) => {
    return conversationsList.filter(
      c => c.status === "ongoing" && c.assignedTo === staffUid
    ).length;
  };

  const getAvailableRequestsCount = (staffUid: string) => {
    return conversationsList.filter(
      c => c.status === "pending" && (!c.assignedTo) && (!c.sharedWith || c.sharedWith.length === 0 || c.sharedWith.includes(staffUid))
    ).length;
  };

  const isStaffOnline = (staffUid: string) => {
    return (staffStatuses[staffUid] || "offline") === "online";
  };

  return (
    <div className="space-y-6">
      {/* View Header with Back Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
              Staff Management
            </h2>
            <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider block mt-1">
              Verify capacities, view queue allocations, and toggle job posting privileges
            </span>
          </div>
        </div>

        <button
          onClick={onRefresh}
          disabled={loading}
          className="px-4 py-2 hover:bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-2"
          title="Refresh Recruiter Profiles"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh Accounts</span>
        </button>
      </div>

      {/* Staff Management Main Card Container */}
      <div className="bg-white border border-slate-200/60 rounded-[32px] shadow-[0_8px_30px_rgba(30, 136, 229, 0.03)] overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-sans font-extrabold text-slate-800 tracking-tight leading-none">
              Recruiter Authority Grid
            </h3>
            <p className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-wider mt-1 block">
              Active Security and Pipeline Controls
            </p>
          </div>
        </div>

        {/* Shimmer loading layout or Table */}
        {loading ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3].map(n => (
              <div key={n} className="flex justify-between items-center py-2">
                <div className="w-1/4 h-4 bg-slate-100 rounded" />
                <div className="w-1/6 h-4 bg-slate-100 rounded" />
                <div className="w-1/6 h-4 bg-slate-100 rounded" />
                <div className="w-1/12 h-6 bg-slate-100 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto min-w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/55 border-b border-slate-150/40">
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Recruiter Identity
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    System Email
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Security Role
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                    Availability
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                    Available Requests (Pending)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                    Active Chats (Ongoing)
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                    Capacity / Routing
                  </th>
                  <th className="px-6 py-4 text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider text-center">
                    Job Creation Privilege
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-xs font-mono text-slate-400 italic">
                      No operational staff records retrieved. Click refresh or seed data first.
                    </td>
                  </tr>
                ) : (
                  staffList.map((staff) => (
                    <tr key={staff.uid} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4.5 font-sans text-xs font-extrabold text-slate-900">
                        {staff.displayName}
                      </td>
                      <td className="px-6 py-4.5 font-mono text-xs text-slate-500">
                        {staff.email}
                      </td>
                      <td className="px-6 py-4.5">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-mono font-bold capitalize">
                          {staff.role}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        {isStaffOnline(staff.uid) ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-mono font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 text-slate-500 rounded-full text-[10px] font-mono font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            Offline
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-center font-mono text-xs font-bold text-amber-600">
                        {getAvailableRequestsCount(staff.uid)} requests
                      </td>
                      <td className="px-6 py-4.5 text-center font-mono text-xs font-bold text-slate-700">
                        {getActiveChatsCount(staff.uid)} chats
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        {getActiveChatsCount(staff.uid) >= 2 ? (
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                            Busy (Max)
                          </span>
                        ) : isStaffOnline(staff.uid) ? (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                            Available
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded text-[10px] font-mono font-bold uppercase tracking-wider">
                            Standby
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4.5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => onTogglePermission(staff.uid, staff.canPostJobs)}
                            className="focus:outline-none cursor-pointer"
                            title={`Toggle canPostJobs for ${staff.displayName}`}
                          >
                            {staff.canPostJobs ? (
                              <div className="w-11 h-6 bg-blue-600 rounded-full flex items-center justify-end p-0.5 transition-all">
                                <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                              </div>
                            ) : (
                              <div className="w-11 h-6 bg-slate-200 rounded-full flex items-center justify-start p-0.5 transition-all">
                                <div className="w-5 h-5 bg-white rounded-full shadow-md"></div>
                              </div>
                            )}
                          </button>
                          <span className={`text-[10px] font-mono font-bold uppercase min-w-[32px] ${staff.canPostJobs ? "text-blue-600" : "text-slate-400"}`}>
                            {staff.canPostJobs ? "Active" : "Locked"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
