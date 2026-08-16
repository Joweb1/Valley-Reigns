import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Building2 } from "lucide-react";
import { EmployerManagementView } from "./EmployerManagementView";

export const EmployerManagementPage: React.FC = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 min-h-[85vh]">
      {/* Top Header Navigation Row */}
      <div className="flex items-center justify-between gap-3 mb-6 pb-2 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="px-3.5 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-800 text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-none hover:-translate-y-0.5 no-underline"
            title="Go Back to Admin Panel"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Link>
          <div>
            <h1 className="text-base font-extrabold text-[#0B1B3D] tracking-tight flex items-center gap-2">
              <Building2 className="w-4.5 h-4.5 text-blue-600" />
              Employer Management
            </h1>
          </div>
        </div>

        {/* Small Tag at top right */}
        <span className="px-3 py-1 bg-[#0B1B3D] text-white border border-[#0B1B3D] font-mono text-[10px] font-extrabold rounded-full uppercase tracking-wider">
          Employers
        </span>
      </div>

      {/* Main Employers Content */}
      <div className="bg-white border border-[#0B1B3D]/15 rounded-2xl p-4 sm:p-6 shadow-none">
        <EmployerManagementView hideTopTitle />
      </div>
    </div>
  );
};
