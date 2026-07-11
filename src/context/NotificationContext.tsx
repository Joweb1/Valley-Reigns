import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { subscribeToConversations, subscribeToSystemNotifications } from "../lib/services";
import { Conversation, ChatMessage, SystemNotification } from "../types";

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  sendPush: (title: string, body: string, options?: NotificationOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "denied";
  });

  const subscriptionStartTimeRef = useRef<number>(Date.now());
  const lastKnownTimestampsRef = useRef<Record<string, number>>({});
  const prevAvailableChatsRef = useRef<Set<string>>(new Set());
  const prevSystemNotificationsRef = useRef<Set<string>>(new Set());

  // Function to request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      console.warn("This browser does not support desktop notifications.");
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        sendPush("Notifications Enabled", "You will now receive real-time push alerts from Valley Reigns!", {
          tag: "welcome-alert",
          silent: false
        });
        return true;
      }
    } catch (e) {
      console.error("Error requesting notification permission:", e);
    }
    return false;
  };

  // Helper to trigger standard browser notification
  const sendPush = (title: string, body: string, options?: NotificationOptions) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "granted") {
      try {
        const notif = new Notification(title, {
          body,
          icon: "/logo.png",
          badge: "/logo.png",
          tag: options?.tag || `alert-${Date.now()}`,
          ...options
        });

        notif.onclick = () => {
          window.parent.focus();
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn("Failed to create standard web Notification:", err);
      }
    }
  };

  // Initialize permission check & automatic request prompt on login (if previously default)
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
      
      // Auto-request once logged in if status is still 'default'
      if (currentUser && Notification.permission === "default") {
        setTimeout(() => {
          requestPermission();
        }, 1500);
      }
    }
  }, [currentUser]);

  // Subscription manager for real-time push triggers
  useEffect(() => {
    if (!currentUser) return;

    // Reset reference trackers on subscription setup
    subscriptionStartTimeRef.current = Date.now();
    lastKnownTimestampsRef.current = {};
    prevAvailableChatsRef.current = new Set();
    prevSystemNotificationsRef.current = new Set();

    let unsubscribeConvs: (() => void) | null = null;
    let unsubscribeNotifs: (() => void) | null = null;

    // 1. Subscribe to conversations for Seeker or Staff messages and claims
    if (currentUser.role === "staff" || currentUser.role === "seeker") {
      unsubscribeConvs = subscribeToConversations((conversationsMap) => {
        const convs = Object.values(conversationsMap) as Conversation[];
        const now = Date.now();
        const start = subscriptionStartTimeRef.current;

        // Loop over each conversation
        convs.forEach((conv) => {
          const messages = Array.isArray(conv.messages) ? conv.messages : [];
          const lastMsg = messages[messages.length - 1] as ChatMessage | undefined;

          // STAFF RULES
          if (currentUser.role === "staff") {
            // A. New available unassigned chat to claim (routed to this staff member)
            if (conv.status === "pending" && conv.sharedWith && conv.sharedWith.includes(currentUser.uid)) {
              if (!prevAvailableChatsRef.current.has(conv.chatId)) {
                // If created after we subscribed, notify
                if (conv.createdAt > start) {
                  sendPush(
                    "New Request to Claim!",
                    `A seeker has made an inquiry about "${conv.jobTitle || 'Job Listing'}" (${conv.customerPhone})`,
                    { tag: `claim-${conv.chatId}` }
                  );
                }
                prevAvailableChatsRef.current.add(conv.chatId);
              }
            } else {
              // Remove if claimed or no longer pending
              prevAvailableChatsRef.current.delete(conv.chatId);
            }

            // B. Messages in staff member's active ongoing chats
            if (conv.status === "ongoing" && conv.assignedTo === currentUser.uid) {
              if (lastMsg && lastMsg.sender === "customer" && lastMsg.timestamp > start) {
                const prevStamp = lastKnownTimestampsRef.current[conv.chatId] || 0;
                if (lastMsg.timestamp > prevStamp) {
                  sendPush(
                    `Message from ${conv.customerPhone}`,
                    `[${conv.jobTitle || 'Chat'}] ${lastMsg.text}`,
                    { tag: `msg-${conv.chatId}` }
                  );
                }
              }
            }
          }

          // SEEKER RULES
          if (currentUser.role === "seeker") {
            const seekerPhoneIdentifier = currentUser.displayName || currentUser.email || "";
            const isMyChat = 
              conv.customerPhone === seekerPhoneIdentifier || 
              conv.customerPhone === currentUser.email ||
              conv.customerPhone === currentUser.displayName;

            if (isMyChat) {
              if (lastMsg && lastMsg.sender === "staff" && lastMsg.timestamp > start) {
                const prevStamp = lastKnownTimestampsRef.current[conv.chatId] || 0;
                if (lastMsg.timestamp > prevStamp) {
                  sendPush(
                    "Valley Reigns Support",
                    `[${conv.jobTitle || 'Chat'}] ${lastMsg.text}`,
                    { tag: `msg-${conv.chatId}` }
                  );
                }
              }
            }
          }

          // Update last known message timestamp
          if (lastMsg) {
            lastKnownTimestampsRef.current[conv.chatId] = lastMsg.timestamp;
          }
        });
      });
    }

    // 2. Subscribe to System Notifications for Admins
    if (currentUser.role === "admin") {
      unsubscribeNotifs = subscribeToSystemNotifications((notifs: SystemNotification[]) => {
        const start = subscriptionStartTimeRef.current;
        notifs.forEach((notif) => {
          if (!prevSystemNotificationsRef.current.has(notif.id)) {
            if (notif.timestamp > start) {
              sendPush(
                `System Alert: ${notif.title}`,
                notif.message,
                { tag: `sys-${notif.id}` }
              );
            }
            prevSystemNotificationsRef.current.add(notif.id);
          }
        });
      });
    }

    return () => {
      if (unsubscribeConvs) unsubscribeConvs();
      if (unsubscribeNotifs) unsubscribeNotifs();
    };
  }, [currentUser]);

  return (
    <NotificationContext.Provider value={{ permission, requestPermission, sendPush }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};
