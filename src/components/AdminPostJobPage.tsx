import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { JobPostingForm } from "./JobPostingForm";

interface AdminPostJobPageProps {
  onBack?: () => void;
  onJobAdded?: () => void;
}

export const AdminPostJobPage: React.FC<AdminPostJobPageProps> = ({ onBack, onJobAdded }) => {
  const navigate = useNavigate();

  const handleJobAdded = () => {
    if (onJobAdded) {
      onJobAdded();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-1 sm:px-2 py-1.5">
      <div className="flex items-center justify-between mb-6">
        {onBack ? (
          <button 
            onClick={onBack}
            className="px-4 py-2 border border-emerald-800 rounded-xl bg-white hover:bg-emerald-50/20 text-[#0B3C2D] hover:text-[#06241B] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </button>
        ) : (
          <Link 
            to="/admin" 
            className="px-4 py-2 border border-emerald-800 rounded-xl bg-white hover:bg-emerald-50/20 text-[#0B3C2D] hover:text-[#06241B] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Link>
        )}
        <div className="flex items-center gap-1.5 bg-[#0B3C2D] border border-emerald-900 text-emerald-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" /> Admin Job Publisher
        </div>
      </div>

      <JobPostingForm onJobAdded={handleJobAdded} hideHeader={true} />
    </div>
  );
};
