import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Save, Key, Phone, HelpCircle, Copy, Check, RefreshCw, Eye, EyeOff, Sparkles, Server, Settings } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../lib/services";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "motion/react";

export const WhatsAppConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  
  // Form states
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

  useEffect(() => {
    if (authLoading) return; // Wait for Firebase Auth to initialize before querying

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
        } else {
          // Set a default verify token if none exists
          setVerifyToken("valleyreigns_verify_token_" + Math.random().toString(36).substring(2, 10));
        }
      } catch (err) {
        console.error("Error fetching WhatsApp configuration:", err);
        setStatusMessage({
          type: "error",
          text: "Failed to load current settings from database. Please ensure you are logged in as an Admin.",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [authLoading]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!phoneNumberId.trim()) {
      setStatusMessage({ type: "error", text: "Phone Number ID is required." });
      return;
    }
    if (!businessAccountId.trim()) {
      setStatusMessage({ type: "error", text: "WhatsApp Business Account ID is required." });
      return;
    }
    if (!accessToken.trim()) {
      setStatusMessage({ type: "error", text: "Permanent Access Token is required." });
      return;
    }
    if (!verifyToken.trim()) {
      setStatusMessage({ type: "error", text: "Webhook Verify Token is required." });
      return;
    }

    setSaving(true);
    setStatusMessage(null);

    try {
      const configRef = doc(db, "settings", "whatsapp");
      await setDoc(configRef, {
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        accessToken: accessToken.trim(),
        verifyToken: verifyToken.trim(),
        updatedAt: Date.now(),
      });

      setStatusMessage({
        type: "success",
        text: "WhatsApp configuration saved successfully!",
      });

      // Clear success notification after 4 seconds
      setTimeout(() => {
        setStatusMessage(null);
      }, 4000);
    } catch (err: any) {
      console.error("Error saving WhatsApp configuration:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to save configuration. Please check your admin privileges.",
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
    setStatusMessage({
      type: "success",
      text: "New Verification Token generated! Remember to save your settings.",
    });
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header Row with sleek back navigation */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/admin"
          className="w-10 h-10 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded-xl flex items-center justify-center shadow-sm hover:shadow transition-all cursor-pointer"
          title="Back to Admin Control Panel"
          id="whatsapp_back_btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-serif font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#0F5132]" />
            WhatsApp Business Integration
          </h1>
          <p className="text-xs font-sans text-slate-500 mt-1">
            Configure credentials to bind your Meta Developer App's WhatsApp Business API and incoming webhook alerts.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white border border-slate-100 rounded-3xl shadow-sm p-16 flex flex-col items-center justify-center space-y-4"
          >
            <RefreshCw className="w-8 h-8 text-[#0F5132] animate-spin" />
            <p className="text-xs font-medium text-slate-400 font-mono">Fetching WhatsApp configurations from cloud...</p>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left Column: Config Form (Sleek card) */}
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSave} className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6 space-y-6" id="whatsapp_config_form">
                <div className="border-b border-slate-100 pb-4">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-emerald-600" />
                    API Credentials
                  </h2>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">
                    Credentials generated within your Meta developer account console.
                  </p>
                </div>

                {statusMessage && (
                  <div
                    className={`p-3.5 rounded-2xl text-xs font-medium flex items-center gap-2.5 ${
                      statusMessage.type === "success"
                        ? "bg-emerald-50 text-[#0F5132] border border-emerald-100"
                        : "bg-rose-50 text-rose-700 border border-rose-100"
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${statusMessage.type === "success" ? "bg-emerald-600" : "bg-rose-600"}`} />
                    <span>{statusMessage.text}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Phone Number ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Phone Number ID
                    </label>
                    <input
                      type="text"
                      value={phoneNumberId}
                      onChange={(e) => setPhoneNumberId(e.target.value)}
                      placeholder="e.g. 109825438910"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-[#0F5132] focus:bg-white text-xs font-medium rounded-xl outline-none transition-all placeholder:text-slate-400"
                      id="input_phone_number_id"
                    />
                  </div>

                  {/* Business Account ID */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Server className="w-3.5 h-3.5 text-slate-400" />
                      WhatsApp Business Account ID
                    </label>
                    <input
                      type="text"
                      value={businessAccountId}
                      onChange={(e) => setBusinessAccountId(e.target.value)}
                      placeholder="e.g. 29382173849"
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-[#0F5132] focus:bg-white text-xs font-medium rounded-xl outline-none transition-all placeholder:text-slate-400"
                      id="input_business_account_id"
                    />
                  </div>

                  {/* Permanent System Token */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-slate-400" />
                        Permanent Access Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1 border-0 bg-transparent cursor-pointer"
                      >
                        {showToken ? (
                          <>
                            <EyeOff className="w-3 h-3" /> Hide Token
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" /> Show Token
                          </>
                        )}
                      </button>
                    </div>
                    <input
                      type={showToken ? "text" : "password"}
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      placeholder="Enter Meta permanent system user access token..."
                      className="w-full px-3.5 py-2.5 bg-slate-50/50 border border-slate-200 hover:border-slate-300 focus:border-[#0F5132] focus:bg-white text-xs font-mono rounded-xl outline-none transition-all placeholder:text-slate-400"
                      id="input_access_token"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[10px] text-slate-400 font-medium">
                    All inputs are validated and securely saved.
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-[#0F5132] hover:bg-[#0c4329] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm hover:shadow hover:-translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                    id="save_whatsapp_config_btn"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Settings...
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" /> Save Configuration
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Webhook Setup Assistance & Guidance */}
            <div className="space-y-6">
              {/* Webhook Settings Box */}
              <div className="bg-slate-900 text-white rounded-3xl shadow-sm p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    Meta Webhook Bindings
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
                    <div className="flex gap-2">
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
                  </div>
                  
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={verifyToken}
                      onChange={(e) => setVerifyToken(e.target.value)}
                      placeholder="e.g. custom_verify_secret"
                      className="flex-grow p-2 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[10px] text-emerald-400 outline-none focus:border-emerald-500"
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

                <div className="text-[9px] text-slate-400 leading-relaxed font-sans border-t border-slate-800 pt-4">
                  <strong>Verification Step:</strong> Meta will deliver a GET validation ping carrying this <em>Verify Token</em>. Our Express server automatically approves matched queries and responds back with the challenge parameter.
                </div>
              </div>

              {/* Step-by-Step Info Guide */}
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-3xl p-5 space-y-4 text-left">
                <h3 className="text-xs font-bold text-[#0F5132] flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#0F5132]" />
                  Setup Steps Workflow
                </h3>
                <ol className="list-decimal list-inside text-[10px] text-slate-600 font-medium space-y-2.5">
                  <li>
                    Register on <a href="https://developers.facebook.com" target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline font-bold">Meta for Developers</a>.
                  </li>
                  <li>
                    Create a Business App & add the <strong>WhatsApp</strong> product inside the dashboard.
                  </li>
                  <li>
                    Extract the <strong>Phone Number ID</strong> and <strong>Business Account ID</strong> under WhatsApp Setup and copy them here.
                  </li>
                  <li>
                    Go to Business Settings and create a <strong>System User</strong> with a permanent token containing permissions for <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[9px]">whatsapp_business_messaging</code>.
                  </li>
                  <li>
                    Paste the permanent token and your choice of <strong>Verify Token</strong> here and click Save.
                  </li>
                  <li>
                    Finally, go back to the Meta App console &rarr; WhatsApp &rarr; Configuration. Bind the Webhook URL and Verify Token, then subscribe to the <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono text-[9px]">messages</code> field.
                  </li>
                </ol>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
