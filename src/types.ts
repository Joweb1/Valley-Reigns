export interface Job {
  id: string;
  title: string;
  company: string;
  category: string;
  salary: string;
  location: string;
  type: string;
  requirements: string[];
  description: string;
  impressions: number;
  createdAt: number;
  postedByUid?: string;
  isUnavailable?: boolean;
}

export interface SystemNotification {
  id: string;
  type: "offline_routing" | "closed_conversation" | "reported_conversation" | "finished_conversation" | "new_job_posted" | "job_updated" | "job_deleted" | "report_submitted" | "awaiting_claim" | "abandoned_conversation" | "transferred_conversation" | "conversation_started" | "conversation_closed" | "conversation_finished" | "conversation_transferred" | "conversation_claimed" | "permission_request";
  title: string;
  message: string;
  timestamp: number;
  read?: boolean;
  metadata?: Record<string, any>;
  staffUid?: string;
  seekerUid?: string;
}

export interface CustomerContact {
  id: string;
  customerPhone: string;
  name?: string;
  lastJobTitle?: string;
  lastChatId?: string;
  firstSeenAt: number;
  lastSeenAt: number;
  chatCount: number;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: "seeker" | "staff" | "admin" | "employer";
  canPostJobs: boolean;
  canMessageSeekers?: boolean;
  isVerifiedEmployer?: boolean;
  companyName?: string;
  companyIndustry?: string;
  companyWebsite?: string;
  companyPhone?: string;
  companyAddress?: string;
  rcNumber?: string;
  maxJobPosts?: number;
  createdAt?: number;
  password?: string;
  authProvider?: "email" | "google";
  messagingPreference?: "whatsapp" | "in-app";
  phoneNumber?: string;
  jobTitle?: string;
  photoURL?: string;
}

export interface EmployerRecruitmentRequest {
  id: string;
  employerUid: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  jobTitle: string;
  jobCategory: string;
  salaryBudget: string;
  numberOfWorkers: number;
  jobLocation: string;
  requirements: string;
  urgency: "immediate" | "within_1_week" | "within_1_month" | "flexible";
  status: "pending" | "reviewing" | "sourcing" | "completed" | "cancelled";
  createdAt: number;
  assignedStaffUid?: string;
  assignedStaffName?: string;
  notes?: string;
}

export interface EmployerApplicant {
  id: string;
  jobId: string;
  jobTitle: string;
  employerUid: string;
  seekerUid: string;
  seekerName: string;
  seekerEmail?: string;
  seekerPhoneMasked?: string;
  seekerCategory?: string;
  appliedAt: number;
  status: "reviewing" | "shortlisted" | "interview_scheduled" | "hired" | "rejected";
  interviewDate?: string;
  notes?: string;
  chatId?: string;
}

export interface ChatMessage {
  id?: string;
  sender: "customer" | "staff" | "system" | "guest";
  text: string;
  timestamp: number;
}

export interface CandidateListLog {
  id: string;
  listName: string; // e.g. "Registered Candidates" | "Pending Resume(CV)" | "Submitted Resume(CV)" | "Address Given" | "Verified" | "Pending Commission Retrieval"
  action: "added" | "removed";
  timestamp: number;
  staffUid?: string;
  staffName?: string;
  customerPhone?: string;
  customerName?: string;
  chatId?: string;
  jobTitle?: string;
}

export interface Conversation {
  chatId: string;
  customerPhone: string;
  name?: string;
  status: "pending" | "ongoing" | "finished" | "abandoned";
  assignedTo: string | null;
  assignedToName: string | null;
  sharedWith: string[];
  text: string;
  jobId: string;
  jobTitle: string;
  createdAt: number;
  lastMessageAt: number;
  messages?: Record<string, ChatMessage> | ChatMessage[];
  assignedToOffline?: boolean;
  isReported?: boolean;
  isInApp?: boolean;
  abandonedAt?: number;
  finishedAt?: number;
  claimedAt?: number;
  seekerUid?: string;
  typing?: Record<string, { isTyping: boolean; name: string; updatedAt: number }>;
  candidateLists?: Record<string, { addedAt: number; addedBy?: string }>;
  candidateListLogs?: CandidateListLog[];
}

export interface StaffStatus {
  uid: string;
  displayName: string;
  email: string;
  status: "online" | "offline";
  lastActive: number;
}

export interface DailyStat {
  id: string;
  date: string;
  impressions: number;
  sent: number;
  claimed: number;
  finished: number;
  abandoned: number;
  timestamp: number;
}

export interface StaffDailyReport {
  id: string;
  uid: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  
  // Targets / Stats (Direct metrics)
  newReachOuts: number;
  resumptions: number;
  cvsCollected: number;
  candidatesRegistered: number;
  addressesGiven: number;
  commissionRetrieved: string; // Can be currency or empty
  flyersMade: number;
  videosMade: number;
  jobsGotten: number;
  newJobsGottenClientRelations: string; // Detail or description
  
  // Qualitative fields
  challenges: string;
  plansTomorrow: string;
  
  // Proof & Confirmations
  chatsClearedConfirmed: boolean;
  chatsClearedProofUrl?: string; // Simulated file/image upload base64/url
  
  // Computed target status checked at submission
  targetReachOutsMet: boolean;   // Target >= 20
  targetAddressesMet: boolean;   // Target >= 4
  targetOnTimeMet: boolean;      // Morning resumption logged on or before 9:00 AM local
  resumptionTimeStr?: string;    // E.g. "08:45 AM"
}

export interface StaffResumptionRecord {
  id?: string;
  uid: string;
  staffName: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
}

export interface StaffReportReopenOverride {
  id?: string;
  uid: string;
  staffName?: string;
  reopenedAt: number; // timestamp when admin reopened submission
  targetDate?: string; // YYYY-MM-DD date
}


