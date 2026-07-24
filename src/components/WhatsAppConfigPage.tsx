import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, ShieldCheck, Save, Key, Phone, HelpCircle, Copy, Check, 
  RefreshCw, Eye, EyeOff, Sparkles, Server, Settings, QrCode, Smartphone, 
  Wifi, WifiOff, Send, CheckCircle2, AlertTriangle, Zap
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

export const WhatsAppConfigPage: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  // Provider Mode state ("official" | "baileys")
  const [activeMode, setActiveMode] = useState<"official" | "baileys">("baileys");
  const [officialConfigured, setOfficialConfigured] = useState(false);

  // Baileys state from server
  const [baileysStatus, setBaileysStatus] = useState<"disconnected" | "connecting" | "qr_ready" | "connected" | "error">("disconnected");
  const [baileysQrCode, setBaileysQrCode] = useState<string | null>(null);
  const [baileysUserPhone, setBaileysUserPhone] = useState<string | null>(null);
  const [baileysError, setBaileysError] = useState<string | null>(null);
  const [connectingBaileys, setConnectingBaileys] = useState(false);

  // Test Message States
  const [testPhone, setTestPhone] = useState("");
  const [testText, setTestText] = useState("Hello from Valley Reigns WhatsApp Integration!");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states for Official Meta API
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [businessAccountId, setBusinessAccountId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  
  // Notification states
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-calculated Webhook URL
  const webhookUrl = `${window.location.origin}/api/webhook/whatsapp`;

  // Fetch provider status from backend API
  const fetchProviderStatus = async () => {
    try {
      const res = await fetch("/api/whatsapp/provider-status");
      if (res.ok) {
        const data = await res.json();
        setActiveMode(data.activeMode || "baileys");
        setOfficialConfigured(data.officialConfigured || false);
        setBaileysStatus(data.baileysStatus || "disconnected");
        setBaileysQrCode(data.baileysQrCode || null);
        setBaileysUserPhone(data.baileysUserPhone || null);
        setBaileysError(data.baileysError || null);
      }
    } catch (err) {
      console.warn("Failed to fetch WhatsApp provider status from server:", err);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    const fetchConfig = async () => {
      try {
        const configRef = doc(db, "settings", "whatsapp");
        const docSnap = await getDoc(configRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPhoneNumberId(data.phoneNumberId || "");
          setBusinessAccountId(data.businessAccountId || "");
          setAccessToken(data.accessToken || "");
          setVerifyToken(data.verifyToken || "");
          if (data.mode) setActiveMode(data.mode);
        } else {
          setVerifyToken("valleyreigns_verify_token_" + Math.random().toString(36).substring(2, 10));
        }
      } catch (err) {
        console.error("Error fetching WhatsApp configuration:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    fetchProviderStatus();
  }, [authLoading]);

  // Polling loop for Baileys connection status when in QR or connecting state
  useEffect(() => {
    let interval: any = null;
    if (baileysStatus === "qr_ready" || baileysStatus === "connecting") {
      interval = setInterval(() => {
        fetchProviderStatus();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [baileysStatus]);

  const handleToggleMode = async (newMode: "official" | "baileys") => {
    setActiveMode(newMode);
    try {
      const res = await fetch("/api/whatsapp/toggle-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: newMode })
      });
      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: `WhatsApp provider switched to ${newMode === "baileys" ? "Baileys WhatsApp Web" : "Meta Official API"}.`
        });
        setTimeout(() => setStatusMessage(null), 3500);
        fetchProviderStatus();
      }
    } catch (err) {
      console.error("Failed to toggle mode:", err);
    }
  };

  const handleConnectBaileys = async () => {
    setConnectingBaileys(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/baileys/connect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBaileysStatus(data.status);
        setBaileysQrCode(data.qrCode);
      }
    } catch (err: any) {
      console.error("Error initializing Baileys:", err);
      setStatusMessage({ type: "error", text: "Failed to initialize Baileys connection." });
    } finally {
      setConnectingBaileys(false);
      fetchProviderStatus();
    }
  };

  const handleDisconnectBaileys = async () => {
    try {
      const res = await fetch("/api/baileys/disconnect", { method: "POST" });
      if (res.ok) {
        setBaileysStatus("disconnected");
        setBaileysQrCode(null);
        setBaileysUserPhone(null);
        setStatusMessage({ type: "success", text: "Baileys session logged out successfully." });
        setTimeout(() => setStatusMessage(null), 3500);
      }
    } catch (err) {
      console.error("Error disconnecting Baileys:", err);
    } finally {
      fetchProviderStatus();
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim() || !testText.trim()) return;

    setSendingTest(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toPhone: testPhone.trim(), text: testText.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          type: "success",
          message: `Test message dispatched successfully via ${data.provider === "baileys" ? "Baileys WA Web" : "Meta Official API"}!`
        });
      } else {
        setTestResult({
          type: "error",
          message: data.error || "Failed to dispatch test message."
        });
      }
    } catch (err: any) {
      setTestResult({
        type: "error",
        message: err.message || "Network error dispatching test message."
      });
    } finally {
      setSendingTest(false);
    }
  };

  const handleSaveOfficial = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      const configRef = doc(db, "settings", "whatsapp");
      await setDoc(configRef, {
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        accessToken: accessToken.trim(),
        verifyToken: verifyToken.trim(),
        mode: activeMode,
        updatedAt: Date.now(),
      }, { merge: true });

      setStatusMessage({
        type: "success",
        text: "Meta WhatsApp API configuration saved successfully!",
      });

      setTimeout(() => setStatusMessage(null), 4000);
      fetchProviderStatus();
    } catch (err: any) {
      console.error("Error saving WhatsApp configuration:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save configuration. Check admin privileges.",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateVerifyToken = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
    let token = "vr_token_";
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setVerifyToken(token);
  };

  const copyToClipboard = (text: string, type: "url" | "token") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header Row with sleek back navigation */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin"
            className="px-4 py-2 border border-slate-200 rounded-xl bg-white hover:bg-slate-50 text-[#111827] text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:-translate-y-0.5 inline-flex shrink-0"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" /> Go Back
          </Link>
          <div className="flex items-center gap-1.5 bg-black border border-neutral-800 text-blue-200 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider">
            <Settings className="w-3.5 h-3.5" /> WhatsApp Multi-Engine Management
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-lg sm:text-xl font-serif font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          WhatsApp Communication Config
        </h1>
        <p className="text-xs font-sans text-slate-500 mt-1">
          Seamlessly route recruitment chat via Meta Official WhatsApp Business API or Baileys WhatsApp Web QR Engine.
        </p>
      </div>

      {/* Global Mode Switcher Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 mb-8 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Active WhatsApp Provider Engine
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select which engine the application backend uses to process and dispatch WhatsApp messages.
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-100 rounded-2xl border border-slate-200 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleToggleMode("baileys")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMode === "baileys"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <QrCode className="w-3.5 h-3.5" /> Baileys WA Web
            </button>
            <button
              type="button"
              onClick={() => handleToggleMode("official")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeMode === "official"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Meta Official API
            </button>
          </div>
        </div>

        {/* Dynamic Status / Auto-Fallback Alert */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-left">
            <p className="font-bold">Automatic Backend Fallback System Active</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              If Meta Official API credentials are missing, incomplete, or switched off, the system automatically routes all incoming and outgoing WhatsApp messages via the <strong>Baileys WhatsApp Web Engine</strong> without dropping candidate communications.
            </p>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${statusMessage.type === "success" ? "bg-emerald-500" : "bg-rose-600"}`} />
          <span>{statusMessage.text}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border border-slate-100 rounded-3xl shadow-sm p-16 flex flex-col items-center justify-center space-y-4"
          >
            <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs font-medium text-slate-400 font-mono">Loading WhatsApp Engine configurations...</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* MAIN COLUMN: BAILEYS WA WEB CONFIG PANEL */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      Baileys WhatsApp Web QR Session
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Connect any standard or business WhatsApp mobile account by scanning a QR Code.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchProviderStatus}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title="Refresh connection status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh
                  </button>
                </div>

                {/* Connection Status Box */}
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {baileysStatus === "connected" ? (
                        <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                          <Wifi className="w-5 h-5" />
                        </div>
                      ) : baileysStatus === "qr_ready" ? (
                        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                          <QrCode className="w-5 h-5 animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center shrink-0">
                          <WifiOff className="w-5 h-5" />
                        </div>
                      )}

                      <div className="text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">Session Status:</span>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                            baileysStatus === "connected"
                              ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                              : baileysStatus === "qr_ready"
                              ? "bg-amber-100 text-amber-700 border border-amber-300"
                              : baileysStatus === "connecting"
                              ? "bg-blue-100 text-blue-700 border border-blue-300"
                              : "bg-slate-200 text-slate-700"
                          }`}>
                            {baileysStatus === "qr_ready" ? "Scan QR Code" : baileysStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                          {baileysStatus === "connected" && baileysUserPhone
                            ? `Linked Account: ${baileysUserPhone}`
                            : baileysStatus === "qr_ready"
                            ? "Waiting for mobile phone scan..."
                            : baileysStatus === "connecting"
                            ? "Connecting to WhatsApp servers..."
                            : "Disconnected (No active Baileys socket)"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {baileysStatus === "connected" ? (
                        <button
                          type="button"
                          onClick={handleDisconnectBaileys}
                          className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          Disconnect Account
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleConnectBaileys}
                          disabled={connectingBaileys}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {connectingBaileys ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Starting...
                            </>
                          ) : (
                            <>
                              <QrCode className="w-3.5 h-3.5" /> Generate QR Code
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* QR Code display container */}
                  {baileysStatus === "qr_ready" && baileysQrCode && (
                    <div className="pt-4 border-t border-slate-200 flex flex-col md:flex-row items-center gap-6">
                      <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-md shrink-0">
                        <img
                          src={baileysQrCode}
                          alt="WhatsApp Baileys QR Code"
                          className="w-52 h-52 object-contain rounded-lg"
                        />
                      </div>
                      <div className="space-y-3 text-left">
                        <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-600" /> How to connect WhatsApp:
                        </h3>
                        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 font-medium">
                          <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                          <li>Tap <strong>Menu</strong> or <strong>Settings</strong> and select <strong>Linked Devices</strong>.</li>
                          <li>Tap <strong>Link a Device</strong> and point your phone camera at this QR Code.</li>
                          <li>Once scanned, WhatsApp Web will bind and process incoming candidate messages automatically!</li>
                        </ol>
                        <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 font-mono">
                          QR Code refreshes automatically every few seconds.
                        </p>
                      </div>
                    </div>
                  )}

                  {baileysError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left font-mono">
                      Error: {baileysError}
                    </div>
                  )}
                </div>

                {/* Test WhatsApp Message Sender Form */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-blue-600" /> Test WhatsApp Dispatcher
                  </h3>
                  <form onSubmit={handleSendTestMessage} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1">
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Target Phone (+234...)</label>
                      <input
                        type="text"
                        value={testPhone}
                        onChange={(e) => setTestPhone(e.target.value)}
                        placeholder="+2348012345678"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2 flex gap-2 items-end">
                      <div className="flex-grow">
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Test Message Text</label>
                        <input
                          type="text"
                          value={testText}
                          onChange={(e) => setTestText(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={sendingTest}
                        className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                      >
                        {sendingTest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        Send
                      </button>
                    </div>
                  </form>

                  {testResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      testResult.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {testResult.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                      <span>{testResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* META OFFICIAL API FORM */}
              <form onSubmit={handleSaveOfficial} className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-600" />
                    Meta Official WhatsApp API Credentials
                  </h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Credentials generated within your Meta developer account console.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Phone Number ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="e.g. 109825438910"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs font-medium rounded-xl outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Business Account ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-400" /> WhatsApp Business Account ID
                    </label>
                    <input
                      type="text"
                      value={businessAccountId}
                      onChange={(e) => setBusinessAccountId(e.target.value)}
                      placeholder="e.g. 29382173849"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs font-medium rounded-xl outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>

                  {/* Permanent System Token */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-400" /> Permanent Access Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 border-0 bg-transparent cursor-pointer"
                      >
                        {showToken ? <><EyeOff className="w-3 h-3" /> Hide</> : <><Eye className="w-3 h-3" /> Show</>}
                      </button>
                    </div>
                    <input
                      type={showToken ? "text" : "password"}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Enter Meta permanent system user access token..."
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs font-mono rounded-xl outline-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {saving ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</> : <><Save className="w-3.5 h-3.5" /> Save Meta Credentials</>}
                  </button>
                </div>
              </form>
            </div>

            {/* RIGHT COLUMN: WEBHOOK & HELP BINDINGS */}
            <div className="space-y-6">
              {/* Webhook Settings Box */}
              <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-blue-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400" /> Meta Webhook Bindings
                  </h2>
                  <p className="text-[10px] text-slate-400 font-sans mt-1">
                    Provide these endpoints inside the "Webhook" product settings of your Meta App panel.
                  </p>
                </div>

                {/* Webhook Endpoint Address */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                    <span>Callback URL</span>
                    {copiedUrl ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-sans">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookUrl, "url")}
                        className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-0"
                      >
                        <Copy className="w-3 h-3" /> Copy URL
                      </button>
                    )}
                  </div>
                  <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[9px] text-slate-300 select-all break-all leading-relaxed">
                    {webhookUrl}
                  </div>
                </div>

                {/* Webhook Verification Token */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                    <span>Verify Token</span>
                    {copiedToken ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-sans">
                        <Check className="w-3 h-3" /> Copied
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(verifyToken, "token")}
                        className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer bg-transparent border-0"
                      >
                        <Copy className="w-3 h-3" /> Copy
                      </button>
                    )}
                  </div>
                  
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value)}
                      placeholder="e.g. custom_verify_secret"
                      className="flex-grow p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] text-blue-400 outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={generateVerifyToken}
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors flex items-center justify-center cursor-pointer"
                      title="Auto-Generate Verification Token"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Info Guide */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-5 space-y-4 text-left">
                <h3 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-600" />
                  Choosing the Right WhatsApp Engine
                </h3>
                <div className="text-[11px] text-slate-600 space-y-3 leading-relaxed">
                  <p>
                    <strong>Baileys WA Web Engine:</strong> Ideal for rapid deployment using any existing smartphone WhatsApp account without awaiting Meta developer review.
                  </p>
                  <p>
                    <strong>Meta Official API:</strong> Ideal for official high-throughput enterprise recruitment accounts with verified business badges.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
