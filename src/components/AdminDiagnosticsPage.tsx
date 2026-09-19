import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, Cpu, Activity, Database, MessageSquare } from "lucide-react";
import { DatabaseTesterModal } from "./DatabaseTesterModal";
import { ChatMessagingTester } from "./ChatMessagingTester";

export const AdminDiagnosticsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {/* Upper Navigation Rail */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-sm shadow-slate-100/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="px-4 py-2 border border-blue-800 rounded-xl bg-white hover:bg-blue-50/20 text-[#111827] hover:text-[#1f2937] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 inline-flex items-center"
              title="Go Back"
            >
              <ArrowLeft className="w-4 h-4" /> Go Back
            </Link>
            <div className="h-5 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#1E88E5]" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1e3a8a] font-sans">
                Dev & System Center
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Block */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <h1 className="text-lg sm:text-xl font-serif italic font-extrabold text-[#1e3a8a] leading-tight flex items-center gap-3">
              Diagnostics & Developer Tools
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl mt-1 leading-relaxed">
              Verify database connectivity, test Firebase synchronization, and run end-to-end messaging diagnostic suites directly inside a sandboxed developer environment.
            </p>
          </motion.div>
        </div>

        {/* Messaging & Chat Diagnostics Suite */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <ChatMessagingTester inline={false} />
        </motion.div>

        {/* Database Connection Tester Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="space-y-6"
        >
          <div className="bg-white p-2 rounded-[32px] shadow-sm border border-slate-100 flex justify-center">
            <DatabaseTesterModal inline={true} />
          </div>
        </motion.div>
      </div>
    </div>
  );
};
