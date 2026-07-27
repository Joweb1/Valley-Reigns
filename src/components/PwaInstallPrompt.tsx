import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Smartphone, X, Monitor } from "lucide-react";

export const PwaInstallPrompt: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showiOSGuidance, setShowiOSGuidance] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // 1. Check standalone / display-mode
    const isStandalone = 
      window.matchMedia("(display-mode: standalone)").matches || 
      window.matchMedia("(display-mode: fullscreen)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      (navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user clicked "Maybe Later" within the last 24 hours
    const is1DayDismissed = (): boolean => {
      try {
        const lastDismissed = localStorage.getItem("pwa_install_dismissed");
        if (!lastDismissed) return false;
        const time = parseInt(lastDismissed, 10);
        if (isNaN(time)) return false;
        return Date.now() - time < 24 * 60 * 60 * 1000; // 1 day expiring
      } catch {
        return false;
      }
    };

    // Check if Service Worker is active or registered
    const isSwRegistered = async (): Promise<boolean> => {
      if (!("serviceWorker" in navigator)) return false;
      if (navigator.serviceWorker.controller) return true;
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration && (registration.active || registration.installing || registration.waiting)) {
          return true;
        }
        // Fallback wait for SW ready
        const readyReg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000))
        ]);
        return !!readyReg;
      } catch {
        return false;
      }
    };

    // Attempt to show prompt ONLY if SW is registered and not dismissed via 1-day "Maybe Later"
    const tryShowPrompt = async () => {
      if (isStandalone || is1DayDismissed()) {
        return;
      }
      const registered = await isSwRegistered();
      if (registered) {
        setIsVisible(true);
      }
    };

    // Initial check with small delay to allow SW registration on load
    const timer = setTimeout(() => {
      tryShowPrompt();
    }, 1000);

    // Event listeners
    const handleSwRegistered = () => {
      tryShowPrompt();
    };

    const handleInstallable = () => {
      tryShowPrompt();
    };

    const handleTriggerInstall = async () => {
      setShowiOSGuidance(false);
      const registered = await isSwRegistered();
      if (registered) {
        setIsVisible(true);
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        if (isIOS || !(window as any).deferredPrompt) {
          setShowiOSGuidance(true);
        }
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsVisible(false);
      try {
        localStorage.removeItem("pwa_install_dismissed");
      } catch {}
    };

    window.addEventListener("sw-registered", handleSwRegistered);
    window.addEventListener("pwa-installable", handleInstallable);
    window.addEventListener("trigger-pwa-install", handleTriggerInstall);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("sw-registered", handleSwRegistered);
      window.removeEventListener("pwa-installable", handleInstallable);
      window.removeEventListener("trigger-pwa-install", handleTriggerInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt;
    if (promptEvent) {
      try {
        promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        console.log(`User response to install prompt: ${outcome}`);
        (window as any).deferredPrompt = null;
        if (outcome === "accepted") {
          setIsInstalled(true);
        }
        setIsVisible(false);
        return;
      } catch (err) {
        console.error("Native install prompt error:", err);
      }
    }

    // If inside an iframe (like AI Studio preview frame where Chrome blocks beforeinstallprompt),
    // open the app in a new top-level tab so Chrome can trigger native installation
    if (window.self !== window.top) {
      window.open(window.location.href, "_blank");
      return;
    }

    // Show step guidance if browser native prompt is not yet ready
    setShowiOSGuidance(true);
  };

  // Close Icon (X) -> Only dismisses for current view/refresh, NO 1-day localStorage penalty!
  const handleCloseX = () => {
    setIsVisible(false);
  };

  // "Maybe Later" button -> Sets 1 day expiration in localStorage
  const handleMaybeLater = () => {
    setIsVisible(false);
    try {
      localStorage.setItem("pwa_install_dismissed", Date.now().toString());
    } catch {}
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <div id="pwa-prompt-container" className="fixed bottom-0 left-0 right-0 z-[60] p-4 flex justify-center pointer-events-none">
        <motion.div
          id="pwa-prompt-card"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 150, damping: 20 }}
          className="pointer-events-auto bg-white text-slate-800 rounded-t-xl rounded-b-2xl border border-slate-200/90 shadow-[0_12px_40px_rgba(0,0,0,0.12)] w-full max-w-md p-4 relative overflow-hidden"
        >
          {/* Close Icon (X): Just closes prompt without setting 1-day localStorage dismissal */}
          <button
            onClick={handleCloseX}
            className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full cursor-pointer"
            aria-label="Close prompt"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {!showiOSGuidance ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E88E5] flex items-center justify-center border border-blue-100 shrink-0">
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
                {/* Maybe Later: Sets 1-day expiration */}
                <button
                  onClick={handleMaybeLater}
                  className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Maybe Later
                </button>
                <button
                  onClick={handleInstallClick}
                  className="flex-1 py-2 bg-[#1E88E5] hover:bg-[#1565C0] active:bg-[#0a3520] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 group"
                >
                  <Download className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  <span>Install</span>
                </button>
              </div>
            </div>
          ) : (
            // Manual installation guidance
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1E88E5] flex items-center justify-center border border-blue-100 shrink-0">
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-sm font-bold text-slate-900">Install App Guide</h3>
                  <p className="text-[11px] text-slate-500">Quick manual install steps</p>
                </div>
              </div>

              {/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-left text-xs text-slate-600 leading-normal">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#1E88E5] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                    <p>
                      Tap <strong className="text-slate-800">Share</strong> in Safari (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">⎋</span> at bottom).
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#1E88E5] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                    <p>
                      Tap <strong className="text-slate-800">Add to Home Screen</strong> (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">＋</span>).
                    </p>
                  </div>
                </div>
              ) : window.self !== window.top ? (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-left text-xs text-slate-600 leading-normal">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#1E88E5] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                    <p>
                      Click <strong className="text-slate-800">Open in new tab</strong> (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">↗</span>) to view outside the preview frame.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#1E88E5] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                    <p>
                      In Chrome, click <strong className="text-slate-800">Install</strong> (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">⤓</span>) in address bar or Menu (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">⋮</span>) &rarr; <strong className="text-slate-800">Install Valley Reigns</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2 text-left text-xs text-slate-600 leading-normal">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#1E88E5] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">1</div>
                    <p>
                      Look for the <strong className="text-slate-800">Install icon</strong> (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">⤓</span>) on the right side of Chrome&apos;s address bar.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 rounded-full bg-blue-100 text-[#1E88E5] font-semibold flex items-center justify-center text-[10px] shrink-0 mt-0.5">2</div>
                    <p>
                      Or open Chrome Menu (<span className="bg-white border border-slate-200 px-1 py-0.5 rounded text-[11px]">⋮</span>) and select <strong className="text-slate-800">Install Valley Reigns</strong>.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowiOSGuidance(false)}
                  className="w-full py-2 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleMaybeLater}
                  className="w-full py-2 bg-[#1E88E5] hover:bg-[#1565C0] text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
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
