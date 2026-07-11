import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert, Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<"seeker" | "staff" | "admin">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  // Show premium layout loader while Auth State is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC]">
        <div className="p-8 rounded-3xl bg-white shadow-xl shadow-slate-100 flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-[#0F5132] animate-spin mb-4" />
          <p className="text-sm font-sans font-medium text-slate-600 animate-pulse">
            Verifying credentials...
          </p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (!allowedRoles.includes(currentUser.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-100 shadow-xl shadow-slate-100 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-sans font-bold text-slate-900 tracking-tight mb-2">
            Access Restricted
          </h2>
          <p className="text-sm font-sans text-slate-500 mb-6 leading-relaxed">
            Your current account role (<span className="font-semibold capitalize">{currentUser.role}</span>) does not possess permission rights to access <code className="px-1.5 py-0.5 bg-slate-100 rounded text-red-600 text-xs font-mono">{location.pathname}</code>.
          </p>
          <div className="flex flex-col gap-2">
            <Navigate to="/" replace />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
