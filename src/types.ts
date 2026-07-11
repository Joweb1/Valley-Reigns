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
  type: "offline_routing" | "closed_conversation" | "reported_conversation" | "finished_conversation" | "new_job_posted" | "job_updated" | "job_deleted";
  title: string;
  message: string;
  timestamp: number;
  read?: boolean;
  metadata?: Record<string, any>;
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
}

export interface ChatMessage {
  id?: string;
  sender: "customer" | "staff" | "system";
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

