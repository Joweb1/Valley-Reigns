import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { JobPostingForm } from "./JobPostingForm";

export const AdminPostJobPage: React.FC = () => {
  const navigate = useNavigate();

  const handleJobAdded = () => {
    // Redirection to the Job Management page is handled beautifully by the JobPostingForm success overlay
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/admin" 
          className="w-10 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
          title="Back to Admin Panel"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-700" />
            Admin Job Publisher
          </h1>
          <p className="text-xs font-sans text-slate-500 mt-1">
            Publish a new job listing directly to the public seeker board.
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-2">
        <JobPostingForm onJobAdded={handleJobAdded} />
      </div>
    </div>
  );
};
