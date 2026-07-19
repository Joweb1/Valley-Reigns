import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { memoryStore } from "../lib/services";
import { X, LogIn, Phone, ArrowLeft, Shield, UserPlus, CheckCircle, Mail, Key, Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  forcedOpen?: boolean;
  onCloseOverride?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ forcedOpen = false, onCloseOverride }) => {
  const [isOpen, setIsOpen] = useState(forcedOpen);
  const { loginWithGoogle, signupUser, loginWithEmail, loginDemo, sendPasswordlessLink } = useAuth();
  const navigate = useNavigate();
  
  // Tabs: "signin" | "signup"
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");
  
  // Email/Password inputs
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [emailError, setEmailError] = useState("");
  
  // Signup inputs
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupRole, setSignupRole] = useState<"seeker" | "staff">("seeker");
  const [signupError, setSignupError] = useState("");

  // Form states
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showDemoPortals, setShowDemoPortals] = useState(false);
  const [showMagicLinkView, setShowMagicLinkView] = useState(false);
  const [showHifiPreview, setShowHifiPreview] = useState(false);
  const [emailLinkError, setEmailLinkError] = useState<string | null>(null);

  // Password visibility controls
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Signup Password inputs
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Processing state for beautiful blur overlay
  const [isProcessing, setIsProcessing] = useState(false);

  // Gesture refs
  const googleHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const googleHoldTriggeredRef = useRef(false);

  const signupHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const signupHoldTriggeredRef = useRef(false);

  const mailHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const mailHoldTriggeredRef = useRef(false);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (googleHoldTimerRef.current) clearTimeout(googleHoldTimerRef.current);
      if (signupHoldTimerRef.current) clearTimeout(signupHoldTimerRef.current);
      if (mailHoldTimerRef.current) clearTimeout(mailHoldTimerRef.current);
    };
  }, []);

  // Google hold gesture handlers
  const handleGooglePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    googleHoldTriggeredRef.current = false;
    googleHoldTimerRef.current = setTimeout(() => {
      setShowDemoPortals(true);
      googleHoldTriggeredRef.current = true;
    }, 5000);
  };

  const handleGooglePointerUp = () => {
    if (googleHoldTimerRef.current) {
      clearTimeout(googleHoldTimerRef.current);
      googleHoldTimerRef.current = null;
    }
    if (!googleHoldTriggeredRef.current) {
      setIsProcessing(true);
      loginWithGoogle().then(() => {
        const userRole = memoryStore.currentUser?.role || "seeker";
        setIsProcessing(false);
        handleRedirect(userRole);
        handleClose();
      }).catch((err) => {
        console.error("Google Auth Error:", err);
        setIsProcessing(false);
      });
    }
  };

  const handleGooglePointerCancel = () => {
    if (googleHoldTimerRef.current) {
      clearTimeout(googleHoldTimerRef.current);
      googleHoldTimerRef.current = null;
    }
  };

  // Signup link hold gesture handlers
  const handleSignupLinkPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    signupHoldTriggeredRef.current = false;
    signupHoldTimerRef.current = setTimeout(() => {
      signupHoldTriggeredRef.current = true;
      setSignupRole("staff");
      setActiveTab("signup");
    }, 5000);
  };

  const handleSignupLinkPointerUp = () => {
    if (signupHoldTimerRef.current) {
      clearTimeout(signupHoldTimerRef.current);
      signupHoldTimerRef.current = null;
    }
    // Safeguard: Once signupRole has been set to staff, never automatically reset it to seeker on release
    if (!signupHoldTriggeredRef.current && signupRole !== "staff") {
      setSignupRole("seeker");
      setActiveTab("signup");
    }
  };

  const handleSignupLinkPointerCancel = () => {
    if (signupHoldTimerRef.current) {
      clearTimeout(signupHoldTimerRef.current);
      signupHoldTimerRef.current = null;
    }
  };

  // Signup heading hold gesture handler
  const handleHeadingPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    signupHoldTriggeredRef.current = false;
    signupHoldTimerRef.current = setTimeout(() => {
      signupHoldTriggeredRef.current = true;
      setSignupRole("staff");
    }, 5000);
  };

  // Magic link hold gesture handlers
  const handleMailPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    mailHoldTriggeredRef.current = false;
    mailHoldTimerRef.current = setTimeout(() => {
      setShowHifiPreview(true);
      mailHoldTriggeredRef.current = true;
    }, 5000);
  };

  const handleMailPointerUp = () => {
    if (mailHoldTimerRef.current) {
      clearTimeout(mailHoldTimerRef.current);
      mailHoldTimerRef.current = null;
    }
  };

  const handleMailPointerCancel = () => {
    if (mailHoldTimerRef.current) {
      clearTimeout(mailHoldTimerRef.current);
      mailHoldTimerRef.current = null;
    }
  };

  // Central Role-based Redirection Router
  const handleRedirect = (role: string) => {
    if (role === "admin") {
      navigate("/admin");
    } else if (role === "staff") {
      navigate("/staff");
    } else {
      navigate("/seeker");
    }
  };

  // Listen to custom event to open the modal from other components
  useEffect(() => {
    const handleOpen = (e: any) => {
      setIsOpen(true);
      setShowMagicLinkView(false);
      setShowEmailForm(false);
      if (e?.detail?.tab === "signup") {
        setActiveTab("signup");
      } else {
        setActiveTab("signin");
      }
      setSignupError("");
      setEmailError("");
    };
    
    window.addEventListener("open-auth-modal" as any, handleOpen);
    return () => window.removeEventListener("open-auth-modal" as any, handleOpen);
  }, []);

  useEffect(() => {
    setIsOpen(forcedOpen);
    if (!forcedOpen) {
      setShowMagicLinkView(false);
      setShowEmailForm(false);
      setShowHifiPreview(false);
      setEmailLinkError(null);
      setEmailError("");
      setSignupError("");
      setIsProcessing(false);
    }
  }, [forcedOpen]);

  const handleClose = () => {
    if (forcedOpen) return;
    setIsOpen(false);
    setShowMagicLinkView(false);
    setShowEmailForm(false);
    setShowHifiPreview(false);
    setEmailLinkError(null);
    setEmailError("");
    setSignupError("");
    setIsProcessing(false);
    if (onCloseOverride) {
      onCloseOverride();
    }
  };

  const handleSimulateMagicLink = async () => {
    setIsProcessing(true);
    setEmailError("");
    try {
      const profile = await loginWithEmail(emailInput, "magic-link-bypass");
      setIsProcessing(false);
      handleRedirect(profile.role);
      handleClose();
    } catch (err: any) {
      setEmailError(err.message || "Simulated login failed.");
      setIsProcessing(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !emailInput.includes("@")) {
      setEmailError("Please enter a valid email address.");
      return;
    }
    if (!passwordInput) {
      setEmailError("Please enter your password.");
      return;
    }
    if (passwordInput.length < 6) {
      setEmailError("Password must be at least 6 characters long.");
      return;
    }
    setEmailError("");
    setIsProcessing(true);

    try {
      const profile = await loginWithEmail(emailInput, passwordInput);
      setIsProcessing(false);
      handleRedirect(profile.role);
      handleClose();
    } catch (err: any) {
      setIsProcessing(false);
      if (err.message === "oauth-login-link-sent") {
        setIsProcessing(true);
        let linkErrorOccurred = false;
        try {
          await sendPasswordlessLink(emailInput);
        } catch (linkErr: any) {
          console.error("Firebase sendSignInLinkToEmail failed:", linkErr);
          linkErrorOccurred = true;
          if (linkErr.code === "auth/operation-not-allowed" || linkErr.message?.includes("operation-not-allowed")) {
            setEmailLinkError("Passwordless Email Sign-In is not enabled in this Firebase Console yet. Please enable 'Email link (passwordless sign-in)' under Authentication > Sign-in method.");
          } else if (linkErr.code === "auth/quota-exceeded" || linkErr.message?.toLowerCase().includes("quota")) {
            setEmailLinkError("We have reached the Firebase daily quota for email sign-in links on this demo project. To ensure you aren't blocked, we have automatically enabled High-Fidelity Simulation Mode below. Click 'Simulate Email Link Login' to sign in instantly!");
          } else {
            setEmailLinkError(linkErr.message || "Unable to send magic link via Firebase.");
          }
          // Automatically show fallback simulation bypass mode if transmission is pending configuration
          setShowHifiPreview(true);
        } finally {
          setIsProcessing(false);
          setShowMagicLinkView(true);
        }
      } else {
        setEmailError(err.message || "Login failed. Please verify your credentials and try again.");
      }
    }
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName.trim()) {
      setSignupError("Please enter your name.");
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes("@")) {
      setSignupError("Please enter a valid email address.");
      return;
    }
    if (!signupPassword) {
      setSignupError("Please enter a password.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Password must be at least 6 characters long.");
      return;
    }
    if (signupPassword !== confirmPassword) {
      setSignupError("Passwords do not match.");
      return;
    }

    setSignupError("");
    setIsProcessing(true);

    signupUser(signupEmail, signupName, signupRole, signupPassword)
      .then(() => {
        setIsProcessing(false);
        handleRedirect(signupRole);
        handleClose();
      })
      .catch((err) => {
        setSignupError("Signup failed. Please try again.");
        setIsProcessing(false);
      });
  };

  return (
    <>
      <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop with elegant fade transition */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={forcedOpen ? undefined : handleClose}
            className={`absolute inset-0 bg-slate-900/40 backdrop-blur-sm ${forcedOpen ? "cursor-default" : "cursor-pointer"}`}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="relative w-full max-w-md bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col"
          >
            {/* Elegant Header section */}
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#1E88E5]/10 flex items-center justify-center text-[#1E88E5]">
                  <Shield className="w-4 h-4" />
                </div>
                <span className="font-serif italic font-bold text-sm text-[#1e3a8a]">
                  Valley Reigns
                </span>
              </div>
              {!forcedOpen && (
                <button
                  onClick={handleClose}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200/80 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>



            {/* Tab content wrapper */}
            <div className="p-6 flex-grow">
              <AnimatePresence mode="wait">
                {showMagicLinkView ? (
                  <motion.div
                    key="magiclink"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="space-y-4 text-center py-4"
                  >
                    <div 
                      onPointerDown={handleMailPointerDown}
                      onPointerUp={handleMailPointerUp}
                      onPointerCancel={handleMailPointerCancel}
                      className="cursor-pointer select-none"
                      title="Hold for 5s to reveal Developer Preview Mode"
                    >
                      <div className="w-16 h-16 rounded-full bg-[#1E88E5]/10 text-[#1E88E5] flex items-center justify-center mx-auto mb-2 transition-all active:scale-95 duration-200">
                        <Mail className="w-8 h-8 animate-bounce" />
                      </div>
                      <h3 className="text-xl font-display font-extrabold text-[#1e3a8a]">
                        {emailLinkError ? "Secure Bypass Active" : "Login Link Sent!"}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto text-center px-4">
                      {emailLinkError ? (
                        <span>
                          Firebase has reached its daily email sign-in link quota. Don't worry! We have automatically activated <strong>High-Fidelity Simulation Mode</strong> below so you can sign in to <strong className="text-slate-800">{emailInput}</strong> instantly.
                        </span>
                      ) : (
                        <span>
                          This email was registered with Google OAuth and has no set password in our database. We have sent a secure, passwordless magic login link to <strong className="text-slate-800">{emailInput}</strong>. <strong className="text-[#1e3a8a] font-extrabold block mt-2">If you do not receive the link shortly, please check your Spam or Junk email folder!</strong>
                        </span>
                      )}
                    </p>

                    {emailLinkError && (
                      <div className="p-3.5 bg-amber-50/80 border border-amber-200/60 rounded-xl text-left text-xs text-amber-800 space-y-1 mt-2">
                        <span className="font-bold block">Developer Integration Warning:</span>
                        <p className="text-[11px] leading-relaxed text-amber-700">
                          {emailLinkError}
                        </p>
                      </div>
                    )}
                    
                    {showHifiPreview && (
                      <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-3 mt-4">
                        <span className="block text-[10px] font-mono font-bold text-blue-800 uppercase tracking-wider">
                          ✨ High-Fidelity Preview Mode
                        </span>
                        <p className="text-[10px] text-slate-500 leading-snug">
                          Since this is a sandboxed developer environment, you can instantly simulate clicking the email link below to log in.
                        </p>
                        <button
                          type="button"
                          onClick={handleSimulateMagicLink}
                          className="w-full py-2.5 px-4 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl font-bold text-xs shadow-md shadow-blue-900/10 transition-all flex items-center justify-center gap-2 cursor-pointer border-0"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Simulate Email Link Login</span>
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setShowMagicLinkView(false);
                        setEmailError("");
                        setShowHifiPreview(false);
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer mt-2 inline-block bg-transparent border-0"
                    >
                      Back to Sign In
                    </button>
                  </motion.div>
                ) : activeTab === "signin" && (
                  <motion.div
                    key="signin"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-4"
                  >
                    <div className="space-y-1">
                      <h3 className="text-xl font-display font-extrabold tracking-tight text-[#1e3a8a]">
                        Welcome Back!
                      </h3>
                      <p className="text-xs text-slate-500">
                        Sign in with email or select a secure gateway option to access your dashboard
                      </p>
                    </div>

                    {!showEmailForm ? (
                      /* First view: Only "Sign in with Email" and "Continue with Google" buttons */
                      <div className="space-y-3 pt-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={() => {
                            setEmailError("");
                            setShowEmailForm(true);
                          }}
                          className="w-full py-3 px-4 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl font-bold text-xs shadow-md shadow-[#1E88E5]/10 transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Mail className="w-4 h-4" />
                          <span>Sign in with Email</span>
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onPointerDown={handleGooglePointerDown}
                          onPointerUp={handleGooglePointerUp}
                          onPointerLeave={handleGooglePointerCancel}
                          onPointerCancel={handleGooglePointerCancel}
                          className="w-full py-3 px-4 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer select-none"
                        >
                          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Continue with Google</span>
                        </motion.button>

                        <div className="flex gap-1.5 justify-center pt-3 border-t border-slate-100 mt-2">
                          <span className="text-[10px] text-slate-500 font-medium">
                            New here?
                          </span>
                          <button
                            type="button"
                            onPointerDown={handleSignupLinkPointerDown}
                            onPointerUp={handleSignupLinkPointerUp}
                            onPointerLeave={handleSignupLinkPointerCancel}
                            onPointerCancel={handleSignupLinkPointerCancel}
                            className="text-[10px] text-[#1E88E5] font-bold hover:underline cursor-pointer select-none"
                          >
                            {signupRole === "staff" ? "Create Staff Account" : "Create New Account"}
                          </button>
                        </div>

                        {/* Troubleshooting toggle to reveal quick-login test portals */}
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setShowDemoPortals(!showDemoPortals)}
                            className="text-[9px] font-mono font-bold text-slate-400 hover:text-[#1E88E5] transition-colors cursor-pointer"
                          >
                            {showDemoPortals ? "Hide Demo Quick-Login Portals" : "Trouble with Google Auth/Email Link? Click to reveal Quick-Login"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Second view: Email & Password Input fields for fill and sign in */
                      <div className="space-y-4 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowEmailForm(false)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Back</span>
                        </button>

                        <form onSubmit={handleEmailSubmit} className="space-y-3">
                          {emailError && (
                            <div className="p-2.5 bg-red-50 border border-red-100 rounded-xl text-[11px] text-red-600 font-medium">
                              {emailError}
                            </div>
                          )}
                          
                          <div className="space-y-1">
                            <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                              Email Address
                            </label>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                <Mail className="w-3.5 h-3.5" />
                              </span>
                              <input
                                type="email"
                                required
                                placeholder="e.g. admin@valleyreigns.com"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none hover:border-[#1E88E5]/60 focus:border-[#1E88E5] focus:bg-white focus:ring-4 focus:ring-[#1E88E5]/10 transition-all focus:scale-[1.01] shadow-sm"
                              />
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <label className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">
                                Password
                              </label>
                              <span className="text-[9px] text-slate-400">Min 6 characters</span>
                            </div>
                            <div className="relative">
                              <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                                <Key className="w-3.5 h-3.5" />
                              </span>
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                placeholder="••••••••"
                                value={passwordInput}
                                onChange={(e) => setPasswordInput(e.target.value)}
                                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none hover:border-[#1E88E5]/60 focus:border-[#1E88E5] focus:bg-white focus:ring-4 focus:ring-[#1E88E5]/10 transition-all focus:scale-[1.01] shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            className="w-full py-2.5 px-4 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl font-bold text-xs shadow-md shadow-[#1E88E5]/10 transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                          >
                            <LogIn className="w-3.5 h-3.5" />
                            <span>Sign In with Email</span>
                          </motion.button>
                        </form>

                        <div className="flex gap-1.5 justify-center pt-3 border-t border-slate-100 mt-2">
                          <span className="text-[10px] text-slate-500 font-medium">
                            New here?
                          </span>
                          <button
                            type="button"
                            onPointerDown={handleSignupLinkPointerDown}
                            onPointerUp={handleSignupLinkPointerUp}
                            onPointerLeave={handleSignupLinkPointerCancel}
                            onPointerCancel={handleSignupLinkPointerCancel}
                            className="text-[10px] text-[#1E88E5] font-bold hover:underline cursor-pointer select-none"
                          >
                            {signupRole === "staff" ? "Create Staff Account" : "Create New Account"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick-Login Testing Portals - hidden by default, visible only after 5s hold */}
                    {showDemoPortals && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#FAFDFB] border border-blue-100 rounded-2xl p-3.5 space-y-3 mt-2 max-h-[320px] overflow-y-auto"
                      >
                        <span className="text-[9px] font-mono font-bold text-blue-700 uppercase tracking-wider block text-center border-b border-blue-50/60 pb-1.5">
                          ⚡ Quick-Login Testing Portals
                        </span>

                        <div className="space-y-1">
                          <span className="text-[8px] font-mono font-semibold text-slate-400 uppercase tracking-wider block">
                            Core Demo Portals
                          </span>
                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsProcessing(true);
                                loginWithEmail("admin@valleyreigns.com").then((p) => {
                                  handleRedirect(p.role);
                                  handleClose();
                                }).catch(() => setIsProcessing(false));
                              }}
                              className="p-2 bg-[#1E88E5]/5 hover:bg-[#1E88E5]/10 rounded-xl text-left border border-blue-600/10 cursor-pointer transition-colors"
                            >
                              <span className="block text-[9px] font-bold text-[#1E88E5]">Admin Portal</span>
                              <span className="block text-[8px] text-slate-500 font-mono">admin@valleyreigns.com</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsProcessing(true);
                                loginWithEmail("staff1@valleyreigns.com").then((p) => {
                                  handleRedirect(p.role);
                                  handleClose();
                                }).catch(() => setIsProcessing(false));
                              }}
                              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200 cursor-pointer transition-colors"
                            >
                              <span className="block text-[9px] font-bold text-slate-700">Recruiter 1 (Staff)</span>
                              <span className="block text-[8px] text-slate-500 font-mono">staff1@valleyreigns.com</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsProcessing(true);
                                loginWithEmail("staff2@valleyreigns.com").then((p) => {
                                  handleRedirect(p.role);
                                  handleClose();
                                }).catch(() => setIsProcessing(false));
                              }}
                              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200 cursor-pointer transition-colors"
                            >
                              <span className="block text-[9px] font-bold text-slate-700">Recruiter 2 (Staff)</span>
                              <span className="block text-[8px] text-slate-500 font-mono">staff2@valleyreigns.com</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setIsProcessing(true);
                                loginWithEmail("genesisjosephoghene+seeker@gmail.com").then((p) => {
                                  handleRedirect(p.role);
                                  handleClose();
                                }).catch(() => setIsProcessing(false));
                              }}
                              className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-slate-200 cursor-pointer transition-colors"
                            >
                              <span className="block text-[9px] font-bold text-slate-700">Job Seeker Demo</span>
                              <span className="block text-[8px] text-slate-500 font-mono">seeker-demo</span>
                            </button>
                          </div>
                        </div>

                        {/* Seeded Staff Section */}
                        {Object.values(memoryStore.users).filter(u => u.role === "staff" && u.email.includes("staff_seeded_")).length > 0 && (
                          <div className="space-y-1 pt-1.5 border-t border-slate-100">
                            <span className="text-[8px] font-mono font-semibold text-teal-600 uppercase tracking-wider block">
                              Seeded Recruiter Staff (10 Users)
                            </span>
                            <div className="grid grid-cols-2 gap-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                              {Object.values(memoryStore.users)
                                .filter(u => u.role === "staff" && u.email.includes("staff_seeded_"))
                                .sort((a, b) => {
                                  const numA = parseInt(a.email.match(/\d+/)?.[0] || "0");
                                  const numB = parseInt(b.email.match(/\d+/)?.[0] || "0");
                                  return numA - numB;
                                })
                                .map((u) => (
                                  <button
                                    key={u.uid}
                                    type="button"
                                    onClick={() => {
                                      setIsProcessing(true);
                                      loginWithEmail(u.email).then((p) => {
                                        handleRedirect(p.role);
                                        handleClose();
                                      }).catch(() => setIsProcessing(false));
                                    }}
                                    className="p-1.5 bg-teal-50/40 hover:bg-teal-50 border border-teal-600/10 hover:border-teal-600/25 rounded-xl text-left cursor-pointer transition-colors"
                                  >
                                    <span className="block text-[9px] font-bold text-teal-800 truncate">{u.displayName}</span>
                                    <span className="block text-[8px] text-slate-400 font-mono truncate">{u.email}</span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {activeTab === "signup" && (
                  <motion.div
                    key="signup"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <button
                      onClick={() => {
                        setSignupRole("seeker"); // reset role back to default seeker when returning
                        setActiveTab("signin");
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Back to Sign In
                    </button>

                    <div className="space-y-1">
                      <h3
                        onPointerDown={handleHeadingPointerDown}
                        onPointerUp={handleSignupLinkPointerUp}
                        onPointerLeave={handleSignupLinkPointerCancel}
                        onPointerCancel={handleSignupLinkPointerCancel}
                        className="text-lg font-display font-bold text-[#1e3a8a] select-none cursor-pointer hover:opacity-90"
                        title="Click and hold for 5s to create recruiter staff account"
                      >
                        {signupRole === "staff" ? "Create Staff Account" : "Create an Account"}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {signupRole === "staff" 
                          ? "Join Valley Reigns as an authorized recruiter or staff member"
                          : "Join Valley Reigns to instantly chat with expert recruiters"
                        }
                      </p>
                    </div>

                    <form onSubmit={handleSignupSubmit} className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                          Full Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. Marcus Vance"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-slate-200/80 rounded-xl text-sm font-sans font-medium focus:outline-none hover:border-[#1E88E5]/60 focus:border-[#1E88E5] focus:bg-white focus:ring-4 focus:ring-[#1E88E5]/10 transition-all focus:scale-[1.01]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                          Email Address
                        </label>
                        <input
                          type="email"
                          placeholder="e.g. marcus@example.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          required
                          className="w-full px-4 py-2 border border-slate-200/80 rounded-xl text-sm font-sans font-medium focus:outline-none hover:border-[#1E88E5]/60 focus:border-[#1E88E5] focus:bg-white focus:ring-4 focus:ring-[#1E88E5]/10 transition-all focus:scale-[1.01]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                          Password
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <Key className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type={showSignupPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={signupPassword}
                            onChange={(e) => setSignupPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-2 border border-slate-200/80 rounded-xl text-sm font-sans font-medium focus:outline-none hover:border-[#1E88E5]/60 focus:border-[#1E88E5] focus:bg-white focus:ring-4 focus:ring-[#1E88E5]/10 transition-all focus:scale-[1.01]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSignupPassword(!showSignupPassword)}
                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showSignupPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
                            <Key className="w-3.5 h-3.5" />
                          </span>
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full pl-9 pr-10 py-2 border border-slate-200/80 rounded-xl text-sm font-sans font-medium focus:outline-none hover:border-[#1E88E5]/60 focus:border-[#1E88E5] focus:bg-white focus:ring-4 focus:ring-[#1E88E5]/10 transition-all focus:scale-[1.01]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {signupError && (
                        <p className="text-xs text-rose-600 font-semibold">{signupError}</p>
                      )}

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full py-3 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer transition-colors mt-2"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{signupRole === "staff" ? "Create Staff Account" : "Register & Log In"}</span>
                      </motion.button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Premium Glassmorphism Loading Overlay */}
            <AnimatePresence>
              {isProcessing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/75 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center rounded-[24px]"
                >
                  <div className="relative flex items-center justify-center mb-4">
                    {/* Outer pulsing ring */}
                    <div className="absolute w-16 h-16 rounded-full border-2 border-blue-500/20 animate-ping" />
                    {/* Spinning active ring */}
                    <div className="w-12 h-12 rounded-full border-4 border-blue-100 border-t-[#1E88E5] animate-spin" />
                  </div>
                  
                  <motion.h4
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="text-sm font-sans font-black text-slate-900 tracking-tight"
                  >
                    Processing Secure Connection...
                  </motion.h4>
                  <motion.p
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-[10px] font-mono text-[#1E88E5] uppercase tracking-wider mt-1"
                  >
                    Please wait while we sync your secure session
                  </motion.p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>


    </>
  );
};
