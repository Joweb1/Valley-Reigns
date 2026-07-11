import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Smartphone, X, Monitor } from "lucide-react";

export const PwaInstallPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showiOSGuidance, setShowiOSGuidance] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check if already installed / running in standalone mode
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      (navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // 2. Check if user dismissed it in this session/recent days
    const lastDismissed = localStorage.getItem("pwa_install_dismissed");
    const isDismissed = lastDismissed && (Date.now() - parseInt(lastDismissed, 10) < 1000 * 60 * 60 * 24); // 24 hours cooldown

    // 3. Setup event listeners for beforeinstallprompt
    const handleInstallable = () => {
      if (!isStandalone && !isDismissed) {
        setIsVisible(true);
      }
    };

    // If deferredPrompt is already populated
    if ((window as any).deferredPrompt && !isStandalone && !isDismissed) {
      setIsVisible(true);
    }

    window.addEventListener("pwa-installable", handleInstallable);

    const handleTriggerInstall = () => {
      setIsVisible(true);
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      if (isIOS) {
        setShowiOSGuidance(true);
      }
    };
    window.addEventListener("trigger-pwa-install", handleTriggerInstall);

    // iOS detection (iOS doesn't support beforeinstallprompt but supports manual adding to home screen)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    if (isIOS && !isStandalone && !isDismissed) {
      // Show prompt but with iOS instructions (share -> add to home screen)
      const delayTimeout = setTimeout(() => {
        setIsVisible(true);
      }, 3000); // Wait 3 seconds to not overwhelm landing
      return () => {
        clearTimeout(delayTimeout);
        window.removeEventListener("pwa-installable", handleInstallable);
        window.removeEventListener("trigger-pwa-install", handleTriggerInstall);
      };
    }

    // Check if app is installed after triggering browser prompt
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setIsVisible(false);
      localStorage.removeItem("pwa_install_dismissed");
    });

    return () => {
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("trigger-pwa-install", handleTriggerInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (!promptEvent) {
      // If no native prompt event is available (like on iOS), toggle iOS manual guidance
      setShowiOSGuidance(true);
      return;
    }

    // Show the browser install prompt
    promptEvent.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await promptEvent.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Clear the deferred prompt variable (it can only be used once)
    (window as any).deferredPrompt = null;
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Cool down for 24 hours before reminding again
    localStorage.setItem("pwa_install_dismissed", Date.now().toString());
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <div id="pwa-prompt-container" className="fixed bottom-0 left-0 right-0 z-50 p-4 flex justify-center pointer-events-none">
        <motion.div
          id="pwa-prompt-card"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          className="pointer-events-auto bg-white text-slate-800 rounded-t-xl rounded-b-2xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.12)] w-full max-w-md p-4 relative overflow-hidden"
        >
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full cursor-pointer"
            aria-label="Dismiss prompt"
          >
            <X className="w-4 h-4" />
          </button>

          {!showiOSGuidance ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {/* App Logo Emblem */}
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F5132] flex items-center justify-center border border-emerald-100 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                
                <div className="flex-1 text-left pr-4">
                  <h3 className="text-sm font-bold text-slate-900">Install Valley Reigns</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-normal">
                    Add to your home screen for quick offline access and real-time alerts.
                  </p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleDismiss}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2 bg-[#0F5132] hover:bg-[#0c4027] active:bg-[#0a3520] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
                >
                  <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Install</span>
                </button>
              </div>
            </div>
          ) : (
            // iOS share prompt guidance
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#0F5132] flex items-center justify-center border border-emerald-100 shrink-0">
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-bold text-slate-900">Add to Home Screen</h3>
                </div>
              </div>

              {/* iOS Step Guide */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-left text-xs text-slate-600 leading-normal">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#0F5132] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                  <p>
                    Tap <strong className="text-slate-800">Share</strong> in Safari (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">⎋</span> at bottom).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#0F5132] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                  <p>
                    Tap <strong className="text-slate-800">Add to Home Screen</strong> (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">＋</span>).
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowiOSGuidance(false)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleDismiss}
                  className="w-full py-2 bg-[#0F5132] hover:bg-[#0c4027] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Got It
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
