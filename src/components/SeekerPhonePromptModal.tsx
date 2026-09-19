import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Phone, X, Check, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface SeekerPhonePromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SeekerPhonePromptModal: React.FC<SeekerPhonePromptModalProps> = ({
  isOpen,
  onClose
}) => {
  const { currentUser, updateProfileData } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = phoneNumber.trim();

    if (!cleanPhone) {
      setError("Please enter a valid phone number.");
      return;
    }

    // Basic length check (must contain at least 7 digits)
    const digitsOnly = cleanPhone.replace(/[^0-9]/g, "");
    if (digitsOnly.length < 7) {
      setError("Please enter a valid phone number with at least 7 digits.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await updateProfileData({ phoneNumber: cleanPhone });
      setIsSuccess(true);
      // Remove any dismissal flag since phone number is now saved
      sessionStorage.removeItem(`vr_dismissed_phone_prompt_${currentUser.uid}`);
      setTimeout(() => {
        setIsSaving(false);
        setIsSuccess(false);
        onClose();
      }, 1000);
    } catch (err: any) {
      console.error("Failed to save phone number:", err);
      setError(err?.message || "Failed to save phone number. Please try again.");
      setIsSaving(false);
    }
  };

  const handleDismiss = () => {
    // Dismiss for this session, but will pop up next time they sign in
    if (currentUser?.uid) {
      sessionStorage.setItem(`vr_dismissed_phone_prompt_${currentUser.uid}`, "true");
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        id="seeker-phone-prompt-modal"
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6"
      >
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Dialog Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
          className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-7 w-full max-w-md z-[80] text-left overflow-hidden"
        >
          {/* Top Decorative Vector Accent */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-36 h-36 rounded-full bg-blue-50/60 pointer-events-none blur-xl" />

          {/* Close Icon Button */}
          <button
            id="seeker-phone-prompt-close-btn"
            type="button"
            onClick={handleDismiss}
            className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border-0 z-10"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Header */}
          <div className="flex items-center gap-3.5 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
              <Phone className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="inline-block text-[10px] font-mono font-bold uppercase tracking-wider text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md mb-0.5">
                Profile Setup
              </span>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight leading-snug">
                Enter Your Phone Number
              </h3>
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-slate-600 leading-relaxed mb-5">
            Welcome, <span className="font-semibold text-slate-900">{currentUser.displayName || "Job Seeker"}</span>! Recruiters and hiring managers contact you directly via phone or WhatsApp for interviews and job offers. Please add and store your phone number to complete your profile.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label 
                htmlFor="seeker-phone-input"
                className="block text-xs font-bold text-slate-700 mb-1.5"
              >
                Phone / WhatsApp Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  id="seeker-phone-input"
                  type="tel"
                  autoFocus
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. +1 (555) 234-5678 or 08012345678"
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 focus:border-blue-500 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  disabled={isSaving || isSuccess}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Your phone number is securely stored and shared only with verified employers.</span>
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
              <button
                id="seeker-phone-save-btn"
                type="submit"
                disabled={isSaving || isSuccess}
                className="w-full sm:flex-1 py-3 px-4 bg-[#1E88E5] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving Phone...</span>
                  </>
                ) : isSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Phone Saved!</span>
                  </>
                ) : (
                  <>
                    <span>Save Phone Number</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                id="seeker-phone-skip-btn"
                type="button"
                onClick={handleDismiss}
                disabled={isSaving || isSuccess}
                className="w-full sm:w-auto py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Remind Me Later
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
