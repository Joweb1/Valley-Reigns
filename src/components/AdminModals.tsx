import React from "react";
import { LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminModalsProps {
  currentUser: any;
  showAdminAccountModal: boolean;
  setShowAdminAccountModal: (show: boolean) => void;
  showAdminAboutModal: boolean;
  setShowAdminAboutModal: (show: boolean) => void;
  logout: () => Promise<void>;
  onNavigate: (to: string) => void;
}

export function AdminModals({
  currentUser,
  showAdminAccountModal,
  setShowAdminAccountModal,
  showAdminAboutModal,
  setShowAdminAboutModal,
  logout,
  onNavigate,
}: AdminModalsProps) {
  return (
    <>
      {/* Custom Admin Account Details Modal */}
      <AnimatePresence>
        {showAdminAccountModal && (
          <div id="admin-account-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminAccountModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#111827] text-white border border-blue-800/40 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-[70] space-y-4 text-left overflow-hidden"
            >
              {/* Vector graphic background */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.05] text-blue-400">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800/10 relative z-10">
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">Account Details</h3>
                <button 
                  id="admin-account-modal-close"
                  onClick={() => setShowAdminAccountModal(false)} 
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer border-0 bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-3 font-sans text-xs relative z-10">
                <div>
                  <span className="text-blue-500/80 font-mono text-[9px] block uppercase">User ID</span>
                  <span className="text-blue-100 font-mono text-[10px] bg-slate-900/40 border border-slate-800/30 px-2 py-1 rounded block truncate">{currentUser?.uid}</span>
                </div>
                <div>
                  <span className="text-blue-500/80 font-mono text-[9px] block uppercase">Display Name</span>
                  <span className="text-blue-300 font-bold text-sm">{currentUser?.displayName}</span>
                </div>
                <div>
                  <span className="text-blue-500/80 font-mono text-[9px] block uppercase">Email Address</span>
                  <span className="text-blue-100 font-medium">{currentUser?.email}</span>
                </div>
                <div>
                  <span className="text-blue-500/80 font-mono text-[9px] block uppercase">Access Role</span>
                  <span className="inline-block bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded font-bold border border-blue-500/30">{currentUser?.role?.toUpperCase()}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2 mt-2 relative z-10">
                <button
                  id="admin-account-modal-signout"
                  onClick={async () => {
                    setShowAdminAccountModal(false);
                    await logout();
                    onNavigate("/");
                  }}
                  className="flex-1 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-bold rounded-xl cursor-pointer transition-colors border border-rose-500/30 flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
                <button
                  id="admin-account-modal-confirm"
                  onClick={() => setShowAdminAccountModal(false)}
                  className="flex-1 py-2.5 bg-[#1E88E5] hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors border-0"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Admin About Modal */}
      <AnimatePresence>
        {showAdminAboutModal && (
          <div id="admin-about-modal" className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAdminAboutModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative bg-[#111827] text-white border border-blue-800/40 rounded-[24px] shadow-2xl p-6 w-full max-w-sm z-[70] space-y-3 text-left overflow-hidden"
            >
              {/* Vector graphic background */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.05] text-blue-400">
                <svg width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="85%" cy="15%" r="50" stroke="currentColor" strokeWidth="1.2" />
                  <circle cx="90%" cy="20%" r="80" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <path d="M-10,80 C30,40 80,100 150,60" stroke="currentColor" strokeWidth="1.2" />
                </svg>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800/10 relative z-10">
                <h3 className="text-sm font-bold text-blue-300 uppercase tracking-wider">About Our Workspace</h3>
                <button 
                  id="admin-about-modal-close"
                  onClick={() => setShowAdminAboutModal(false)} 
                  className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer border-0 bg-transparent"
                >
                  ✕
                </button>
              </div>
              
              <p className="text-[11px] leading-relaxed font-sans text-blue-100 relative z-10">
                Valley Reigns is a full-cycle recruitment management workspace designed to unite ambitious talent with forward-thinking organizations.
              </p>
              <p className="text-[11px] leading-relaxed font-sans font-semibold text-blue-400 relative z-10">
                Active Recruitment for everyone — streamlined, collaborative, and secure.
              </p>
              
              <button
                id="admin-about-modal-confirm"
                onClick={() => setShowAdminAboutModal(false)}
                className="w-full py-2.5 bg-[#1E88E5] hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer mt-2 relative z-10 transition-colors border-0"
              >
                Confirm
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
