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
}

export interface SystemNotification {
  id: string;
  type: "offline_routing" | "closed_conversation" | "reported_conversation" | "finished_conversation" | "new_job_posted" | "job_updated" | "job_deleted" | "report_submitted" | "awaiting_claim" | "abandoned_conversation" | "transferred_conversation" | "conversation_started" | "conversation_closed" | "conversation_finished" | "conversation_transferred" | "conversation_claimed";
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
  role: "seeker" | "staff" | "admin";
  canPostJobs: boolean;
  password?: string;
  authProvider?: "email" | "google";
  messagingPreference?: "whatsapp" | "in-app";
  photoURL?: string;
}

export interface ChatMessage {
  id?: string;
  sender: "customer" | "staff" | "system" | "guest";
  text: string;
  timestamp: number;
}

export interface Conversation {
  chatId: string;
  customerPhone: string;
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
  seekerUid?: string;
  typing?: Record<string, { isTyping: boolean; name: string; updatedAt: number }>;
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
  targetOnTimeMet: boolean;      // Submitted on or before 9:00 PM local
}


