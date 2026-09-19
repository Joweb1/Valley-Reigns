import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { UserCheck, UserPlus, ChevronRight } from "lucide-react";

export const StaffPortalInvite: React.FC = () => {
  const { signupUser, currentUser } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Register as 'staff'
    await signupUser(email, name, "staff");
    
    setSubmitting(false);
    setComplete(true);
  };

  if (complete || currentUser?.role === "staff") {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-4">
        <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-8 max-w-md w-full text-center space-y-5">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1E88E5] mx-auto">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-xl font-sans font-bold text-slate-900 tracking-tight">
              Recruiter Account Unlocked!
            </h3>
            <p className="text-xs font-sans text-slate-400 leading-relaxed mt-1">
              Your staff credentials have been configured and session authenticated.
            </p>
          </div>
          <Link
            to="/staff"
            className="w-full py-3 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl text-xs font-sans font-extrabold flex items-center justify-center gap-1.5 transition-colors shadow-md"
          >
            Enter Staff Dashboard Console <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[600px] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-100 shadow-xl rounded-3xl p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1E88E5] mx-auto mb-3">
            <UserPlus className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-sans font-extrabold text-slate-900 tracking-tight">
            Recruiter Enrollment Portal
          </h2>
          <span className="text-[10px] font-mono text-[#1E88E5] font-bold uppercase tracking-wider block mt-1">
            Secure Staff Invite Route
          </span>
        </div>

        <form onSubmit={handleRegister} className="space-y-4 text-slate-800">
          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Full Legal Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Marcus Vance"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Recruiter Email
            </label>
            <input
              type="email"
              required
              placeholder="e.g. vance@valleyreigns.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
              Enrollment Token Key
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              defaultValue="VALLEY_STAFF_2026"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-sans font-medium focus:border-[#1E88E5] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl text-xs font-sans font-extrabold shadow-md shadow-blue-950/10 flex items-center justify-center cursor-pointer"
          >
            {submitting ? "Registering Credentials..." : "Enroll Recruiter & Log In"}
          </button>
        </form>

        <p className="text-[10px] font-sans text-slate-400 text-center leading-relaxed">
          Enrolling will register your profile, assigning the role of <strong>'staff'</strong>. Your profile will instantly be authorized to route conversation payloads.
        </p>
      </div>
    </div>
  );
};
export default StaffPortalInvite;
