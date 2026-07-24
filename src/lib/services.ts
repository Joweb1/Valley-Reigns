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
import { Job, UserProfile, Conversation, ChatMessage, DailyStat, SystemNotification, StaffDailyReport, CustomerContact } from "../types";
import { SEEDED_JOBS_LIST } from "./defaultJobs";

// ==========================================
// SEED DATA FOR HIGH-FIDELITY PREVIEW
// ==========================================
const DEFAULT_JOBS: Job[] = SEEDED_JOBS_LIST;

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
  contacts: Record<string, CustomerContact> = {};
  listeners: Set<() => void> = new Set();

  constructor() {
    // Load from localStorage if available (excluding user accounts)
    const savedJobs = localStorage.getItem("vr_jobs");
    const savedConvs = localStorage.getItem("vr_conversations");
    const savedUsers = localStorage.getItem("vr_users");
    const savedNotifications = localStorage.getItem("vr_system_notifications");
    const savedReports = localStorage.getItem("vr_daily_reports");
    const savedContacts = localStorage.getItem("vr_contacts");
    if (savedJobs) {
      try {
        const parsed = JSON.parse(savedJobs);
        const existingIds = new Set(parsed.map((j: any) => j.id));
        let mergedAny = false;
        for (const job of DEFAULT_JOBS) {
          if (!existingIds.has(job.id)) {
            parsed.push(job);
            mergedAny = true;
          }
        }
        this.jobs = parsed;
        if (mergedAny) {
          localStorage.setItem("vr_jobs", JSON.stringify(this.jobs));
        }
      } catch (e) {
        console.warn("Error parsing saved jobs, using defaults:", e);
        this.jobs = [...DEFAULT_JOBS];
      }
    }
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
    if (savedContacts) {
      try {
        this.contacts = JSON.parse(savedContacts);
      } catch (e) {
        console.warn("Could not load contacts from localStorage", e);
      }
    }
  }

  save() {
    localStorage.setItem("vr_jobs", JSON.stringify(this.jobs));
    localStorage.setItem("vr_conversations", JSON.stringify(this.conversations));
    localStorage.setItem("vr_users", JSON.stringify(this.users));
    localStorage.setItem("vr_system_notifications", JSON.stringify(this.systemNotifications));
    localStorage.setItem("vr_daily_reports", JSON.stringify(this.dailyReports));
    localStorage.setItem("vr_contacts", JSON.stringify(this.contacts));
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
    
    const jobs = snapshot.docs.map(doc => doc.data() as Job);
    const existingIds = new Set(jobs.map(j => j.id));
    let seededAny = false;
    
    for (const job of DEFAULT_JOBS) {
      if (!existingIds.has(job.id)) {
        await setDoc(doc(db, "jobs", job.id), job);
        jobs.push(job);
        seededAny = true;
      }
    }
    
    if (seededAny) {
      memoryStore.jobs = [...jobs];
      memoryStore.save();
    }
    
    // Sort by creation time desc
    return jobs.sort((a, b) => b.createdAt - a.createdAt);
  } catch (error) {
    console.warn("Firestore getJobs failing, using resilient fallback:", error);
    const localJobs = [...memoryStore.jobs];
    const localIds = new Set(localJobs.map(j => j.id));
    let localSeededAny = false;
    
    for (const job of DEFAULT_JOBS) {
      if (!localIds.has(job.id)) {
        localJobs.push(job);
        localSeededAny = true;
      }
    }
    
    if (localSeededAny) {
      memoryStore.jobs = localJobs;
      memoryStore.save();
    }
    
    return localJobs.sort((a, b) => b.createdAt - a.createdAt);
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
    const staff = users.filter(u => u.role === "staff" || u.role === "admin");
    if (staff.length > 0) return staff;
  } catch (error) {
    console.warn("Firestore getStaffProfiles failing, using fallback:");
  }
  return Object.values(memoryStore.users).filter(u => u.role === "staff" || u.role === "admin");
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

  let finalMessages: ChatMessage[] = Array.isArray(messages) ? messages : [];

  // Fallback: If messages list is empty but top-level text is present, construct initial message
  if (finalMessages.length === 0 && data.text) {
    finalMessages = [{
      sender: data.sender || "customer",
      text: data.text,
      timestamp: data.createdAt || data.lastMessageAt || Date.now()
    }];
  }

  return {
    ...data,
    chatId: id || data.chatId,
    messages: finalMessages
  };
}

// RTDB Helper: Set or update in Realtime Database
async function syncToRTDB(chatId: string, data: Partial<Conversation>): Promise<void> {
  if (!rtdb) return;
  try {
    const authUid = auth?.currentUser?.uid || memoryStore.currentUser?.uid || chatId;
    const authEmail = auth?.currentUser?.email || memoryStore.currentUser?.email || "user@valleyreigns.com";
    const sessionToken = "session_" + (authUid || chatId);

    const rtdbRef = ref(rtdb, `conversations/${chatId}`);
    await update(rtdbRef, {
      uid: authUid,
      email: authEmail,
      sessionToken,
      sender: "system",
      ...data
    });
  } catch (error) {
    console.warn(`RTDB update failed for chat ${chatId}:`, error);
  }
}

async function writeNewToRTDB(chatId: string, data: Conversation): Promise<void> {
  if (!rtdb) return;
  try {
    const authUid = auth?.currentUser?.uid || memoryStore.currentUser?.uid || chatId;
    const authEmail = auth?.currentUser?.email || memoryStore.currentUser?.email || data.customerPhone || "user@valleyreigns.com";
    const sessionToken = "session_" + (authUid || chatId);

    const rtdbRef = ref(rtdb, `conversations/${chatId}`);
    await set(rtdbRef, {
      uid: authUid,
      email: authEmail,
      sessionToken,
      sender: "customer",
      ...data
    });
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

  // Also sync to Realtime Database with auth identifier fields
  if (rtdb) {
    try {
      const authEmail = auth?.currentUser?.email || memoryStore.users[uid]?.email || `${uid}@valleyreigns.com`;
      const rtdbRef = ref(rtdb, `staff_statuses/${uid}`);
      await set(rtdbRef, {
        uid,
        email: authEmail,
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

// Merge two conversation states for dual-query deduplication
export function mergeConversations(c1: Conversation, c2: Conversation): Conversation {
  const time1 = c1.lastMessageAt || c1.createdAt || 0;
  const time2 = c2.lastMessageAt || c2.createdAt || 0;
  const primary = time1 >= time2 ? c1 : c2;
  const secondary = primary === c1 ? c2 : c1;

  const msgs1 = Array.isArray(c1.messages)
    ? c1.messages
    : c1.messages
    ? (Object.values(c1.messages) as ChatMessage[])
    : [];
  const msgs2 = Array.isArray(c2.messages)
    ? c2.messages
    : c2.messages
    ? (Object.values(c2.messages) as ChatMessage[])
    : [];

  const combinedMsgs = [...msgs1, ...msgs2];
  const uniqueMap = new Map<string, ChatMessage>();

  combinedMsgs.forEach((m) => {
    const key = `${m.timestamp || 0}_${m.sender || "system"}_${(m.text || "").trim()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, m);
    }
  });

  const mergedMessages = Array.from(uniqueMap.values()).sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );

  const mergedStatus = primary.status || secondary.status || "pending";
  let mergedAssignedTo = primary.assignedTo !== undefined ? primary.assignedTo : secondary.assignedTo;
  let mergedAssignedToName = primary.assignedToName !== undefined ? primary.assignedToName : secondary.assignedToName;

  if (mergedStatus === "pending" && (primary.assignedTo === null || primary.status === "pending")) {
    mergedAssignedTo = null;
    mergedAssignedToName = null;
  }

  return {
    ...secondary,
    ...primary,
    chatId: primary.chatId || secondary.chatId,
    jobId: primary.jobId || secondary.jobId,
    jobTitle: primary.jobTitle || secondary.jobTitle,
    customerPhone: primary.customerPhone || secondary.customerPhone,
    seekerUid: primary.seekerUid || secondary.seekerUid,
    status: mergedStatus,
    assignedTo: mergedAssignedTo,
    assignedToName: mergedAssignedToName,
    sharedWith: primary.sharedWith || secondary.sharedWith || [],
    messages: mergedMessages
  };
}

// Dual Query Listener: Subscribes to BOTH Firestore AND Realtime Database simultaneously
export function subscribeToConversations(callback: (conversations: Record<string, Conversation>) => void) {
  let latestFirestoreConvs: Record<string, Conversation> = {};
  let latestRtdbConvs: Record<string, Conversation> = {};
  let unsubFirestore: (() => void) | null = null;
  let unsubRtdb: (() => void) | null = null;

  const emitMerged = () => {
    const merged: Record<string, Conversation> = {};

    // 1. Initial memoryStore conversations
    Object.entries(memoryStore.conversations).forEach(([id, c]) => {
      merged[id] = normalizeConversation(id, c);
    });

    // 2. Merge Firestore conversations
    Object.entries(latestFirestoreConvs).forEach(([id, c]) => {
      if (!merged[id]) {
        merged[id] = c;
      } else {
        merged[id] = mergeConversations(merged[id], c);
      }
    });

    // 3. Merge Realtime Database conversations
    Object.entries(latestRtdbConvs).forEach(([id, c]) => {
      if (!merged[id]) {
        merged[id] = c;
      } else {
        merged[id] = mergeConversations(merged[id], c);
      }
    });

    callback(merged);
  };

  // Listen to Firestore (Guest and WhatsApp storage)
  try {
    const collRef = collection(db, "conversations");
    unsubFirestore = onSnapshot(collRef, (snapshot) => {
      const convs: Record<string, Conversation> = {};
      if (!snapshot.empty) {
        snapshot.docs.forEach((d) => {
          convs[d.id] = normalizeConversation(d.id, d.data());
        });
      } else {
        Object.entries(DEFAULT_CONVERSATIONS).forEach(([id, conv]) => {
          setDoc(doc(db, "conversations", id), conv).catch(() => {});
          convs[id] = normalizeConversation(id, conv);
        });
      }
      latestFirestoreConvs = convs;
      emitMerged();
    }, (err) => {
      console.warn("Firestore snapshot listener error in subscribeToConversations:", err);
    });
  } catch (err) {
    console.warn("Firestore subscribeToConversations caught exception:", err);
  }

  // Listen to Realtime Database (In-App conversation storage)
  if (rtdb) {
    try {
      const rtdbRef = ref(rtdb, "conversations");
      unsubRtdb = onValue(rtdbRef, (snapshot) => {
        const convs: Record<string, Conversation> = {};
        if (snapshot.exists()) {
          const rawData = snapshot.val();
          Object.entries(rawData).forEach(([id, val]) => {
            convs[id] = normalizeConversation(id, val);
          });
        }
        latestRtdbConvs = convs;
        emitMerged();
      }, (err) => {
        console.warn("RTDB onValue listener error in subscribeToConversations:", err);
      });
    } catch (e) {
      console.warn("RTDB subscribeToConversations caught exception:", e);
    }
  }

  // Listen to local memory store updates
  const unsubMemory = memoryStore.subscribe(() => {
    emitMerged();
  });

  // Emit merged state initially
  emitMerged();

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubRtdb) unsubRtdb();
    if (unsubMemory) unsubMemory();
  };
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
      
      // Auto-claim message for WhatsApp chats
      const isWhatsApp = chatId.startsWith("whatsapp-") || Boolean(data.customerPhone && (data.customerPhone.startsWith("+") || /^\d+$/.test(data.customerPhone)));
      const targetPhone = data.customerPhone || (chatId.startsWith("whatsapp-") ? chatId.replace("whatsapp-", "") : null);

      if (isWhatsApp && targetPhone) {
        const claimNoticeText = `Hello! Your request has been received. Staff member ${userName} is ready to discuss with you.`;
        const claimNoticeMsg: ChatMessage = {
          sender: "staff",
          text: claimNoticeText,
          timestamp: Date.now() + 10
        };
        currentMessages = [...messagesArray, systemMsg, claimNoticeMsg];

        // Dispatch outbound WhatsApp message via Baileys WA / Meta API
        fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toPhone: targetPhone,
            text: claimNoticeText
          })
        }).catch(err => console.warn("[claimConversation] Failed to dispatch WhatsApp claim notification:", err));
      } else {
        currentMessages = [...messagesArray, systemMsg];
      }
      
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

// Helper function to dynamically route a conversation to 5 available staff members
export async function routeToAvailableStaff(): Promise<{ selectedStaffUids: string[]; assignedToOffline: boolean }> {
  const staff = await getStaffProfiles();
  const statuses = await getStaffStatuses();

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
    selectedStaff = selectedStaff.slice(0, 5);
  } else {
    const busyOnlineToTake = onlineBusy.slice(0, 5);
    const offlineAvailableToTake = offlineNotBusy.slice(0, 5);

    selectedStaff = [...busyOnlineToTake, ...offlineAvailableToTake];
    if (offlineAvailableToTake.length > 0) {
      assignedToOffline = true;
    }
  }

  let selectedStaffUids = selectedStaff.map(s => s.uid);
  if (selectedStaffUids.length === 0) {
    selectedStaffUids = ["staff-demo", "staff-1-seed", "staff-2-seed"];
  }

  return { selectedStaffUids, assignedToOffline };
}

// Send Chat Message
export async function sendChatMessage(chatId: string, sender: "customer" | "staff" | "system" | "guest", text: string): Promise<void> {
  const now = Date.now();
  const newMessage: ChatMessage = {
    sender,
    text,
    timestamp: now
  };

  const sysMsgText = "Conversation re-opened by user and returned to Available Requests queue.";
  let isReinitiated = false;
  let freshStaffUids: string[] = [];

  // 1. Memory State Fallback
  let currentMessages: ChatMessage[] = [];
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    if ((sender === "customer" || sender === "guest") && (conv.status === "abandoned" || conv.status === "finished")) {
      const routed = await routeToAvailableStaff();
      freshStaffUids = routed.selectedStaffUids;
      isReinitiated = true;
      conv.status = "pending";
      conv.assignedTo = null;
      conv.assignedToName = null;
      conv.sharedWith = freshStaffUids;
      conv.createdAt = now;
      delete conv.abandonedAt;
      delete conv.finishedAt;

      const sysMsg: ChatMessage = {
        sender: "system",
        text: sysMsgText,
        timestamp: now
      };
      if (!conv.messages) conv.messages = [];
      if (Array.isArray(conv.messages)) {
        conv.messages.push(sysMsg);
      }
    }

    conv.text = text;
    conv.lastMessageAt = now;
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
      const isFsAbandoned = data.status === "abandoned" || data.status === "finished" || isReinitiated;

      if ((sender === "customer" || sender === "guest") && isFsAbandoned) {
        isReinitiated = true;
        if (freshStaffUids.length === 0) {
          const routed = await routeToAvailableStaff();
          freshStaffUids = routed.selectedStaffUids;
        }

        const sysMsg: ChatMessage = {
          sender: "system",
          text: sysMsgText,
          timestamp: now
        };

        const newMessagesList = [...messagesArray];
        if (!newMessagesList.some(m => m.sender === "system" && m.text === sysMsgText && Math.abs(m.timestamp - sysMsg.timestamp) < 5000)) {
          newMessagesList.push(sysMsg);
        }
        newMessagesList.push(newMessage);
        currentMessages = newMessagesList;

        await updateDoc(convRef, {
          text: text,
          lastMessageAt: now,
          createdAt: now,
          status: "pending",
          assignedTo: null,
          assignedToName: null,
          sharedWith: freshStaffUids,
          abandonedAt: null,
          finishedAt: null,
          messages: currentMessages
        });

        // Trigger staff notifications for re-initiated chat
        freshStaffUids.forEach(uid => {
          addSystemNotification({
            type: "awaiting_claim",
            title: "Re-initiated Chat Awaiting Claim",
            message: `Abandoned chat with ${data.customerPhone || "Customer"} (Job: ${data.jobTitle || "Job"}) was re-initiated by user and assigned to 5 available staff for claim.`,
            metadata: { chatId, customerPhone: data.customerPhone, jobId: data.jobId, jobTitle: data.jobTitle },
            staffUid: uid
          }).catch(err => console.warn("Failed to log re-initiated notification", err));
        });
      } else {
        currentMessages = [...messagesArray, newMessage];
        await updateDoc(convRef, {
          text: text,
          lastMessageAt: now,
          messages: currentMessages
        });
      }
    } else {
      const baseConv = memoryStore.conversations[chatId] || {
        chatId,
        customerPhone: chatId,
        status: "pending",
        text,
        createdAt: now,
        lastMessageAt: now,
        messages: [newMessage]
      };
      const messagesArray = Array.isArray(baseConv.messages) ? [...baseConv.messages] : [];
      if (!messagesArray.some(m => m.timestamp === newMessage.timestamp && m.text === newMessage.text)) {
        messagesArray.push(newMessage);
      }
      currentMessages = messagesArray;
      await setDoc(convRef, {
        ...baseConv,
        text,
        lastMessageAt: now,
        messages: currentMessages
      }, { merge: true });
    }
  } catch (error) {
    console.warn("Firestore sendChatMessage failed, writing to fallback/RTDB:", error);
  }

  // 3. Dual Write: Realtime Database
  if (rtdb) {
    try {
      if (isReinitiated) {
        await syncToRTDB(chatId, {
          text: text,
          lastMessageAt: now,
          createdAt: now,
          status: "pending",
          assignedTo: null,
          assignedToName: null,
          sharedWith: freshStaffUids.length > 0 ? freshStaffUids : (conv?.sharedWith || []),
          abandonedAt: null,
          finishedAt: null,
          messages: currentMessages
        });
      } else {
        await syncToRTDB(chatId, {
          text: text,
          lastMessageAt: now,
          messages: currentMessages
        });
      }
    } catch (error) {
      console.warn("RTDB sendChatMessage sync failed:", error);
    }
  }

  // 4. Outbound WhatsApp Message Dispatch for Staff/System replies
  if ((sender === "staff" || sender === "system") && text) {
    const isWhatsApp = chatId.startsWith("whatsapp-") || Boolean(conv && conv.customerPhone && (conv.customerPhone.startsWith("+") || /^\d+$/.test(conv.customerPhone)));
    if (isWhatsApp) {
      const targetPhone = conv?.customerPhone || chatId.replace("whatsapp-", "");
      if (targetPhone) {
        fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            toPhone: targetPhone,
            text: text
          })
        }).catch(err => console.warn("[sendChatMessage] Outbound WhatsApp dispatch failed:", err));
      }
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

  const now = Date.now();
  if (conv) {
    conv.assignedTo = targetStaffUid;
    conv.assignedToName = targetStaffName;
    conv.status = targetStaffUid ? "ongoing" : "pending";
    conv.createdAt = now; // Reset timer so SLA check doesn't move it back to abandoned!
    conv.lastMessageAt = now;
    delete conv.abandonedAt;
    delete conv.finishedAt;
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
        createdAt: now,
        lastMessageAt: now,
        abandonedAt: null,
        finishedAt: null,
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
        createdAt: now,
        lastMessageAt: now,
        abandonedAt: null,
        finishedAt: null,
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
    } else if (status === "pending" || status === "ongoing") {
      conv.createdAt = now; // Reset timer benchmark for SLA
      conv.lastMessageAt = now;
      delete conv.abandonedAt;
      delete conv.finishedAt;
      if (status === "pending") {
        conv.assignedTo = null;
        conv.assignedToName = null;
      }
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
  const additionalFields: Record<string, any> = {};
  if (status === "abandoned") {
    additionalFields.abandonedAt = now;
  } else if (status === "finished") {
    additionalFields.finishedAt = now;
  } else if (status === "pending" || status === "ongoing") {
    additionalFields.createdAt = now;
    additionalFields.lastMessageAt = now;
    additionalFields.abandonedAt = null;
    additionalFields.finishedAt = null;
    if (status === "pending") {
      additionalFields.assignedTo = null;
      additionalFields.assignedToName = null;
    }
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
// - WhatsApp Chats: Any WhatsApp conversation pending or ongoing moves to abandoned after 24 hours from initiation
// - In-App Chats: Active for 1 month (30 days) before being automatically marked as abandoned
export async function checkAndEnforceSLAs(): Promise<void> {
  const now = Date.now();
  const twentyFourHours = 24 * 3600 * 1000;
  const thirtyDays = 30 * 24 * 3600 * 1000;

  // Check local memoryStore
  const convs = Object.values(memoryStore.conversations);
  for (const conv of convs) {
    if (conv.status !== "pending" && conv.status !== "ongoing") continue;

    const age = now - conv.createdAt;
    let shouldAbandon = false;
    let reason = "";
    let message = "";
    let title = "";

    const isInApp = conv.isInApp || (conv.customerPhone ? !conv.customerPhone.startsWith("+") : true) || Boolean(conv.seekerUid);

    if (isInApp) {
      if (age > thirtyDays) {
        shouldAbandon = true;
        reason = "in_app_unresolved_30_days";
        title = "In-App Chat Abandoned (30 Days)";
        message = `In-app conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) was automatically marked as abandoned after 1 month of initialization.`;
      }
    } else {
      if (age > twentyFourHours) {
        shouldAbandon = true;
        reason = "whatsapp_24_hours";
        title = "SLA: WhatsApp Chat Abandoned (24h)";
        message = `WhatsApp conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) was automatically marked as abandoned after 24 hours of initialization.`;
      }
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

      const isInApp = conv.isInApp || (conv.customerPhone ? !conv.customerPhone.startsWith("+") : true) || Boolean(conv.seekerUid);

      if (isInApp) {
        if (age > thirtyDays) {
          shouldAbandon = true;
          reason = "in_app_unresolved_30_days";
          title = "In-App Chat Abandoned (30 Days)";
          message = `In-app conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) was automatically marked as abandoned after 1 month of initialization.`;
        }
      } else {
        if (age > twentyFourHours) {
          shouldAbandon = true;
          reason = "whatsapp_24_hours";
          title = "SLA: WhatsApp Chat Abandoned (24h)";
          message = `WhatsApp conversation with ${conv.customerPhone} (Job: ${conv.jobTitle}) was automatically marked as abandoned after 24 hours of initialization.`;
        }
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
// - Abandoned conversations -> delete after 6 months (180 days) of being abandoned
// - Finished conversations -> delete after 1 month (30 days) of being finished
export async function pruneExpiredConversations(): Promise<void> {
  const now = Date.now();
  const thirtyDays = 30 * 24 * 3600 * 1000;
  const sixMonths = 180 * 24 * 3600 * 1000;

  // 1. Process local memoryStore
  const localConvs = Object.values(memoryStore.conversations);
  const localChatsToDelete: string[] = [];

  for (const conv of localConvs) {
    if (conv.status === "abandoned") {
      const abandonedTime = conv.abandonedAt || conv.lastMessageAt || conv.createdAt;
      if (now - abandonedTime > sixMonths) {
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
        if (now - abandonedTime > sixMonths) {
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

// Delete single conversation completely
export async function deleteConversation(chatId: string): Promise<void> {
  if (memoryStore.conversations[chatId]) {
    delete memoryStore.conversations[chatId];
    memoryStore.save();
  }

  try {
    const docRef = doc(db, "conversations", chatId);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore deleteConversation failed:", err);
  }

  if (rtdb) {
    try {
      const rtdbRef = ref(rtdb, `conversations/${chatId}`);
      await set(rtdbRef, null);
    } catch (err) {
      console.warn("RTDB deleteConversation failed:", err);
    }
  }
}

export async function batchDeleteConversations(chatIds: string[]): Promise<void> {
  await Promise.all(chatIds.map(id => deleteConversation(id)));
}

export async function batchResetConversations(chatIds: string[]): Promise<void> {
  await Promise.all(chatIds.map(id => updateConversationStatus(id, "pending")));
}

// ==========================================
// CUSTOMER CONTACTS MANAGEMENT SERVICES
// ==========================================
export async function saveContact(customerPhone: string, jobTitle?: string, name?: string): Promise<void> {
  if (!customerPhone || customerPhone.trim() === "") return;
  const id = customerPhone.replace(/[^0-9+]/g, "") || `contact-${Date.now()}`;
  const now = Date.now();

  const existingInMem = memoryStore.contacts ? memoryStore.contacts[id] : undefined;
  const contact: CustomerContact = {
    id,
    customerPhone,
    name: name || existingInMem?.name || customerPhone,
    lastJobTitle: jobTitle || existingInMem?.lastJobTitle || "General Inquiry",
    firstSeenAt: existingInMem ? existingInMem.firstSeenAt : now,
    lastSeenAt: now,
    chatCount: existingInMem ? (existingInMem.chatCount || 1) + 1 : 1
  };

  if (!memoryStore.contacts) {
    memoryStore.contacts = {};
  }
  memoryStore.contacts[id] = contact;
  memoryStore.save();

  try {
    const docRef = doc(db, "contacts", id);
    await setDoc(docRef, contact, { merge: true });
  } catch (err) {
    console.warn("Firestore saveContact failed:", err);
  }
}

export async function getContacts(): Promise<CustomerContact[]> {
  try {
    const collRef = collection(db, "contacts");
    const snap = await getDocs(collRef);
    if (!snap.empty) {
      const list = snap.docs.map(d => d.data() as CustomerContact);
      const sorted = list.sort((a, b) => b.lastSeenAt - a.lastSeenAt);
      if (!memoryStore.contacts) memoryStore.contacts = {};
      sorted.forEach(c => { memoryStore.contacts[c.id] = c; });
      memoryStore.save();
      return sorted;
    }
  } catch (err) {
    console.warn("Firestore getContacts failed, using memory fallback:", err);
  }

  // Seed default contacts if empty
  if (!memoryStore.contacts || Object.keys(memoryStore.contacts).length === 0) {
    memoryStore.contacts = {
      "15550192834": {
        id: "15550192834",
        customerPhone: "+1 (555) 019-2834",
        name: "Alex Rivera",
        lastJobTitle: "Lead WhatsApp Solutions Architect",
        firstSeenAt: Date.now() - 3600000 * 48,
        lastSeenAt: Date.now() - 3600000 * 2,
        chatCount: 3
      },
      "15550149872": {
        id: "15550149872",
        customerPhone: "+1 (555) 014-9872",
        name: "Samantha Wright",
        lastJobTitle: "Senior AI Integration Specialist",
        firstSeenAt: Date.now() - 3600000 * 72,
        lastSeenAt: Date.now() - 3600000 * 23.5,
        chatCount: 1
      },
      "15550127643": {
        id: "15550127643",
        customerPhone: "+1 (555) 012-7643",
        name: "David Chen",
        lastJobTitle: "Staff Fintech Infrastructure Engineer",
        firstSeenAt: Date.now() - 3600000 * 24,
        lastSeenAt: Date.now() - 3600000 * 1,
        chatCount: 5
      }
    };
    memoryStore.save();
  }

  return Object.values(memoryStore.contacts).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
}

export async function deleteContact(id: string): Promise<void> {
  if (memoryStore.contacts && memoryStore.contacts[id]) {
    delete memoryStore.contacts[id];
    memoryStore.save();
  }
  try {
    const docRef = doc(db, "contacts", id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn("Firestore deleteContact failed:", err);
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
  // Check if an existing conversation exists for this seeker/customer and job
  let existingConv: Conversation | undefined;
  if (memoryStore.conversations) {
    existingConv = Object.values(memoryStore.conversations).find(c =>
      (seekerUid ? c.seekerUid === seekerUid : c.customerPhone === customerPhone) && c.jobId === jobId
    );
  }

  if (!existingConv) {
    try {
      const collRef = collection(db, "conversations");
      const snap = await getDocs(collRef);
      const fsConvs = snap.docs.map(d => d.data() as Conversation);
      existingConv = fsConvs.find(c =>
        (seekerUid ? c.seekerUid === seekerUid : c.customerPhone === customerPhone) && c.jobId === jobId
      );
    } catch (err) {
      console.warn("Failed to check existing conversations in Firestore:", err);
    }
  }

  if (existingConv) {
    // Re-use existing conversation; sendChatMessage handles reinitiating abandoned conversations to pending queue
    await saveContact(customerPhone, jobTitle);
    await sendChatMessage(existingConv.chatId, "customer", text);
    return existingConv.chatId;
  }

  // Save/update customer contact
  await saveContact(customerPhone, jobTitle);

  const chatId = `chat-${Date.now()}`;
  const initialMessage: ChatMessage = {
    sender: "customer",
    text,
    timestamp: Date.now()
  };

  // --- Dynamic Chat Routing Logic ---
  const { selectedStaffUids, assignedToOffline } = await routeToAvailableStaff();
  const actualSeekerUid = seekerUid || auth.currentUser?.uid || undefined;
  const isAppChat = (customerPhone ? !customerPhone.startsWith("+") : true) || Boolean(actualSeekerUid);

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
    isInApp: isAppChat,
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



