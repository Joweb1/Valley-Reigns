import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, ShieldCheck, Save, Key, Phone, HelpCircle, Copy, Check, 
  RefreshCw, Eye, EyeOff, Sparkles, Server, Settings, QrCode, Smartphone, 
  Wifi, WifiOff, Send, CheckCircle2, AlertTriangle, Zap, MessageSquare, 
  ExternalLink, Play, Pause, UserCheck, Clock, Layers
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, clearAllWhatsAppConversations } from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

interface ReceivedWhatsAppMsg {
  id: string;
  chatId: string;
  customerPhone: string;
  name: string;
  text: string;
  timestamp: number;
  provider: "baileys" | "official" | "simulated";
  status: string;
}

export const WhatsAppConfigPage: React.FC = () => {
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  // Provider Mode state ("official" | "baileys")
  const [activeMode, setActiveMode] = useState<"official" | "baileys">("baileys");
  const [officialConfigured, setOfficialConfigured] = useState(false);

  // Baileys state from server
  const [baileysStatus, setBaileysStatus] = useState<"disconnected" | "connecting" | "qr_ready" | "connected" | "error">("disconnected");
  const [baileysQrCode, setBaileysQrCode] = useState<string | null>(null);
  const [baileysPairingCode, setBaileysPairingCode] = useState<string | null>(null);
  const [baileysUserPhone, setBaileysUserPhone] = useState<string | null>(null);
  const [baileysError, setBaileysError] = useState<string | null>(null);
  const [connectingBaileys, setConnectingBaileys] = useState(false);

  // Baileys Auth Method: QR vs Pairing Code
  const [baileysAuthMethod, setBaileysAuthMethod] = useState<"qr" | "pairing">("qr");
  const [pairingPhone, setPairingPhone] = useState("");
  const [pairingFormattedPhone, setPairingFormattedPhone] = useState<string | null>(null);
  const [requestingPairingCode, setRequestingPairingCode] = useState(false);
  const [pairingCodeError, setPairingCodeError] = useState<string | null>(null);
  const [copiedPairingCode, setCopiedPairingCode] = useState(false);

  // Received Messages Live Inspector states
  const [receivedMessages, setReceivedMessages] = useState<ReceivedWhatsAppMsg[]>([]);
  const [loadingReceivedMessages, setLoadingReceivedMessages] = useState(false);
  const [autoPollReceived, setAutoPollReceived] = useState(true);
  const [lastPolledTime, setLastPolledTime] = useState<number | null>(null);

  // Simulate Incoming Message state
  const [simulatePhone, setSimulatePhone] = useState("+2348012345678");
  const [simulateName, setSimulateName] = useState("Alex Candidate");
  const [simulateText, setSimulateText] = useState("Hello! I saw the job opening and would like to apply.");
  const [simulating, setSimulating] = useState(false);
  const [simulateResult, setSimulateResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Test Outbound Message States
  const [testPhone, setTestPhone] = useState("");
  const [testText, setTestText] = useState("Hello from Valley Reigns WhatsApp Integration!");
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states for Official Meta API
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [officialPhoneNumber, setOfficialPhoneNumber] = useState("");
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
        if (data.baileysPairingCode) {
          setBaileysPairingCode(data.baileysPairingCode);
        }
        setBaileysUserPhone(data.baileysUserPhone || null);
        setBaileysError(data.baileysError || null);
      }
    } catch (err) {
      console.warn("Failed to fetch WhatsApp provider status from server:", err);
    }
  };

  // Fetch Live Received Messages
  const fetchReceivedMessages = async () => {
    setLoadingReceivedMessages(true);
    try {
      const res = await fetch("/api/whatsapp/received-messages");
      if (res.ok) {
        const data = await res.json();
        setReceivedMessages(data.messages || []);
        setLastPolledTime(Date.now());
      }
    } catch (err) {
      console.warn("Failed to fetch received WhatsApp messages:", err);
    } finally {
      setLoadingReceivedMessages(false);
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
          setOfficialPhoneNumber(data.officialPhoneNumber || "");
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
    fetchReceivedMessages();
  }, [authLoading]);

  // Polling loop for Baileys connection status when connecting or in QR / pairing state
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

  // Automated 10-second polling for Received Messages
  useEffect(() => {
    let interval: any = null;
    if (autoPollReceived) {
      interval = setInterval(() => {
        fetchReceivedMessages();
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoPollReceived]);

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
    setBaileysPairingCode(null);
    try {
      await clearAllWhatsAppConversations();
      const res = await fetch("/api/baileys/connect", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setBaileysStatus(data.status);
        setBaileysQrCode(data.qrCode);
      }
    } catch (err: any) {
      console.error("Error initializing Baileys QR:", err);
      setStatusMessage({ type: "error", text: "Failed to initialize Baileys connection." });
    } finally {
      setConnectingBaileys(false);
      fetchProviderStatus();
    }
  };

  const handleRequestPairingCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPhone.trim()) return;

    setRequestingPairingCode(true);
    setPairingCodeError(null);
    setPairingFormattedPhone(null);
    try {
      await clearAllWhatsAppConversations();
      const res = await fetch("/api/baileys/request-pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: pairingPhone.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setBaileysPairingCode(data.pairingCode);
        setPairingFormattedPhone(data.formattedPhone || `+${data.phoneNumber}`);
        setBaileysStatus("qr_ready");
      } else {
        setPairingCodeError(data.error || "Failed to generate WhatsApp pairing code.");
      }
    } catch (err: any) {
      setPairingCodeError(err.message || "Network error generating pairing code.");
    } finally {
      setRequestingPairingCode(false);
      fetchProviderStatus();
    }
  };

  const handleDisconnectBaileys = async () => {
    try {
      await clearAllWhatsAppConversations();
      const res = await fetch("/api/baileys/disconnect", { method: "POST" });
      if (res.ok) {
        setBaileysStatus("disconnected");
        setBaileysQrCode(null);
        setBaileysPairingCode(null);
        setBaileysUserPhone(null);
        setStatusMessage({ type: "success", text: "Baileys session logged out and previous conversations cleared successfully." });
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

  const handleSimulateIncoming = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simulatePhone.trim() || !simulateText.trim()) return;

    setSimulating(true);
    setSimulateResult(null);

    try {
      const res = await fetch("/api/whatsapp/simulate-incoming", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerPhone: simulatePhone.trim(),
          name: simulateName.trim(),
          text: simulateText.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSimulateResult({
          type: "success",
          message: `Incoming message created! A pending conversation for +${simulatePhone} is now registered.`
        });
        fetchReceivedMessages();
      } else {
        setSimulateResult({
          type: "error",
          message: data.error || "Failed to simulate incoming message."
        });
      }
    } catch (err: any) {
      setSimulateResult({
        type: "error",
        message: err.message || "Error simulating incoming message."
      });
    } finally {
      setSimulating(false);
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
        officialPhoneNumber: officialPhoneNumber.trim(),
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

  const copyToClipboard = (text: string, type: "url" | "token" | "pairing") => {
    navigator.clipboard.writeText(text);
    if (type === "url") {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === "token") {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else if (type === "pairing") {
      setCopiedPairingCode(true);
      setTimeout(() => setCopiedPairingCode(false), 2000);
    }
  };

  const formatRelativeTime = (ts: number) => {
    if (!ts) return "Recently";
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 30) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          Seamlessly route recruitment chat via Meta Official WhatsApp Business API or Baileys WhatsApp Web QR & Phone Code Engine.
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
            {/* MAIN COLUMN: BAILEYS & INSPECTOR */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* 1. BAILEYS WHATSAPP WEB ENGINE BOX */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <QrCode className="w-4 h-4 text-emerald-600" />
                      Baileys WhatsApp Web Engine
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Link any mobile WhatsApp account using QR Code or 8-Digit Pairing Code.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={fetchProviderStatus}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[10px] font-bold"
                    title="Refresh connection status"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
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
                            {baileysStatus === "qr_ready" ? "Awaiting Linking" : baileysStatus}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 font-mono">
                          {baileysStatus === "connected" && baileysUserPhone
                            ? `Linked Mobile: ${baileysUserPhone}`
                            : baileysStatus === "qr_ready"
                            ? "Waiting for mobile phone scan or code authorization..."
                            : baileysStatus === "connecting"
                            ? "Connecting to WhatsApp Web servers..."
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
                              <QrCode className="w-3.5 h-3.5" /> Initialize Socket
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Auth Method Selector (QR Code vs Pairing Code) */}
                  {baileysStatus !== "connected" && (
                    <div className="pt-4 border-t border-slate-200 space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                        <button
                          type="button"
                          onClick={() => setBaileysAuthMethod("qr")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            baileysAuthMethod === "qr"
                              ? "bg-slate-900 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <QrCode className="w-3.5 h-3.5" /> Scan QR Code
                        </button>
                        <button
                          type="button"
                          onClick={() => setBaileysAuthMethod("pairing")}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            baileysAuthMethod === "pairing"
                              ? "bg-slate-900 text-white shadow-sm"
                              : "bg-slate-100 text-slate-600 hover:text-slate-900"
                          }`}
                        >
                          <Smartphone className="w-3.5 h-3.5" /> Link with Phone Code
                        </button>
                      </div>

                      {/* Tab 1: QR Code View */}
                      {baileysAuthMethod === "qr" && (
                        <div>
                          {baileysStatus === "qr_ready" && baileysQrCode ? (
                            <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-4 rounded-2xl border border-slate-200">
                              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-md shrink-0">
                                <img
                                  src={baileysQrCode}
                                  alt="WhatsApp Baileys QR Code"
                                  className="w-48 h-48 object-contain rounded-lg"
                                />
                              </div>
                              <div className="space-y-3 text-left">
                                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <Smartphone className="w-4 h-4 text-emerald-600" /> How to connect via QR:
                                </h3>
                                <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 font-medium">
                                  <li>Open <strong>WhatsApp</strong> on your mobile phone.</li>
                                  <li>Tap <strong>Menu</strong> or <strong>Settings</strong> & select <strong>Linked Devices</strong>.</li>
                                  <li>Tap <strong>Link a Device</strong> and scan this QR code.</li>
                                  <li>Once scanned, WhatsApp Web will bind and route candidate messages automatically!</li>
                                </ol>
                                <p className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 font-mono">
                                  QR Code refreshes automatically every few seconds.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 font-mono text-left py-2">
                              Click "Initialize Socket" above to generate a new live QR code.
                            </p>
                          )}
                        </div>
                      )}

                      {/* Tab 2: Pairing Code View */}
                      {baileysAuthMethod === "pairing" && (
                        <div className="space-y-4 text-left">
                          <form onSubmit={handleRequestPairingCode} className="flex flex-col sm:flex-row items-end gap-3">
                            <div className="flex-grow w-full">
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                WhatsApp Mobile Phone Number (Country code included, e.g. 2348012345678)
                              </label>
                              <input
                                type="text"
                                value={pairingPhone}
                                onChange={(e) => setPairingPhone(e.target.value)}
                                placeholder="e.g. 2348012345678 or 08012345678"
                                className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono outline-none focus:border-emerald-500"
                                required
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={requestingPairingCode}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0 disabled:opacity-50 flex items-center gap-1.5"
                            >
                              {requestingPairingCode ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Smartphone className="w-3.5 h-3.5" />
                              )}
                              Request Pairing Code
                            </button>
                          </form>
                          <p className="text-[10px] text-slate-500 font-mono">
                            💡 Format tip: Local numbers starting with '0' (e.g. 080...) are automatically converted to international format (+234...).
                          </p>

                          {pairingCodeError && (
                            <p className="text-xs text-rose-600 font-mono bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                              {pairingCodeError}
                            </p>
                          )}

                          {baileysPairingCode && (
                            <div className="p-4 bg-emerald-950 text-white rounded-2xl border border-emerald-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">
                                  Your Live WhatsApp 8-Digit Pairing Code:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(baileysPairingCode, "pairing")}
                                  className="text-xs font-bold text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer bg-emerald-900/60 px-2.5 py-1 rounded-lg"
                                >
                                  {copiedPairingCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                                  {copiedPairingCode ? "Copied" : "Copy Code"}
                                </button>
                              </div>
                              <div className="text-2xl sm:text-3xl font-mono font-black tracking-widest text-emerald-300 text-center py-2.5 bg-emerald-900/40 rounded-xl border border-emerald-800 select-all">
                                {baileysPairingCode}
                              </div>
                              {pairingFormattedPhone && (
                                <div className="text-[11px] font-mono text-emerald-300 bg-emerald-900/50 p-2 rounded-xl border border-emerald-800/80 flex items-center gap-2">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                  <span>Registered Target Phone: <strong>{pairingFormattedPhone}</strong></span>
                                </div>
                              )}
                              <div className="text-xs text-emerald-200 space-y-1.5 font-medium leading-relaxed">
                                <p><strong>Steps to authorize on your mobile WhatsApp app:</strong></p>
                                <ol className="list-decimal list-inside text-[11px] space-y-1 text-emerald-300">
                                  <li>Open WhatsApp on your mobile phone (ensure active internet/data connection).</li>
                                  <li>Tap <strong>Settings &gt; Linked Devices &gt; Link a Device</strong>.</li>
                                  <li>Tap <strong>"Link with phone number instead"</strong> at the bottom of the QR scanner.</li>
                                  <li>Enter the 8-character code above!</li>
                                </ol>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {baileysError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 text-left font-mono">
                      Error: {baileysError}
                    </div>
                  )}
                </div>

                {/* Test Outbound WhatsApp Message Form */}
                <div className="border-t border-slate-100 pt-6 space-y-4">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Send className="w-4 h-4 text-blue-600" /> Test Outbound WhatsApp Dispatcher
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

              {/* 2. RECEIVED MESSAGES LIVE INSPECTOR & TESTING SECTION */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-purple-600" />
                      Received Messages Live Inspector
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Automatically syncs and records all incoming WhatsApp customer messages every 10 seconds.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAutoPollReceived(!autoPollReceived)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        autoPollReceived
                          ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          : "bg-slate-100 text-slate-600"
                      }`}
                      title="Toggle 10s auto-refresh"
                    >
                      {autoPollReceived ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                          Auto 10s Active
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-slate-500" />
                          Auto Paused
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={fetchReceivedMessages}
                      disabled={loadingReceivedMessages}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                      title="Fetch latest received messages now"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingReceivedMessages ? "animate-spin" : ""}`} />
                      Refresh Now
                    </button>
                  </div>
                </div>

                {/* Received Messages List */}
                <div className="space-y-3">
                  {loadingReceivedMessages && receivedMessages.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
                      <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto mb-2" />
                      <p className="text-xs font-mono text-slate-500">Scanning for incoming WhatsApp messages...</p>
                    </div>
                  ) : receivedMessages.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 space-y-2">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No incoming WhatsApp messages recorded yet</p>
                      <p className="text-[11px] text-slate-400">
                        When a WhatsApp customer sends a message to your connected account, it will automatically appear here and create a pending conversation in your Inbox.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {receivedMessages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-purple-300 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-extrabold text-slate-900">{msg.name}</span>
                              <span className="text-[10px] font-mono text-slate-500">({msg.customerPhone})</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                {msg.provider === "baileys" ? "Baileys WA" : msg.provider === "official" ? "Meta API" : "Simulated"}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" /> {formatRelativeTime(msg.timestamp)}
                              </span>
                            </div>
                            <p className="text-xs font-medium text-slate-800 bg-white p-2 rounded-xl border border-slate-200 italic">
                              "{msg.text}"
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/admin/chat?chatId=${msg.chatId}`)}
                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 self-start sm:self-center shadow-sm"
                          >
                            Open in Inbox <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastPolledTime && (
                    <p className="text-[10px] font-mono text-slate-400 text-right">
                      Last synchronized: {new Date(lastPolledTime).toLocaleTimeString()}
                    </p>
                  )}
                </div>

                {/* Simulate Incoming WhatsApp Message Box */}
                <div className="border-t border-slate-100 pt-6 space-y-4 text-left">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" /> Simulate Incoming WhatsApp Customer Message
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400">Developer Testing Suite</span>
                  </div>

                  <form onSubmit={handleSimulateIncoming} className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Customer Name</label>
                        <input
                          type="text"
                          value={simulateName}
                          onChange={(e) => setSimulateName(e.target.value)}
                          placeholder="Alex Candidate"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-1">Phone Number (+234...)</label>
                        <input
                          type="text"
                          value={simulatePhone}
                          onChange={(e) => setSimulatePhone(e.target.value)}
                          placeholder="+2348012345678"
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono outline-none focus:border-purple-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">Incoming Message Body</label>
                      <input
                        type="text"
                        value={simulateText}
                        onChange={(e) => setSimulateText(e.target.value)}
                        placeholder="I am interested in applying for open positions."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-purple-500"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={simulating}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                      >
                        {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        Trigger Incoming Test Message
                      </button>
                    </div>
                  </form>

                  {simulateResult && (
                    <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                      simulateResult.type === "success"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}>
                      {simulateResult.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />}
                      <span>{simulateResult.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. META OFFICIAL API FORM */}
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

                  {/* Official WhatsApp Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-[#00A884]" /> Official WhatsApp Phone Number
                    </label>
                    <input
                      type="text"
                      value={officialPhoneNumber}
                      onChange={(e) => setOfficialPhoneNumber(e.target.value)}
                      placeholder="e.g. +2348031234567 or 2348031234567"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-blue-500 focus:bg-white text-xs font-medium rounded-xl outline-none transition-all placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-400">
                      The phone number registered with Meta Official WhatsApp API for candidates to message.
                    </p>
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
                    <strong>Baileys WA Web Engine:</strong> Ideal for rapid deployment using any existing smartphone WhatsApp account without awaiting Meta developer review. Supports both QR code scanning and 8-digit Pairing Code.
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
