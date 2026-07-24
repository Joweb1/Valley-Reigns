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
    const dashboardPath = currentUser.role === "admin" ? "/admin" : currentUser.role === "staff" ? "/staff" : "/seeker";
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
};
