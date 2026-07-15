import React, { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: Array<"seeker" | "staff" | "admin">;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();
  const [isStandaloneOrFs, setIsStandaloneOrFs] = useState(() => {
    if (typeof window === "undefined") return false;
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;
    const isFullscreen = !!document.fullscreenElement;
    return isStandalone || isFullscreen;
  });

  useEffect(() => {
    const checkMode = () => {
      const isStandalone = 
        window.matchMedia("(display-mode: standalone)").matches || 
        (navigator as any).standalone === true;
      const isFullscreen = !!document.fullscreenElement;
      setIsStandaloneOrFs(isStandalone || isFullscreen);
    };

    checkMode();
    document.addEventListener("fullscreenchange", checkMode);
    
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", checkMode);
    } else {
      mediaQuery.addListener(checkMode);
    }

    return () => {
      document.removeEventListener("fullscreenchange", checkMode);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener("change", checkMode);
      } else {
        mediaQuery.removeListener(checkMode);
      }
    };
  }, []);

  // Show nothing while loading (the global loading overlay in App.tsx handles visual feedback)
  if (loading) {
    return null;
  }

  // Not authenticated
  if (!currentUser) {
    if (isStandaloneOrFs) {
      // In PWA/Fullscreen, keep logged-out users on /seeker to display the forced AuthModal
      if (location.pathname === "/seeker") {
        return <>{children}</>;
      } else {
        return <Navigate to="/seeker" replace />;
      }
    }
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check role authorization
  if (!allowedRoles.includes(currentUser.role)) {
    if (isStandaloneOrFs) {
      // In PWA/Fullscreen, if role is not authorized, redirect to their proper dashboard or /seeker
      const dashboardPath = currentUser.role === "admin" ? "/admin" : currentUser.role === "staff" ? "/staff" : "/seeker";
      if (location.pathname !== dashboardPath) {
        return <Navigate to={dashboardPath} replace />;
      }
    }
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
