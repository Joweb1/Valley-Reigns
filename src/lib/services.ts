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
  deleteDoc,
  limit,
  limitToLast,
  getCountFromServer,
  getAggregateFromServer,
  sum
} from "firebase/firestore";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";
export { auth, db };
import { Job, UserProfile, Conversation, ChatMessage, DailyStat, SystemNotification, StaffDailyReport, CustomerContact, CandidateListLog, StaffResumptionRecord, StaffReportReopenOverride, EmployerRecruitmentRequest, EmployerApplicant, StaffDirectConversation, StaffDirectMessage, StaffGroupChatMessage, ChatTestSuiteReport, AppSettings } from "../types";
import { SEEDED_JOBS_LIST } from "./defaultJobs";
import { generateJobSEOMetadata } from "./seo";

// ==========================================
// FIRESTORE PAYLOAD SANITIZER
// Recursively strips undefined fields from objects/arrays so Firestore setDoc/updateDoc
// never throws "Unsupported field value: undefined"
// ==========================================
export function sanitizeForFirestore<T>(data: T): T {
  if (data === undefined) {
    return null as unknown as T;
  }
  if (data === null || typeof data !== "object") {
    return data;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  const cleanObj: Record<string, any> = {};
  for (const [key, value] of Object.entries(data as Record<string, any>)) {
    if (value !== undefined) {
      cleanObj[key] = sanitizeForFirestore(value);
    }
  }
  return cleanObj as T;
}

export function normalizePhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const cleaned = phone.replace(/\s+/g, "").trim();
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  return cleaned;
}

// ==========================================
// SEED DATA FOR HIGH-FIDELITY PREVIEW
// ==========================================
const DEFAULT_JOBS: Job[] = SEEDED_JOBS_LIST;

const DEFAULT_CANDIDATE_LIST_LOGS: CandidateListLog[] = [];

const DEFAULT_CONVERSATIONS: Record<string, Conversation> = {};

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
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 60
    },
    "staff-1-seed": {
      uid: "staff-1-seed",
      email: "staff1@valleyreigns.com",
      displayName: "Marcus Vance",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 32
    },
    "staff-2-seed": {
      uid: "staff-2-seed",
      email: "staff2@valleyreigns.com",
      displayName: "Jessica Carter",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 21
    },
    "admin-demo": {
      uid: "admin-demo",
      email: "genesisjosephoghene+admin@gmail.com",
      displayName: "Jessica Carter",
      role: "admin",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 14
    },
    "staff-demo": {
      uid: "staff-demo",
      email: "genesisjosephoghene+staff@gmail.com",
      displayName: "Marcus Vance",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 7
    },
    "seeker-demo": {
      uid: "seeker-demo",
      email: "genesisjosephoghene+seeker@gmail.com",
      displayName: "Alex Rivera",
      role: "seeker",
      canPostJobs: false,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      phoneNumber: "+234 812 345 6789",
      jobTitle: "Senior Frontend Specialist",
      createdAt: Date.now() - 86400000 * 5
    },
    "seeker-sophia": {
      uid: "seeker-sophia",
      email: "sophia.williams@gmail.com",
      displayName: "Sophia Williams",
      role: "seeker",
      canPostJobs: false,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      phoneNumber: "+234 809 231 9944",
      jobTitle: "Full Stack Software Engineer",
      createdAt: Date.now() - 86400000 * 8
    },
    "seeker-emeka": {
      uid: "seeker-emeka",
      email: "emeka.okafor@techmail.ng",
      displayName: "Emeka Okafor",
      role: "seeker",
      canPostJobs: false,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      phoneNumber: "+234 703 445 1188",
      jobTitle: "Data Analyst & BI Specialist",
      createdAt: Date.now() - 86400000 * 14
    },
    "seeker-zainab": {
      uid: "seeker-zainab",
      email: "zainab.bello@cloudhub.io",
      displayName: "Zainab Bello",
      role: "seeker",
      canPostJobs: false,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      phoneNumber: "+234 818 990 4422",
      jobTitle: "Cloud DevOps & Kubernetes Engineer",
      createdAt: Date.now() - 86400000 * 18
    },
    "staff-sarah": {
      uid: "staff-sarah",
      email: "sarah.jenkins@valleyreigns.com",
      displayName: "Sarah Jenkins",
      role: "staff",
      canPostJobs: true,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      phoneNumber: "+234 814 667 8890",
      jobTitle: "Senior Talent Coordinator",
      createdAt: Date.now() - 86400000 * 25
    },
    "employer-demo": {
      uid: "employer-demo",
      email: "employer@apexsystems.com",
      displayName: "David Apex",
      companyName: "Apex Systems Global",
      companyIndustry: "Technology & Software",
      companyWebsite: "https://apexsystems.com",
      companyPhone: "+234 803 112 4490",
      companyAddress: "Plot 12, Adeola Odeku St, Victoria Island, Lagos",
      rcNumber: "RC-892341",
      role: "employer",
      canPostJobs: true,
      canMessageSeekers: true,
      isVerifiedEmployer: true,
      maxJobPosts: 10,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 30
    },
    "employer-novacore": {
      uid: "employer-novacore",
      email: "hiring@novacore.com",
      displayName: "Chioma Okonjo",
      companyName: "NovaCore Supply & Logistics",
      companyIndustry: "Logistics & Freight",
      companyWebsite: "https://novacorelogistics.com",
      companyPhone: "+234 802 555 7711",
      companyAddress: "14 Commercial Ave, Ikeja, Lagos",
      rcNumber: "RC-773412",
      role: "employer",
      canPostJobs: false,
      canMessageSeekers: false,
      isVerifiedEmployer: false,
      maxJobPosts: 3,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 12
    },
    "employer-zenith": {
      uid: "employer-zenith",
      email: "careers@zenithretail.ng",
      displayName: "Tunde Bakare",
      companyName: "Zenith Retail Group",
      companyIndustry: "Retail & Consumer Goods",
      companyWebsite: "https://zenithretail.ng",
      companyPhone: "+234 814 990 2233",
      companyAddress: "Block 4, Admiralty Way, Lekki Phase 1, Lagos",
      rcNumber: "RC-661298",
      role: "employer",
      canPostJobs: true,
      canMessageSeekers: false,
      isVerifiedEmployer: true,
      maxJobPosts: 5,
      password: "Password123",
      authProvider: "email",
      messagingPreference: "in-app",
      createdAt: Date.now() - 86400000 * 20
    }
  };
  staffStatuses: Record<string, "online" | "offline"> = {
    "staff-demo": "online",
    "staff-1-seed": "online",
    "staff-2-seed": "online"
  };
  recruitmentRequests: Record<string, EmployerRecruitmentRequest> = {
    "req-101": {
      id: "req-101",
      employerUid: "employer-demo",
      companyName: "Apex Systems Global",
      contactPerson: "David Apex",
      email: "employer@apexsystems.com",
      phone: "+234 803 112 4490",
      jobTitle: "Senior Frontend React Developer",
      jobCategory: "Information Technology",
      salaryBudget: "₦850,000 - ₦1,200,000 / month",
      numberOfWorkers: 2,
      jobLocation: "Victoria Island, Lagos (Hybrid)",
      requirements: "Minimum 4+ years of TypeScript, React, Tailwind CSS, and performance optimization experience.",
      urgency: "immediate",
      status: "sourcing",
      createdAt: Date.now() - 86400000 * 3,
      assignedStaffUid: "staff-1-seed",
      assignedStaffName: "Marcus Vance",
      notes: "Sourcing top candidates from verified tech pool. 4 shortlisted profiles being vetted."
    },
    "req-102": {
      id: "req-102",
      employerUid: "employer-demo",
      companyName: "Apex Systems Global",
      contactPerson: "David Apex",
      email: "employer@apexsystems.com",
      phone: "+234 803 112 4490",
      jobTitle: "Customer Experience Specialist",
      jobCategory: "Customer Support",
      salaryBudget: "₦350,000 - ₦500,000 / month",
      numberOfWorkers: 3,
      jobLocation: "Lagos / Remote",
      requirements: "Experience handling high volume candidate and client chats, fast typing, fluent English.",
      urgency: "within_1_week",
      status: "reviewing",
      createdAt: Date.now() - 86400000 * 1,
      assignedStaffUid: "staff-2-seed",
      assignedStaffName: "Jessica Carter"
    }
  };
  employerApplicants: Record<string, EmployerApplicant> = {
    "app-101": {
      id: "app-101",
      jobId: "job-001",
      jobTitle: "Lead Cloud Solutions Architect",
      employerUid: "employer-demo",
      seekerUid: "seeker-demo",
      seekerName: "Alex Rivera",
      seekerEmail: "genesisjosephoghene+seeker@gmail.com",
      seekerPhoneMasked: "+234 ••• ••• 2834",
      seekerCategory: "Engineering",
      appliedAt: Date.now() - 86400000 * 2,
      status: "shortlisted",
      interviewDate: "Tomorrow at 2:00 PM (Google Meet)",
      notes: "Exceptional architecture portfolio and live system demonstration."
    },
    "app-102": {
      id: "app-102",
      jobId: "job-002",
      jobTitle: "Senior AI Integration Specialist",
      employerUid: "employer-demo",
      seekerUid: "seeker-seed-2",
      seekerName: "Robert Chen",
      seekerEmail: "robert.chen@devmail.io",
      seekerPhoneMasked: "+234 ••• ••• 9872",
      seekerCategory: "AI / ML",
      appliedAt: Date.now() - 86400000 * 4,
      status: "reviewing",
      notes: "Strong LLM and pipeline automation track record."
    }
  };
  currentUser: UserProfile | null = null;
  systemNotifications: SystemNotification[] = [];
  dailyReports: StaffDailyReport[] = [];
  contacts: Record<string, CustomerContact> = {};
  candidateListLogs: CandidateListLog[] = [];
  staffResumptions: Record<string, StaffResumptionRecord> = {};
  reportReopens: Record<string, StaffReportReopenOverride> = {};
  appSettings: AppSettings = { unclaimedChatTimeoutHours: 24 };
  listeners: Set<() => void> = new Set();

  constructor() {
    // Load from localStorage if available (excluding user accounts)
    const savedJobs = localStorage.getItem("vr_jobs");
    const savedConvs = localStorage.getItem("vr_conversations");
    const savedUsers = localStorage.getItem("vr_users");
    const savedNotifications = localStorage.getItem("vr_system_notifications");
    const savedReports = localStorage.getItem("vr_daily_reports");
    const savedContacts = localStorage.getItem("vr_contacts");
    const savedListLogs = localStorage.getItem("vr_candidate_list_logs");
    const savedResumptions = localStorage.getItem("vr_staff_resumptions");
    const savedReopens = localStorage.getItem("vr_report_reopens");
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
    // Clear conversations and contacts on user request
    if (localStorage.getItem("vr_chats_cleared_v3") !== "true") {
      localStorage.removeItem("vr_conversations");
      localStorage.removeItem("vr_contacts");
      localStorage.removeItem("vr_candidate_list_logs");
      localStorage.setItem("vr_chats_cleared_v3", "true");
      this.conversations = {};
      this.contacts = {};
      this.candidateListLogs = [];
    } else {
      if (savedConvs) {
        try { this.conversations = JSON.parse(savedConvs); } catch (e) { this.conversations = {}; }
      }
      if (savedContacts) {
        try { this.contacts = JSON.parse(savedContacts); } catch (e) { this.contacts = {}; }
      }
      if (savedListLogs) {
        try { this.candidateListLogs = JSON.parse(savedListLogs); } catch (e) { this.candidateListLogs = []; }
      }
    }
    if (savedResumptions) {
      try { this.staffResumptions = JSON.parse(savedResumptions); } catch(e) {}
    }
    if (savedReopens) {
      try { this.reportReopens = JSON.parse(savedReopens); } catch(e) {}
    }
    const savedRecruitments = localStorage.getItem("vr_recruitment_requests");
    if (savedRecruitments) {
      try {
        const parsed = JSON.parse(savedRecruitments);
        this.recruitmentRequests = { ...this.recruitmentRequests, ...parsed };
      } catch(e) {}
    }
    const savedApplicants = localStorage.getItem("vr_employer_applicants");
    if (savedApplicants) {
      try {
        const parsed = JSON.parse(savedApplicants);
        this.employerApplicants = { ...this.employerApplicants, ...parsed };
      } catch(e) {}
    }
    const savedAppSettings = localStorage.getItem("vr_app_settings");
    if (savedAppSettings) {
      try {
        const parsed = JSON.parse(savedAppSettings);
        this.appSettings = { ...this.appSettings, ...parsed };
      } catch(e) {}
    }
  }

  save() {
    localStorage.setItem("vr_jobs", JSON.stringify(this.jobs));
    localStorage.setItem("vr_conversations", JSON.stringify(this.conversations));
    localStorage.setItem("vr_users", JSON.stringify(this.users));
    localStorage.setItem("vr_system_notifications", JSON.stringify(this.systemNotifications));
    localStorage.setItem("vr_daily_reports", JSON.stringify(this.dailyReports));
    localStorage.setItem("vr_contacts", JSON.stringify(this.contacts));
    localStorage.setItem("vr_candidate_list_logs", JSON.stringify(this.candidateListLogs));
    localStorage.setItem("vr_staff_resumptions", JSON.stringify(this.staffResumptions || {}));
    localStorage.setItem("vr_report_reopens", JSON.stringify(this.reportReopens || {}));
    localStorage.setItem("vr_recruitment_requests", JSON.stringify(this.recruitmentRequests || {}));
    localStorage.setItem("vr_employer_applicants", JSON.stringify(this.employerApplicants || {}));
    localStorage.setItem("vr_app_settings", JSON.stringify(this.appSettings || { unclaimedChatTimeoutHours: 24 }));
    this.listeners.forEach(l => l());
  }

  subscribe(cb: () => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }
}

export const memoryStore = new MemoryStorage();

// Seeding lifecycle guards for instant first-time device loading
let hasSeededDatabase = false;
let isSeedingDatabase = false;

// ==========================================
// FIRESTORE DATABASE INITIALIZATION / SEEDING
// ==========================================
export async function initializeDatabaseSeed(): Promise<void> {
  if (hasSeededDatabase || isSeedingDatabase) return;
  isSeedingDatabase = true;

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

    hasSeededDatabase = true;
  } catch (err) {
    console.warn("Could not seed users in Firestore, relying on in-memory fallback:", err);
  } finally {
    isSeedingDatabase = false;
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
  const jobId = `job-${Date.now()}`;
  
  // Automatically generate SEO & AIO metadata for persistent indexing
  const seoData = generateJobSEOMetadata({
    id: jobId,
    title: job.title,
    company: job.company,
    category: job.category,
    location: job.location,
    salary: job.salary,
    type: job.type,
    requirements: job.requirements,
    description: job.description,
    createdAt: Date.now()
  });

  const newJob: Job = {
    ...job,
    postedByUid: resolvedPostedByUid,
    id: jobId,
    impressions: 0,
    createdAt: Date.now(),
    seo: seoData
  };

  try {
    await setDoc(doc(db, "jobs", newJob.id), sanitizeForFirestore(newJob));
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

export async function getJobById(jobId: string): Promise<Job | null> {
  if (!jobId) return null;

  // 1. Check in-memory store
  const memJob = memoryStore.jobs.find(j => j.id === jobId);
  if (memJob) {
    if (!memJob.seo) {
      memJob.seo = generateJobSEOMetadata(memJob);
    }
    return memJob;
  }

  // 2. Fetch directly from Firestore
  try {
    const jobDoc = await getDoc(doc(db, "jobs", jobId));
    if (jobDoc.exists()) {
      const data = jobDoc.data() as Job;
      if (!data.seo) {
        data.seo = generateJobSEOMetadata(data);
      }
      return data;
    }
  } catch (err) {
    console.warn(`Firestore getJobById(${jobId}) error:`, err);
  }

  // 3. Fallback to default seed jobs
  const defaultFound = DEFAULT_JOBS.find(j => j.id === jobId);
  if (defaultFound) {
    if (!defaultFound.seo) {
      defaultFound.seo = generateJobSEOMetadata(defaultFound);
    }
    return defaultFound;
  }

  return null;
}

let pendingJobImpressions: Record<string, number> = {};
let impressionTimeout: any = null;
const NUM_IMPRESSION_SHARDS = 10;

// ==========================================
// SCALABLE DISTRIBUTED SHARDED COUNTER (10,000+ USERS)
// Writes to a randomly selected sub-document shard (0-9) to eliminate
// Firestore's 1 write/sec single document lock contention.
// ==========================================
export async function incrementJobImpressions(jobId: string) {
  // 1. Immediately update memory store for instantaneous responsive UX
  const job = memoryStore.jobs.find(j => j.id === jobId);
  if (job) {
    job.impressions += 1;
    memoryStore.save();
  }

  // 2. Queue the increment locally
  pendingJobImpressions[jobId] = (pendingJobImpressions[jobId] || 0) + 1;

  // 3. Debounce/Batch updates to distributed shards in Firestore
  if (impressionTimeout) {
    clearTimeout(impressionTimeout);
  }

  impressionTimeout = setTimeout(async () => {
    const batchToProcess = { ...pendingJobImpressions };
    pendingJobImpressions = {};
    impressionTimeout = null;

    for (const [id, count] of Object.entries(batchToProcess)) {
      try {
        // Distribute writes across 10 independent shard documents
        const shardIndex = Math.floor(Math.random() * NUM_IMPRESSION_SHARDS).toString();
        const shardRef = doc(db, "jobs", id, "shards", shardIndex);
        
        // Write atomic increment to the selected shard
        await setDoc(shardRef, { count: increment(count) }, { merge: true });

        // Non-blocking opportunistic sync to parent job document (for backward compatibility)
        const jobRef = doc(db, "jobs", id);
        updateDoc(jobRef, { impressions: increment(count) }).catch(() => {
          // Permitted to silently fail for viewers without direct job update permissions
        });
      } catch (error) {
        console.warn(`Firestore sharded increment impressions notice for ${id}:`, error);
      }
    }
  }, 1000); // 1-second batch window
}

// Retrieves authoritative distributed impressions count using native Firestore aggregate sum
export async function getJobImpressionsCount(jobId: string): Promise<number> {
  try {
    const shardsColl = collection(db, "jobs", jobId, "shards");
    const aggSnap = await getAggregateFromServer(shardsColl, {
      total: sum("count")
    });
    const totalFromShards = aggSnap.data().total;
    if (typeof totalFromShards === "number" && totalFromShards > 0) {
      return totalFromShards;
    }
  } catch (err) {
    // Fallback to memoryStore or cached job
  }
  const job = memoryStore.jobs.find(j => j.id === jobId);
  return job?.impressions || 0;
}

// ==========================================
// SCALABLE NATIVE AGGREGATE QUERIES (10,000+ USERS)
// Uses getCountFromServer to compute counts directly on the database engine.
// Consumes 1 aggregate read instead of downloading thousands of documents!
// ==========================================

export async function getJobsCount(activeOnly?: boolean): Promise<number> {
  try {
    const collRef = collection(db, "jobs");
    const q = activeOnly ? query(collRef, where("isUnavailable", "!=", true)) : collRef;
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.warn("[getCountFromServer] getJobsCount fallback to memoryStore:", err);
    if (activeOnly) {
      return memoryStore.jobs.filter(j => !j.isUnavailable).length;
    }
    return memoryStore.jobs.length;
  }
}

export async function getApplicationsCount(employerUid?: string): Promise<number> {
  try {
    const collRef = collection(db, "employer_applicants");
    const q = employerUid ? query(collRef, where("employerUid", "==", employerUid)) : collRef;
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.warn("[getCountFromServer] getApplicationsCount fallback to memoryStore:", err);
    return Object.values(memoryStore.employerApplicants || {}).filter(a => !employerUid || a.employerUid === employerUid).length;
  }
}

export async function getUsersCount(role?: string): Promise<number> {
  try {
    const collRef = collection(db, "users");
    const q = role ? query(collRef, where("role", "==", role)) : collRef;
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.warn("[getCountFromServer] getUsersCount fallback to memoryStore:", err);
    return Object.values(memoryStore.users).filter(u => !role || u.role === role).length;
  }
}

export async function getConversationsCount(status?: string): Promise<number> {
  try {
    const collRef = collection(db, "conversations");
    const q = status ? query(collRef, where("status", "==", status)) : collRef;
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.warn("[getCountFromServer] getConversationsCount fallback to memoryStore:", err);
    return Object.values(memoryStore.conversations).filter(c => !status || c.status === status).length;
  }
}

export function subscribeToJobs(callback: (jobs: Job[]) => void) {
  // 1. Immediately emit memory-stored jobs synchronously so first-time devices load in 0ms
  if (memoryStore.jobs && memoryStore.jobs.length > 0) {
    callback([...memoryStore.jobs].sort((a, b) => b.createdAt - a.createdAt));
  }

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
        // If Firestore is completely empty on a brand new project, seed in background
        const seededList = [...DEFAULT_JOBS];
        memoryStore.jobs = seededList;
        memoryStore.save();
        callback(seededList.sort((a, b) => b.createdAt - a.createdAt));
        
        // Background non-blocking sync to Firestore
        (async () => {
          try {
            for (const job of DEFAULT_JOBS) {
              await setDoc(doc(db, "jobs", job.id), job, { merge: true });
            }
          } catch (e) {}
        })();
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
  // Check local cache first for instant response
  const local = memoryStore.users[uid];
  if (local) {
    if (!local.messagingPreference) {
      local.messagingPreference = "in-app";
    }
  }

  try {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      if (!profile.messagingPreference) {
        profile.messagingPreference = "in-app";
      }
      // Update memory store with latest from server
      memoryStore.users[uid] = profile;
      return profile;
    }
    return local || null;
  } catch (error) {
    console.warn("Firestore getUserProfile failing, retrieving from fallback:", error);
    return local || null;
  }
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  if (!profile.messagingPreference) {
    profile.messagingPreference = "in-app";
  }
  // Immediately persist in memory store for instant responsiveness
  memoryStore.users[profile.uid] = profile;
  memoryStore.save();

  try {
    await setDoc(doc(db, "users", profile.uid), sanitizeForFirestore(profile), { merge: true });
  } catch (error) {
    console.warn("Firestore saveUserProfile failing, saving in fallback:", error);
  }
}

export async function getUserProfileByEmail(email: string): Promise<UserProfile | null> {
  const normEmail = email.trim().toLowerCase();
  
  // Fast path: check memory store first
  const fallbackUser = Object.values(memoryStore.users).find(
    u => u.email && u.email.trim().toLowerCase() === normEmail
  );
  if (fallbackUser) {
    if (!fallbackUser.messagingPreference) {
      fallbackUser.messagingPreference = "in-app";
    }
    return fallbackUser;
  }

  try {
    const q = query(collection(db, "users"), where("email", "==", normEmail), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const profile = snap.docs[0].data() as UserProfile;
      if (!profile.messagingPreference) {
        profile.messagingPreference = "in-app";
      }
      memoryStore.users[profile.uid] = profile;
      return profile;
    }
  } catch (error) {
    console.warn("Firestore getUserProfileByEmail failing, using fallback:", error);
  }
  return null;
}

export async function getStaffProfiles(): Promise<UserProfile[]> {
  try {
    const collRef = collection(db, "users");
    const snapshot = await getDocs(collRef);
    const userMap = new Map<string, UserProfile>();
    snapshot.docs.forEach(doc => {
      const data = doc.data() as UserProfile;
      const uid = data.uid || doc.id;
      if (uid && !userMap.has(uid)) {
        userMap.set(uid, { ...data, uid });
      }
    });
    const staff = Array.from(userMap.values()).filter(u => u.role === "staff" || u.role === "admin");
    if (staff.length > 0) return staff;
  } catch (error) {
    console.warn("Firestore getStaffProfiles failing, using fallback:");
  }
  const fallbackMap = new Map<string, UserProfile>();
  Object.values(memoryStore.users).forEach(u => {
    if (u && u.uid && (u.role === "staff" || u.role === "admin")) {
      fallbackMap.set(u.uid, u);
    }
  });
  return Array.from(fallbackMap.values());
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  const seedFallbackMap: Record<string, number> = {
    "admin-seed": Date.now() - 86400000 * 60,
    "staff-1-seed": Date.now() - 86400000 * 32,
    "staff-2-seed": Date.now() - 86400000 * 21,
    "admin-demo": Date.now() - 86400000 * 14,
    "staff-demo": Date.now() - 86400000 * 7,
    "seeker-demo": Date.now() - 86400000 * 5,
    "seeker-sophia": Date.now() - 86400000 * 8,
    "seeker-emeka": Date.now() - 86400000 * 3,
    "seeker-zainab": Date.now() - 86400000 * 2,
    "staff-sarah": Date.now() - 86400000 * 1,
    "employer-demo": Date.now() - 3600000 * 4,
    "employer-novacore": Date.now() - 86400000 * 12,
    "employer-zenith": Date.now() - 86400000 * 20
  };

  try {
    const collRef = collection(db, "users");
    const snapshot = await getDocs(collRef);
    const userMap = new Map<string, UserProfile>();
    snapshot.docs.forEach(doc => {
      const u = doc.data() as UserProfile;
      const uid = u.uid || doc.id;
      if (uid) {
        if (!u.createdAt) {
          u.createdAt = seedFallbackMap[uid] || memoryStore.users[uid]?.createdAt || Date.now() - 86400000 * 4;
        }
        if (!userMap.has(uid)) {
          userMap.set(uid, { ...u, uid });
        }
      }
    });
    if (userMap.size > 0) return Array.from(userMap.values());
  } catch (error) {
    console.warn("Firestore getAllUserProfiles failing, using fallback:", error);
  }
  const fallbackMap = new Map<string, UserProfile>();
  Object.values(memoryStore.users).forEach(u => {
    if (u && u.uid) {
      if (!u.createdAt) {
        fallbackMap.set(u.uid, {
          ...u,
          createdAt: seedFallbackMap[u.uid] || Date.now() - 86400000 * 4
        });
      } else if (!fallbackMap.has(u.uid)) {
        fallbackMap.set(u.uid, u);
      }
    }
  });
  return Array.from(fallbackMap.values());
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
    const now = Date.now();
    const threshold = 3 * 60 * 1000;
    snap.forEach((doc) => {
      const data = doc.data();
      if (data && data.status) {
        const isExpired = data.lastActive ? (now - data.lastActive > threshold) : false;
        statuses[doc.id] = (data.status === "online" && !isExpired) ? "online" : "offline";
      }
    });
  } catch (error) {
    console.warn("Firestore getStaffStatuses failed, relying on memory baseline:", error);
  }

  return statuses;
}

// Real-time Staff Status Subscription (Firestore with instant memoryStore fallback)
export function subscribeToStaffStatuses(callback: (statuses: Record<string, "online" | "offline">) => void): () => void {
  let fsStatuses: Record<string, "online" | "offline"> = {};
  let unsubFs: (() => void) | null = null;

  const emit = () => {
    const merged: Record<string, "online" | "offline"> = {
      ...memoryStore.staffStatuses,
      ...fsStatuses
    };
    callback(merged);
  };

  // Immediate synchronous emit for instant load on fresh devices
  emit();

  // Listen to Firestore staff_statuses collection in real-time
  try {
    const collRef = collection(db, "staff_statuses");
    unsubFs = onSnapshot(collRef, (snap) => {
      const fresh: Record<string, "online" | "offline"> = {};
      const now = Date.now();
      const threshold = 3 * 60 * 1000;
      snap.docs.forEach((d) => {
        const data = d.data();
        if (data && data.status) {
          const isExpired = data.lastActive ? (now - data.lastActive > threshold) : false;
          const status = (data.status === "online" && !isExpired) ? "online" : "offline";
          fresh[d.id] = status;
          memoryStore.staffStatuses[d.id] = status;
        }
      });
      fsStatuses = fresh;
      emit();
    }, (err) => {
      console.warn("Firestore staff_statuses snapshot error:", err);
    });
  } catch (err) {
    console.warn("Firestore subscribeToStaffStatuses exception:", err);
  }

  emit();

  return () => {
    if (unsubFs) unsubFs();
  };
}

export async function toggleStaffJobPosting(uid: string, canPost: boolean): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, { canPostJobs: canPost }, { merge: true });
  } catch (error) {
    console.warn("Firestore toggleStaffJobPosting failing, applying locally:", error);
  }
  if (memoryStore.users[uid]) {
    memoryStore.users[uid].canPostJobs = canPost;
    memoryStore.save();
  }
}

export async function updateUserRole(
  uid: string,
  newRole: "seeker" | "staff" | "admin" | "employer",
  extra?: Partial<UserProfile>
): Promise<void> {
  const payload: Partial<UserProfile> = {
    role: newRole,
    ...(newRole === "staff" || newRole === "admin" ? { canPostJobs: true } : {}),
    ...(extra || {})
  };

  try {
    const docRef = doc(db, "users", uid);
    await setDoc(docRef, payload, { merge: true });
  } catch (error) {
    console.warn("Firestore updateUserRole failing, applying locally:", error);
  }

  if (memoryStore.users[uid]) {
    memoryStore.users[uid] = {
      ...memoryStore.users[uid],
      ...payload
    };
    memoryStore.save();
  }
}

export async function deleteUserProfile(uid: string): Promise<void> {
  try {
    const targetUser = memoryStore.users[uid];
    const userRole = targetUser?.role;
    const userPhone = targetUser?.phoneNumber || targetUser?.companyPhone;
    const userEmail = targetUser?.email;

    // 1. Identify and delete all conversations related to this user
    const chatsToDelete: string[] = [];
    const chatsToUnassign: string[] = [];

    // Scan memoryStore.conversations
    Object.values(memoryStore.conversations).forEach(conv => {
      if (!conv || !conv.chatId) return;

      const isDirectMatch = conv.chatId === uid || conv.seekerUid === uid;
      const isPhoneMatch = Boolean(userPhone && conv.customerPhone && (conv.customerPhone === userPhone || conv.customerPhone.includes(userPhone)));
      const isEmailMatch = Boolean(userEmail && conv.customerPhone && conv.customerPhone === userEmail);
      const isOfficeChat = (conv.chatId.startsWith("direct_") || conv.chatId.startsWith("office_")) && conv.chatId.includes(uid);
      const isParticipant = Array.isArray((conv as any).participantUids) && (conv as any).participantUids.includes(uid);

      if (isDirectMatch || isPhoneMatch || isEmailMatch || isOfficeChat || isParticipant) {
        chatsToDelete.push(conv.chatId);
      } else if (conv.assignedTo === uid) {
        chatsToUnassign.push(conv.chatId);
      }
    });

    // Also scan Firestore conversations collection
    try {
      const snap = await getDocs(collection(db, "conversations"));
      for (const d of snap.docs) {
        const cId = d.id;
        if (chatsToDelete.includes(cId)) continue;
        const cData = d.data() as Conversation;
        const isDirect = cId === uid || cData.seekerUid === uid;
        const isPhone = Boolean(userPhone && cData.customerPhone && (cData.customerPhone === userPhone || cData.customerPhone.includes(userPhone)));
        const isEmail = Boolean(userEmail && cData.customerPhone && cData.customerPhone === userEmail);
        const isOffice = (cId.startsWith("direct_") || cId.startsWith("office_")) && cId.includes(uid);
        const isPart = Array.isArray((cData as any).participantUids) && (cData as any).participantUids.includes(uid);

        if (isDirect || isPhone || isEmail || isOffice || isPart) {
          chatsToDelete.push(cId);
        } else if (cData.assignedTo === uid) {
          chatsToUnassign.push(cId);
        }
      }
    } catch (e) {
      console.warn("Firestore scan during cascade delete:", e);
    }

    // Cascade delete conversations and all subcollection messages
    await Promise.allSettled(chatsToDelete.map(async (chatId) => {
      try {
        const msgsSnap = await getDocs(collection(db, "conversations", chatId, "messages"));
        await Promise.allSettled(msgsSnap.docs.map(m => deleteDoc(m.ref)));
      } catch (_) {}

      try {
        await deleteDoc(doc(db, "conversations", chatId));
      } catch (_) {}

      delete memoryStore.conversations[chatId];
      localStorage.removeItem(`vr_chat_messages_${chatId}`);
    }));

    // For unassigned chats from staff/admin deletion, return them to pending queue
    await Promise.allSettled(chatsToUnassign.map(async (chatId) => {
      try {
        await forceReassignConversation(chatId, null, null);
      } catch (_) {}
    }));

    // 2. Cascade delete employer applicants
    Object.keys(memoryStore.employerApplicants).forEach(appId => {
      const app = memoryStore.employerApplicants[appId];
      if (app && (app.seekerUid === uid || app.employerUid === uid || (userEmail && app.seekerEmail === userEmail))) {
        delete memoryStore.employerApplicants[appId];
        deleteDoc(doc(db, "employer_applicants", appId)).catch(() => {});
      }
    });

    // 3. Cascade delete recruitment requests
    Object.keys(memoryStore.recruitmentRequests).forEach(reqId => {
      const req = memoryStore.recruitmentRequests[reqId];
      if (req && (req.employerUid === uid || req.assignedStaffUid === uid || (userEmail && req.email === userEmail))) {
        delete memoryStore.recruitmentRequests[reqId];
        deleteDoc(doc(db, "recruitment_requests", reqId)).catch(() => {});
      }
    });

    // 4. Cascade delete notifications
    memoryStore.systemNotifications = memoryStore.systemNotifications.filter(n => {
      const isRelated = n.staffUid === uid || n.seekerUid === uid || (n.metadata && (n.metadata.staffUid === uid || n.metadata.seekerUid === uid || n.metadata.uid === uid));
      if (isRelated && n.id) {
        deleteDoc(doc(db, "system_notifications", n.id)).catch(() => {});
        return false;
      }
      return true;
    });

    // 5. If employer, delete jobs posted by them
    if (userRole === "employer") {
      memoryStore.jobs = memoryStore.jobs.filter(job => {
        const isPostedBy = job.postedByUid === uid || (targetUser?.companyName && job.company === targetUser.companyName);
        if (isPostedBy) {
          deleteDoc(doc(db, "jobs", job.id)).catch(() => {});
          return false;
        }
        return true;
      });
    }

    // 6. Delete user profile doc from Firestore
    const docRef = doc(db, "users", uid);
    await deleteDoc(docRef);
  } catch (error) {
    console.warn("Firestore deleteUserProfile failing, applying locally:", error);
  }

  // 7. Remove from memoryStore & persist
  if (memoryStore.users[uid]) {
    delete memoryStore.users[uid];
  }
  memoryStore.save();
}

export async function batchUpdateUserRoles(
  uids: string[],
  newRole: "seeker" | "staff" | "admin" | "employer"
): Promise<void> {
  await Promise.all(uids.map(uid => updateUserRole(uid, newRole)));
}

export async function batchDeleteUserProfiles(uids: string[]): Promise<void> {
  await Promise.all(uids.map(uid => deleteUserProfile(uid)));
}


// ==========================================
// EMPLOYER MANAGEMENT & ECOSYSTEM SERVICES
// ==========================================

export async function getEmployerProfiles(): Promise<UserProfile[]> {
  try {
    const collRef = collection(db, "users");
    const snapshot = await getDocs(collRef);
    const users = snapshot.docs.map(doc => doc.data() as UserProfile);
    const employers = users.filter(u => u.role === "employer");
    if (employers.length > 0) return employers;
  } catch (error) {
    console.warn("Firestore getEmployerProfiles failing, using fallback:", error);
  }
  return Object.values(memoryStore.users).filter(u => u.role === "employer");
}

export async function toggleEmployerJobPosting(uid: string, canPost: boolean): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { canPostJobs: canPost });
  } catch (error) {
    console.warn("Firestore toggleEmployerJobPosting failing, applying locally:", error);
  }
  if (memoryStore.users[uid]) {
    memoryStore.users[uid].canPostJobs = canPost;
    memoryStore.save();
  }
}

export async function toggleEmployerSeekerMessaging(uid: string, canMessage: boolean): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { canMessageSeekers: canMessage });
  } catch (error) {
    console.warn("Firestore toggleEmployerSeekerMessaging failing, applying locally:", error);
  }
  if (memoryStore.users[uid]) {
    memoryStore.users[uid].canMessageSeekers = canMessage;
    memoryStore.save();
  }
}

export async function toggleEmployerVerification(uid: string, isVerified: boolean): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { isVerifiedEmployer: isVerified });
  } catch (error) {
    console.warn("Firestore toggleEmployerVerification failing, applying locally:", error);
  }
  if (memoryStore.users[uid]) {
    memoryStore.users[uid].isVerifiedEmployer = isVerified;
    memoryStore.save();
  }
}

export async function updateEmployerMaxJobPosts(uid: string, maxPosts: number): Promise<void> {
  try {
    const docRef = doc(db, "users", uid);
    await updateDoc(docRef, { maxJobPosts: maxPosts });
  } catch (error) {
    console.warn("Firestore updateEmployerMaxJobPosts failing, applying locally:", error);
  }
  if (memoryStore.users[uid]) {
    memoryStore.users[uid].maxJobPosts = maxPosts;
    memoryStore.save();
  }
}

export async function deleteEmployerProfile(uid: string): Promise<void> {
  await deleteUserProfile(uid);
}

export async function submitEmployerRecruitmentRequest(
  data: Omit<EmployerRecruitmentRequest, "id" | "createdAt" | "status">
): Promise<EmployerRecruitmentRequest> {
  const newRequest: EmployerRecruitmentRequest = {
    ...data,
    id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    createdAt: Date.now(),
    status: "pending"
  };

  try {
    const docRef = doc(db, "recruitment_requests", newRequest.id);
    await setDoc(docRef, newRequest);
  } catch (error) {
    console.warn("Firestore submitEmployerRecruitmentRequest failing, storing locally:", error);
  }

  memoryStore.recruitmentRequests[newRequest.id] = newRequest;
  memoryStore.save();
  return newRequest;
}

export async function getEmployerRecruitmentRequests(employerUid?: string): Promise<EmployerRecruitmentRequest[]> {
  try {
    const collRef = collection(db, "recruitment_requests");
    const q = employerUid ? query(collRef, where("employerUid", "==", employerUid)) : collRef;
    const snapshot = await getDocs(q);
    let requests = snapshot.docs.map(doc => doc.data() as EmployerRecruitmentRequest);
    if (requests.length > 0) {
      return requests.sort((a, b) => b.createdAt - a.createdAt);
    }
  } catch (error) {
    console.warn("Firestore getEmployerRecruitmentRequests failing, using fallback:", error);
  }
  let localList = Object.values(memoryStore.recruitmentRequests);
  if (employerUid) {
    localList = localList.filter(r => r.employerUid === employerUid);
  }
  return localList.sort((a, b) => b.createdAt - a.createdAt);
}

export async function updateRecruitmentRequestStatus(
  id: string,
  status: EmployerRecruitmentRequest["status"],
  staffUid?: string,
  staffName?: string,
  notes?: string
): Promise<void> {
  const updates: any = { status };
  if (staffUid) updates.assignedStaffUid = staffUid;
  if (staffName) updates.assignedStaffName = staffName;
  if (notes !== undefined) updates.notes = notes;

  try {
    const docRef = doc(db, "recruitment_requests", id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.warn("Firestore updateRecruitmentRequestStatus failing, updating locally:", error);
  }

  if (memoryStore.recruitmentRequests[id]) {
    memoryStore.recruitmentRequests[id] = {
      ...memoryStore.recruitmentRequests[id],
      ...updates
    };
    memoryStore.save();
  }
}

export async function getEmployerApplicants(employerUid?: string): Promise<EmployerApplicant[]> {
  try {
    const collRef = collection(db, "employer_applicants");
    const q = employerUid ? query(collRef, where("employerUid", "==", employerUid)) : collRef;
    const snapshot = await getDocs(q);
    let apps = snapshot.docs.map(doc => doc.data() as EmployerApplicant);
    if (apps.length > 0) {
      return apps.sort((a, b) => b.appliedAt - a.appliedAt);
    }
  } catch (error) {
    console.warn("Firestore getEmployerApplicants failing, using fallback:", error);
  }
  let localList = Object.values(memoryStore.employerApplicants);
  if (employerUid) {
    localList = localList.filter(a => a.employerUid === employerUid);
  }
  return localList.sort((a, b) => b.appliedAt - a.appliedAt);
}

export async function updateEmployerApplicantStatus(
  id: string,
  status: EmployerApplicant["status"],
  interviewDate?: string,
  notes?: string
): Promise<void> {
  const updates: any = { status };
  if (interviewDate !== undefined) updates.interviewDate = interviewDate;
  if (notes !== undefined) updates.notes = notes;

  try {
    const docRef = doc(db, "employer_applicants", id);
    await updateDoc(docRef, updates);
  } catch (error) {
    console.warn("Firestore updateEmployerApplicantStatus failing, updating locally:", error);
  }

  if (memoryStore.employerApplicants[id]) {
    memoryStore.employerApplicants[id] = {
      ...memoryStore.employerApplicants[id],
      ...updates
    };
    memoryStore.save();
  }
}

export async function createEmployerApplicant(
  data: Omit<EmployerApplicant, "id" | "appliedAt">
): Promise<EmployerApplicant> {
  // Denormalize user display metadata (name, avatar) if not supplied
  let seekerName = data.seekerName;
  let seekerAvatar = data.seekerAvatar;
  let seekerEmail = data.seekerEmail;

  if (data.seekerUid && (!seekerName || !seekerAvatar)) {
    const cachedUser = memoryStore.users[data.seekerUid];
    if (cachedUser) {
      if (!seekerName) seekerName = cachedUser.displayName;
      if (!seekerAvatar) seekerAvatar = cachedUser.photoURL;
      if (!seekerEmail) seekerEmail = cachedUser.email;
    }
  }

  const newApp: EmployerApplicant = {
    ...data,
    seekerName: seekerName || "Candidate",
    seekerAvatar,
    seekerEmail,
    id: `app-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    appliedAt: Date.now()
  };

  try {
    const docRef = doc(db, "employer_applicants", newApp.id);
    await setDoc(docRef, sanitizeForFirestore(newApp));
  } catch (error) {
    console.warn("Firestore createEmployerApplicant failing, saving locally:", error);
  }

  memoryStore.employerApplicants[newApp.id] = newApp;
  memoryStore.save();
  return newApp;
}

// ==========================================
// FIRESTORE CHAT ROUTING & SYNC
// ==========================================

// ==========================================
// CHAT SUBCOLLECTION & MESSAGING CORE
// ==========================================

// Stable message ID generator: Generates deterministic, chronological unique message IDs
export function generateMessageId(chatId: string, timestamp: number = Date.now()): string {
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  return `msg_${timestamp}_${randomSuffix}`;
}

// Persists an individual message to the /conversations/{chatId}/messages/{messageId} subcollection
export async function saveMessageToSubcollection(chatId: string, message: ChatMessage): Promise<ChatMessage> {
  if (!chatId || !message) return message;
  const messageId = message.id || generateMessageId(chatId, message.timestamp);
  const fullMessage: ChatMessage = {
    ...message,
    id: messageId,
    chatId: message.chatId || chatId
  };

  try {
    const msgRef = doc(db, "conversations", chatId, "messages", messageId);
    await setDoc(msgRef, sanitizeForFirestore(fullMessage), { merge: true });
  } catch (err) {
    console.warn(`[saveMessageToSubcollection] Firestore subcollection write warning for chat ${chatId}:`, err);
  }

  return fullMessage;
}

// Scoped Subcollection Listener with Pagination Support:
// Subscribes strictly to /conversations/{chatId}/messages with real-time updates and seamless local caching
export function subscribeToConversationMessages(
  chatId: string,
  pageSize: number = 50,
  callback: (messages: ChatMessage[]) => void
): () => void {
  if (!chatId) {
    callback([]);
    return () => {};
  }

  let unsubFirestore: (() => void) | null = null;
  let isBackfilled = false;

  const emitMessages = (msgs: ChatMessage[]) => {
    // Keep memoryStore conversation message cache in sync
    if (memoryStore.conversations[chatId]) {
      memoryStore.conversations[chatId].messages = msgs;
    }
    callback(msgs);
  };

  // 1. Instant optimistic emission from memory store
  const cachedConv = memoryStore.conversations[chatId];
  if (cachedConv) {
    const initialMsgs = extractConversationMessages(
      cachedConv.messages,
      cachedConv.text,
      cachedConv.createdAt || cachedConv.lastMessageAt,
      (cachedConv as any).sender,
      chatId
    );
    emitMessages(initialMsgs);
  }

  // 2. Scoped Firestore listener on /conversations/{chatId}/messages ordered by timestamp
  try {
    const messagesCollRef = collection(db, "conversations", chatId, "messages");
    const q = query(messagesCollRef, orderBy("timestamp", "asc"), limitToLast(pageSize));

    unsubFirestore = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const msgs: ChatMessage[] = snapshot.docs.map((d) => {
          const data = d.data() as ChatMessage;
          const isRead = data.read === true || data.deliveryStatus === "delivered";
          return {
            ...data,
            id: data.id || d.id,
            chatId: data.chatId || chatId,
            read: isRead,
            readAt: data.readAt,
            deliveryStatus: data.deliveryStatus || (isRead ? "delivered" : "sent")
          };
        });

        // Ensure chronological ordering
        msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        emitMessages(msgs);
      } else if (!isBackfilled) {
        // Backfill / migration fallback: If subcollection is empty, check parent document messages
        isBackfilled = true;
        try {
          const convRef = doc(db, "conversations", chatId);
          const parentSnap = await getDoc(convRef);
          if (parentSnap.exists()) {
            const data = parentSnap.data();
            const legacyMsgs = extractConversationMessages(
              data.messages,
              data.text,
              data.createdAt || data.lastMessageAt,
              data.sender,
              chatId
            );

            if (legacyMsgs.length > 0) {
              emitMessages(legacyMsgs);
              // Asynchronously backfill legacy messages into subcollection with stable IDs
              Promise.all(legacyMsgs.map((m) => saveMessageToSubcollection(chatId, m))).catch((err) =>
                console.warn("[subscribeToConversationMessages] Subcollection backfill notice:", err)
              );
            }
          }
        } catch (fetchErr) {
          console.warn("[subscribeToConversationMessages] Parent fallback fetch notice:", fetchErr);
        }
      }
    }, (err) => {
      console.warn(`[subscribeToConversationMessages] Listener snapshot notice for chat ${chatId}:`, err);
    });
  } catch (err) {
    console.warn(`[subscribeToConversationMessages] Exception initializing listener for chat ${chatId}:`, err);
  }

  // 3. Resilient memoryStore sync listener: whenever a local/optimistic message is sent or updated, emit immediately
  const unsubMemory = memoryStore.subscribe(() => {
    const conv = memoryStore.conversations[chatId];
    if (conv) {
      const msgs = extractConversationMessages(
        conv.messages,
        conv.text,
        conv.createdAt || conv.lastMessageAt,
        (conv as any).sender,
        chatId
      );
      emitMessages(msgs);
    }
  });

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubMemory) unsubMemory();
  };
}

// Automatically mark received conversation messages as read and delivered in Firestore
export async function markConversationMessagesAsRead(
  chatId: string,
  viewerUid?: string,
  viewerRole: "staff" | "customer" | "guest" = "customer"
): Promise<void> {
  if (!chatId) return;

  try {
    const conv = memoryStore.conversations[chatId];
    const rawMsgs = conv?.messages || [];
    const messages = Array.isArray(rawMsgs) ? rawMsgs : Object.values(rawMsgs);

    const unreadReceived = messages.filter((m: ChatMessage) => {
      if (!m) return false;
      const isFromMe = viewerUid 
        ? m.senderUid === viewerUid 
        : (viewerRole === "staff" ? m.sender === "staff" : (m.sender === "customer" || m.sender === "guest"));
      return !isFromMe && (!m.read || m.deliveryStatus !== "delivered");
    });

    if (unreadReceived.length === 0) return;

    const now = Date.now();
    // 1. Update memoryStore
    const updatedMessages = messages.map((m: ChatMessage) => {
      if (!m) return m;
      const isFromMe = viewerUid 
        ? m.senderUid === viewerUid 
        : (viewerRole === "staff" ? m.sender === "staff" : (m.sender === "customer" || m.sender === "guest"));
      if (!isFromMe && (!m.read || m.deliveryStatus !== "delivered")) {
        return {
          ...m,
          read: true,
          deliveryStatus: "delivered" as const,
          readAt: m.readAt || now
        };
      }
      return m;
    });

    if (conv) {
      conv.messages = updatedMessages;
      memoryStore.conversations[chatId] = conv;
      memoryStore.save();
    }

    // 2. Update subcollection documents in Firestore
    const subcollectionUpdates = unreadReceived.map(async (m: ChatMessage) => {
      if (!m.id) return;
      try {
        const msgRef = doc(db, "conversations", chatId, "messages", m.id);
        await setDoc(msgRef, {
          read: true,
          deliveryStatus: "delivered",
          readAt: now
        }, { merge: true });
      } catch (err) {
        console.warn(`[markConversationMessagesAsRead] Subcollection write warning for message ${m.id}:`, err);
      }
    });

    // 3. Update parent conversation document messages array
    const convRef = doc(db, "conversations", chatId);
    const parentUpdate = setDoc(convRef, sanitizeForFirestore({
      messages: updatedMessages
    }), { merge: true }).catch(err => {
      console.warn(`[markConversationMessagesAsRead] Parent update warning for chat ${chatId}:`, err);
    });

    await Promise.all([...subcollectionUpdates, parentUpdate]);
  } catch (err) {
    console.warn(`[markConversationMessagesAsRead] Failed for chat ${chatId}:`, err);
  }
}

// Paginated query to load older historical messages from the subcollection
export async function loadOlderMessages(
  chatId: string,
  oldestTimestamp: number,
  pageSize: number = 50
): Promise<ChatMessage[]> {
  if (!chatId || !oldestTimestamp) return [];
  try {
    const msgsRef = collection(db, "conversations", chatId, "messages");
    const q = query(
      msgsRef,
      where("timestamp", "<", oldestTimestamp),
      orderBy("timestamp", "desc"),
      limit(pageSize)
    );
    const snap = await getDocs(q);
    const older: ChatMessage[] = snap.docs.map((d) => {
      const data = d.data() as ChatMessage;
      const isRead = data.read === true || data.deliveryStatus === "delivered";
      return {
        ...data,
        id: data.id || d.id,
        chatId: data.chatId || chatId,
        read: isRead,
        readAt: data.readAt,
        deliveryStatus: data.deliveryStatus || (isRead ? "delivered" : "sent")
      };
    });
    // Return sorted chronologically ascending
    return older.reverse();
  } catch (err) {
    console.warn(`[loadOlderMessages] Error loading older messages for chat ${chatId}:`, err);
    return [];
  }
}

// Helper to reliably extract and sanitize chat messages from any format (array, map, or fallback text)
export function extractConversationMessages(
  rawMessages: any,
  fallbackText?: string,
  fallbackTimestamp?: number,
  fallbackSender?: any,
  chatId?: string
): ChatMessage[] {
  let list: any[] = [];
  if (Array.isArray(rawMessages)) {
    list = rawMessages;
  } else if (rawMessages && typeof rawMessages === "object") {
    // Firestore map-style dictionaries with numeric or random hash keys
    list = Object.entries(rawMessages).map(([key, val]) => {
      if (val && typeof val === "object") {
        return { id: key, ...(val as object) };
      }
      return val;
    });
  }

  const valid: ChatMessage[] = [];
  for (let i = 0; i < list.length; i++) {
    const m = list[i];
    if (m && typeof m === "object") {
      const text = typeof m.text === "string" ? m.text : (m.text != null ? String(m.text) : "");
      const sender = m.sender || "customer";
      const timestamp = typeof m.timestamp === "number" ? m.timestamp : (Number(m.timestamp) || Date.now());
      const id = m.id || `msg_${timestamp}_${i}_${(m.sender || "c")}`;
      if (text || sender) {
        const isRead = m.read === true || m.deliveryStatus === "delivered";
        valid.push({
          id,
          chatId: m.chatId || chatId || "",
          sender: sender as "customer" | "staff" | "system" | "guest",
          text,
          timestamp,
          senderUid: m.senderUid,
          senderName: m.senderName,
          attachmentUrl: m.attachmentUrl,
          fileType: m.fileType,
          read: isRead,
          readAt: m.readAt,
          deliveryStatus: m.deliveryStatus || (isRead ? "delivered" : "sent")
        });
      }
    }
  }

  valid.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

  // Fallback: If messages list is empty but top-level text is present, construct initial message
  if (valid.length === 0 && fallbackText) {
    const fallbackTime = fallbackTimestamp || Date.now();
    valid.push({
      id: `msg_${fallbackTime}_initial`,
      chatId: chatId || "",
      sender: (fallbackSender as any) || "customer",
      text: fallbackText,
      timestamp: fallbackTime,
      read: false,
      deliveryStatus: "sent"
    });
  }

  return valid;
}

// Helper to normalize conversation data from Firestore
function normalizeConversation(id: string, data: any): Conversation {
  if (!data) return data;
  const finalMessages = extractConversationMessages(
    data.messages,
    data.text,
    data.createdAt || data.lastMessageAt,
    data.sender
  );

  return {
    ...data,
    chatId: id || data.chatId,
    messages: finalMessages
  };
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

  memoryStore.staffStatuses[uid] = isOnline ? "online" : "offline";
  memoryStore.save();
}

// Merge two conversation states for dual-query deduplication without ever dropping messages
export function mergeConversations(c1: Conversation, c2: Conversation): Conversation {
  const time1 = c1.lastMessageAt || c1.createdAt || 0;
  const time2 = c2.lastMessageAt || c2.createdAt || 0;
  const primary = time1 >= time2 ? c1 : c2;
  const secondary = primary === c1 ? c2 : c1;

  const msgs1 = extractConversationMessages(c1.messages, c1.text, c1.createdAt || c1.lastMessageAt, (c1 as any).sender, c1.chatId);
  const msgs2 = extractConversationMessages(c2.messages, c2.text, c2.createdAt || c2.lastMessageAt, (c2 as any).sender, c2.chatId);

  const combinedMsgs = [...msgs1, ...msgs2];
  const uniqueMap = new Map<string, ChatMessage>();

  combinedMsgs.forEach((m) => {
    const key = m.id || `${m.timestamp || 0}_${m.sender || "system"}_${(m.text || "").trim()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, m);
    }
  });

  const mergedMessages = Array.from(uniqueMap.values()).sort(
    (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
  );

  let mergedStatus = primary.status || secondary.status || "pending";
  let mergedAssignedTo = primary.assignedTo !== undefined ? primary.assignedTo : secondary.assignedTo;
  let mergedAssignedToName = primary.assignedToName !== undefined ? primary.assignedToName : secondary.assignedToName;

  // If either state is claimed & ongoing, preserve the ongoing status & assignment
  if (c1.status === "ongoing" && c1.assignedTo && c2.status === "pending") {
    mergedStatus = "ongoing";
    mergedAssignedTo = c1.assignedTo;
    mergedAssignedToName = c1.assignedToName;
  } else if (c2.status === "ongoing" && c2.assignedTo && c1.status === "pending") {
    mergedStatus = "ongoing";
    mergedAssignedTo = c2.assignedTo;
    mergedAssignedToName = c2.assignedToName;
  }

  const isEmp = Boolean(
    primary.isEmployer || secondary.isEmployer ||
    primary.chatId?.startsWith("employer_") || secondary.chatId?.startsWith("employer_") ||
    primary.userRole === "employer" || secondary.userRole === "employer"
  );

  return {
    ...secondary,
    ...primary,
    chatId: primary.chatId || secondary.chatId,
    jobId: primary.jobId || secondary.jobId,
    jobTitle: primary.jobTitle || secondary.jobTitle,
    customerPhone: primary.customerPhone || secondary.customerPhone,
    seekerUid: primary.seekerUid || secondary.seekerUid,
    employerUid: primary.employerUid || secondary.employerUid || (isEmp ? (primary.seekerUid || secondary.seekerUid) : undefined),
    adminUid: primary.adminUid || secondary.adminUid,
    adminName: primary.adminName || secondary.adminName,
    companyName: primary.companyName || secondary.companyName,
    companyIndustry: primary.companyIndustry || secondary.companyIndustry,
    isEmployer: isEmp,
    userRole: isEmp ? "employer" : (primary.userRole || secondary.userRole),
    seekerRole: isEmp ? "employer" : (primary.seekerRole || secondary.seekerRole),
    status: mergedStatus,
    assignedTo: mergedAssignedTo,
    assignedToName: mergedAssignedToName,
    sharedWith: primary.sharedWith || secondary.sharedWith || [],
    messages: mergedMessages
  };
}

// Live Conversation Listener: Subscribes to Firestore real-time snapshots with instant memoryStore caching
export function subscribeToConversations(callback: (conversations: Record<string, Conversation>) => void) {
  let latestFirestoreConvs: Record<string, Conversation> = {};
  let unsubFirestore: (() => void) | null = null;

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

    callback(merged);
  };

  // Immediate synchronous emit for instant load on fresh devices
  emitMerged();

  // Listen to Firestore
  try {
    const collRef = collection(db, "conversations");
    unsubFirestore = onSnapshot(collRef, (snapshot) => {
      const convs: Record<string, Conversation> = {};
      if (!snapshot.empty) {
        snapshot.docs.forEach((d) => {
          const conv = normalizeConversation(d.id, d.data());
          convs[d.id] = conv;
          // Keep memoryStore synchronised so send operations have full message history
          memoryStore.conversations[d.id] = conv;
        });
        memoryStore.save();
      }
      latestFirestoreConvs = convs;
      emitMerged();
    }, (err) => {
      console.warn("Firestore snapshot listener notice in subscribeToConversations:", err);
    });
  } catch (err) {
    console.warn("Firestore subscribeToConversations caught exception:", err);
  }

  // Listen to local memory store updates
  const unsubMemory = memoryStore.subscribe(() => {
    emitMerged();
  });

  return () => {
    if (unsubFirestore) unsubFirestore();
    if (unsubMemory) unsubMemory();
  };
}

// Explicitly refresh all conversations directly from Firestore and check for new messages
export async function refreshConversationsFromFirestore(): Promise<Record<string, Conversation>> {
  try {
    const collRef = collection(db, "conversations");
    const snapshot = await getDocs(collRef);
    const convs: Record<string, Conversation> = {};
    if (!snapshot.empty) {
      snapshot.docs.forEach((d) => {
        const conv = normalizeConversation(d.id, d.data());
        convs[d.id] = conv;
        memoryStore.conversations[d.id] = conv;
      });
      memoryStore.save();
    }
    
    // Merge Firestore conversations with memory store to prevent losing local updates
    const merged: Record<string, Conversation> = {};
    Object.entries(memoryStore.conversations).forEach(([id, c]) => {
      merged[id] = normalizeConversation(id, c);
    });
    Object.entries(convs).forEach(([id, c]) => {
      if (!merged[id]) {
        merged[id] = c;
      } else {
        merged[id] = mergeConversations(merged[id], c);
      }
    });
    return merged;
  } catch (err) {
    console.warn("[refreshConversationsFromFirestore] Error querying fresh conversations:", err);
    return memoryStore.conversations;
  }
}

// Directly fetch latest messages for a conversation from Firestore subcollection and parent doc
export async function fetchLatestConversationMessages(
  chatId: string,
  limitCount: number = 50
): Promise<ChatMessage[]> {
  if (!chatId) return [];
  try {
    const messagesCollRef = collection(db, "conversations", chatId, "messages");
    const q = query(messagesCollRef, orderBy("timestamp", "asc"), limitToLast(limitCount));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const msgs: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data() as ChatMessage;
        const isRead = data.read === true || data.deliveryStatus === "delivered";
        return {
          ...data,
          id: data.id || d.id,
          chatId: data.chatId || chatId,
          read: isRead,
          readAt: data.readAt,
          deliveryStatus: data.deliveryStatus || (isRead ? "delivered" : "sent")
        };
      });
      msgs.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
      if (memoryStore.conversations[chatId]) {
        memoryStore.conversations[chatId].messages = msgs;
        memoryStore.save();
      }
      return msgs;
    } else {
      // Fallback check on parent conversation doc
      const convRef = doc(db, "conversations", chatId);
      const parentSnap = await getDoc(convRef);
      if (parentSnap.exists()) {
        const data = parentSnap.data();
        const legacyMsgs = extractConversationMessages(
          data.messages,
          data.text,
          data.createdAt || data.lastMessageAt,
          data.sender,
          chatId
        );
        if (legacyMsgs.length > 0) {
          if (memoryStore.conversations[chatId]) {
            memoryStore.conversations[chatId].messages = legacyMsgs;
            memoryStore.save();
          }
          return legacyMsgs;
        }
      }
    }
  } catch (err) {
    console.warn(`[fetchLatestConversationMessages] Notice fetching messages for ${chatId}:`, err);
  }

  // Fallback to memoryStore
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    return extractConversationMessages(
      conv.messages,
      conv.text,
      conv.createdAt || conv.lastMessageAt,
      (conv as any).sender,
      chatId
    );
  }
  return [];
}

// Claim a Conversation
export async function claimConversation(chatId: string, userUid: string, userName: string): Promise<boolean> {
  const now = Date.now();
  const systemMsg: ChatMessage = {
    id: generateMessageId(chatId, now),
    chatId,
    sender: "system",
    text: `Chat claimed by ${userName}`,
    timestamp: now
  };

  // Persist system message to subcollection
  saveMessageToSubcollection(chatId, systemMsg).catch((err) =>
    console.warn("[claimConversation] System message subcollection notice:", err)
  );

  // 1. Fetch current conversation state from memory & Firestore
  let existingConv: Conversation | null = memoryStore.conversations[chatId] || null;
  const convRef = doc(db, "conversations", chatId);

  try {
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      const data = docSnap.data() as Conversation;
      if (data.assignedTo && data.assignedTo !== userUid) {
        return false;
      }
      existingConv = normalizeConversation(chatId, data);
    }
  } catch (error) {
    console.warn("Firestore fetch in claimConversation notice:", error);
  }

  // 2. Extract existing messages
  const existingMessages = existingConv 
    ? extractConversationMessages(existingConv.messages, existingConv.text, existingConv.createdAt || existingConv.lastMessageAt, (existingConv as any).sender)
    : [];

  let currentMessages: ChatMessage[] = [...existingMessages, systemMsg];

  // Check top message for Job ID if missing
  let topJobId = existingConv?.jobId || "";
  if (!topJobId) {
    const firstCustomerMsg = currentMessages.find(m => m.sender === "customer" || m.sender === "guest") || currentMessages[0];
    if (firstCustomerMsg?.text) {
      const jobIdMatch = firstCustomerMsg.text.match(/\b(JOB-[A-Za-z0-9_-]+|job-[A-Za-z0-9_-]+)\b/i);
      if (jobIdMatch) {
        topJobId = jobIdMatch[0];
      }
    }
  }

  // 3. Update memoryStore immediately
  const updatedConv: Conversation = {
    chatId,
    customerPhone: existingConv?.customerPhone || chatId,
    sharedWith: existingConv?.sharedWith || [],
    text: existingConv?.text || "",
    jobId: topJobId || existingConv?.jobId || "",
    jobTitle: existingConv?.jobTitle || "",
    createdAt: existingConv?.createdAt || now,
    ...(existingConv || {}),
    assignedTo: userUid,
    assignedToName: userName,
    status: "ongoing",
    claimedAt: now,
    lastMessageAt: now,
    messages: currentMessages
  };

  if (topJobId) {
    updatedConv.jobId = topJobId;
  }

  memoryStore.conversations[chatId] = updatedConv;
  memoryStore.save();

  // 4. Dual Write: Firestore
  const updatePayload: any = {
    assignedTo: userUid,
    assignedToName: userName,
    status: "ongoing",
    claimedAt: now,
    lastMessageAt: now,
    messages: currentMessages
  };

  if (topJobId) {
    updatePayload.jobId = topJobId;
  }

  try {
    await setDoc(convRef, sanitizeForFirestore(updatePayload), { merge: true });
  } catch (error) {
    console.warn("Firestore claimConversation setDoc notice:", error);
  }

  // Trigger system notification for the seeker
  const seekerUid = existingConv?.seekerUid;
  const jobTitle = existingConv?.jobTitle || "your job application";
  if (seekerUid) {
    addSystemNotification({
      type: "conversation_claimed",
      title: "Conversation Claimed",
      message: `Your conversation for "${jobTitle}" has been claimed by ${userName}.`,
      metadata: { chatId, jobId: topJobId, jobTitle, staffName: userName, staffUid: userUid },
      seekerUid
    }).catch(err => console.warn("Failed to notify seeker of claimed conversation", err));

    dispatchWebPushNotification({
      title: "Conversation Claimed",
      body: `Your conversation for "${jobTitle}" has been claimed by ${userName}.`,
      tag: `claimed-${chatId}`,
      targetUserId: seekerUid,
      role: "seeker",
      data: { chatId }
    });
  }

  // Also notify admins of claim
  dispatchWebPushNotification({
    title: "Conversation Claimed",
    body: `Staff member ${userName} claimed conversation for "${jobTitle}".`,
    tag: `admin-claimed-${chatId}`,
    role: "admin",
    data: { chatId }
  });

  return true;
}

// Helper function to broadcast pending conversations to all active staff and admin members
export async function routeToAvailableStaff(): Promise<{ selectedStaffUids: string[]; assignedToOffline: boolean }> {
  const staff = await getStaffProfiles();
  const statuses = await getStaffStatuses();

  // Pending chats are no longer routed to specific staff but broadcasted to all active staff & admins
  const eligibleStaff = staff.filter(s => s.role === "staff" || s.role === "admin");
  let selectedStaffUids = eligibleStaff.map(s => s.uid);

  if (selectedStaffUids.length === 0) {
    selectedStaffUids = Object.values(memoryStore.users || {})
      .filter(u => u.role === "staff" || u.role === "admin")
      .map(u => u.uid);
  }

  if (selectedStaffUids.length === 0) {
    selectedStaffUids = ["staff-demo", "staff-1-seed", "staff-2-seed"];
  }

  const anyOnline = selectedStaffUids.some(uid => 
    (statuses[uid] || memoryStore.staffStatuses[uid]) === "online"
  );

  return { selectedStaffUids, assignedToOffline: !anyOnline };
}

// ==========================================
// SCALABLE WEB PUSH NOTIFICATION DISPATCHER
// Triggers W3C standard Web Push via backend /api/push/broadcast
// Works even when user devices are backgrounded or browser tabs closed
// ==========================================
export async function dispatchWebPushNotification(params: {
  title: string;
  body: string;
  tag?: string;
  role?: "admin" | "staff" | "seeker" | "employer";
  targetUserId?: string;
  data?: Record<string, any>;
}): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/push/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params)
    }).catch(() => {
      // Background fire-and-forget
    });
  } catch {
    // Suppress network notices
  }
}

// Send Chat Message
export async function sendChatMessage(
  chatId: string,
  sender: "customer" | "staff" | "system" | "guest",
  text: string,
  options?: {
    senderUid?: string;
    senderName?: string;
    senderAvatar?: string;
    senderRole?: string;
    attachmentUrl?: string;
    fileType?: string;
    messageId?: string;
    adminUid?: string;
    adminName?: string;
    jobId?: string;
    jobTitle?: string;
    companyName?: string;
    companyIndustry?: string;
    isEmployer?: boolean;
    userRole?: string;
  }
): Promise<ChatMessage> {
  const now = Date.now();
  const messageId = options?.messageId || generateMessageId(chatId, now);

  // Denormalize sender display metadata directly into the message document
  let senderName = options?.senderName;
  let senderAvatar = options?.senderAvatar;
  let senderRole = options?.senderRole;

  if (options?.senderUid && (!senderName || !senderAvatar || !senderRole)) {
    const cachedUser = memoryStore.users[options.senderUid];
    if (cachedUser) {
      if (!senderName) senderName = cachedUser.displayName;
      if (!senderAvatar) senderAvatar = cachedUser.photoURL;
      if (!senderRole) senderRole = cachedUser.role;
    }
  }

  const newMessage: ChatMessage = {
    id: messageId,
    chatId,
    sender,
    text,
    timestamp: now,
    senderUid: options?.senderUid,
    senderName,
    senderAvatar,
    senderRole,
    attachmentUrl: options?.attachmentUrl,
    fileType: options?.fileType,
    deliveryStatus: "sent"
  };

  const sysMsgText = "Conversation re-opened by user and returned to Available Requests queue.";
  let isReinitiated = false;
  let freshStaffUids: string[] = [];
  let targetPhone: string | null = null;

  // 1. Fetch current conversation state (memory-first for speed, fallback to Firestore if uncached)
  let existingConv: Conversation | null = memoryStore.conversations[chatId] || null;
  const convRef = doc(db, "conversations", chatId);

  if (!existingConv) {
    try {
      const docSnap = await getDoc(convRef);
      if (docSnap.exists()) {
        existingConv = normalizeConversation(chatId, docSnap.data());
      }
    } catch (err) {
      console.warn("[sendChatMessage] Firestore fetch notice:", err);
    }
  }

  if (existingConv?.customerPhone) {
    targetPhone = existingConv.customerPhone;
  }

  // Detect if chat is from/with an employer
  const isEmployerChat = Boolean(
    options?.senderRole === "employer" ||
    options?.userRole === "employer" ||
    options?.isEmployer ||
    existingConv?.isEmployer ||
    existingConv?.userRole === "employer" ||
    existingConv?.seekerRole === "employer" ||
    existingConv?.companyName ||
    (existingConv?.chatId && existingConv.chatId.startsWith("employer_")) ||
    chatId.startsWith("employer_")
  );

  // Accurately resolve employer, seeker, and admin identifiers
  let resolvedEmployerUid: string | null = null;
  let resolvedSeekerUid: string | null = null;
  let resolvedAdminUid: string | null = null;

  if (isEmployerChat) {
    if (chatId.startsWith("employer_") && chatId.includes("_admin_")) {
      const parts = chatId.split("_admin_");
      resolvedEmployerUid = parts[0].replace("employer_", "");
      resolvedAdminUid = parts[1] || null;
    }
    if (!resolvedEmployerUid) {
      resolvedEmployerUid = existingConv?.employerUid || existingConv?.seekerUid || null;
    }
    if (!resolvedEmployerUid && (options?.senderRole === "employer" || sender === "customer")) {
      resolvedEmployerUid = options?.senderUid || auth.currentUser?.uid || null;
    }
    resolvedSeekerUid = resolvedEmployerUid;

    if (!resolvedAdminUid) {
      resolvedAdminUid = options?.adminUid || existingConv?.adminUid || existingConv?.assignedStaffUid || existingConv?.assignedTo || null;
    }
    if (!resolvedAdminUid && sender === "staff") {
      resolvedAdminUid = options?.senderUid || auth.currentUser?.uid || null;
    }
  } else {
    resolvedSeekerUid = existingConv?.seekerUid || null;
    if (!resolvedSeekerUid && (sender === "customer" || sender === "guest" || options?.senderRole === "seeker")) {
      resolvedSeekerUid = options?.senderUid || auth.currentUser?.uid || null;
    }
    if (!resolvedSeekerUid && chatId.startsWith("c_")) {
      const parts = chatId.split("_");
      if (parts.length >= 3) {
        resolvedSeekerUid = parts.slice(2).join("_");
      }
    }
  }

  // 2. Extract full existing message history
  const existingMessages: ChatMessage[] = existingConv
    ? extractConversationMessages(existingConv.messages, existingConv.text, existingConv.createdAt || existingConv.lastMessageAt, (existingConv as any).sender, chatId)
    : [];

  let updatedStatus = existingConv?.status || "pending";
  let assignedTo = existingConv?.assignedTo !== undefined ? existingConv.assignedTo : null;
  let assignedToName = existingConv?.assignedToName !== undefined ? existingConv.assignedToName : null;
  let sharedWith = existingConv?.sharedWith || [];
  let isNewlyClaimedByStaff = false;

  const newMessagesList: ChatMessage[] = [...existingMessages];
  let claimSysMsg: ChatMessage | null = null;
  let reopenSysMsg: ChatMessage | null = null;

  if (isEmployerChat) {
    let targetAdminUid = resolvedAdminUid || options?.adminUid || existingConv?.adminUid || existingConv?.assignedStaffUid || existingConv?.assignedTo;
    let targetAdminName = options?.adminName || existingConv?.adminName || existingConv?.assignedStaffName || existingConv?.assignedToName;

    if (targetAdminUid && !targetAdminName) {
      const cachedUser = memoryStore.users[targetAdminUid];
      if (cachedUser) {
        targetAdminName = cachedUser.displayName || cachedUser.email || "Administrator";
      }
    }

    if (!targetAdminName && targetAdminUid) {
      targetAdminName = "Administrator";
    }

    updatedStatus = "ongoing";
    assignedTo = targetAdminUid || assignedTo || "admin-support";
    assignedToName = targetAdminName || assignedToName || "Administrator";
    sharedWith = targetAdminUid ? [targetAdminUid] : (sharedWith.length > 0 ? sharedWith : ["admin-support"]);
  } else if (sender === "staff") {
    // Auto-claim and switch status to 'ongoing' if a staff member sends a message to a pending or unassigned chat
    if (updatedStatus === "pending" || !assignedTo) {
      updatedStatus = "ongoing";
      assignedTo = options?.senderUid || auth.currentUser?.uid || assignedTo || "staff-member";
      assignedToName = options?.senderName || auth.currentUser?.displayName || assignedToName || "Staff Member";
      isNewlyClaimedByStaff = true;

      claimSysMsg = {
        id: generateMessageId(chatId, now - 1),
        chatId,
        sender: "system",
        text: `Chat claimed by ${assignedToName}`,
        timestamp: now - 1,
        deliveryStatus: "sent"
      };
      newMessagesList.push(claimSysMsg);
    }
  }

  const isAbandoned = !isEmployerChat && (existingConv?.status === "abandoned" || existingConv?.status === "finished");

  if ((sender === "customer" || sender === "guest") && isAbandoned) {
    isReinitiated = true;
    const routed = await routeToAvailableStaff();
    freshStaffUids = routed.selectedStaffUids;
    updatedStatus = "pending";
    assignedTo = null;
    assignedToName = null;
    sharedWith = freshStaffUids;

    reopenSysMsg = {
      id: generateMessageId(chatId, now - 1),
      chatId,
      sender: "system",
      text: sysMsgText,
      timestamp: now - 1,
      deliveryStatus: "sent"
    };
    newMessagesList.push(reopenSysMsg);
  }

  newMessagesList.push(newMessage);
  const finalMessages = newMessagesList;

  const employerBusinessName = isEmployerChat
    ? (existingConv?.companyName ||
       options?.companyName || 
       (options?.senderRole === "employer" ? (options?.senderName || "Employer Business") : undefined) ||
       existingConv?.name || 
       "Employer Business")
    : undefined;

  // 3. Update memoryStore immediately
  const updatedConvData: Conversation = {
    ...(existingConv || {}),
    chatId,
    customerPhone: isEmployerChat ? (employerBusinessName || targetPhone || chatId) : (targetPhone || chatId),
    name: isEmployerChat ? employerBusinessName : (existingConv?.name || (sender === "customer" ? senderName : undefined)),
    companyName: isEmployerChat ? employerBusinessName : existingConv?.companyName,
    companyIndustry: options?.companyIndustry || existingConv?.companyIndustry,
    isEmployer: isEmployerChat ? true : existingConv?.isEmployer,
    userRole: isEmployerChat ? "employer" : (existingConv?.userRole || "seeker"),
    seekerRole: isEmployerChat ? "employer" : (existingConv?.seekerRole || "seeker"),
    seekerUid: resolvedSeekerUid || existingConv?.seekerUid || null,
    employerUid: isEmployerChat ? (resolvedEmployerUid || existingConv?.employerUid || null) : (existingConv?.employerUid || null),
    adminUid: isEmployerChat ? (assignedTo || existingConv?.adminUid || resolvedAdminUid) : existingConv?.adminUid,
    adminName: isEmployerChat ? (assignedToName || existingConv?.adminName) : existingConv?.adminName,
    assignedStaffUid: isEmployerChat ? (assignedTo || existingConv?.assignedStaffUid || resolvedAdminUid) : existingConv?.assignedStaffUid,
    assignedStaffName: isEmployerChat ? (assignedToName || existingConv?.assignedStaffName) : existingConv?.assignedStaffName,
    sharedWith,
    text,
    jobId: existingConv?.jobId || (isEmployerChat ? "admin-support" : ""),
    jobTitle: existingConv?.jobTitle || (isEmployerChat ? `Admin Support (${assignedToName || "Admin"})` : ""),
    createdAt: existingConv?.createdAt || now,
    lastMessageAt: now,
    status: isEmployerChat ? "ongoing" : updatedStatus,
    assignedTo,
    assignedToName,
    claimedAt: (existingConv as any)?.claimedAt || (isNewlyClaimedByStaff || isEmployerChat ? now : undefined),
    messages: finalMessages
  };

  if (isReinitiated) {
    delete (updatedConvData as any).abandonedAt;
    delete (updatedConvData as any).finishedAt;
    updatedConvData.createdAt = now;
  }

  memoryStore.conversations[chatId] = updatedConvData;
  memoryStore.save();

  // 4. Persistence: Parallel direct subcollection write & parent document update
  const fsUpdatePayload: any = sanitizeForFirestore({
    chatId,
    customerPhone: isEmployerChat ? (employerBusinessName || targetPhone || "Employer") : (targetPhone || existingConv?.customerPhone || "Chat"),
    name: isEmployerChat ? (employerBusinessName || "Employer") : (existingConv?.name || targetPhone || "Chat"),
    jobId: options?.jobId || existingConv?.jobId || (isEmployerChat ? "admin-support" : "general-inquiry"),
    jobTitle: options?.jobTitle || existingConv?.jobTitle || (isEmployerChat ? `Admin Support (${assignedToName || "Admin"})` : "General Inquiry"),
    seekerUid: resolvedSeekerUid || existingConv?.seekerUid || null,
    employerUid: isEmployerChat ? (resolvedEmployerUid || existingConv?.employerUid || null) : (existingConv?.employerUid || null),
    userRole: isEmployerChat ? "employer" : (existingConv?.userRole || "seeker"),
    seekerRole: isEmployerChat ? "employer" : (existingConv?.seekerRole || "seeker"),
    isEmployer: isEmployerChat,
    text,
    createdAt: existingConv?.createdAt || now,
    lastMessageAt: now,
    status: isEmployerChat ? "ongoing" : updatedStatus,
    assignedTo: assignedTo || null,
    assignedToName: assignedToName || null,
    sharedWith: sharedWith || (assignedTo ? [assignedTo] : []),
    adminUid: isEmployerChat ? (assignedTo || resolvedAdminUid || null) : (existingConv?.adminUid || null),
    adminName: isEmployerChat ? (assignedToName || null) : (existingConv?.adminName || null),
    assignedStaffUid: isEmployerChat ? (assignedTo || resolvedAdminUid || null) : (existingConv?.assignedStaffUid || null),
    assignedStaffName: isEmployerChat ? (assignedToName || null) : (existingConv?.assignedStaffName || null),
    companyName: isEmployerChat ? (employerBusinessName || options?.companyName || existingConv?.companyName) : existingConv?.companyName,
    companyIndustry: options?.companyIndustry || existingConv?.companyIndustry,
    isInApp: true,
    messages: finalMessages
  });

  if (isEmployerChat) {
    fsUpdatePayload.isEmployer = true;
    fsUpdatePayload.userRole = "employer";
    fsUpdatePayload.seekerRole = "employer";
    fsUpdatePayload.companyName = employerBusinessName;
    fsUpdatePayload.name = employerBusinessName;
    fsUpdatePayload.customerPhone = employerBusinessName;
    fsUpdatePayload.employerUid = resolvedEmployerUid || existingConv?.employerUid || null;
    fsUpdatePayload.seekerUid = resolvedEmployerUid || existingConv?.seekerUid || null;
    fsUpdatePayload.adminUid = assignedTo || resolvedAdminUid || null;
    fsUpdatePayload.adminName = assignedToName || null;
    fsUpdatePayload.assignedStaffUid = assignedTo || resolvedAdminUid || null;
    fsUpdatePayload.assignedStaffName = assignedToName || null;
    if (options?.companyIndustry || existingConv?.companyIndustry) {
      fsUpdatePayload.companyIndustry = options?.companyIndustry || existingConv?.companyIndustry;
    }
  }

  if (isNewlyClaimedByStaff || isEmployerChat || (sender === "staff" && !(existingConv as any)?.claimedAt)) {
    fsUpdatePayload.claimedAt = now;
  }

  if (isReinitiated) {
    fsUpdatePayload.createdAt = now;
    fsUpdatePayload.abandonedAt = null;
    fsUpdatePayload.finishedAt = null;
  }

  const messageToWrite: ChatMessage = { ...newMessage, deliveryStatus: "sent" };
  const writePromises: Promise<any>[] = [
    saveMessageToSubcollection(chatId, messageToWrite),
    setDoc(convRef, sanitizeForFirestore({
      ...fsUpdatePayload,
      messages: finalMessages.map(m => m.id === messageId ? messageToWrite : m)
    }), { merge: true })
  ];

  if (claimSysMsg) {
    writePromises.push(saveMessageToSubcollection(chatId, claimSysMsg));
  }
  if (reopenSysMsg) {
    writePromises.push(saveMessageToSubcollection(chatId, reopenSysMsg));
  }

  try {
    await Promise.all(writePromises);
    newMessage.deliveryStatus = "sent";

    // Synchronize memory store and notify all local listeners immediately so tick flips to 'sent'
    if (memoryStore.conversations[chatId]) {
      const conv = memoryStore.conversations[chatId];
      if (Array.isArray(conv.messages)) {
        const idx = conv.messages.findIndex((m: ChatMessage) => m.id === messageId);
        if (idx !== -1) {
          conv.messages[idx] = { ...conv.messages[idx], deliveryStatus: "sent" };
        }
      }
      memoryStore.save();
    }

    if (isReinitiated && freshStaffUids.length > 0) {
      freshStaffUids.forEach(uid => {
        addSystemNotification({
          type: "awaiting_claim",
          title: "Re-initiated Chat Awaiting Claim",
          message: `Abandoned chat with ${existingConv?.customerPhone || "Customer"} (Job: ${existingConv?.jobTitle || "Job"}) was re-initiated by user and assigned to 5 available staff for claim.`,
          metadata: { chatId, customerPhone: existingConv?.customerPhone, jobId: existingConv?.jobId, jobTitle: existingConv?.jobTitle },
          staffUid: uid
        }).catch(err => console.warn("Failed to log re-initiated notification", err));
      });
    }
  } catch (error: any) {
    console.warn("Firestore parallel message write notice (persisting in local store):", error);
    handleFirestoreError(error, OperationType.WRITE, `conversations/${chatId}`);
    
    // Ensure the message remains confirmed and delivered in local memory storage
    newMessage.deliveryStatus = "sent";
    if (memoryStore.conversations[chatId]) {
      const conv = memoryStore.conversations[chatId];
      if (Array.isArray(conv.messages)) {
        const idx = conv.messages.findIndex((m: ChatMessage) => m.id === messageId);
        if (idx !== -1) {
          conv.messages[idx] = { ...conv.messages[idx], deliveryStatus: "sent" };
        }
      }
      memoryStore.save();
    }
  }

  // Scalable Web Push Dispatch: alerts the recipient even if their browser is minimized or mobile device is asleep
  if (sender === "customer" || sender === "guest") {
    // Alert assigned staff or all available staff
    dispatchWebPushNotification({
      title: `Message from ${targetPhone || 'Candidate'}`,
      body: `[${existingConv?.jobTitle || 'Chat'}] ${text || 'Sent an attachment'}`,
      tag: `msg-${chatId}`,
      targetUserId: assignedTo || undefined,
      role: assignedTo ? undefined : "staff",
      data: { chatId, sender }
    });
  } else if (sender === "staff") {
    // Alert job seeker
    dispatchWebPushNotification({
      title: "Valley Reigns Support",
      body: `[${existingConv?.jobTitle || 'Chat'}] ${text || 'Sent an attachment'}`,
      tag: `msg-${chatId}`,
      targetUserId: existingConv?.seekerUid || undefined,
      role: "seeker",
      data: { chatId, sender }
    });
  }

  return newMessage;
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
    await setDoc(convRef, {
      typing: {
        [userId]: { isTyping, name: userName, updatedAt: Date.now() }
      }
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore updateTypingStatus failed:", err);
  }
}

// Force reassign or release assignment (Admin utility)
export async function forceReassignConversation(chatId: string, targetStaffUid: string | null = null, targetStaffName: string | null = null): Promise<void> {
  const now = Date.now();
  const sysMsg: ChatMessage = {
    id: generateMessageId(chatId, now),
    chatId,
    sender: "system",
    text: targetStaffUid 
      ? `Conversation reassigned to ${targetStaffName} by Admin.` 
      : "Conversation released back to the Available Requests queue by Admin.",
    timestamp: now
  };

  saveMessageToSubcollection(chatId, sysMsg).catch((err) =>
    console.warn("[forceReassignConversation] Subcollection notice:", err)
  );

  // 1. Retrieve existing conversation state
  let existingConv: Conversation | null = memoryStore.conversations[chatId] || null;
  const convRef = doc(db, "conversations", chatId);

  try {
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      existingConv = normalizeConversation(chatId, docSnap.data());
    }
  } catch (err) {
    console.warn("Firestore fetch in forceReassignConversation notice:", err);
  }

  const oldStaffUid = existingConv?.assignedTo || null;
  const oldStaffName = existingConv?.assignedToName || null;

  const existingMessages = existingConv 
    ? extractConversationMessages(existingConv.messages, existingConv.text, existingConv.createdAt || existingConv.lastMessageAt, (existingConv as any).sender, chatId)
    : [];

  const currentMessages = [...existingMessages, sysMsg];

  // 2. Update memoryStore
  if (existingConv) {
    existingConv.assignedTo = targetStaffUid;
    existingConv.assignedToName = targetStaffName;
    existingConv.status = targetStaffUid ? "ongoing" : "pending";
    existingConv.createdAt = now;
    existingConv.lastMessageAt = now;
    delete existingConv.abandonedAt;
    delete existingConv.finishedAt;
    existingConv.messages = currentMessages;
    memoryStore.conversations[chatId] = existingConv;
    memoryStore.save();
  }

  // 3. Dual Write: Firestore
  const updatePayload: any = sanitizeForFirestore({
    assignedTo: targetStaffUid || null,
    assignedToName: targetStaffName || null,
    status: targetStaffUid ? "ongoing" : "pending",
    createdAt: now,
    lastMessageAt: now,
    abandonedAt: null,
    finishedAt: null,
    messages: currentMessages
  });

  try {
    await setDoc(convRef, updatePayload, { merge: true });
  } catch (error) {
    console.warn("Firestore forceReassignConversation failed:", error);
  }

  // Trigger system notification for staff and seeker
  if (targetStaffUid) {
    addSystemNotification({
      type: "transferred_conversation",
      title: "Conversation Assigned by Admin",
      message: oldStaffUid 
        ? `A conversation with ${existingConv?.customerPhone || "Customer"} previously assigned to ${oldStaffName || "another staff member"} has been transferred to you by the Admin.`
        : `A conversation with ${existingConv?.customerPhone || "Customer"} has been assigned to you by the Admin.`,
      metadata: { chatId, oldStaffUid, targetStaffUid },
      staffUid: targetStaffUid
    }).catch(err => console.warn("Failed to log reassignment notification", err));

    if (oldStaffUid && oldStaffUid !== targetStaffUid) {
      addSystemNotification({
        type: "transferred_conversation",
        title: "Conversation Transferred by Admin",
        message: `Your conversation with ${existingConv?.customerPhone || "Customer"} has been transferred to ${targetStaffName} by the Admin.`,
        metadata: { chatId, oldStaffUid, targetStaffUid },
        staffUid: oldStaffUid
      }).catch(err => console.warn("Failed to log transfer notification for old staff", err));
    }
  } else if (oldStaffUid) {
    addSystemNotification({
      type: "transferred_conversation",
      title: "Conversation Released by Admin",
      message: `Your conversation with ${existingConv?.customerPhone || "Customer"} has been released back to the Available Requests queue by the Admin.`,
      metadata: { chatId, oldStaffUid },
      staffUid: oldStaffUid
    }).catch(err => console.warn("Failed to log release notification for old staff", err));
  }

  const seekerUid = existingConv?.seekerUid;
  const jobTitle = existingConv?.jobTitle || "your job application";
  if (seekerUid) {
    if (targetStaffUid) {
      addSystemNotification({
        type: "conversation_transferred",
        title: "Conversation Transferred",
        message: `Your conversation for "${jobTitle}" has been transferred to recruiter ${targetStaffName}.`,
        metadata: { chatId, jobId: existingConv?.jobId || "", jobTitle, staffUid: targetStaffUid, staffName: targetStaffName },
        seekerUid
      }).catch(err => console.warn("Failed to notify seeker of transfer", err));
    } else {
      addSystemNotification({
        type: "conversation_transferred",
        title: "Conversation Released",
        message: `Your conversation for "${jobTitle}" has been released back to the queue. A new recruiter will claim it shortly.`,
        metadata: { chatId, jobId: existingConv?.jobId || "", jobTitle },
        seekerUid
      }).catch(err => console.warn("Failed to notify seeker of transfer", err));
    }
  }
}

// Update conversation status (e.g. finished, abandoned)
export async function updateConversationStatus(chatId: string, status: "pending" | "ongoing" | "finished" | "abandoned", isSLA: boolean = false): Promise<void> {
  const now = Date.now();
  const sysMsg: ChatMessage = {
    id: generateMessageId(chatId, now),
    chatId,
    sender: "system",
    text: isSLA 
      ? `Conversation automatically marked as ABANDONED due to SLA timeout.` 
      : `Conversation status set to: ${status.toUpperCase()}`,
    timestamp: now
  };

  saveMessageToSubcollection(chatId, sysMsg).catch((err) =>
    console.warn("[updateConversationStatus] Subcollection notice:", err)
  );

  // 1. Retrieve existing conversation state
  let existingConv: Conversation | null = memoryStore.conversations[chatId] || null;
  const convRef = doc(db, "conversations", chatId);

  try {
    const docSnap = await getDoc(convRef);
    if (docSnap.exists()) {
      existingConv = normalizeConversation(chatId, docSnap.data());
    }
  } catch (err) {
    console.warn("Firestore fetch in updateConversationStatus notice:", err);
  }

  const existingMessages = existingConv 
    ? extractConversationMessages(existingConv.messages, existingConv.text, existingConv.createdAt || existingConv.lastMessageAt, (existingConv as any).sender, chatId)
    : [];

  const currentMessages = [...existingMessages, sysMsg];

  // 2. Update memoryStore
  if (existingConv) {
    existingConv.status = status;
    if (status === "abandoned") {
      existingConv.abandonedAt = now;
    } else if (status === "finished") {
      existingConv.finishedAt = now;
    } else if (status === "pending" || status === "ongoing") {
      existingConv.createdAt = now;
      existingConv.lastMessageAt = now;
      delete existingConv.abandonedAt;
      delete existingConv.finishedAt;
      if (status === "pending") {
        existingConv.assignedTo = null;
        existingConv.assignedToName = null;
      }
    }
    existingConv.messages = currentMessages;
    memoryStore.conversations[chatId] = existingConv;
    memoryStore.save();
  }

  // 3. Dual Write: Firestore
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

  const updatePayload: any = sanitizeForFirestore({
    status,
    messages: currentMessages,
    ...additionalFields
  });

  try {
    await setDoc(convRef, updatePayload, { merge: true });
  } catch (error) {
    console.warn("Firestore updateConversationStatus failed:", error);
  }

  // Trigger system notifications
  if (!isSLA && (status === "finished" || status === "abandoned")) {
    const staffName = existingConv?.assignedToName || "Staff Member";
    const title = status === "finished" ? "Conversation Finished" : "Conversation Closed";
    const type = status === "finished" ? "finished_conversation" : "closed_conversation";
    addSystemNotification({
      type,
      title,
      message: `${staffName} marked conversation with ${existingConv?.customerPhone || "Customer"} as ${status}.`,
      metadata: { chatId, staffName, status },
      staffUid: existingConv?.assignedTo || undefined
    }).catch(err => console.warn("Failed to log status update notification", err));
  }

  const seekerUid = existingConv?.seekerUid;
  if (seekerUid && (status === "finished" || status === "abandoned")) {
    const staffName = existingConv?.assignedToName || "Staff Member";
    const jobTitle = existingConv?.jobTitle || "your job application";
    const seekerNotifType = status === "finished" ? "conversation_finished" : "conversation_closed";
    const seekerNotifTitle = status === "finished" ? "Conversation Finished" : "Conversation Closed";
    const seekerNotifMsg = status === "finished" 
      ? `Your conversation for "${jobTitle}" has been finished by ${staffName}.`
      : `Your conversation for "${jobTitle}" has been closed.`;
      
    addSystemNotification({
      type: seekerNotifType,
      title: seekerNotifTitle,
      message: seekerNotifMsg,
      metadata: { chatId, jobId: existingConv?.jobId || "", jobTitle, status, staffName },
      seekerUid
    }).catch(err => console.warn("Failed to notify seeker of conversation close/finish", err));
  }
}

// ==========================================
// APP SETTINGS SERVICES (Configurable Timeout)
// ==========================================
export function getCachedAppSettingsTimeout(): number {
  if (memoryStore.appSettings?.unclaimedChatTimeoutHours && Number(memoryStore.appSettings.unclaimedChatTimeoutHours) > 0) {
    const val = Number(memoryStore.appSettings.unclaimedChatTimeoutHours);
    return val > 72 ? 72 : val;
  }
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("vr_app_settings") : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.unclaimedChatTimeoutHours && Number(parsed.unclaimedChatTimeoutHours) > 0) {
        const val = Number(parsed.unclaimedChatTimeoutHours);
        return val > 72 ? 72 : val;
      }
    }
  } catch {
    // fallback
  }
  return 24;
}

export function subscribeToAppSettings(callback: (settings: AppSettings) => void): () => void {
  const current = memoryStore.appSettings || { unclaimedChatTimeoutHours: 24 };
  callback(current);

  const handleLocalUpdate = (e: Event) => {
    const customEvent = e as CustomEvent<AppSettings>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    } else {
      callback(memoryStore.appSettings || { unclaimedChatTimeoutHours: 24 });
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("vr_app_settings_updated", handleLocalUpdate);
  }

  let unsubFirestore: (() => void) | null = null;
  try {
    const docRef = doc(db, "app_settings", "general");
    unsubFirestore = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as AppSettings;
        memoryStore.appSettings = { ...memoryStore.appSettings, ...data };
        memoryStore.save();
        callback(memoryStore.appSettings);
      }
    }, (err) => {
      console.warn("Firestore subscribeToAppSettings listener notice:", err);
    });
  } catch (err) {
    console.warn("Firestore subscribeToAppSettings exception:", err);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener("vr_app_settings_updated", handleLocalUpdate);
    }
    if (unsubFirestore) {
      unsubFirestore();
    }
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  try {
    const docRef = doc(db, "app_settings", "general");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AppSettings;
      if (data.unclaimedChatTimeoutHours && Number(data.unclaimedChatTimeoutHours) > 72) {
        data.unclaimedChatTimeoutHours = 72;
      }
      memoryStore.appSettings = { ...memoryStore.appSettings, ...data };
      memoryStore.save();
      return memoryStore.appSettings;
    }
  } catch (err) {
    console.warn("Firestore getAppSettings notice:", err);
  }
  return memoryStore.appSettings || { unclaimedChatTimeoutHours: 24 };
}

export async function saveAppSettings(newSettings: Partial<AppSettings>): Promise<AppSettings> {
  const sanitized: Partial<AppSettings> = { ...newSettings };
  if (sanitized.unclaimedChatTimeoutHours !== undefined) {
    const raw = Number(sanitized.unclaimedChatTimeoutHours);
    sanitized.unclaimedChatTimeoutHours = Math.min(72, Math.max(1, isNaN(raw) ? 24 : raw));
  }
  const merged: AppSettings = {
    ...memoryStore.appSettings,
    ...sanitized,
    updatedAt: Date.now(),
  };
  memoryStore.appSettings = merged;
  memoryStore.save();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("vr_app_settings_updated", { detail: merged }));
  }

  try {
    const docRef = doc(db, "app_settings", "general");
    await setDoc(docRef, sanitizeForFirestore(merged), { merge: true });
  } catch (err) {
    console.warn("Firestore saveAppSettings notice:", err);
  }
  return merged;
}

// Automatically enforce SLA time limits for chats:
// - Unclaimed Chats: Moved to abandoned after configured hours (default 24 hours)
// - Ongoing chats: Never automatically marked as abandoned when SLA timer elapses; only pending chats will
export async function checkAndEnforceSLAs(): Promise<void> {
  const now = Date.now();
  const settings = await getAppSettings();
  const timeoutHours = Number(settings.unclaimedChatTimeoutHours) > 0 ? Number(settings.unclaimedChatTimeoutHours) : 24;
  const unclaimedTimeoutMs = timeoutHours * 3600 * 1000;

  // Check local memoryStore
  const convs = Object.values(memoryStore.conversations);
  for (const conv of convs) {
    // Only pending chats are marked as abandoned when SLA countdown elapses; ongoing chats are never abandoned
    if (conv.status !== "pending") continue;

    const age = now - (conv.createdAt || conv.lastMessageAt || now);
    let shouldAbandon = false;
    let reason = "";
    let message = "";
    let title = "";

    // Unclaimed pending chat exceeded admin-configured threshold
    if (!conv.assignedTo && age > unclaimedTimeoutMs) {
      shouldAbandon = true;
      reason = `unclaimed_${timeoutHours}_hours`;
      title = `Chat Abandoned (${timeoutHours}h Unclaimed)`;
      message = `In-app conversation with ${conv.customerPhone || conv.name || "applicant"} (Job: ${conv.jobTitle || "General"}) was automatically moved to abandoned after ${timeoutHours} hours without staff claim.`;
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
      // Only pending chats are marked as abandoned when SLA countdown elapses; ongoing chats are never abandoned
      if (conv.status !== "pending") continue;

      const age = now - (conv.createdAt || conv.lastMessageAt || now);
      let shouldAbandon = false;
      let reason = "";
      let message = "";
      let title = "";

      if (!conv.assignedTo && age > unclaimedTimeoutMs) {
        shouldAbandon = true;
        reason = `unclaimed_${timeoutHours}_hours`;
        title = `Chat Abandoned (${timeoutHours}h Unclaimed)`;
        message = `In-app conversation with ${conv.customerPhone || conv.name || "applicant"} (Job: ${conv.jobTitle || "General"}) was automatically moved to abandoned after ${timeoutHours} hours without staff claim.`;
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
}

export async function batchDeleteConversations(chatIds: string[]): Promise<void> {
  await Promise.all(chatIds.map(id => deleteConversation(id)));
}

export async function batchResetConversations(chatIds: string[]): Promise<void> {
  await Promise.all(chatIds.map(id => updateConversationStatus(id, "pending")));
}

export async function clearAllConversations(): Promise<void> {
  memoryStore.conversations = {};
  memoryStore.save();

  try {
    const collRef = collection(db, "conversations");
    const snap = await getDocs(collRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (err) {
    console.warn("Firestore clearAllConversations failed:", err);
  }
}

// ==========================================
// CUSTOMER CONTACTS MANAGEMENT SERVICES
// ==========================================
export async function saveContact(customerPhone: string, jobTitle?: string, name?: string): Promise<void> {
  const phoneStr = String(customerPhone || "").trim();
  if (!phoneStr) return;
  const id = (phoneStr || "").replace(/[^0-9+]/g, "") || `contact-${Date.now()}`;
  const now = Date.now();

  const existingInMem = memoryStore.contacts ? memoryStore.contacts[id] : undefined;
  const contact: CustomerContact = {
    id,
    customerPhone: phoneStr,
    name: name || existingInMem?.name || phoneStr,
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
        lastJobTitle: "Lead Cloud Solutions Architect",
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
  const now = Date.now();
  const sysMsg: ChatMessage = {
    id: generateMessageId(chatId, now),
    chatId,
    sender: "system",
    text: "Conversation history cleared.",
    timestamp: now
  };
  
  // 1. Update memory store
  const conv = memoryStore.conversations[chatId];
  if (conv) {
    conv.messages = [sysMsg];
    conv.text = "Conversation history cleared.";
    memoryStore.save();
  }

  // 2. Subcollection: Clear messages and save cleared marker
  try {
    const msgsCollRef = collection(db, "conversations", chatId, "messages");
    const snap = await getDocs(msgsCollRef);
    const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
    await saveMessageToSubcollection(chatId, sysMsg);
  } catch (err) {
    console.warn("Firestore subcollection clear messages failed:", err);
  }

  // 3. Update Firestore parent document
  try {
    const convRef = doc(db, "conversations", chatId);
    await setDoc(convRef, {
      messages: [sysMsg],
      text: "Conversation history cleared.",
      lastMessageAt: now
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore clear messages failed:", err);
  }
}

// Report conversation
export async function reportConversation(chatId: string, reason: string): Promise<void> {
  const now = Date.now();
  const sysMsg: ChatMessage = {
    id: generateMessageId(chatId, now),
    chatId,
    sender: "system",
    text: `Conversation reported. Reason: ${reason}`,
    timestamp: now
  };

  // Persist to subcollection
  saveMessageToSubcollection(chatId, sysMsg).catch((err) =>
    console.warn("[reportConversation] Subcollection notice:", err)
  );

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
    await setDoc(convRef, sanitizeForFirestore({
      isReported: true,
      messages: conv ? (Array.isArray(conv.messages) ? conv.messages : [sysMsg]) : [sysMsg]
    }), { merge: true });
  } catch (err) {
    console.warn("Firestore report conversation failed:", err);
  }
}

// Webhook simulation / customer message generator
export async function simulateIncomingChat(
  customerPhone: string, 
  text: string, 
  jobId: string, 
  jobTitle: string, 
  seekerUid?: string,
  directStaffUid?: string
): Promise<string> {
  // Fetch direct assigned staff if provided
  let targetStaff: UserProfile | null = null;
  if (directStaffUid) {
    targetStaff = memoryStore.users[directStaffUid] || await getUserProfile(directStaffUid);
  }

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
    // If conversation was pending and we now have a direct staff assignment, assign directly
    if (directStaffUid && existingConv.status === "pending") {
      const staffName = targetStaff?.displayName || "Staff Specialist";
      existingConv.status = "ongoing";
      existingConv.assignedTo = directStaffUid;
      existingConv.assignedToName = staffName;
      existingConv.sharedWith = [directStaffUid];
      memoryStore.conversations[existingConv.chatId] = existingConv;
      memoryStore.save();
      try {
        const convRef = doc(db, "conversations", existingConv.chatId);
        await updateDoc(convRef, {
          status: "ongoing",
          assignedTo: directStaffUid,
          assignedToName: staffName,
          sharedWith: [directStaffUid]
        });
      } catch (err) {
        console.warn("Error updating existing conv assignment:", err);
      }
    }

    // Re-use existing conversation
    await saveContact(customerPhone, jobTitle);
    await sendChatMessage(existingConv.chatId, "customer", text);
    return existingConv.chatId;
  }

  // Save/update customer contact
  await saveContact(customerPhone, jobTitle);

  const chatId = `chat-${Date.now()}`;
  const now = Date.now();
  const actualSeekerUid = seekerUid || auth.currentUser?.uid || undefined;
  const initialMessage: ChatMessage = {
    id: generateMessageId(chatId, now),
    chatId,
    sender: "customer",
    text,
    timestamp: now,
    senderUid: actualSeekerUid
  };

  // Persist initial message immediately to subcollection
  saveMessageToSubcollection(chatId, initialMessage).catch(err =>
    console.warn("[simulateIncomingChat] Initial message subcollection notice:", err)
  );

  // --- Dynamic Chat Routing Logic vs Direct Staff Assignment ---
  const isDirectAssigned = Boolean(directStaffUid);
  const assignedStaffName = targetStaff?.displayName || "Staff Specialist";

  let selectedStaffUids: string[] = [];
  let assignedToOffline = false;

  if (isDirectAssigned && directStaffUid) {
    selectedStaffUids = [directStaffUid];
  } else {
    const routeRes = await routeToAvailableStaff();
    selectedStaffUids = routeRes.selectedStaffUids;
    assignedToOffline = routeRes.assignedToOffline;
  }

  const isAppChat = (customerPhone ? !customerPhone.startsWith("+") : true) || Boolean(actualSeekerUid);

  const conversationMessages: ChatMessage[] = [initialMessage];

  if (isDirectAssigned && directStaffUid) {
    const assignSystemMsg: ChatMessage = {
      id: generateMessageId(chatId, now + 1),
      chatId,
      sender: "system",
      text: `Chat automatically assigned to ${assignedStaffName} via direct referral link.`,
      timestamp: now + 1
    };
    conversationMessages.push(assignSystemMsg);
    saveMessageToSubcollection(chatId, assignSystemMsg).catch(err =>
      console.warn("[simulateIncomingChat] Direct assignment system message subcollection notice:", err)
    );
  }

  const conversation: Conversation = {
    chatId,
    customerPhone,
    status: isDirectAssigned ? "ongoing" : "pending",
    assignedTo: isDirectAssigned && directStaffUid ? directStaffUid : null,
    assignedToName: isDirectAssigned ? assignedStaffName : null,
    sharedWith: selectedStaffUids,
    text,
    jobId,
    jobTitle,
    createdAt: now,
    lastMessageAt: now,
    messages: conversationMessages,
    assignedToOffline: isDirectAssigned ? false : assignedToOffline,
    isInApp: isAppChat,
    seekerUid: actualSeekerUid || null
  };

  // 1. Memory Fallback State
  memoryStore.conversations[chatId] = conversation;
  memoryStore.save();

  if (isDirectAssigned && directStaffUid) {
    // Notify the assigned staff member directly
    addSystemNotification({
      type: "conversation_claimed",
      title: "Direct Referral Inquiry Assigned",
      message: `A candidate inquiry from ${customerPhone} for "${jobTitle}" has been directly assigned to you via your link.`,
      metadata: { chatId, customerPhone, jobId, jobTitle },
      staffUid: directStaffUid
    }).catch(err => console.warn("direct assigned staff notification failed", err));

    // Trigger seeker notification
    if (actualSeekerUid) {
      addSystemNotification({
        type: "conversation_started",
        title: "Direct Conversation Started",
        message: `You connected directly with ${assignedStaffName} regarding "${jobTitle}". They will reply soon!`,
        metadata: { chatId, customerPhone, jobId, jobTitle, assignedStaffUid: directStaffUid },
        seekerUid: actualSeekerUid
      }).catch(err => console.warn("failed to log conversation started for seeker " + actualSeekerUid, err));
    }
  } else {
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
  }

  // 2. Persistence: Write to Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    await setDoc(convRef, sanitizeForFirestore(conversation));
  } catch (error) {
    console.warn("Firestore simulateIncomingChat failed:", error);
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
    await setDoc(doc(db, "system_notifications", newNotification.id), sanitizeForFirestore(newNotification));
  } catch (error) {
    console.warn("Firestore addSystemNotification failing, saving in fallback:", error);
  }

  if (!memoryStore.systemNotifications) {
    memoryStore.systemNotifications = [];
  }
  memoryStore.systemNotifications.unshift(newNotification);
  memoryStore.save();

  // Scalable Web Push Dispatch for system events
  dispatchWebPushNotification({
    title: newNotification.title,
    body: newNotification.message,
    tag: `sys-${newNotification.id}`,
    targetUserId: newNotification.seekerUid || newNotification.staffUid,
    role: !newNotification.seekerUid && !newNotification.staffUid ? "admin" : undefined,
    data: { notifId: newNotification.id, type: newNotification.type }
  });

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
  // Immediate synchronous emit for instant load on fresh devices
  if (memoryStore.systemNotifications && memoryStore.systemNotifications.length > 0) {
    callback(memoryStore.systemNotifications);
  } else {
    callback([]);
    getSystemNotifications().then(notifs => {
      if (notifs && notifs.length > 0) {
        callback(notifs);
      }
    }).catch(() => {});
  }

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
// FIRESTORE JOB MUTATIONS (EDIT/DELETE/AVAILABILITY)
// ==========================================
export async function toggleJobAvailability(jobId: string, isUnavailable: boolean, actorUid?: string): Promise<void> {
  try {
    const docRef = doc(db, "jobs", jobId);
    await updateDoc(docRef, { isUnavailable });
  } catch (error) {
    console.warn("Firestore toggleJobAvailability failing, updating in fallback:", error);
  }

  const index = memoryStore.jobs.findIndex(j => j.id === jobId);
  if (index !== -1) {
    memoryStore.jobs[index] = { ...memoryStore.jobs[index], isUnavailable };
    memoryStore.save();
  }

  const actorName = actorUid ? (memoryStore.users[actorUid]?.displayName || "Staff") : "Staff";
  const jobTitle = memoryStore.jobs[index]?.title || "Unknown Job";
  await addSystemNotification({
    type: "job_updated",
    title: isUnavailable ? "Job Marked Unavailable" : "Job Marked Available",
    message: `${actorName} marked the job "${jobTitle}" as ${isUnavailable ? "unavailable" : "available"}.`,
    metadata: { jobId, isUnavailable, actorUid }
  }).catch(() => {});
}

export async function batchSetJobAvailability(jobIds: string[], isUnavailable: boolean, actorUid?: string): Promise<void> {
  for (const id of jobIds) {
    try {
      const docRef = doc(db, "jobs", id);
      await updateDoc(docRef, { isUnavailable });
    } catch (error) {
      console.warn(`Firestore batchSetJobAvailability failing for ${id}:`, error);
    }

    const index = memoryStore.jobs.findIndex(j => j.id === id);
    if (index !== -1) {
      memoryStore.jobs[index] = { ...memoryStore.jobs[index], isUnavailable };
    }
  }
  memoryStore.save();

  const actorName = actorUid ? (memoryStore.users[actorUid]?.displayName || "Staff") : "Staff";
  await addSystemNotification({
    type: "job_updated",
    title: isUnavailable ? "Jobs Marked Unavailable" : "Jobs Marked Available",
    message: `${actorName} marked ${jobIds.length} job listing(s) as ${isUnavailable ? "unavailable" : "available"}.`,
    metadata: { jobIds, isUnavailable, actorUid }
  }).catch(() => {});
}

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
    await setDoc(reportRef, sanitizeForFirestore(report));
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

// ==========================================
// CANDIDATE LISTS & REPORTING TRACKER
// ==========================================
export function getCandidateListLogs(): CandidateListLog[] {
  if (!memoryStore.candidateListLogs || memoryStore.candidateListLogs.length === 0) {
    const savedListLogs = localStorage.getItem("vr_candidate_list_logs");
    if (savedListLogs) {
      try {
        memoryStore.candidateListLogs = JSON.parse(savedListLogs);
      } catch (e) {}
    }
    if (!memoryStore.candidateListLogs || memoryStore.candidateListLogs.length === 0) {
      memoryStore.candidateListLogs = [...DEFAULT_CANDIDATE_LIST_LOGS];
      memoryStore.save();
    }
  }
  return [...memoryStore.candidateListLogs].sort((a, b) => b.timestamp - a.timestamp);
}

export function subscribeToCandidateListLogs(callback: (logs: CandidateListLog[]) => void): () => void {
  callback(getCandidateListLogs());
  return memoryStore.subscribe(() => {
    callback(getCandidateListLogs());
  });
}

export async function toggleCandidateListTag(
  chatId: string,
  listName: string,
  staffUid?: string,
  staffName?: string
): Promise<Record<string, { addedAt: number; addedBy?: string }>> {
  const conv = memoryStore.conversations[chatId];
  const currentLists = { ...(conv?.candidateLists || {}) };
  const isCurrentlyIn = Boolean(currentLists[listName]);

  const newLists = { ...currentLists };
  let action: "added" | "removed";

  if (isCurrentlyIn) {
    delete newLists[listName];
    action = "removed";
  } else {
    newLists[listName] = {
      addedAt: Date.now(),
      addedBy: staffName || staffUid || "Staff"
    };
    action = "added";
  }

  if (conv) {
    conv.candidateLists = newLists;
    memoryStore.conversations[chatId] = conv;
  }

  // Create activity log
  const newLog: CandidateListLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    listName,
    action,
    timestamp: Date.now(),
    staffUid,
    staffName: staffName || "Staff Member",
    customerPhone: conv?.customerPhone || "",
    customerName: conv?.name || conv?.customerPhone || "Candidate",
    chatId,
    jobTitle: conv?.jobTitle || "Job Candidate"
  };

  memoryStore.candidateListLogs = [newLog, ...(memoryStore.candidateListLogs || [])];
  memoryStore.save();

  // Sync to Firestore
  try {
    const convRef = doc(db, "conversations", chatId);
    await setDoc(convRef, {
      candidateLists: newLists
    }, { merge: true });
  } catch (err) {
    console.warn("Firestore sync for candidate list tag failed:", err);
  }

  return newLists;
}

// ==========================================
// STAFF RESUMPTION & PUNCTUALITY TRACKING (9:00 AM SLA)
// ==========================================
export function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isTimestampOnTime(timestamp: number): boolean {
  const d = new Date(timestamp);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const seconds = d.getSeconds();
  // Standard resumption deadline is 9:00 AM local time
  if (hours < 9) return true;
  if (hours === 9 && minutes === 0 && seconds === 0) return true;
  return false;
}

export function formatTimeStr(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  const minStr = minutes < 10 ? `0${minutes}` : minutes;
  return `${hours12}:${minStr} ${ampm}`;
}

export async function recordStaffResumption(
  uid: string,
  staffName: string,
  customDate?: string,
  customTimestamp?: number
): Promise<StaffResumptionRecord> {
  const date = customDate || getLocalTodayString();
  const timestamp = customTimestamp || Date.now();
  const id = `resumption_${uid}_${date}`;

  if (!memoryStore.staffResumptions) {
    memoryStore.staffResumptions = {};
  }

  // Return existing record if already logged for today
  if (memoryStore.staffResumptions[id]) {
    return memoryStore.staffResumptions[id];
  }

  const record: StaffResumptionRecord = {
    id,
    uid,
    staffName: staffName || "Staff Member",
    date,
    timestamp
  };

  memoryStore.staffResumptions[id] = record;
  memoryStore.save();

  try {
    const docRef = doc(db, "staff_resumptions", id);
    await setDoc(docRef, record, { merge: true });
  } catch (err) {
    console.warn("Firestore recordStaffResumption failed:", err);
  }

  return record;
}

export async function getStaffResumption(uid: string, date: string): Promise<StaffResumptionRecord | null> {
  const id = `resumption_${uid}_${date}`;
  if (memoryStore.staffResumptions && memoryStore.staffResumptions[id]) {
    return memoryStore.staffResumptions[id];
  }

  try {
    const docRef = doc(db, "staff_resumptions", id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const rec = snap.data() as StaffResumptionRecord;
      if (!memoryStore.staffResumptions) memoryStore.staffResumptions = {};
      memoryStore.staffResumptions[id] = rec;
      memoryStore.save();
      return rec;
    }
  } catch (err) {
    console.warn("Firestore getStaffResumption failed:", err);
  }

  return null;
}

// ==========================================
// ADMIN REPORT SUBMISSION REOPEN OVERRIDES & SLA TARGET TIME CONFIG
// ==========================================
export function formatTime24to12(time24?: string): string {
  if (!time24) return "9:00 PM";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10) || 0;
  if (isNaN(h)) return "9:00 PM";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const mPadded = m < 10 ? `0${m}` : `${m}`;
  return `${h}:${mPadded} ${ampm}`;
}

export function getStaffReportDeadlineConfig(): { 
  hour: number; 
  minute: number; 
  timeStr: string; 
  label: string; 
  time12: string 
} {
  const time24 = memoryStore.appSettings?.staffReportDeadlineTime || "21:00";
  const [hStr, mStr] = time24.split(":");
  let hour = parseInt(hStr, 10);
  let minute = parseInt(mStr, 10);
  if (isNaN(hour) || hour < 0 || hour > 23) hour = 21;
  if (isNaN(minute) || minute < 0 || minute > 59) minute = 0;
  const timeStr = `${hour < 10 ? "0" + hour : hour}:${minute < 10 ? "0" + minute : minute}`;
  const time12 = formatTime24to12(timeStr);
  return {
    hour,
    minute,
    timeStr,
    time12,
    label: `${time12} Daily`
  };
}

export function isDeadlinePassedForDate(dateStr: string): boolean {
  const localTodayStr = getLocalTodayString();
  if (dateStr < localTodayStr) {
    return true; // Any past day -> deadline has passed
  }
  if (dateStr === localTodayStr) {
    const config = getStaffReportDeadlineConfig();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    if (currentHour > config.hour) return true;
    if (currentHour === config.hour && currentMinute >= config.minute) return true;
    return false;
  }
  return false;
}

export async function reopenStaffReportSubmissions(
  uids: string[],
  targetDate?: string,
  staffProfiles?: UserProfile[]
): Promise<void> {
  const now = Date.now();
  if (!memoryStore.reportReopens) {
    memoryStore.reportReopens = {};
  }

  const names: string[] = [];

  for (const uid of uids) {
    const staffName =
      staffProfiles?.find(s => s.uid === uid)?.displayName ||
      memoryStore.users[uid]?.displayName ||
      "Staff Member";
    names.push(staffName);

    const key = targetDate ? `${uid}_${targetDate}` : uid;
    const override: StaffReportReopenOverride = {
      id: `reopen_${key}`,
      uid,
      staffName,
      reopenedAt: now,
      targetDate
    };

    memoryStore.reportReopens[key] = override;
    memoryStore.reportReopens[uid] = override;

    try {
      const docRef = doc(db, "staff_report_reopens", key);
      await setDoc(docRef, override);
    } catch (err) {
      console.warn(`Firestore reopen error for ${key}:`, err);
    }
  }

  memoryStore.save();

  await addSystemNotification({
    type: "report_submitted",
    title: "Daily Report Submission Reopened",
    message: `Admin reopened daily report submission for ${names.join(", ")} ${targetDate ? `for ${targetDate}` : ""} (6-hour window active).`,
    metadata: { uids, reopenedAt: now, targetDate }
  }).catch(() => {});
}

export function isReportSubmissionReopened(uid: string, targetDate?: string): {
  isReopened: boolean;
  remainingMs: number;
  expiresAt: number | null;
  reopenedAt: number | null;
} {
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  let override: StaffReportReopenOverride | null = null;

  if (memoryStore.reportReopens) {
    if (targetDate && memoryStore.reportReopens[`${uid}_${targetDate}`]) {
      override = memoryStore.reportReopens[`${uid}_${targetDate}`];
    } else if (memoryStore.reportReopens[uid]) {
      override = memoryStore.reportReopens[uid];
    }
  }

  if (!override || !override.reopenedAt) {
    return { isReopened: false, remainingMs: 0, expiresAt: null, reopenedAt: null };
  }

  if (targetDate && override.targetDate && override.targetDate !== targetDate) {
    const specificOverride = memoryStore.reportReopens[`${uid}_${targetDate}`];
    if (specificOverride && specificOverride.reopenedAt) {
      override = specificOverride;
    } else {
      return { isReopened: false, remainingMs: 0, expiresAt: null, reopenedAt: null };
    }
  }

  const elapsed = Date.now() - override.reopenedAt;
  if (elapsed < SIX_HOURS) {
    const remainingMs = SIX_HOURS - elapsed;
    return {
      isReopened: true,
      remainingMs,
      expiresAt: override.reopenedAt + SIX_HOURS,
      reopenedAt: override.reopenedAt
    };
  }

  return { isReopened: false, remainingMs: 0, expiresAt: null, reopenedAt: override.reopenedAt };
}

export function subscribeToReportReopens(callback: () => void): () => void {
  const collRef = collection(db, "staff_report_reopens");
  const unsubscribeFirestore = onSnapshot(
    collRef,
    (snapshot) => {
      if (!memoryStore.reportReopens) {
        memoryStore.reportReopens = {};
      }
      snapshot.docs.forEach(docSnap => {
        const data = docSnap.data() as StaffReportReopenOverride;
        if (data && data.uid) {
          const key = docSnap.id;
          memoryStore.reportReopens[key] = data;
          if (data.targetDate) {
            memoryStore.reportReopens[`${data.uid}_${data.targetDate}`] = data;
          }
          memoryStore.reportReopens[data.uid] = data;
        }
      });
      memoryStore.save();
      callback();
    },
    (err) => {
      console.warn("Firestore staff_report_reopens snapshot error:", err);
    }
  );

  const unsubscribeMemory = memoryStore.subscribe(callback);

  return () => {
    try {
      unsubscribeFirestore();
    } catch (_) {}
    unsubscribeMemory();
  };
}

// Complete Database & Storage Cleanup for Chats, Messages, and Saved Contacts
export async function clearAllDatabaseChatsAndContacts(): Promise<void> {
  // 1. Clear Memory Store
  memoryStore.conversations = {};
  memoryStore.contacts = {};
  memoryStore.candidateListLogs = [];
  memoryStore.save();

  // 2. Clear LocalStorage
  localStorage.removeItem("vr_conversations");
  localStorage.removeItem("vr_contacts");
  localStorage.removeItem("vr_candidate_list_logs");

  // 3. Clear Firestore Collections if connected
  try {
    const convSnap = await getDocs(collection(db, "conversations"));
    const deletePromises = convSnap.docs.map(async (d) => {
      // Also delete subcollection messages if any
      try {
        const msgsSnap = await getDocs(collection(db, "conversations", d.id, "messages"));
        await Promise.allSettled(msgsSnap.docs.map(m => deleteDoc(m.ref)));
      } catch (_) {}
      return deleteDoc(d.ref);
    });
    await Promise.allSettled(deletePromises);
  } catch (e) {
    console.warn("Firestore conversations cleanup notice:", e);
  }

  try {
    const contactSnap = await getDocs(collection(db, "contacts"));
    const deletePromises = contactSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.allSettled(deletePromises);
  } catch (e) {
    console.warn("Firestore contacts cleanup notice:", e);
  }

  try {
    const logSnap = await getDocs(collection(db, "candidate_list_logs"));
    const deletePromises = logSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.allSettled(deletePromises);
  } catch (e) {
    console.warn("Firestore candidate logs cleanup notice:", e);
  }
}

// ==========================================
// STAFF/ADMIN 1-ON-1 DIRECT MESSAGING SERVICE
// ==========================================

export function getDirectChatId(uidA: string, uidB: string): string {
  return [uidA, uidB].sort().join("_");
}

export async function sendStaffDirectMessage(
  recipientUid: string,
  text: string,
  options?: {
    attachmentUrl?: string;
    fileType?: string;
    senderUid?: string;
    senderName?: string;
    senderAvatar?: string;
    senderRole?: "staff" | "admin";
  }
): Promise<StaffDirectMessage> {
  const senderUid = options?.senderUid || auth.currentUser?.uid || "staff-seed";
  const senderName = options?.senderName || auth.currentUser?.displayName || "Staff Member";
  const senderRole = options?.senderRole || "staff";
  const directChatId = getDirectChatId(senderUid, recipientUid);
  const now = Date.now();
  const messageId = `sdm_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const message: StaffDirectMessage = {
    id: messageId,
    directChatId,
    senderUid,
    senderName,
    senderAvatar: options?.senderAvatar,
    senderRole,
    recipientUid,
    text,
    timestamp: now,
    attachmentUrl: options?.attachmentUrl,
    fileType: options?.fileType,
    deliveryStatus: "sent"
  };

  // 1. Direct subcollection write to Firestore
  const directDocId = `direct_${directChatId}`;
  try {
    const msgRef = doc(db, "conversations", directDocId, "messages", messageId);
    await setDoc(msgRef, sanitizeForFirestore(message));
  } catch (err) {
    console.warn("[sendStaffDirectMessage] Subcollection write failed:", err);
  }

  // 2. Parent thread update in Firestore
  try {
    const convRef = doc(db, "conversations", directDocId);
    await setDoc(convRef, sanitizeForFirestore({
      chatId: directDocId,
      conversationType: "staff_direct",
      participantUids: [senderUid, recipientUid],
      lastMessageText: text,
      lastMessageAt: now,
      lastSenderUid: senderUid,
      status: "ongoing"
    }), { merge: true });
  } catch (err) {
    console.warn("[sendStaffDirectMessage] Parent update failed:", err);
  }

  return message;
}

export function subscribeToStaffDirectMessages(
  directChatId: string,
  callback: (msgs: StaffDirectMessage[]) => void
): () => void {
  const directDocId = `direct_${directChatId}`;
  try {
    const q = query(
      collection(db, "conversations", directDocId, "messages"),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => d.data() as StaffDirectMessage);
      callback(msgs);
    }, (err) => {
      console.warn("[subscribeToStaffDirectMessages] Snapshot notice:", err);
    });
  } catch (err) {
    console.warn("[subscribeToStaffDirectMessages] Setup error:", err);
    return () => {};
  }
}

// ==========================================
// STAFF/ADMIN GROUP CHAT CHANNEL SERVICE
// ==========================================

export async function sendStaffGroupMessage(
  text: string,
  options?: {
    channelId?: string;
    attachmentUrl?: string;
    fileType?: string;
    senderUid?: string;
    senderName?: string;
    senderAvatar?: string;
    senderRole?: "staff" | "admin";
  }
): Promise<StaffGroupChatMessage> {
  const channelId = options?.channelId || "staff_team_hub";
  const groupDocId = `group_${channelId}`;
  const senderUid = options?.senderUid || auth.currentUser?.uid || "staff-seed";
  const senderName = options?.senderName || auth.currentUser?.displayName || "Staff Member";
  const senderRole = options?.senderRole || "staff";
  const now = Date.now();
  const messageId = `sgm_${now}_${Math.random().toString(36).substring(2, 7)}`;

  const message: StaffGroupChatMessage = {
    id: messageId,
    channelId,
    senderUid,
    senderName,
    senderAvatar: options?.senderAvatar,
    senderRole,
    text,
    timestamp: now,
    attachmentUrl: options?.attachmentUrl,
    fileType: options?.fileType,
    deliveryStatus: "sent"
  };

  try {
    const msgRef = doc(db, "conversations", groupDocId, "messages", messageId);
    await setDoc(msgRef, sanitizeForFirestore(message));
  } catch (err) {
    console.warn("[sendStaffGroupMessage] Subcollection write failed:", err);
  }

  try {
    const channelRef = doc(db, "conversations", groupDocId);
    await setDoc(channelRef, sanitizeForFirestore({
      chatId: groupDocId,
      conversationType: "staff_group",
      channelId,
      lastMessageText: text,
      lastMessageAt: now,
      lastSenderUid: senderUid,
      status: "ongoing"
    }), { merge: true });
  } catch (err) {
    console.warn("[sendStaffGroupMessage] Parent update failed:", err);
  }

  return message;
}

export function subscribeToStaffGroupMessages(
  callback: (msgs: StaffGroupChatMessage[]) => void,
  channelId: string = "staff_team_hub"
): () => void {
  const groupDocId = `group_${channelId}`;
  try {
    const q = query(
      collection(db, "conversations", groupDocId, "messages"),
      orderBy("timestamp", "asc")
    );
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => d.data() as StaffGroupChatMessage);
      callback(msgs);
    }, (err) => {
      console.warn("[subscribeToStaffGroupMessages] Snapshot notice:", err);
    });
  } catch (err) {
    console.warn("[subscribeToStaffGroupMessages] Setup error:", err);
    return () => {};
  }
}

// ==========================================
// TEST AUTOMATION & DIAGNOSTIC LOGS SERVICE
// ==========================================

export async function cleanupTestArtifacts(chatIds: string[]): Promise<void> {
  if (!chatIds || chatIds.length === 0) return;

  const deletePromises = chatIds.map(async (chatId) => {
    // 1. Delete memory store
    delete memoryStore.conversations[chatId];

    // 2. Delete Firestore messages subcollection
    try {
      const msgsSnap = await getDocs(collection(db, "conversations", chatId, "messages"));
      await Promise.allSettled(msgsSnap.docs.map(m => deleteDoc(m.ref)));
    } catch (_) {}

    // 3. Delete Firestore parent document
    try {
      await deleteDoc(doc(db, "conversations", chatId));
    } catch (_) {}
  });

  await Promise.allSettled(deletePromises);
  memoryStore.save();
}

export async function saveChatTestReport(report: ChatTestSuiteReport): Promise<void> {
  const testId = `test_run_${report.timestamp}`;
  try {
    await setDoc(doc(db, "conversations", `test_log_${testId}`), sanitizeForFirestore({
      ...report,
      chatId: `test_log_${testId}`,
      conversationType: "test_report",
      lastMessageAt: report.timestamp,
      status: "finished"
    }));
  } catch (err) {
    console.warn("[saveChatTestReport] Notice:", err);
  }
}

export async function getChatTestReports(): Promise<ChatTestSuiteReport[]> {
  try {
    const snap = await getDocs(query(collection(db, "conversations"), orderBy("timestamp", "desc"), limit(10)));
    return snap.docs
      .map(d => d.data() as any)
      .filter(d => d.conversationType === "test_report" || d.scenarios) as ChatTestSuiteReport[];
  } catch (err) {
    console.warn("[getChatTestReports] Notice:", err);
    return [];
  }
}




