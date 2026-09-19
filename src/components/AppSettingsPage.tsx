import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { 
  ArrowLeft, 
  SlidersHorizontal, 
  Clock, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RotateCcw, 
  ShieldAlert, 
  Activity,
  CalendarCheck2
} from "lucide-react";
import { getAppSettings, saveAppSettings, checkAndEnforceSLAs, formatTime24to12 } from "../lib/services";
import { AppSettings } from "../types";

export const AppSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>({ unclaimedChatTimeoutHours: 24, staffReportDeadlineTime: "21:00" });
  const [timeoutInput, setTimeoutInput] = useState<number>(24);
  const [staffSlaTimeInput, setStaffSlaTimeInput] = useState<string>("21:00");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEnforcingSLA, setIsEnforcingSLA] = useState(false);
  const [slaStatusMsg, setSlaStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    getAppSettings().then(s => {
      setSettings(s);
      setTimeoutInput(s.unclaimedChatTimeoutHours ?? 24);
      setStaffSlaTimeInput(s.staffReportDeadlineTime ?? "21:00");
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (timeoutInput < 1 || isNaN(timeoutInput)) return;

    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const formattedLabel = `${formatTime24to12(staffSlaTimeInput)} Daily`;
      const updated = await saveAppSettings({
        unclaimedChatTimeoutHours: Number(timeoutInput),
        staffReportDeadlineTime: staffSlaTimeInput || "21:00",
        staffReportDeadlineLabel: formattedLabel,
      });
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTriggerSLA = async () => {
    setIsEnforcingSLA(true);
    setSlaStatusMsg(null);
    try {
      await checkAndEnforceSLAs();
      setSlaStatusMsg("SLA scan complete. All pending chats past timeout were evaluated.");
      setTimeout(() => setSlaStatusMsg(null), 5000);
    } catch (err) {
      setSlaStatusMsg("Error running SLA scan. Please check network logs.");
    } finally {
      setIsEnforcingSLA(false);
    }
  };

  const displayTimeLabel = formatTime24to12(staffSlaTimeInput);

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-16 font-sans">
      {/* Top Navigation Rail */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  navigate(-1);
                } else {
                  navigate("/admin");
                }
              }}
              className="p-2 -ml-1 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-slate-700 transition-all flex items-center justify-center cursor-pointer shadow-xs"
              title="Return"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-5 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                System Configurations
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Header Block */}
        <div>
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#0B1B3D] tracking-tight flex items-center gap-3">
              App Settings & SLA Policies
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure candidate routing timeouts, staff report deadlines, and organizational rules.
            </p>
          </motion.div>
        </div>

        {/* Success feedback */}
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold shadow-xs"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Settings saved successfully! Chat timeout is {settings.unclaimedChatTimeoutHours}h and Staff Daily Report SLA Target Time is updated to {settings.staffReportDeadlineLabel || `${formatTime24to12(settings.staffReportDeadlineTime)} Daily`}.
            </span>
          </motion.div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Card 1: Staff Report SLA Target Time Section */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 shadow-xs">
                  <CalendarCheck2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-[#0B1B3D]">Staff Daily Report SLA Target Time</h2>
                  <p className="text-xs text-slate-500">
                    Daily compliance deadline for staff to complete and submit targets, registrations, and chats.
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs font-bold shrink-0">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Current: {displayTimeLabel} Daily</span>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    Daily Cut-off Time (Local)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Standard is 9:00 PM Daily. Reports submitted on or before this time are compliant.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="time"
                      value={staffSlaTimeInput}
                      onChange={(e) => setStaffSlaTimeInput(e.target.value)}
                      disabled={isLoading}
                      className="py-2.5 px-4 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-center shadow-xs cursor-pointer"
                    />
                  </div>
                  <div className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold font-mono tracking-tight shadow-xs whitespace-nowrap">
                    {displayTimeLabel} Daily
                  </div>
                </div>
              </div>

              {/* Quick Select SLA Presets */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
                {[
                  { time: "18:00", label: "6:00 PM" },
                  { time: "19:00", label: "7:00 PM" },
                  { time: "20:00", label: "8:00 PM" },
                  { time: "21:00", label: "9:00 PM (Default)" },
                  { time: "22:00", label: "10:00 PM" },
                  { time: "23:00", label: "11:00 PM" },
                ].map(preset => (
                  <button
                    key={preset.time}
                    type="button"
                    onClick={() => setStaffSlaTimeInput(preset.time)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      staffSlaTimeInput === preset.time
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* SLA Policy Breakdown Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50/60 border border-emerald-200/70 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Before {displayTimeLabel}</span>
                </div>
                <p className="text-[11px] text-emerald-700 leading-relaxed">
                  Submitted reports are verified on-time and marked compliant in administrative metrics.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200/70 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-800">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>After {displayTimeLabel}</span>
                </div>
                <p className="text-[11px] text-amber-700 leading-relaxed">
                  Submissions enter read-only lock mode. Admin approval or 6-hour reopen override is required.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Chat Inactivity & Abandonment SLA Threshold */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-extrabold text-[#0B1B3D]">Unclaimed Chat Abandonment Threshold</h2>
                <p className="text-xs text-slate-500">
                  Duration before an unclaimed candidate ticket is automatically archived as abandoned.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <label className="text-xs font-extrabold text-slate-800 block mb-1">
                    Threshold Duration (Hours)
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Standard is 24 hours. Minimum 1 hour, maximum 72 hours.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min={1}
                      max={72}
                      value={timeoutInput}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val)) {
                          setTimeoutInput(1);
                        } else {
                          setTimeoutInput(Math.min(72, Math.max(1, val)));
                        }
                      }}
                      disabled={isLoading}
                      className="w-28 py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl font-mono text-sm font-bold text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-center"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold pointer-events-none">
                      hrs
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick select pills */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 flex-wrap">
                <span className="text-[11px] text-slate-400 font-medium">Presets:</span>
                {[6, 12, 24, 48, 72].map(hrs => (
                  <button
                    key={hrs}
                    type="button"
                    onClick={() => setTimeoutInput(hrs)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      timeoutInput === hrs
                        ? "bg-blue-600 text-white shadow-xs"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {hrs}h {hrs === 24 ? "(Default)" : ""}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                <span>Only Admins can modify organizational SLA policies.</span>
              </div>

              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="px-6 py-2.5 bg-[#0B1B3D] hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? "Saving Settings..." : "Save All Settings"}</span>
              </button>
            </div>
          </motion.div>
        </form>

        {/* SLA Manual Enforcement Block */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Run SLA Background Scan Now</h3>
                <p className="text-xs text-slate-500">
                  Manually evaluate all pending chats against the {settings.unclaimedChatTimeoutHours}h timeout.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isEnforcingSLA}
              onClick={handleTriggerSLA}
              className="px-4 py-2 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isEnforcingSLA ? "animate-spin" : ""}`} />
              <span>{isEnforcingSLA ? "Scanning..." : "Execute Scan"}</span>
            </button>
          </div>

          {slaStatusMsg && (
            <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
              {slaStatusMsg}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  );
};
