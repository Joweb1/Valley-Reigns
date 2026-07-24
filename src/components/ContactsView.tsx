import React, { useState, useEffect } from "react";
import { CustomerContact } from "../types";
import { getContacts, deleteContact } from "../lib/services";
import { 
  Phone, 
  MessageCircle, 
  Trash2, 
  Search, 
  LayoutGrid, 
  List, 
  RefreshCw, 
  UserCheck, 
  Calendar, 
  ArrowLeft, 
  Briefcase, 
  Sparkles, 
  ExternalLink,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ContactsViewProps {
  onBack?: () => void;
  hideTopTitle?: boolean;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ onBack, hideTopTitle }) => {
  const [contacts, setContacts] = useState<CustomerContact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<"card" | "list">("card");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const loadContactsData = async () => {
    try {
      setLoading(true);
      const data = await getContacts();
      setContacts(data);
    } catch (err) {
      console.warn("Failed to load contacts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContactsData();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadContactsData();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      setStatusMsg("Contact deleted successfully.");
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      console.error("Delete contact error:", err);
    } finally {
      setDeleteConfirmId(null);
    }
  };

  const filteredContacts = contacts.filter(c => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      c.customerPhone.toLowerCase().includes(query) ||
      (c.name && c.name.toLowerCase().includes(query)) ||
      (c.lastJobTitle && c.lastJobTitle.toLowerCase().includes(query))
    );
  });

  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  return (
    <div className="space-y-4 text-slate-900">
      {/* Top Header Bar (Only if not hidden by standalone page wrapper) */}
      {!hideTopTitle && (
        <div className="flex items-center justify-between gap-3 pb-1 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            {onBack && (
              <button
                onClick={onBack}
                className="px-3 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-none"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Go Back
              </button>
            )}
            <h2 className="text-lg font-black text-[#0B1B3D] tracking-tight">Saved Contacts</h2>
          </div>

          {/* Small Tag at Top Right */}
          <span className="px-2.5 py-0.5 bg-[#0B1B3D] text-white border border-[#0B1B3D] font-mono text-[10px] font-extrabold rounded-full uppercase tracking-wider">
            Contact
          </span>
        </div>
      )}

      {/* Status Message */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>{statusMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search Input & Action Buttons on Same Row */}
      <div className="flex items-center gap-2 w-full">
        {/* Search Input occupying remaining width */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search phone, name or job..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-[#0B1B3D]/20 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-[#0B1B3D] focus:ring-1 focus:ring-[#0B1B3D]/20 transition-all shadow-none"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={handleRefresh}
          className="p-1.5 bg-white border border-[#0B1B3D]/20 hover:border-[#0B1B3D]/50 text-[#0B1B3D] rounded-xl transition-all shadow-none cursor-pointer shrink-0"
          title="Refresh contacts"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
        </button>

        {/* View Mode Switcher */}
        <div className="flex items-center bg-slate-100 border border-[#0B1B3D]/15 rounded-xl p-0.5 shrink-0">
          <button
            onClick={() => setViewMode("card")}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === "card"
                ? "bg-[#0B1B3D] text-white shadow-none"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">Cards</span>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              viewMode === "list"
                ? "bg-[#0B1B3D] text-white shadow-none"
                : "text-slate-500 hover:text-slate-800"
            }`}
            title="List Table View"
          >
            <List className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-[11px]">List</span>
          </button>
        </div>
      </div>

      {/* Contacts View Container */}
      {loading ? (
        /* Skeleton Shimmer Loading UI */
        viewMode === "card" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white border border-[#0B1B3D]/15 rounded-xl p-3.5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 w-full">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 animate-shimmer shrink-0" />
                    <div className="space-y-1.5 w-full">
                      <div className="h-3.5 bg-slate-200 animate-shimmer rounded-md w-3/4" />
                      <div className="h-2.5 bg-slate-200 animate-shimmer rounded-md w-1/2" />
                    </div>
                  </div>
                  <div className="w-5 h-5 bg-slate-200 animate-shimmer rounded-md shrink-0" />
                </div>
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="h-3 bg-slate-200 animate-shimmer rounded-md w-4/5" />
                  <div className="flex justify-between items-center pt-0.5">
                    <div className="h-4 bg-slate-200 animate-shimmer rounded-md w-8" />
                    <div className="h-3 bg-slate-200 animate-shimmer rounded-md w-16" />
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <div className="h-7 bg-slate-200 animate-shimmer rounded-lg w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#0B1B3D]/15 rounded-xl overflow-hidden">
            <div className="p-3 bg-slate-50 border-b border-[#0B1B3D]/15 flex justify-between">
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-24" />
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-32" />
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-16" />
              <div className="h-3 bg-slate-200 animate-shimmer rounded w-20" />
            </div>
            <div className="divide-y divide-slate-100 p-2 space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-2 px-2 gap-3">
                  <div className="flex items-center gap-2 w-1/3">
                    <div className="w-7 h-7 rounded-lg bg-slate-200 animate-shimmer shrink-0" />
                    <div className="space-y-1 w-full">
                      <div className="h-3 bg-slate-200 animate-shimmer rounded w-3/4" />
                      <div className="h-2 bg-slate-200 animate-shimmer rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-slate-200 animate-shimmer rounded w-1/4" />
                  <div className="h-4 bg-slate-200 animate-shimmer rounded w-8" />
                  <div className="h-3 bg-slate-200 animate-shimmer rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        )
      ) : filteredContacts.length === 0 ? (
        <div className="p-8 text-center bg-white border border-[#0B1B3D]/15 rounded-2xl space-y-2">
          <Phone className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-700">No contacts found</p>
          <p className="text-[11px] font-mono text-slate-400 max-w-xs mx-auto">
            {searchQuery ? "No customer contacts matched your search query." : "No WhatsApp customer contacts recorded yet."}
          </p>
        </div>
      ) : viewMode === "card" ? (
        /* Compact Card Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredContacts.map((contact) => (
            <motion.div
              key={contact.id}
              layout
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white border border-[#0B1B3D]/20 rounded-xl p-3.5 shadow-none hover:border-[#0B1B3D]/50 transition-all space-y-3 relative overflow-hidden flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0B1B3D] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-extrabold text-[#0B1B3D] leading-tight truncate">
                        {contact.name || contact.customerPhone}
                      </h4>
                      <p className="text-[11px] font-mono font-bold text-blue-700 truncate">
                        {contact.customerPhone}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setDeleteConfirmId(contact.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border-0 bg-transparent shrink-0"
                    title="Delete contact"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-700">
                    <Briefcase className="w-3.5 h-3.5 text-[#0B1B3D]/60 shrink-0" />
                    <span className="font-semibold text-[11px] truncate" title={contact.lastJobTitle}>
                      {contact.lastJobTitle || "General Inquiry"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1 font-mono font-bold text-[#0B1B3D] bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/60">
                      <MessageSquare className="w-3 h-3 text-[#0B1B3D]" />
                      {contact.chatCount || 1}
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 font-medium">
                      {formatDate(contact.lastSeenAt)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                <a
                  href={`https://wa.me/${contact.customerPhone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-1.5 px-2.5 bg-[#0B1B3D] hover:bg-[#162A52] text-white text-xs font-extrabold rounded-lg transition-all flex items-center justify-center gap-1.5 shadow-none cursor-pointer no-underline"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3 opacity-60" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        /* List Table View */
        <div className="bg-white border border-[#0B1B3D]/20 rounded-xl overflow-hidden shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/90 border-b border-[#0B1B3D]/15 text-[10px] font-mono font-bold uppercase tracking-wider text-[#0B1B3D]">
                <tr>
                  <th className="py-2.5 px-3">Contact Phone</th>
                  <th className="py-2.5 px-3">Last Job Inquired</th>
                  <th className="py-2.5 px-3 text-center">Inquiries</th>
                  <th className="py-2.5 px-3">Last Activity</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-xs">
                {filteredContacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#0B1B3D] text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-extrabold text-[#0B1B3D]">{contact.name || contact.customerPhone}</div>
                          <div className="font-mono text-[10px] text-blue-700">{contact.customerPhone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-[#0B1B3D]/60 shrink-0" />
                        <span className="font-bold truncate max-w-[200px]">{contact.lastJobTitle || "General Inquiry"}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="font-mono font-bold bg-slate-100 text-[#0B1B3D] border border-slate-200/60 px-2 py-0.5 rounded-md text-[10px]">
                        {contact.chatCount || 1}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {formatDate(contact.lastSeenAt)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`https://wa.me/${contact.customerPhone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-[#0B1B3D] hover:bg-[#162A52] text-white rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 font-bold text-[10px] no-underline"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-400" />
                          <span className="hidden sm:inline">WhatsApp</span>
                        </a>

                        <button
                          onClick={() => setDeleteConfirmId(contact.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer border-0 bg-transparent"
                          title="Delete contact"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 z-10"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">Delete Contact Record</h3>
                  <p className="text-xs font-mono text-slate-500">Irreversible database action</p>
                </div>
              </div>

              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                Are you sure you want to delete this customer contact record? This will remove them from the saved contacts list.
              </p>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Contact
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
