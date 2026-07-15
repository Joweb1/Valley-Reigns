import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from "firebase/auth";
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  increment, 
  query, 
  orderBy, 
  onSnapshot,
  where,
  deleteDoc
} from "firebase/firestore";
import { 
  ref, 
  onValue, 
  set, 
  update, 
  push, 
  runTransaction 
} from "firebase/database";
import { auth, db, rtdb } from "./firebase";
export { auth, db, rtdb };
import { Job, UserProfile, Conversation, ChatMessage, DailyStat, SystemNotification, StaffDailyReport } from "../types";

// ==========================================
// SEED DATA FOR HIGH-FIDELITY PREVIEW
// ==========================================
const DEFAULT_JOBS: Job[] = [
  {
    id: "job-001",
    title: "Lead WhatsApp Solutions Architect",
    company: "Apex Tech Solutions",
    category: "Tech",
    salary: "$145,000 - $180,000",
    location: "Remote",
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
    salary: "$165,000 - $210,000",
    location: "San Francisco, CA",
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
    salary: "$130,000 - $160,000",
    location: "Austin, TX (Hybrid)",
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
    salary: "$175,000 - $220,000",
    location: "New York, NY",
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

const DEFAULT_CONVERSATIONS: Record<string, Conversation> = {
  "chat-101": {
    chatId: "chat-101",
    customerPhone: "+1 (555) 019-2834",
    status: "pending",
    assignedTo: null,
    assignedToName: null,
    sharedWith: ["staff-001", "staff-002", "staff-demo"],
    text: "Hello! I am highly interested in the Lead WhatsApp Solutions Architect position. Here is my profile. Reference ID: job-001",
    jobId: "job-001",
    jobTitle: "Lead WhatsApp Solutions Architect",
    createdAt: Date.now() - 3600000 * 2, // 2 hours ago (22 hours left)
    lastMessageAt: Date.now() - 3600000 * 2
  },
  "chat-102": {
    chatId: "chat-102",
    customerPhone: "+1 (555) 014-9872",
    status: "pending",
    assignedTo: null,
    assignedToName: null,
    sharedWith: ["staff-001", "staff-demo"],
    text: "Can you tell me more about the Senior AI Integration Specialist job? Reference ID: job-002",
    jobId: "job-002",
    jobTitle: "Senior AI Integration Specialist",
    createdAt: Date.now() - 3600000 * 23.5, // 23.5 hours ago (30 mins left - nearly expired!)
    lastMessageAt: Date.now() - 3600000 * 23.5
  },
  "chat-103": {
    chatId: "chat-103",
    customerPhone: "+1 (555) 012-7643",
    status: "ongoing",
    assignedTo: "staff-001",
    assignedToName: "Marcus Vance",
    sharedWith: ["staff-001", "staff-002", "staff-demo"],
    text: "Excellent! When is the team scheduling the technical deep dive? Reference ID: job-004",
    jobId: "job-004",
    jobTitle: "Staff Fintech Infrastructure Engineer",
    createdAt: Date.now() - 3600000 * 4, // 4 hours ago
    lastMessageAt: Date.now() - 3600000 * 1
  }
};

// ==========================================
// RESILIENT IN-MEMORY STORE FALLBACK
// ==========================================
// If Firebase fails or rules are denied, we use this store to guarantee that
// the AI Studio preview remains 100% interactive and fully functional.
class MemoryStorage {
  jobs: Job[] = [...DEFAULT_JOBS];
  conversations: Record<string, Conversation> = { ...DEFAULT_CONVERSATIONS };
  users: Record<string, UserProfile> = {
    "admin-seed": {
      uid: "admin-seed",
      email: "admin@valleyreigns.com",
      displayName: "Valley Reigns Admin",
      role: "admin",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app"
    },
    "staff-1-seed": {
      uid: "staff-1-seed",
      email: "staff1@valleyreigns.com",
      displayName: "Marcus Vance",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app"
    },
    "staff-2-seed": {
      uid: "staff-2-seed",
      email: "staff2@valleyreigns.com",
      displayName: "Jessica Carter",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app"
    },
    "admin-demo": {
      uid: "admin-demo",
      email: "genesisjosephoghene+admin@gmail.com",
      displayName: "Jessica Carter",
      role: "admin",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app"
    },
    "staff-demo": {
      uid: "staff-demo",
      email: "genesisjosephoghene+staff@gmail.com",
      displayName: "Marcus Vance",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app"
    },
    "seeker-demo": {
      uid: "seeker-demo",
      email: "genesisjosephoghene+seeker@gmail.com",
      displayName: "Alex Rivera",
      role: "seeker",
      canPostJobs: false,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app"
    }
  };
  staffStatuses: Record<string, "online" | "offline"> = {
    "staff-demo": "online",
    "staff-1-seed": "online",
    "staff-2-seed": "online"
  };
  currentUser: UserProfile | null = null;
  systemNotifications: SystemNotification[] = [];
  dailyReports: StaffDailyReport[] = [];
  listeners: Set<() => void> = new Set();

  constructor() {
    // Load from localStorage if available (excluding user accounts)
    const savedJobs = localStorage.getItem("vr_jobs");
    const savedConvs = localStorage.getItem("vr_conversations");
    const savedUsers = localStorage.getItem("vr_users");
    const savedNotifications = localStorage.getItem("vr_system_notifications");
    const savedReports = localStorage.getItem("vr_daily_reports");
    if (savedJobs) this.jobs = JSON.parse(savedJobs);
    if (savedConvs) this.conversations = JSON.parse(savedConvs);
    if (savedNotifications) {
      try {
        this.systemNotifications = JSON.parse(savedNotifications);
      } catch (e) {
        console.warn("Could not load system notifications from localStorage", e);
      }
    }
    if (savedUsers) {
      try {
        const parsedUsers = JSON.parse(savedUsers);
        this.users = { ...this.users, ...parsedUsers };
      } catch (e) {
        console.warn("Could not load users from localStorage", e);
      }
    }
    if (savedReports) {
      try {
        this.dailyReports = JSON.parse(savedReports);
      } catch (e) {
        console.warn("Could not load daily reports from localStorage", e);
      }
    }
  }

  save() {
    localStorage.setItem("vr_jobs", JSON.stringify(this.jobs));
    localStorage.setItem("vr_conversations", JSON.stringify(this.conversations));
    localStorage.setItem("vr_users", JSON.stringify(this.users));
    localStorage.setItem("vr_system_notifications", JSON.stringify(this.systemNotifications));
    localStorage.setItem("vr_daily_reports", JSON.stringify(this.dailyReports));
    this.listeners.forEach(l => l());
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const memoryStore = new MemoryStorage();

// ==========================================
// FIRESTORE DATABASE INITIALIZATION / SEEDING
// ==========================================
export async function initializeDatabaseSeed(): Promise<void> {
  try {
    const adminRef = doc(db, "users", "admin-seed");
    const adminSnap = await getDoc(adminRef);
    if (!adminSnap.exists() || !adminSnap.data()?.password || adminSnap.data()?.password !== "Password123") {
      await setDoc(adminRef, {
        uid: "admin-seed",
        email: "admin@valleyreigns.com",
        displayName: "Valley Reigns Admin",
        role: "admin",
        canPostJobs: true,
        password: "Password123",
        authProvider: "email"
      }, { merge: true });
    }

    const staff1Ref = doc(db, "users", "staff-1-seed");
    const staff1Snap = await getDoc(staff1Ref);
    if (!staff1Snap.exists() || !staff1Snap.data()?.password || staff1Snap.data()?.password !== "Password123") {
      await setDoc(staff1Ref, {
        uid: "staff-1-seed",
        email: "staff1@valleyreigns.com",
        displayName: "Marcus Vance",
        role: "staff",
        canPostJobs: true,
        password: "Password123",
        authProvider: "email"
      }, { merge: true });
    }

    const staff2Ref = doc(db, "users", "staff-2-seed");
    const staff2Snap = await getDoc(staff2Ref);
    if (!staff2Snap.exists() || !staff2Snap.data()?.password || staff2Snap.data()?.password !== "Password123") {
      await setDoc(staff2Ref, {
        uid: "staff-2-seed",
        email: "staff2@valleyreigns.com",
        displayName: "Jessica Carter",
        role: "staff",
        canPostJobs: true,
        password: "Password123",
        authProvider: "email"
      }, { merge: true });
    }

    // Seed staff online statuses in Firestore
    const status1Ref = doc(db, "staff_statuses", "staff-1-seed");
    const status1Snap = await getDoc(status1Ref);
    if (!status1Snap.exists()) {
      await setDoc(status1Ref, { status: "online", lastActive: Date.now() });
    }

    const status2Ref = doc(db, "staff_statuses", "staff-2-seed");
    const status2Snap = await getDoc(status2Ref);
    if (!status2Snap.exists()) {
      await setDoc(status2Ref, { status: "online", lastActive: Date.now() });
    }

    const statusDemoRef = doc(db, "staff_statuses", "staff-demo");
    const statusDemoSnap = await getDoc(statusDemoRef);
    if (!statusDemoSnap.exists()) {
      await setDoc(statusDemoRef, { status: "online", lastActive: Date.now() });
    }
  } catch (err) {
    console.warn("Could not seed users in Firestore, relying on in-memory fallback:", err);
  }
}

// ==========================================
// FIRESTORE JOB ACTIONS
// ==========================================
export async function getJobs(): Promise<Job[]> {
  // Automatically trigger database/user seeding
  await initializeDatabaseSeed();

  try {
    const collRef = collection(db, "jobs");
    const snapshot = await getDocs(collRef);
    if (snapshot.empty) {
      // Seed jobs in Firestore
      for (const job of DEFAULT_JOBS) {
        await setDoc(doc(db, "jobs", job.id), job);
      }
      return DEFAULT_JOBS;
    }
    const jobs = snapshot.docs.map(doc => doc.data() as Job);
    // Sort by creation time desc
    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn("Firestore getJobs failing, using resilient fallback:", error);
    return [...memoryStore.jobs].sort((a, b) => b.createdAt - a.createdAt);
  }
}

export async function addJob(job: Omit<Job, "id" | "impressions" | "createdAt"> & { postedByUid?: string }): Promise<Job> {
  const resolvedPostedByUid = job.postedByUid || auth.currentUser?.uid || "";
  const newJob: Job = {
    ...job,
    postedByUid: resolvedPostedByUid,
    id: `job-${Date.now()}`,
    impressions: 0,
    createdAt: Date.now()
  };

  try {
    await setDoc(doc(db, "jobs", newJob.id), newJob);
  } catch (error) {
    console.warn("Firestore addJob failing, saving in fallback:", error);
  }

  memoryStore.jobs.unshift(newJob);
  memoryStore.save();

  // Trigger system notification
  const creatorName = resolvedPostedByUid ? (memoryStore.users[resolvedPostedByUid]?.displayName || "Staff Member") : "Staff Member";
  addSystemNotification({
    type: "new_job_posted",
    title: "New Job Opening Posted",
    message: `${creatorName} listed a new job opening: "${newJob.title}" at ${newJob.company}.`,
    metadata: { jobId: newJob.id, jobTitle: newJob.title, company: newJob.company, postedByUid: resolvedPostedByUid },
    staffUid: resolvedPostedByUid
  }).catch(err => console.warn("Failed to log job post notification", err));

  return newJob;
}

let pendingJobImpressions: Record<string, number> = {};
let impressionTimeout: any = null;

export async function incrementJobImpressions(jobId: string) {
  // 1. Immediately update memory store for responsive UX
  const job = memoryStore.jobs.find(j => j.id === jobId);
  if (job) {
    job.impressions += 1;
    memoryStore.save();
  }

  // 2. Queue the increment
  pendingJobImpressions[jobId] = (pendingJobImpressions[jobId] || 0) + 1;

  // 3. Debounce/Batch updates to Firestore to protect write quotas
  if (impressionTimeout) {
    clearTimeout(impressionTimeout);
  }

  impressionTimeout = setTimeout(async () => {
    const batchToProcess = { ...pendingJobImpressions };
    pendingJobImpressions = {};
    impressionTimeout = null;

    for (const [id, count] of Object.entries(batchToProcess)) {
      try {
        const jobRef = doc(db, "jobs", id);
        await updateDoc(jobRef, {
          impressions: increment(count)
        });
      } catch (error) {
        console.warn(`Firestore increment impressions failing for ${id}:`, error);
      }
    }
  }, 1000); // 1-second batch window
}

export function subscribeToJobs(callback: (jobs: Job[]) => void) {
  try {
    const collRef = collection(db, "jobs");
    const unsubscribe = onSnapshot(collRef, (snapshot) => {
      if (!snapshot.empty) {
        const jobsList = snapshot.docs.map(doc => doc.data() as Job);
        const sorted = jobsList.sort((a, b) => b.createdAt - a.createdAt);
        // Sync local memory store
        memoryStore.jobs = sorted;
        memoryStore.save();
        callback(sorted);
      } else {
        callback([...memoryStore.jobs].sort((a, b) => b.createdAt - a.createdAt));
      }
    }, (error) => {
      console.warn("Firestore jobs collection listener failed, using local memory subscription fallback:", error);
      callback([...memoryStore.jobs].sort((a, b) => b.createdAt - a.createdAt));
    });
    return unsubscribe;
  } catch (error) {
    console.warn("Firestore subscribeToJobs failed to initialize, using memory subscription fallback:", error);
    return memoryStore.subscribe(() => {
      callback([...memoryStore.jobs].sort((a, b) => b.createdAt - a.createdAt));
    });
  }
}

// ==========================================
// FIRESTORE USER PROFILE ACTIONS
// ==========================================
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      if (!profile.messagingPreference) {
        profile.messagingPreference = "in-app";
      }
      return profile;
    }
    // Check local fallback
    const local = memoryStore.users[uid];
    if (local && !local.messagingPreference) {
      local.messagingPreference = "in-app";
    }
    return local || null;
  } catch (error) {
    console.warn("Firestore getUserProfile failing, retrieving from fallback:", error);
    const local = memoryStore.users[uid];
    if (local && !local.messagingPreference) {
      local.messagingPreference = "in-app";
    }
    return local || null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!profile.messagingPreference) {
    profile.messagingPreference = "in-app";
  }
  try {
    await setDoc(doc(db, "users", profile.uid), profile);
  } catch (error) {
    console.warn("Firestore saveUserProfile failing, saving in fallback:", error);
  }
  memoryStore.users[profile.uid] = profile;
  memoryStore.save();
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const normEmail = email.trim().toLowerCase();
  try {
    const q = query(collection(db, "users"), where("email", "==", normEmail));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const profile = snap.docs[0].data() as UserProfile;
      if (!profile.messagingPreference) {
        profile.messagingPreference = "in-app";
      }
      return profile;
    }
  } catch (error) {
    console.warn("Firestore getUserProfileByEmail failing, using fallback:", error);
  }
  // Check memory store fallback
  const fallbackUser = Object.values(memoryStore.users).find(
    u => u.email.trim().toLowerCase() === normEmail
  );
  if (fallbackUser && !fallbackUser.messagingPreference) {
    fallbackUser.messagingPreference = "in-app";
  }
  return fallbackUser || null;
}

export async function getStaffProfiles(): Promise<UserProfile[]> {
  try {
    const collRef = collection(db, "users");
    const snapshot = await getDocs(collRef);
    const users = snapshot.docs.map(doc => doc.data() as UserProfile);
    const staff = users.filter(u => u.role === "staff");
    if (staff.length > 0) return staff;
  } catch (error) {
    console.warn("Firestore getStaffProfiles failing, using fallback:");
  }
  return Object.values(memoryStore.users).filter(u => u.role === "staff");
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  try {
    const collRef = collection(db, "users");
    const snapshot = await getDocs(collRef);
    const users = snapshot.docs.map(doc => doc.data() as UserProfile);
    if (users.length > 0) return users;
  } catch (error) {
    console.warn("Firestore getAllUserProfiles failing, using fallback:", error);
  }
  return Object.values(memoryStore.users);
}

export async function getStaffStatuses(): Promise<Record<string, "online" | "offline">> {
  const statuses: Record<string, "online" | "offline"> = {};
  
  // Set memory store status as baseline
  Object.entries(memoryStore.staffStatuses).forEach(([uid, status]) => {
    statuses[uid] = status;
  });

  try {
    const collRef = collection(db, "staff_statuses");
    const snap = await getDocs(collRef);
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && data.status) {
        statuses[doc.id] = data.status;
      }
    });
  } catch (error) {
    console.warn("Firestore getStaffStatuses failed, relying on memory baseline:", error);
  }

  return statuses;
}

export async function toggleStaffJobPosting(uid: string, canPost: boolean): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { canPostJobs: canPost });
  } catch (error) {
    console.warn("Firestore toggleStaffJobPosting failing, applying locally:", error);
  }
  if (memoryStore.users[uid]) {
    memoryStore.users[uid].canPostJobs = canPost;
    memoryStore.save();
  }
}

// ==========================================
// REALTIME DATABASE CHAT ROUTING & SYNC
// ==========================================

// Helper to normalize conversation data from RTDB or Firestore
function normalizeConversation(id: string, data: any): Conversation {
  if (!data) return data;
  let messages = data.messages;
  if (messages && typeof messages === "object" && !Array.isArray(messages)) {
    // Parse RTDB map-style arrays or objects
    const keys = Object.keys(messages);
    const isNumericKeys = keys.every(k => !isNaN(Number(k)));
    if (isNumericKeys) {
      messages = Object.values(messages).sort((a: any, b: any) => (a.timestamp || 0) - (b.timestamp || 0));
    } else {
      messages = Object.values(messages);
    }
  }
  return {
    ...data,
    chatId: id || data.chatId,
    messages: messages || []
  };
}

// RTDB Helper: Set or update in Realtime Database
async function syncToRTDB(chatId: string, data: Partial<Conversation>): Promise<void> {
  if (!rtdb) return;
  try {
    const rtdbRef = ref(rtdb, `conversations/${chatId}`);
    await update(rtdbRef, data);
  } catch (error) {
    console.warn(`RTDB update failed for chat ${chatId}:`, error);
  }
}

async function writeNewToRTDB(chatId: string, data: Conversation): Promise<void> {
  if (!rtdb) return;
  try {
    const rtdbRef = ref(rtdb, `conversations/${chatId}`);
    await set(rtdbRef, data);
  } catch (error) {
    console.warn(`RTDB set failed for chat ${chatId}:`, error);
  }
}

// Staff Availability Toggle
export async function setStaffOnlineStatus(uid: string, isOnline: boolean) {
  try {
    const statusRef = doc(db, "staff_statuses", uid);
    await setDoc(statusRef, {
      status: isOnline ? "online" : "offline",
      lastActive: Date.now()
    }, { merge: true });
  } catch (error) {
    console.warn("Firestore setStaffOnlineStatus failing:", error);
  }

  // Also sync to Realtime Database
  if (rtdb) {
    try {
      const rtdbRef = ref(rtdb, `staff_statuses/${uid}`);
      await set(rtdbRef, {
        status: isOnline ? "online" : "offline",
        lastActive: Date.now()
      });
    } catch (error) {
      console.warn("RTDB setStaffOnlineStatus failing:", error);
    }
  }

  memoryStore.staffStatuses[uid] = isOnline ? "online" : "offline";
  memoryStore.save();
}

// Firestore fallback subscription helper
function subscribeToFirestoreConversations(callback: (conversations: Record<string, Conversation>) => void) {
  try {
    const collRef = collection(db, "conversations");
    return onSnapshot(collRef, (snapshot) => {
      if (!snapshot.empty) {
        const convs: Record<string, Conversation> = {};
        snapshot.docs.forEach((d) => {
          convs[d.id] = normalizeConversation(d.id, d.data());
        });
        callback(convs);
      } else {
        // Seed default conversations in Firestore if empty
        const seedPromises = Object.entries(DEFAULT_CONVERSATIONS).map(([id, conv]) => {
          const messagesArray = Array.isArray(conv.messages) 
            ? conv.messages 
            : conv.messages 
            ? Object.values(conv.messages) 
            : [{ sender: "customer" as const, text: conv.text, timestamp: conv.createdAt }];
          const firestoreConv: Conversation = {
            ...conv,
            messages: messagesArray
          };
          return setDoc(doc(db, "conversations", id), firestoreConv);
        });
        Promise.all(seedPromises).then(() => {
          callback(DEFAULT_CONVERSATIONS);
        }).catch((err) => {
          console.warn("Seeding default conversations to Firestore failed:", err);
          callback(DEFAULT_CONVERSATIONS);
        });
      }
    }, (error) => {
      console.warn("Firestore collection listener failed, falling back to local simulation:", error);
      callback(memoryStore.conversations);
    });
  } catch (error) {
    console.warn("Firestore subscribeToConversations failed, using fallback:", error);
    return memoryStore.subscribe(() => {
      callback(memoryStore.conversations);
    });
  }
}

// Listen to conversations (RTDB first with Firestore fallback)
export function subscribeToConversations(callback: (conversations: Record<string, Conversation>) => void) {
  if (rtdb) {
    try {
      const rtdbRef = ref(rtdb, "conversations");
      const unsubscribe = onValue(rtdbRef, (snapshot) => {
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          const parsed: Record<string, Conversation> = {};
          Object.entries(rawData).forEach(([id, val]) => {
            parsed[id] = normalizeConversation(id, val);
          });
          callback(parsed);
        } else {
          // If RTDB is empty, seed it with default conversations
          const initialConvs = { ...DEFAULT_CONVERSATIONS };
          Object.entries(initialConvs).forEach(([id, conv]) => {
            writeNewToRTDB(id, conv);
          });
          callback(initialConvs);
        }
      }, (error) => {
        console.warn("RTDB subscribeToConversations failed or permission denied. Falling back to Firestore:", error);
        subscribeToFirestoreConversations(callback);
      });
      return unsubscribe;
    } catch (e) {
      console.warn("RTDB subscribeToConversations threw an exception. Falling back to Firestore:", e);
    }
  }

  return subscribeToFirestoreConversations(callback);
}

// Claim a Conversation
export async function claimConversation(chatId: string, userUid: string, userName: string): Promise<boolean> {
  const systemMsg: ChatMessage = {
    sender: "system",
    text: `Chat claimed by ${userName}`,
    timestamp: Date.now()
  };

  // 1. Memory fallback state
  let currentMessages: ChatMessage[] = [];
  const localConv = memoryStore.conversations[chatId];
  if (localConv) {
    localConv.assignedTo = userUid;
    localConv.assignedToName = userName;
    localConv.status = "ongoing";
    localConv.lastMessageAt = Date.now();
    if (!localConv.messages) localConv.messages = [];
    if (Array.isArray(localConv.messages)) {
      localConv.messages.push(systemMsg);
      currentMessages = [...localConv.messages];
    } else {
      currentMessages = [...Object.values(localConv.messages), systemMsg];
      localConv.messages = currentMessages;
    }
    memoryStore.save();
  }

  let success = false;
  let seekerUid: string | undefined = localConv?.seekerUid;
  const jobTitle = localConv?.jobTitle || "your job application";

  // 2. Dual Write: Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Conversation;
      if (data.assignedTo && data.assignedTo !== userUid) {
        return false;
      }
      seekerUid = seekerUid || data.seekerUid;
      const messagesArray = Array.isArray(data.messages) ? data.messages : [];
      currentMessages = [...messagesArray, systemMsg];
      
      await updateDoc(convRef, {
        assignedTo: userUid,
        assignedToName: userName,
        status: "ongoing",
        lastMessageAt: Date.now(),
        messages: currentMessages
      });
      success = true;
    }
  } catch (error) {
    console.warn("Firestore claimConversation failed, depending on local or RTDB status:", error);
    success = true; // allow fallback
  }

  // Trigger system notification for the seeker
  if (seekerUid) {
    addSystemNotification({
      type: "conversation_claimed",
      title: "Conversation Claimed",
      message: `Your conversation for "${jobTitle}" has been claimed by ${userName}.`,
      metadata: { chatId, jobId: localConv?.jobId || "", jobTitle, staffName: userName, staffUid: userUid },
      seekerUid
    }).catch(err => console.warn("Failed to notify seeker of claimed conversation", err));
  }

  // 3. Dual Write: Realtime Database
  if (rtdb) {
    try {
      await syncToRTDB(chatId, {
        assignedTo: userUid,
        assignedToName: userName,
        status: "ongoing",
        lastMessageAt: Date.now(),
        messages: currentMessages
      });
    } catch (error) {
      console.warn("RTDB claimConversation sync failed:", error);
    }
  }

  return success;
}

// Send Chat Message
export async function sendChatMessage(chatId: string, sender: "customer" | "staff" | "system", text: string): Promise<void> {
  const newMessage: ChatMessage = {
    sender,
    text,
    timestamp: Date.now()
  };

  // 1. Memory State Fallback
  let currentMessages: ChatMessage[] = [];
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    conv.text = text;
    conv.lastMessageAt = Date.now();
    if (!conv.messages) conv.messages = [];
    if (Array.isArray(conv.messages)) {
      conv.messages.push(newMessage);
      currentMessages = [...conv.messages];
    } else {
      currentMessages = [...Object.values(conv.messages), newMessage];
      conv.messages = currentMessages;
    }
    memoryStore.save();
  }

  // 2. Dual Write: Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Conversation;
      const messagesArray = Array.isArray(data.messages) ? data.messages : [];
      currentMessages = [...messagesArray, newMessage];
      await updateDoc(convRef, {
        text: text,
        lastMessageAt: Date.now(),
        messages: currentMessages
      });
    }
  } catch (error) {
    console.warn("Firestore sendChatMessage failed, writing to fallback/RTDB:", error);
  }

  // 3. Dual Write: Realtime Database
  if (rtdb) {
    try {
      await syncToRTDB(chatId, {
        text: text,
        lastMessageAt: Date.now(),
        messages: currentMessages
      });
    } catch (error) {
      console.warn("RTDB sendChatMessage sync failed:", error);
    }
  }
}

// Update real-time typing status
export async function updateTypingStatus(chatId: string, userId: string, isTyping: boolean, userName: string): Promise<void> {
  // 1. Update memory store
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    if (!conv.typing) conv.typing = {};
    conv.typing[userId] = { isTyping, name: userName, updatedAt: Date.now() };
    memoryStore.save();
  }

  // 2. Update Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    await updateDoc(convRef, {
      [`typing.${userId}`]: { isTyping, name: userName, updatedAt: Date.now() }
    });
  } catch (err) {
    console.warn("Firestore updateTypingStatus failed:", err);
  }

  // 3. Update RTDB
  if (rtdb) {
    try {
      const rtdbRef = ref(rtdb, `conversations/${chatId}/typing/${userId}`);
      await set(rtdbRef, { isTyping, name: userName, updatedAt: Date.now() });
    } catch (err) {
      console.warn("RTDB updateTypingStatus failed:", err);
    }
  }
}

// Force reassign or release assignment (Admin utility)
export async function forceReassignConversation(chatId: string, targetStaffUid: string | null = null, targetStaffName: string | null = null): Promise<void> {
  const sysMsg: ChatMessage = {
    sender: "system",
    text: targetStaffUid 
      ? `Conversation reassigned to ${targetStaffName} by Admin.` 
      : "Conversation released back to the Available Requests queue by Admin.",
    timestamp: Date.now()
  };

  // 1. Local Fallback State
  let currentMessages: ChatMessage[] = [];
  const conv = memoryStore.conversations[chatId];
  const oldStaffUid = conv?.assignedTo || null;
  const oldStaffName = conv?.assignedToName || null;

  if (conv) {
    conv.assignedTo = targetStaffUid;
    conv.assignedToName = targetStaffName;
    conv.status = targetStaffUid ? "ongoing" : "pending";
    conv.lastMessageAt = Date.now();
    if (!conv.messages) conv.messages = [];
    if (Array.isArray(conv.messages)) {
      conv.messages.push(sysMsg);
      currentMessages = [...conv.messages];
    } else {
      currentMessages = [...Object.values(conv.messages), sysMsg];
      conv.messages = currentMessages;
    }
    memoryStore.save();

    // Trigger system notification for conversation transfer/reassignment
    if (targetStaffUid) {
      // Notify the new staff
      addSystemNotification({
        type: "transferred_conversation",
        title: "Conversation Assigned by Admin",
        message: oldStaffUid 
          ? `A conversation with ${conv.customerPhone || "Customer"} previously assigned to ${oldStaffName || "another staff member"} has been transferred to you by the Admin.`
          : `A conversation with ${conv.customerPhone || "Customer"} has been assigned to you by the Admin.`,
        metadata: { chatId, oldStaffUid, targetStaffUid },
        staffUid: targetStaffUid
      }).catch(err => console.warn("Failed to log reassignment notification", err));

      // Notify the old staff if any
      if (oldStaffUid && oldStaffUid !== targetStaffUid) {
        addSystemNotification({
          type: "transferred_conversation",
          title: "Conversation Transferred by Admin",
          message: `Your conversation with ${conv.customerPhone || "Customer"} has been transferred to ${targetStaffName} by the Admin.`,
          metadata: { chatId, oldStaffUid, targetStaffUid },
          staffUid: oldStaffUid
        }).catch(err => console.warn("Failed to log transfer notification for old staff", err));
      }
    } else if (oldStaffUid) {
      // Notify the old staff that it was released back to queue
      addSystemNotification({
        type: "transferred_conversation",
        title: "Conversation Released by Admin",
        message: `Your conversation with ${conv.customerPhone || "Customer"} has been released back to the Available Requests queue by the Admin.`,
        metadata: { chatId, oldStaffUid },
        staffUid: oldStaffUid
      }).catch(err => console.warn("Failed to log release notification for old staff", err));
    }
  }

  // 2. Dual Write: Firestore
  let seekerUid: string | undefined = conv?.seekerUid;
  const jobTitle = conv?.jobTitle || "your job application";

  try {
    const convRef = doc(db, "conversations", chatId);
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Conversation;
      seekerUid = seekerUid || data.seekerUid;
      const messagesArray = Array.isArray(data.messages) ? data.messages : [];
      currentMessages = [...messagesArray, sysMsg];
      await updateDoc(convRef, {
        assignedTo: targetStaffUid,
        assignedToName: targetStaffName,
        status: targetStaffUid ? "ongoing" : ("pending" as const),
        lastMessageAt: Date.now(),
        messages: currentMessages
      });
    }
  } catch (error) {
    console.warn("Firestore forceReassignConversation failed:", error);
  }

  // Trigger system notification for the seeker
  if (seekerUid) {
    if (targetStaffUid) {
      addSystemNotification({
        type: "conversation_transferred",
        title: "Conversation Transferred",
        message: `Your conversation for "${jobTitle}" has been transferred to recruiter ${targetStaffName}.`,
        metadata: { chatId, jobId: conv?.jobId || "", jobTitle, staffUid: targetStaffUid, staffName: targetStaffName },
        seekerUid
      }).catch(err => console.warn("Failed to notify seeker of transfer", err));
    } else {
      addSystemNotification({
        type: "conversation_transferred",
        title: "Conversation Released",
        message: `Your conversation for "${jobTitle}" has been released back to the queue. A new recruiter will claim it shortly.`,
        metadata: { chatId, jobId: conv?.jobId || "", jobTitle },
        seekerUid
      }).catch(err => console.warn("Failed to notify seeker of transfer", err));
    }
  }

  // 3. Dual Write: Realtime Database
  if (rtdb) {
    try {
      await syncToRTDB(chatId, {
        assignedTo: targetStaffUid,
        assignedToName: targetStaffName,
        status: targetStaffUid ? "ongoing" : "pending",
        lastMessageAt: Date.now(),
        messages: currentMessages
      });
    } catch (error) {
      console.warn("RTDB forceReassignConversation sync failed:", error);
    }
  }
}

// Update conversation status (e.g. finished, abandoned)
export async function updateConversationStatus(chatId: string, status: "pending" | "ongoing" | "finished" | "abandoned", isSLA: boolean = false): Promise<void> {
  const sysMsg: ChatMessage = {
    sender: "system",
    text: isSLA 
      ? `Conversation automatically marked as ABANDONED due to SLA timeout.` 
      : `Conversation status set to: ${status.toUpperCase()}`,
    timestamp: Date.now()
  };

  // 1. Memory Fallback State
  let currentMessages: ChatMessage[] = [];
  const conv = memoryStore.conversations[chatId];
  const now = Date.now();
  if (conv) {
    conv.status = status;
    if (status === "abandoned") {
      conv.abandonedAt = now;
    } else if (status === "finished") {
      conv.finishedAt = now;
    }
    if (!conv.messages) conv.messages = [];
    if (Array.isArray(conv.messages)) {
      conv.messages.push(sysMsg);
      currentMessages = [...conv.messages];
    } else {
      currentMessages = [...Object.values(conv.messages), sysMsg];
      conv.messages = currentMessages;
    }
    memoryStore.save();
  }

  // Log system notification if status is finished or abandoned
  if (!isSLA && (status === "finished" || status === "abandoned")) {
    const staffName = conv?.assignedToName || "Staff Member";
    const title = status === "finished" ? "Conversation Finished" : "Conversation Closed";
    const type = status === "finished" ? "finished_conversation" : "closed_conversation";
    addSystemNotification({
      type,
      title,
      message: `${staffName} marked conversation with ${conv?.customerPhone || "Customer"} as ${status}.`,
      metadata: { chatId, staffName, status },
      staffUid: conv?.assignedTo || undefined
    }).catch(err => console.warn("Failed to log status update notification", err));
  }

  // 2. Dual Write: Firestore
  const additionalFields: Partial<Conversation> = {};
  if (status === "abandoned") {
    additionalFields.abandonedAt = now;
  } else if (status === "finished") {
    additionalFields.finishedAt = now;
  }

  let seekerUid: string | undefined = conv?.seekerUid;

  try {
    const convRef = doc(db, "conversations", chatId);
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Conversation;
      seekerUid = seekerUid || data.seekerUid;
      const messagesArray = Array.isArray(data.messages) ? data.messages : [];
      currentMessages = [...messagesArray, sysMsg];
      await updateDoc(convRef, {
        status,
        messages: currentMessages,
        ...additionalFields
      });
    }
  } catch (error) {
    console.warn("Firestore updateConversationStatus failed:", error);
  }

  // Trigger system notification for the seeker
  if (seekerUid && (status === "finished" || status === "abandoned")) {
    const staffName = conv?.assignedToName || "Staff Member";
    const jobTitle = conv?.jobTitle || "your job application";
    const seekerNotifType = status === "finished" ? "conversation_finished" : "conversation_closed";
    const seekerNotifTitle = status === "finished" ? "Conversation Finished" : "Conversation Closed";
    const seekerNotifMsg = status === "finished" 
      ? `Your conversation for "${jobTitle}" has been finished by ${staffName}.`
      : `Your conversation for "${jobTitle}" has been closed.`;
      
    addSystemNotification({
      type: seekerNotifType,
      title: seekerNotifTitle,
      message: seekerNotifMsg,
      metadata: { chatId, jobId: conv?.jobId || "", jobTitle, status, staffName },
      seekerUid
    }).catch(err => console.warn("Failed to notify seeker of conversation close/finish", err));
  }

  // 3. Dual Write: Realtime Database
  if (rtdb) {
    try {
      await syncToRTDB(chatId, {
        status,
        messages: currentMessages,
        ...additionalFields
      });
    } catch (error) {
      console.warn("RTDB updateConversationStatus sync failed:", error);
    }
  }
}

// Automatically enforce SLA time limits for chats:
// - Unclaimed by staff within 12 hours -> marked as abandoned + admin notification
// - Unfinished within 24 hours -> marked as abandoned + admin notification
export async function checkAndEnforceSLAs(): Promise<void> {
  const now = Date.now();
  const twelveHours = 12 * 3600 * 1000;
  const twentyFourHours = 24 * 3600 * 1000;

  // Check local memoryStore
  const convs = Object.values(memoryStore.conversations);
  for (const conv of convs) {
    if (conv.status !== "pending" && conv.status !== "ongoing") continue;

    const age = now - conv.createdAt;
    let shouldAbandon = false;
    let reason = "";
    let message = "";
    let title = "";

    if (conv.status === "pending" && age > twelveHours) {
      shouldAbandon = true;
      reason = "unclaimed_12_hours";
      title = "SLA: Unclaimed Chat Abandoned";
      message = `Conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) was automatically marked as abandoned because it was not claimed by any staff within 12 hours.`;
    } else if (conv.status === "ongoing" && age > twentyFourHours) {
      shouldAbandon = true;
      reason = "unfinished_24_hours";
      title = "SLA: Unfinished Chat Abandoned";
      message = `Conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) assigned to ${conv.assignedToName || "staff"} was automatically marked as abandoned because it was not finished within 24 hours.`;
    }

    if (shouldAbandon) {
      await updateConversationStatus(conv.chatId, "abandoned", true);
      await addSystemNotification({
        type: "closed_conversation",
        title,
        message,
        metadata: { chatId: conv.chatId, customerPhone: conv.customerPhone, reason, age },
        staffUid: conv.assignedTo || undefined
      });
    }
  }

  // Check Firestore
  try {
    const collRef = collection(db, "conversations");
    const snap = await getDocs(collRef);
    for (const d of snap.docs) {
      const conv = d.data() as Conversation;
      if (conv.status !== "pending" && conv.status !== "ongoing") continue;

      const age = now - conv.createdAt;
      let shouldAbandon = false;
      let reason = "";
      let message = "";
      let title = "";

      if (conv.status === "pending" && age > twelveHours) {
        shouldAbandon = true;
        reason = "unclaimed_12_hours";
        title = "SLA: Unclaimed Chat Abandoned";
        message = `Conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) was automatically marked as abandoned because it was not claimed by any staff within 12 hours.`;
      } else if (conv.status === "ongoing" && age > twentyFourHours) {
        shouldAbandon = true;
        reason = "unfinished_24_hours";
        title = "SLA: Unfinished Chat Abandoned";
        message = `Conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) assigned to ${conv.assignedToName || "staff"} was automatically marked as abandoned because it was not finished within 24 hours.`;
      }

      if (shouldAbandon) {
        await updateConversationStatus(conv.chatId, "abandoned", true);
        await addSystemNotification({
          type: "closed_conversation",
          title,
          message,
          metadata: { chatId: conv.chatId, customerPhone: conv.customerPhone, reason, age },
          staffUid: conv.assignedTo || undefined
        });
      }
    }
  } catch (err) {
    console.warn("Firestore SLA check failed (usually harmless if offline):", err);
  }

  // Run periodic automated pruning for abandoned and finished conversations
  try {
    await pruneExpiredConversations();
  } catch (err) {
    console.warn("Periodic conversation pruning failed:", err);
  }
}

// Automatically prune finished and abandoned conversations based on the following rules:
// - Abandoned conversations -> delete after 24 hours of being abandoned
// - Finished conversations -> delete after 1 month (30 days) of being finished
export async function pruneExpiredConversations(): Promise<void> {
  const now = Date.now();
  const oneDay = 24 * 3600 * 1000;
  const thirtyDays = 30 * 24 * 3600 * 1000;

  // 1. Process local memoryStore
  const localConvs = Object.values(memoryStore.conversations);
  const localChatsToDelete: string[] = [];

  for (const conv of localConvs) {
    if (conv.status === "abandoned") {
      const abandonedTime = conv.abandonedAt || conv.lastMessageAt || conv.createdAt;
      if (now - abandonedTime > oneDay) {
        localChatsToDelete.push(conv.chatId);
      }
    } else if (conv.status === "finished") {
      const finishedTime = conv.finishedAt || conv.lastMessageAt || conv.createdAt;
      if (now - finishedTime > thirtyDays) {
        localChatsToDelete.push(conv.chatId);
      }
    }
  }

  for (const chatId of localChatsToDelete) {
    delete memoryStore.conversations[chatId];
  }
  if (localChatsToDelete.length > 0) {
    memoryStore.save();
    console.log(`Pruned ${localChatsToDelete.length} conversations from local memoryStore.`);
  }

  // 2. Process Firestore
  try {
    const collRef = collection(db, "conversations");
    const snap = await getDocs(collRef);
    for (const d of snap.docs) {
      const conv = d.data() as Conversation;
      let shouldDelete = false;

      if (conv.status === "abandoned") {
        const abandonedTime = conv.abandonedAt || conv.lastMessageAt || conv.createdAt;
        if (now - abandonedTime > oneDay) {
          shouldDelete = true;
        }
      } else if (conv.status === "finished") {
        const finishedTime = conv.finishedAt || conv.lastMessageAt || conv.createdAt;
        if (now - finishedTime > thirtyDays) {
          shouldDelete = true;
        }
      }

      if (shouldDelete) {
        // Delete document from Firestore
        await deleteDoc(d.ref);
        console.log(`Pruned expired conversation ${conv.chatId} (${conv.status}) from Firestore.`);

        // Delete from Realtime Database (rtdb) if active
        if (rtdb) {
          try {
            const rtdbRef = ref(rtdb, `conversations/${conv.chatId}`);
            await set(rtdbRef, null);
          } catch (error) {
            console.warn(`RTDB delete for ${conv.chatId} failed inside pruneExpiredConversations:`, error);
          }
        }
      }
    }
  } catch (err) {
    console.warn("Firestore pruneExpiredConversations failed:", err);
  }
}

// Clear conversation messages
export async function clearConversationMessages(chatId: string): Promise<void> {
  const sysMsg: ChatMessage = {
    sender: "system",
    text: "Conversation history cleared.",
    timestamp: Date.now()
  };
  
  // Update memory store
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    conv.messages = [sysMsg];
    conv.text = "Conversation history cleared.";
    memoryStore.save();
  }

  // Update Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    await updateDoc(convRef, {
      messages: [sysMsg],
      text: "Conversation history cleared.",
      lastMessageAt: Date.now()
    });
  } catch (err) {
    console.warn("Firestore clear messages failed:", err);
  }

  // Update RTDB
  if (rtdb) {
    try {
      await syncToRTDB(chatId, {
        messages: [sysMsg],
        text: "Conversation history cleared.",
        lastMessageAt: Date.now()
      });
    } catch (err) {
      console.warn("RTDB clear messages failed:", err);
    }
  }
}

// Report conversation
export async function reportConversation(chatId: string, reason: string): Promise<void> {
  const sysMsg: ChatMessage = {
    sender: "system",
    text: `Conversation reported. Reason: ${reason}`,
    timestamp: Date.now()
  };

  // Memory store update
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    conv.isReported = true;
    if (!conv.messages) {
      conv.messages = [];
    }
    if (Array.isArray(conv.messages)) {
      conv.messages.push(sysMsg);
    } else {
      conv.messages = [...Object.values(conv.messages), sysMsg];
    }
    memoryStore.save();
  }

  // Trigger system notification for reported conversation
  const staffName = conv?.assignedToName || "Staff Member";
  addSystemNotification({
    type: "reported_conversation",
    title: "Conversation Reported",
    message: `${staffName} reported conversation with ${conv?.customerPhone || "Customer"}. Reason: ${reason}`,
    metadata: { chatId, staffName, reason },
    staffUid: conv?.assignedTo || undefined
  }).catch(err => console.warn("Failed to log report notification", err));

  // Update Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    await updateDoc(convRef, {
      isReported: true,
      messages: conv ? (Array.isArray(conv.messages) ? conv.messages : [sysMsg]) : [sysMsg]
    });
  } catch (err) {
    console.warn("Firestore report conversation failed:", err);
  }

  // Update RTDB
  if (rtdb) {
    try {
      await syncToRTDB(chatId, {
        isReported: true,
        messages: conv ? (Array.isArray(conv.messages) ? conv.messages : [sysMsg]) : [sysMsg]
      });
    } catch (err) {
      console.warn("RTDB report conversation failed:", err);
    }
  }
}

// Webhook simulation / customer message generator
export async function simulateIncomingChat(customerPhone: string, text: string, jobId: string, jobTitle: string, seekerUid?: string): Promise<string> {
  const chatId = `chat-${Date.now()}`;
  const initialMessage: ChatMessage = {
    sender: "customer",
    text,
    timestamp: Date.now()
  };

  // --- Dynamic Chat Routing Logic ---
  // 1. Get all staff profiles
  const staff = await getStaffProfiles();

  // 2. Get their online statuses
  const statuses = await getStaffStatuses();

  // 3. Count active (ongoing) chats currently assigned to each staff member
  let conversationsList: Conversation[] = [];
  try {
    const collRef = collection(db, "conversations");
    const snap = await getDocs(collRef);
    conversationsList = snap.docs.map(doc => doc.data() as Conversation);
  } catch (error) {
    console.warn("Firestore get conversations for routing failed, using memory fallback:", error);
    conversationsList = Object.values(memoryStore.conversations);
  }

  const activeChatsCount: Record<string, number> = {};
  conversationsList.forEach((c) => {
    if (c.status === "ongoing" && c.assignedTo) {
      activeChatsCount[c.assignedTo] = (activeChatsCount[c.assignedTo] || 0) + 1;
    }
  });

  // 4. Categorize all staff profiles by online status and busy state (busy is activeCount >= 2)
  const sortedStaff = [...staff].sort((a, b) => {
    const countA = activeChatsCount[a.uid] || 0;
    const countB = activeChatsCount[b.uid] || 0;
    return countA - countB;
  });

  const onlineNotBusy: UserProfile[] = [];
  const offlineNotBusy: UserProfile[] = [];
  const onlineBusy: UserProfile[] = [];
  const offlineBusy: UserProfile[] = [];

  sortedStaff.forEach((s) => {
    const isOnline = (statuses[s.uid] || memoryStore.staffStatuses[s.uid]) === "online";
    const activeCount = activeChatsCount[s.uid] || 0;
    const isBusy = activeCount >= 2;

    if (isOnline) {
      if (!isBusy) onlineNotBusy.push(s);
      else onlineBusy.push(s);
    } else {
      if (!isBusy) offlineNotBusy.push(s);
      else offlineBusy.push(s);
    }
  });

  let selectedStaff: UserProfile[] = [];
  let assignedToOffline = false;

  if (onlineNotBusy.length > 0) {
    // Case A: At least one online staff member is not busy.
    // Target is exactly 5 staff. Prioritize online, then fill with offline available, then online busy, then offline busy.
    selectedStaff = [...onlineNotBusy];

    if (selectedStaff.length < 5) {
      const remainingNeeded = 5 - selectedStaff.length;
      const offlineToTake = offlineNotBusy.slice(0, remainingNeeded);
      selectedStaff.push(...offlineToTake);
      if (offlineToTake.length > 0) {
        assignedToOffline = true;
      }
    }

    if (selectedStaff.length < 5) {
      const remainingNeeded = 5 - selectedStaff.length;
      selectedStaff.push(...onlineBusy.slice(0, remainingNeeded));
    }

    if (selectedStaff.length < 5) {
      const remainingNeeded = 5 - selectedStaff.length;
      const offlineBusyToTake = offlineBusy.slice(0, remainingNeeded);
      selectedStaff.push(...offlineBusyToTake);
      if (offlineBusyToTake.length > 0) {
        assignedToOffline = true;
      }
    }
    // Crop to 5 max
    selectedStaff = selectedStaff.slice(0, 5);
  } else {
    // Case B: ALL online staff are busy (or there are no online staff).
    // "assign the conversation to 5 online busy staffs and 5 offline available staff, making 10"
    const busyOnlineToTake = onlineBusy.slice(0, 5);
    const offlineAvailableToTake = offlineNotBusy.slice(0, 5);

    selectedStaff = [...busyOnlineToTake, ...offlineAvailableToTake];
    if (offlineAvailableToTake.length > 0) {
      assignedToOffline = true;
    }
  }

  const selectedStaffUids = selectedStaff.map(s => s.uid);
  const actualSeekerUid = seekerUid || auth.currentUser?.uid || undefined;

  const conversation: Conversation = {
    chatId,
    customerPhone,
    status: "pending",
    assignedTo: null,
    assignedToName: null,
    sharedWith: selectedStaffUids,
    text,
    jobId,
    jobTitle,
    createdAt: Date.now(),
    lastMessageAt: Date.now(),
    messages: [initialMessage],
    assignedToOffline,
    seekerUid: actualSeekerUid
  };

  // 1. Memory Fallback State
  memoryStore.conversations[chatId] = conversation;
  memoryStore.save();

  if (assignedToOffline) {
    addSystemNotification({
      type: "offline_routing",
      title: "Offline Routing Warning",
      message: `No online staff available. Conversation for ${customerPhone} (Job: ${jobTitle}) has been routed to offline staff.`,
      metadata: { chatId, customerPhone, jobId, jobTitle }
    }).catch(err => console.warn("offline routing warning logging failed", err));
  }

  // Trigger seeker notification
  if (actualSeekerUid) {
    addSystemNotification({
      type: "conversation_started",
      title: "Conversation Started",
      message: `You started a conversation for "${jobTitle}". Staff will reply soon!`,
      metadata: { chatId, customerPhone, jobId, jobTitle },
      seekerUid: actualSeekerUid
    }).catch(err => console.warn("failed to log conversation started for seeker " + actualSeekerUid, err));
  }

  // Trigger staff-specific notifications for awaiting claim
  selectedStaffUids.forEach(uid => {
    addSystemNotification({
      type: "awaiting_claim",
      title: "New Chat Awaiting Claim",
      message: `A new inquiry from ${customerPhone} for "${jobTitle}" is awaiting your claim.`,
      metadata: { chatId, customerPhone, jobId, jobTitle },
      staffUid: uid
    }).catch(err => console.warn("failed to log awaiting claim notification for staff " + uid, err));
  });

  // 2. Dual Write: Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    await setDoc(convRef, conversation);
  } catch (error) {
    console.warn("Firestore simulateIncomingChat failed:", error);
  }

  // 3. Dual Write: Realtime Database
  if (rtdb) {
    try {
      await writeNewToRTDB(chatId, conversation);
    } catch (error) {
      console.warn("RTDB simulateIncomingChat sync failed:", error);
    }
  }

  return chatId;
}

// ==========================================
// DAILY STATS SEEDING & FETCHING (ADMIN CHART)
// ==========================================
export async function getDailyStats(): Promise<DailyStat[]> {
  try {
    const collRef = collection(db, "daily_stats");
    const snapshot = await getDocs(collRef);
    if (snapshot.empty) {
      console.log("Seeding daily_stats collection in Firestore starting June 20th, 2026...");
      const seeded = generateMockDailyStats();
      for (const stat of seeded) {
        await setDoc(doc(db, "daily_stats", stat.id), stat);
      }
      return seeded;
    }
    const stats = snapshot.docs.map(doc => doc.data() as DailyStat);
    return stats.sort((a, b) => a.timestamp - b.timestamp);
  } catch (error) {
    console.warn("Firestore getDailyStats failing, using resilient fallback:", error);
    return generateMockDailyStats();
  }
}

export function generateMockDailyStats(): DailyStat[] {
  const stats: DailyStat[] = [];
  
  // Historical Yearly Representative Points
  const historicalYearly = [
    { date: "2022-06-15", impressions: 4500, sent: 1200, claimed: 1100, finished: 950, abandoned: 150 },
    { date: "2023-06-15", impressions: 5800, sent: 1600, claimed: 1500, finished: 1350, abandoned: 130 },
    { date: "2024-06-15", impressions: 7200, sent: 2100, claimed: 1950, finished: 1800, abandoned: 120 },
    { date: "2025-06-15", impressions: 9500, sent: 2900, claimed: 2800, finished: 2600, abandoned: 180 },
  ];
  
  historicalYearly.forEach(item => {
    stats.push({
      id: item.date,
      date: item.date,
      impressions: item.impressions,
      sent: item.sent,
      claimed: item.claimed,
      finished: item.finished,
      abandoned: item.abandoned,
      timestamp: new Date(item.date + "T00:00:00Z").getTime()
    });
  });

  // Historical Monthly Representative Points for 2026
  const historicalMonthly = [
    { date: "2026-01-15", impressions: 1200, sent: 350, claimed: 320, finished: 290, abandoned: 25 },
    { date: "2026-02-15", impressions: 1350, sent: 400, claimed: 380, finished: 340, abandoned: 30 },
    { date: "2026-03-15", impressions: 1500, sent: 460, claimed: 430, finished: 390, abandoned: 35 },
    { date: "2026-04-15", impressions: 1650, sent: 510, claimed: 480, finished: 440, abandoned: 35 },
    { date: "2026-05-15", impressions: 1800, sent: 580, claimed: 550, finished: 510, abandoned: 38 },
  ];

  historicalMonthly.forEach(item => {
    stats.push({
      id: item.date,
      date: item.date,
      impressions: item.impressions,
      sent: item.sent,
      claimed: item.claimed,
      finished: item.finished,
      abandoned: item.abandoned,
      timestamp: new Date(item.date + "T00:00:00Z").getTime()
    });
  });

  const startDate = new Date("2026-06-20T00:00:00Z");
  const endDate = new Date("2026-07-25T00:00:00Z"); // fixed span of ~36 days
  
  let current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    
    // Deterministic mock generation based on day index
    const dayIndex = Math.floor((current.getTime() - startDate.getTime()) / (3600000 * 24));
    
    // Generate beautiful trends
    const impressions = 150 + Math.floor(Math.sin(dayIndex / 5) * 40) + (dayIndex * 3) + (dayIndex % 7 * 15);
    const sent = 15 + Math.floor(Math.sin(dayIndex / 4) * 5) + Math.floor(dayIndex / 2) + (dayIndex % 3 * 3);
    const claimed = Math.max(0, sent - 3 - (dayIndex % 4));
    const finished = Math.max(0, claimed - 2 - (dayIndex % 3));
    const abandoned = Math.max(0, sent - claimed - 1 + (dayIndex % 2));

    stats.push({
      id: dateStr,
      date: dateStr,
      impressions,
      sent,
      claimed,
      finished,
      abandoned,
      timestamp: current.getTime()
    });
    
    current.setDate(current.getDate() + 1);
  }
  return stats;
}

// ==========================================
// SYSTEM NOTIFICATION ACTIONS
// ==========================================
export async function addSystemNotification(notification: Omit<SystemNotification, "id" | "timestamp" | "read">): Promise<SystemNotification> {
  const newNotification: SystemNotification = {
    ...notification,
    id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp: Date.now(),
    read: false
  };

  try {
    await setDoc(doc(db, "system_notifications", newNotification.id), newNotification);
  } catch (error) {
    console.warn("Firestore addSystemNotification failing, saving in fallback:", error);
  }

  if (!memoryStore.systemNotifications) {
    memoryStore.systemNotifications = [];
  }
  memoryStore.systemNotifications.unshift(newNotification);
  memoryStore.save();
  return newNotification;
}

export async function getSystemNotifications(): Promise<SystemNotification[]> {
  try {
    const collRef = collection(db, "system_notifications");
    const snapshot = await getDocs(collRef);
    if (!snapshot.empty) {
      const list = snapshot.docs.map(doc => doc.data() as SystemNotification);
      return list.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (error) {
    console.warn("Firestore getSystemNotifications failing, using fallback:", error);
  }

  if (!memoryStore.systemNotifications) {
    memoryStore.systemNotifications = [];
  }
  return [...memoryStore.systemNotifications].sort((a, b) => b.timestamp - a.timestamp);
}

// Real-time subscription for system notifications
export function subscribeToSystemNotifications(callback: (notifications: SystemNotification[]) => void) {
  try {
    const collRef = collection(db, "system_notifications");
    const q = query(collRef, orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => doc.data() as SystemNotification);
      callback(list);
    }, (error) => {
      console.warn("Firestore subscribeToSystemNotifications failed, falling back to local memory:", error);
      callback(memoryStore.systemNotifications || []);
    });
    return unsubscribe;
  } catch (error) {
    console.warn("Firestore subscribeToSystemNotifications failed to initialize, using memory subscription:", error);
    return memoryStore.subscribe(() => {
      callback(memoryStore.systemNotifications || []);
    });
  }
}

export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    const docRef = doc(db, "system_notifications", id);
    await updateDoc(docRef, { read: true });
  } catch (error) {
    console.warn("Firestore markNotificationAsRead failed:", error);
  }

  if (memoryStore.systemNotifications) {
    memoryStore.systemNotifications = memoryStore.systemNotifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    memoryStore.save();
  }
}

// ==========================================
// FIRESTORE JOB MUTATIONS (EDIT/DELETE)
// ==========================================
export async function updateJob(jobId: string, updatedFields: Partial<Job>, actorUid?: string): Promise<void> {
  try {
    const docRef = doc(db, "jobs", jobId);
    await updateDoc(docRef, updatedFields);
  } catch (error) {
    console.warn("Firestore updateJob failing, updating in fallback:", error);
  }

  const index = memoryStore.jobs.findIndex(j => j.id === jobId);
  if (index !== -1) {
    memoryStore.jobs[index] = { ...memoryStore.jobs[index], ...updatedFields };
    memoryStore.save();
  }

  const actorName = actorUid ? (memoryStore.users[actorUid]?.displayName || "Staff") : "Staff";
  const jobTitle = updatedFields.title || memoryStore.jobs[index]?.title || "Unknown Job";
  await addSystemNotification({
    type: "job_updated",
    title: "Job Listing Updated",
    message: `${actorName} updated the details of "${jobTitle}" job listing.`,
    metadata: { jobId, updatedFields, actorUid }
  });
}

export async function deleteJob(jobId: string, actorUid?: string): Promise<void> {
  const targetJob = memoryStore.jobs.find(j => j.id === jobId);
  const jobTitle = targetJob?.title || "Unknown Job";

  try {
    const docRef = doc(db, "jobs", jobId);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn("Firestore deleteJob failing:", error);
  }

  // Delete related conversations in memoryStore
  const relatedChats: string[] = [];
  Object.entries(memoryStore.conversations).forEach(([chatId, conv]) => {
    if (conv.jobId === jobId) {
      relatedChats.push(chatId);
      delete memoryStore.conversations[chatId];
    }
  });
  memoryStore.save();

  // Delete related conversations in Firestore
  try {
    const convColl = collection(db, "conversations");
    const q = query(convColl, where("jobId", "==", jobId));
    const snap = await getDocs(q);
    const deletePromises = snap.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    console.warn("Firestore delete related conversations failing:", error);
  }

  // Delete related conversations in Realtime Database (rtdb)
  if (rtdb) {
    try {
      const deletePromises = relatedChats.map(chatId => {
        const rtdbRef = ref(rtdb, `conversations/${chatId}`);
        return set(rtdbRef, null);
      });
      await Promise.all(deletePromises);
    } catch (error) {
      console.warn("RTDB delete related conversations failing:", error);
    }
  }

  memoryStore.jobs = memoryStore.jobs.filter(j => j.id !== jobId);
  memoryStore.save();

  const actorName = actorUid ? (memoryStore.users[actorUid]?.displayName || "Staff") : "Staff";
  await addSystemNotification({
    type: "job_deleted",
    title: "Job Listing Deleted",
    message: `${actorName} deleted the job listing: "${jobTitle}".`,
    metadata: { jobId, jobTitle, actorUid }
  });
}

// ==========================================
// STAFF DAILY REPORTS SERVICES
// ==========================================

export function generateMockDailyReports(): StaffDailyReport[] {
  return [
    {
      id: "rep-001",
      uid: "staff-1-seed",
      staffName: "Marcus Vance",
      date: "2026-07-06",
      timestamp: Date.now() - 3600000 * 24, // 1 day ago
      newReachOuts: 23,
      resumptions: 2,
      cvsCollected: 3,
      candidatesRegistered: 5,
      addressesGiven: 4,
      commissionRetrieved: "$150",
      flyersMade: 12,
      videosMade: 2,
      jobsGotten: 1,
      newJobsGottenClientRelations: "PostgreSQL Database Admin, Senior Flutter Dev",
      challenges: "Multiple candidates had network issues during interview sessions.",
      plansTomorrow: "Follow up on the 5 registered candidates and pitch to Apex Tech.",
      chatsClearedConfirmed: true,
      chatsClearedProofUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
      targetReachOutsMet: true,
      targetAddressesMet: true,
      targetOnTimeMet: true
    },
    {
      id: "rep-002",
      uid: "staff-2-seed",
      staffName: "Jessica Carter",
      date: "2026-07-06",
      timestamp: Date.now() - 3600000 * 23, // Yesterday, slightly later
      newReachOuts: 18, // Target 20 unmet
      resumptions: 0,
      cvsCollected: 1,
      candidatesRegistered: 2,
      addressesGiven: 5, // Target 4 met
      commissionRetrieved: "None",
      flyersMade: 5,
      videosMade: 0,
      jobsGotten: 0,
      newJobsGottenClientRelations: "None",
      challenges: "Low candidate response rate on cold calls.",
      plansTomorrow: "Increase outreach volume to exceed 20 target.",
      chatsClearedConfirmed: true,
      chatsClearedProofUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
      targetReachOutsMet: false,
      targetAddressesMet: true,
      targetOnTimeMet: true
    },
    {
      id: "rep-003",
      uid: "staff-demo",
      staffName: "Marcus Vance",
      date: "2026-07-07",
      timestamp: Date.now() - 3600000 * 3, // Submitted 3 hours ago
      newReachOuts: 31,
      resumptions: 2,
      cvsCollected: 1,
      candidatesRegistered: 3,
      addressesGiven: 3, // Target 4 unmet
      commissionRetrieved: "N50,000",
      flyersMade: 25,
      videosMade: 3,
      jobsGotten: 2,
      newJobsGottenClientRelations: "Recruitment lead signed with Valley Reigns",
      challenges: "Heavy rain reduced walk-in candidates.",
      plansTomorrow: "Focus on resume screening and dispatching client addresses.",
      chatsClearedConfirmed: true,
      chatsClearedProofUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80",
      targetReachOutsMet: true,
      targetAddressesMet: false,
      targetOnTimeMet: true
    }
  ];
}

export async function submitDailyReport(reportData: Omit<StaffDailyReport, "id" | "timestamp">): Promise<void> {
  const existingIndex = memoryStore.dailyReports.findIndex(
    r => r.uid === reportData.uid && r.date === reportData.date
  );

  let id: string;
  let timestamp: number;

  if (existingIndex !== -1) {
    id = memoryStore.dailyReports[existingIndex].id;
    timestamp = Date.now();
  } else {
    id = `report-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    timestamp = Date.now();
  }

  const report: StaffDailyReport = {
    ...reportData,
    id,
    timestamp
  };

  if (existingIndex !== -1) {
    memoryStore.dailyReports[existingIndex] = report;
  } else {
    memoryStore.dailyReports = [report, ...memoryStore.dailyReports];
  }
  memoryStore.save();

  // Try saving to Firestore
  try {
    const reportRef = doc(db, "daily_reports", id);
    await setDoc(reportRef, report);
  } catch (error) {
    console.warn("Firestore submitDailyReport failed, operating in memory-only cache:", error);
  }

  // Create a system notification to alert admins
  await addSystemNotification({
    type: "report_submitted",
    title: existingIndex !== -1 ? "Daily Report Edited" : "Daily Report Submitted",
    message: existingIndex !== -1 
      ? `⚠️ ${reportData.staffName} edited their previously submitted daily report for ${reportData.date}.`
      : `${reportData.staffName} submitted a new daily report for ${reportData.date}.`,
    metadata: { reportId: id, staffName: reportData.staffName, date: reportData.date, edited: existingIndex !== -1 },
    staffUid: reportData.uid
  }).catch(err => console.warn("Failed to log report system notification", err));
}

export async function getDailyReports(): Promise<StaffDailyReport[]> {
  try {
    const collRef = collection(db, "daily_reports");
    const snapshot = await getDocs(collRef);
    if (snapshot.empty) {
      const mockReports = generateMockDailyReports();
      memoryStore.dailyReports = mockReports;
      memoryStore.save();
      for (const rep of mockReports) {
        await setDoc(doc(db, "daily_reports", rep.id), rep).catch(() => {});
      }
      return mockReports;
    }
    const reports = snapshot.docs.map(doc => doc.data() as StaffDailyReport);
    // Sort descending by timestamp
    const sorted = reports.sort((a, b) => b.timestamp - a.timestamp);
    memoryStore.dailyReports = sorted;
    memoryStore.save();
    return sorted;
  } catch (error) {
    console.warn("Firestore getDailyReports failed, using local memoryStore cache:", error);
    if (memoryStore.dailyReports.length === 0) {
      memoryStore.dailyReports = generateMockDailyReports();
      memoryStore.save();
    }
    return memoryStore.dailyReports.sort((a, b) => b.timestamp - a.timestamp);
  }
}

export function subscribeToDailyReports(callback: (reports: StaffDailyReport[]) => void): () => void {
  // First emit memory cached reports
  if (memoryStore.dailyReports.length === 0) {
    getDailyReports().then(reports => callback(reports)).catch(() => {});
  } else {
    callback(memoryStore.dailyReports.sort((a, b) => b.timestamp - a.timestamp));
  }

  const collRef = collection(db, "daily_reports");
  
  const unsubscribeFirestore = onSnapshot(
    collRef,
    (snapshot) => {
      if (snapshot.empty) {
        // Fallback to seeded mock if Firestore is empty
        if (memoryStore.dailyReports.length === 0) {
          const seeded = generateMockDailyReports();
          memoryStore.dailyReports = seeded;
          memoryStore.save();
          callback(seeded);
        } else {
          callback(memoryStore.dailyReports.sort((a, b) => b.timestamp - a.timestamp));
        }
        return;
      }
      const reports = snapshot.docs.map(doc => doc.data() as StaffDailyReport);
      const sorted = reports.sort((a, b) => b.timestamp - a.timestamp);
      memoryStore.dailyReports = sorted;
      memoryStore.save();
      callback(sorted);
    },
    (error) => {
      console.warn("subscribeToDailyReports Firestore snapshot subscription failed:", error);
    }
  );

  const unsubscribeMemory = memoryStore.subscribe(() => {
    callback(memoryStore.dailyReports.sort((a, b) => b.timestamp - a.timestamp));
  });

  return () => {
    unsubscribeFirestore();
    unsubscribeMemory();
  };
}



