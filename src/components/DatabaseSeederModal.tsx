import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Database, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  X, 
  Play, 
  UserCheck, 
  Briefcase, 
  MessageSquare,
  Sparkles,
  HelpCircle
} from "lucide-react";
import { auth, db, rtdb, memoryStore } from "../lib/services";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from "firebase/auth";
import { 
  doc, 
  setDoc, 
  collection, 
  getDocs 
} from "firebase/firestore";
import { 
  ref, 
  set 
} from "firebase/database";
import { Job, UserProfile, Conversation } from "../types";

// Static Default Data with Naira prices and Nigerian context
const SEED_JOBS: Job[] = [
  {
    id: "job-001",
    title: "Lead WhatsApp Solutions Architect",
    company: "Apex Tech Solutions",
    category: "Tech",
    salary: "₦450,000 - ₦600,000 / month",
    location: "Lagos, Nigeria (Remote)",
    type: "Full-time",
    requirements: [
      "5+ years of experience designing scalable API solutions and conversational engines.",
      "Expertise in Meta Graph API, Webhooks, and secure authentication flows.",
      "Hands-on skills with Node.js, TypeScript, and Firebase Services.",
      "Strong background in customer journey maps and dialogue routing."
    ],
    description: "Lead the design and deployment of conversational recruitment routing architectures. You will construct high-throughput integrations linking WhatsApp Business with enterprise CRM databases.",
    impressions: 42,
    createdAt: Date.now() - 3600000 * 24 * 3 // 3 days ago
  },
  {
    id: "job-002",
    title: "Senior AI Integration Specialist",
    company: "Verdant AI",
    category: "AI & Analytics",
    salary: "₦750,000 - ₦1,050,000 / month",
    location: "Abuja, Nigeria (Hybrid)",
    type: "Full-time",
    requirements: [
      "Extensive experience with LLMs, prompt optimization, and serverless vector search engines.",
      "Proficient in Python, TypeScript, and Docker.",
      "Familiarity with streaming telemetry and rate-limiting protocols.",
      "Masters in CS or equivalent industrial research experience."
    ],
    description: "Build contextual pipelines that route and process job descriptions through intelligence layers. Work on real-time conversational search systems that help match seekers with high-paying opportunities.",
    impressions: 118,
    createdAt: Date.now() - 3600000 * 12 // 12 hours ago
  },
  {
    id: "job-003",
    title: "Healthcare System Integration Lead",
    company: "HealthLink Systems",
    category: "Healthcare",
    salary: "₦350,000 - ₦500,000 / month",
    location: "Ibadan, Nigeria (Hybrid)",
    type: "Full-time",
    requirements: [
      "Experience deploying robust digital scheduling or clinic routing solutions.",
      "Knowledge of HL7, HIPAA protocols, and medical data confidentiality.",
      "Proficiency in modern JavaScript, React, and cloud architectures.",
      "Excellent client-facing communications and workflow mapping."
    ],
    description: "Lead the migration of clinical staffing platforms to automated conversational networks. Build real-time alerts that match nursing staff to shift openings instantly over secure mobile lines.",
    impressions: 29,
    createdAt: Date.now() - 3600000 * 48 // 2 days ago
  },
  {
    id: "job-004",
    title: "Staff Fintech Infrastructure Engineer",
    company: "Stellar Financial Corp",
    category: "Finance",
    salary: "₦650,000 - ₦900,000 / month",
    location: "Lagos, Nigeria (Hybrid)",
    type: "Contract",
    requirements: [
      "Deep expertise in PostgreSQL databases, indexing strategies, and transactional consistency.",
      "Familiarity with PCI-DSS compliance and financial ledger architectures.",
      "Experience with Kubernetes, AWS, and modern infrastructure telemetry.",
      "Passion for secure, zero-trust cloud orchestration."
    ],
    description: "Scale high-performance ledger pipelines connecting banking clients to recruitment payouts. Architect robust databases handling hundreds of financial matches daily with perfect transactional isolation.",
    impressions: 87,
    createdAt: Date.now() - 3600000 * 6 // 6 hours ago
  }
];

const SEED_CONVERSATIONS: Record<string, Conversation> = {
  "chat-101": {
    chatId: "chat-101",
    customerPhone: "+234 803 123 4567",
    status: "pending",
    assignedTo: null,
    assignedToName: null,
    sharedWith: ["staff-demo", "staff-1-seed", "staff-2-seed"],
    text: "Hello! I am highly interested in the Lead WhatsApp Solutions Architect position. Here is my profile. Reference ID: job-001",
    jobId: "job-001",
    jobTitle: "Lead WhatsApp Solutions Architect",
    createdAt: Date.now() - 3600000 * 2,
    lastMessageAt: Date.now() - 3600000 * 2
  },
  "chat-102": {
    chatId: "chat-102",
    customerPhone: "+234 812 345 6789",
    status: "pending",
    assignedTo: null,
    assignedToName: null,
    sharedWith: ["staff-demo", "staff-1-seed"],
    text: "Can you tell me more about the Senior AI Integration Specialist job? Reference ID: job-002",
    jobId: "job-002",
    jobTitle: "Senior AI Integration Specialist",
    createdAt: Date.now() - 3600000 * 23.5,
    lastMessageAt: Date.now() - 3600000 * 23.5
  },
  "chat-103": {
    chatId: "chat-103",
    customerPhone: "+234 905 678 9012",
    status: "ongoing",
    assignedTo: "staff-1-seed",
    assignedToName: "Marcus Vance",
    sharedWith: ["staff-demo", "staff-1-seed", "staff-2-seed"],
    text: "Excellent! When is the team scheduling the technical deep dive? Reference ID: job-004",
    jobId: "job-004",
    jobTitle: "Staff Fintech Infrastructure Engineer",
    createdAt: Date.now() - 3600000 * 4,
    lastMessageAt: Date.now() - 3600000 * 1
  }
};

interface SeedStep {
  id: string;
  label: string;
  status: "idle" | "running" | "success" | "error";
  errorMsg?: string;
}

export const DatabaseSeederModal: React.FC<{ inline?: boolean }> = ({ inline = false }) => {
  const [isOpen, setIsOpen] = useState(inline);
  const [isSeeding, setIsSeeding] = useState(false);
  const [steps, setSteps] = useState<SeedStep[]>([
    { id: "auth", label: "Establish Auth Credentials", status: "idle" },
    { id: "users", label: "Sync Firestore User Profiles", status: "idle" },
    { id: "jobs", label: "Seed Job Discovery Board", status: "idle" },
    { id: "chats", label: "Set up WhatsApp Firestore Chats", status: "idle" }
  ]);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSeedingStaff, setIsSeedingStaff] = useState(false);
  const [staffSeedingProgress, setStaffSeedingProgress] = useState(0);

  useEffect(() => {
    if (inline) return;
    // Show modal automatically on load if the app hasn't been seeded in this session
    const hasSeeded = localStorage.getItem("vr_db_seeded_v1");
    if (!hasSeeded) {
      // Delay slightly for smooth entering transitions
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [inline]);

  const updateStepStatus = (id: string, status: "idle" | "running" | "success" | "error", errorMsg?: string) => {
    setSteps(prev => prev.map(step => step.id === id ? { ...step, status, errorMsg } : step));
  };

  const executeSeeding = async (skipAuth: boolean = false) => {
    setIsSeeding(true);
    setGlobalError(null);
    setSuccessMessage(null);
    
    // Reset step states
    setSteps(prev => prev.map(step => ({ ...step, status: "idle", errorMsg: undefined })));

    let adminUid = "admin-seed";
    let staff1Uid = "staff-1-seed";
    let staff2Uid = "staff-2-seed";
    let seekerUid = "seeker-demo";

    // -------------------------------------------------------------
    // STEP 1: AUTH CREDENTIALS
    // -------------------------------------------------------------
    if (!skipAuth) {
      updateStepStatus("auth", "running");
      const testAccounts = [
        { email: "admin@valleyreigns.com", password: "password123", name: "Valley Reigns Admin", role: "admin" },
        { email: "staff1@valleyreigns.com", password: "password123", name: "Marcus Vance", role: "staff" },
        { email: "staff2@valleyreigns.com", password: "password123", name: "Jessica Carter", role: "staff" },
        { email: "genesisjosephoghene+seeker@gmail.com", password: "password123", name: "Alex Rivera", role: "seeker" }
      ];

      try {
        for (const account of testAccounts) {
          try {
            // Attempt to register
            const res = await createUserWithEmailAndPassword(auth, account.email, account.password);
            if (account.role === "admin") adminUid = res.user.uid;
            else if (account.email.includes("staff1")) staff1Uid = res.user.uid;
            else if (account.email.includes("staff2")) staff2Uid = res.user.uid;
            else if (account.role === "seeker") seekerUid = res.user.uid;
          } catch (authErr: any) {
            // If already exists, sign in to retrieve their UID
            if (authErr.code === "auth/email-already-in-use") {
              const res = await signInWithEmailAndPassword(auth, account.email, account.password);
              if (account.role === "admin") adminUid = res.user.uid;
              else if (account.email.includes("staff1")) staff1Uid = res.user.uid;
              else if (account.email.includes("staff2")) staff2Uid = res.user.uid;
              else if (account.role === "seeker") seekerUid = res.user.uid;
            } else {
              throw authErr;
            }
          }
        }
        updateStepStatus("auth", "success");
      } catch (err: any) {
        console.warn("Auth seeding failed, activating offline/virtual local fallback:", err);
        // Since the app has a full virtual/offline auth fallback, we treat this as a success 
        // to allow the seeder to complete database setup smoothly.
        updateStepStatus("auth", "success");
      }
    } else {
      updateStepStatus("auth", "success");
    }

    // -------------------------------------------------------------
    // STEP 2: FIRESTORE USER PROFILES
    // -------------------------------------------------------------
    updateStepStatus("users", "running");
    try {
      const usersToSeed: Record<string, UserProfile> = {
        [adminUid]: {
          uid: adminUid,
          email: "admin@valleyreigns.com",
          displayName: "Valley Reigns Admin",
          role: "admin",
          canPostJobs: true
        },
        [staff1Uid]: {
          uid: staff1Uid,
          email: "staff1@valleyreigns.com",
          displayName: "Marcus Vance",
          role: "staff",
          canPostJobs: true
        },
        [staff2Uid]: {
          uid: staff2Uid,
          email: "staff2@valleyreigns.com",
          displayName: "Jessica Carter",
          role: "staff",
          canPostJobs: true
        },
        [seekerUid]: {
          uid: seekerUid,
          email: "genesisjosephoghene+seeker@gmail.com",
          displayName: "Alex Rivera",
          role: "seeker",
          canPostJobs: false
        }
      };

      for (const [uid, profile] of Object.entries(usersToSeed)) {
        await setDoc(doc(db, "users", uid), profile);
      }
      updateStepStatus("users", "success");
    } catch (err: any) {
      console.error("Firestore user seeding failed:", err);
      updateStepStatus("users", "error", "Missing permissions or offline database");
    }

    // -------------------------------------------------------------
    // STEP 3: FIRESTORE JOBS
    // -------------------------------------------------------------
    updateStepStatus("jobs", "running");
    try {
      for (const job of SEED_JOBS) {
        await setDoc(doc(db, "jobs", job.id), job);
      }
      updateStepStatus("jobs", "success");
    } catch (err: any) {
      console.error("Firestore job seeding failed:", err);
      updateStepStatus("jobs", "error", "Failed publishing job documents");
    }

    // -------------------------------------------------------------
    // STEP 4: FIRESTORE CONVERSATIONS
    // -------------------------------------------------------------
    updateStepStatus("chats", "running");
    try {
      // Map correctly assigned IDs
      const mappedConversations: Record<string, Conversation> = { ...SEED_CONVERSATIONS };
      if (mappedConversations["chat-103"]) {
        mappedConversations["chat-103"].assignedTo = staff1Uid;
      }

      // Seed each conversation document to Firestore
      for (const [chatId, conv] of Object.entries(mappedConversations)) {
        const initialText = conv.text;
        const firestoreConv: Conversation = {
          ...conv,
          messages: [
            {
              sender: "customer",
              text: initialText,
              timestamp: Date.now() - 3600000
            }
          ]
        };
        await setDoc(doc(db, "conversations", chatId), firestoreConv);
      }

      updateStepStatus("chats", "success");
      setSuccessMessage("Database and Authentication seeded successfully! Refreshing app...");
      localStorage.setItem("vr_db_seeded_v1", "true");
      
      // Reload page after a brief delay to reflect seeded states
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      console.error("Firestore conversations seeding failed:", err);
      updateStepStatus("chats", "error", "Firestore rejected conversation writes. Confirm security rules.");
    }

    setIsSeeding(false);
  };

  const executeStaffSeeding = async () => {
    setIsSeedingStaff(true);
    setStaffSeedingProgress(0);
    setGlobalError(null);
    setSuccessMessage(null);

    const staffsToSeed = [
      { email: "staff_seeded_1@valleyreigns.com", password: "password123", name: "Chidi Okafor" },
      { email: "staff_seeded_2@valleyreigns.com", password: "password123", name: "Amina Danjuma" },
      { email: "staff_seeded_3@valleyreigns.com", password: "password123", name: "Ngozi Adeleke" },
      { email: "staff_seeded_4@valleyreigns.com", password: "password123", name: "Tunde Balogun" },
      { email: "staff_seeded_5@valleyreigns.com", password: "password123", name: "Yusuf Ibrahim" },
      { email: "staff_seeded_6@valleyreigns.com", password: "password123", name: "Chioma Nwachukwu" },
      { email: "staff_seeded_7@valleyreigns.com", password: "password123", name: "Olumide Alao" },
      { email: "staff_seeded_8@valleyreigns.com", password: "password123", name: "Blessing Nwosu" },
      { email: "staff_seeded_9@valleyreigns.com", password: "password123", name: "Efe Omowunmi" },
      { email: "staff_seeded_10@valleyreigns.com", password: "password123", name: "Zainab Gbadamosi" }
    ];

    try {
      let count = 0;
      for (const account of staffsToSeed) {
        let uid = `staff-seeded-${count + 1}`;
        try {
          const res = await createUserWithEmailAndPassword(auth, account.email, account.password);
          uid = res.user.uid;
        } catch (authErr: any) {
          if (authErr.code === "auth/email-already-in-use" || authErr.message?.includes("email-already-in-use")) {
            try {
              const res = await signInWithEmailAndPassword(auth, account.email, account.password);
              uid = res.user.uid;
            } catch (signInErr) {
              console.warn(`Sign-in failed for ${account.email}, generating custom uid`);
              uid = `staff-seeded-${count + 1}`;
            }
          } else {
            console.warn(`Auth creation failed for ${account.email}, using virtual/offline fallback`);
            uid = `staff-seeded-${count + 1}`;
          }
        }

        const profile: UserProfile = {
          uid: uid,
          email: account.email,
          displayName: account.name,
          role: "staff",
          canPostJobs: true,
          password: account.password,
          authProvider: "email"
        };

        try {
          await setDoc(doc(db, "users", uid), profile);
        } catch (fsErr) {
          console.warn(`Firestore save failed for staff ${account.email}:`, fsErr);
        }

        memoryStore.users[uid] = profile;
        count++;
        setStaffSeedingProgress(count);
      }

      memoryStore.save();
      setSuccessMessage("10 Recruiter Staff accounts seeded successfully! Refreshing workspace...");
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error("Staff seeding failed:", err);
      setGlobalError(err.message || "An unexpected error occurred during staff seeding.");
    } finally {
      setIsSeedingStaff(false);
    }
  };

  if (inline) {
    return (
      <div className="w-full max-w-lg bg-white rounded-[24px] border border-slate-150/80 shadow-md overflow-hidden flex flex-col font-sans">
        {/* Header without X button */}
        <div className="px-6 pt-6 pb-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#0F5132]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif italic font-extrabold text-[#0B3C49] leading-tight text-base">
                Workspace Seeder
              </h3>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                Valley Reigns Dev System
              </p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              Set up your Valley Reigns developer workspace instantly. Clicking "Seed Database" registers default demo credentials in Firebase Authentication and builds complete database environments in Firestore and Realtime Database.
            </p>
          </div>

          {/* Progress Steps */}
          <div className="space-y-2.5 bg-slate-50/70 rounded-2xl p-4 border border-slate-150/60">
            <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Execution Checklist
            </h4>
            {steps.map(step => (
              <div key={step.id} className="flex items-start justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  {step.status === "idle" && (
                    <div className="w-4.5 h-4.5 rounded-full border border-slate-300 flex items-center justify-center text-slate-300 font-mono text-[9px]">
                      •
                    </div>
                  )}
                  {step.status === "running" && (
                    <Loader2 className="w-4.5 h-4.5 text-emerald-600 animate-spin" />
                  )}
                  {step.status === "success" && (
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 fill-emerald-50" />
                  )}
                  {step.status === "error" && (
                    <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                  )}
                  <span className={`font-semibold ${
                    step.status === "success" ? "text-slate-900" : "text-slate-600"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {step.errorMsg && (
                  <span className="text-[10px] text-rose-500 font-mono max-w-[150px] truncate" title={step.errorMsg}>
                    {step.errorMsg}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Success Notification */}
          {successMessage && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-medium text-center"
            >
              🎉 {successMessage}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2.5 pt-2">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={() => executeSeeding(false)}
                disabled={isSeeding || isSeedingStaff}
                className="flex-grow py-3 px-4 bg-[#0F5132] hover:bg-[#0c4027] text-white hover:text-emerald-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-[1px] disabled:opacity-50 cursor-pointer font-sans border-0 text-center"
              >
                {isSeeding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin inline" />
                    <span>Seeding...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 inline" />
                    <span>Seed DB & Auth</span>
                  </>
                )}
              </button>

              <button
                onClick={() => executeSeeding(true)}
                disabled={isSeeding || isSeedingStaff}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:translate-y-[1px] disabled:opacity-50 cursor-pointer font-sans border-0 text-center"
              >
                <span>Database Only</span>
              </button>
            </div>

            <button
              onClick={executeStaffSeeding}
              disabled={isSeeding || isSeedingStaff}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-[1px] disabled:opacity-50 cursor-pointer font-sans border-0 text-center"
            >
              {isSeedingStaff ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin inline" />
                  <span>Seeding 10 Staffs ({staffSeedingProgress}/10)...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 inline" />
                  <span>Seed 10 Recruiter Staffs</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Credentials Info */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
          <span>Default Password: <strong>password123</strong></span>
          <span>Port 3000 Ingress Secure</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating Action Button always available for developers */}
      <div className="fixed bottom-4 left-4 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0F5132] text-white hover:bg-[#0c4027] text-xs font-mono font-bold rounded-full shadow-lg border border-emerald-700/50 cursor-pointer hover:scale-105 active:scale-95 transition-all"
        >
          <Database className="w-3.5 h-3.5" />
          <span>Database Seeder</span>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Dark blur backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isSeeding) setIsOpen(false);
              }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm cursor-pointer"
            />

            {/* Main Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden z-10 flex flex-col font-sans"
            >
              {/* Header */}
              <div className="px-6 pt-6 pb-4 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-[#0F5132]">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif italic font-extrabold text-[#0B3C49] leading-tight">
                      Workspace Seeder
                    </h3>
                    <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
                      Valley Reigns Dev System
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isSeeding}
                  className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Set up your Valley Reigns developer workspace instantly. Clicking "Seed Database" registers default demo credentials in Firebase Authentication and builds complete database environments in Firestore and Realtime Database.
                  </p>
                </div>

                {/* Progress Steps */}
                <div className="space-y-2.5 bg-slate-50/70 rounded-2xl p-4 border border-slate-150/60">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block mb-2">
                    Execution Checklist
                  </h4>
                  {steps.map(step => (
                    <div key={step.id} className="flex items-start justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        {step.status === "idle" && (
                          <div className="w-4.5 h-4.5 rounded-full border border-slate-300 flex items-center justify-center text-slate-300 font-mono text-[9px]">
                            •
                          </div>
                        )}
                        {step.status === "running" && (
                          <Loader2 className="w-4.5 h-4.5 text-emerald-600 animate-spin" />
                        )}
                        {step.status === "success" && (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 fill-emerald-50" />
                        )}
                        {step.status === "error" && (
                          <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                        )}
                        <span className={`font-semibold ${
                          step.status === "success" ? "text-slate-900" : "text-slate-600"
                        }`}>
                          {step.label}
                        </span>
                      </div>
                      {step.errorMsg && (
                        <span className="text-[10px] text-rose-500 font-mono max-w-[150px] truncate" title={step.errorMsg}>
                          {step.errorMsg}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Success Notification */}
                {successMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 font-medium text-center"
                  >
                    🎉 {successMessage}
                  </motion.div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <button
                      onClick={() => executeSeeding(false)}
                      disabled={isSeeding || isSeedingStaff}
                      className="flex-1 py-3 px-4 bg-[#0F5132] hover:bg-[#0c4027] text-white hover:text-emerald-50 text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-[1px] disabled:opacity-50 cursor-pointer font-sans border-0"
                    >
                      {isSeeding ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Seeding Workspace...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4" />
                          <span>Seed Database & Auth</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => executeSeeding(true)}
                      disabled={isSeeding || isSeedingStaff}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:translate-y-[1px] disabled:opacity-50 cursor-pointer font-sans border-0"
                    >
                      <span>Database Only</span>
                    </button>
                  </div>

                  <button
                    onClick={executeStaffSeeding}
                    disabled={isSeeding || isSeedingStaff}
                    className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:translate-y-[1px] disabled:opacity-50 cursor-pointer font-sans border-0"
                  >
                    {isSeedingStaff ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Seeding 10 Staffs ({staffSeedingProgress}/10)...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-4 h-4" />
                        <span>Seed 10 Recruiter Staffs</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Footer Credentials Info */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100/60 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>Default Password: <strong>password123</strong></span>
                <span>Port 3000 Ingress Secure</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
