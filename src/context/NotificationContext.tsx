import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "./AuthContext";
import { subscribeToConversations, subscribeToSystemNotifications } from "../lib/services";
import { Conversation, ChatMessage, SystemNotification } from "../types";
import { Bell, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface NotificationContextType {
  permission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
  sendPush: (title: string, body: string, options?: NotificationOptions) => void;
  pushNotificationsEnabled: boolean;
  setPushNotificationsEnabled: (enabled: boolean) => void;
}

// Helper to convert base64 VAPID public keys to Uint8Array required by pushManager.subscribe
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, "+")
    .replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe the device browser service worker to standard Web Push
async function subscribeToWebPush(userId: string | null = null): Promise<PushSubscription | undefined> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // 1. Fetch persistent public VAPID key from Node express backend
      const res = await fetch("/api/push/public-key");
      if (!res.ok) {
        throw new Error(`Failed to load VAPID public key: ${res.statusText}`);
      }
      const data = await res.json();
      if (!data.publicKey) {
        throw new Error("VAPID public key payload empty.");
      }

      // 2. Subscribe using the standard browser push manager
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey)
      });
    }

    // 3. Register/Update subscription in persistent Firestore collection
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, userId })
    });

    console.log("[Web Push] Subscription successfully registered on server.");
    return subscription;
  } catch (err) {
    console.error("[Web Push] Subscription registration failed:", err);
  }
}

// Unsubscribe the device browser service worker from Web Push
async function unsubscribeFromWebPush() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      // 1. Remove subscription from persistent Firestore collection
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: subscription.endpoint })
      });

      // 2. Local browser unregistration
      await subscription.unsubscribe();
      console.log("[Web Push] Subscription successfully revoked.");
    }
  } catch (err) {
    console.error("[Web Push] Subscription revocation failed:", err);
  }
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

  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("push_notifications_enabled") === "true";
  });

  const [toasts, setToasts] = useState<Array<{ id: string; title: string; body: string; tag?: string }>>([]);

  const addToast = (title: string, body: string, tag?: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, body, tag }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  };

  const handleSetPushNotificationsEnabled = (enabled: boolean) => {
    setPushNotificationsEnabled(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("push_notifications_enabled", enabled ? "true" : "false");
    }
  };

  // Synchronize W3C Push subscription with backend Firestore database
  useEffect(() => {
    if (pushNotificationsEnabled) {
      subscribeToWebPush(currentUser?.uid || null);
    } else {
      unsubscribeFromWebPush();
    }
  }, [pushNotificationsEnabled, currentUser]);

  const subscriptionStartTimeRef = useRef<number>(Date.now());
  const lastKnownTimestampsRef = useRef<Record<string, number>>({});
  const prevAvailableChatsRef = useRef<Set<string>>(new Set());
  const prevSystemNotificationsRef = useRef<Set<string>>(new Set());

  // Function to request notification permission
  const requestPermission = async (): Promise<boolean> => {
    if (typeof window === "undefined") return false;

    const inIframe = window.self !== window.top;

    if (!("Notification" in window)) {
      console.warn("This browser does not support desktop notifications. Fallback to simulation.");
      handleSetPushNotificationsEnabled(true);
      localStorage.setItem("push_notifications_simulated", "true");
      addToast(
        "Simulation Mode Active",
        "This browser context doesn't support system notifications. We have automatically enabled high-fidelity simulated alerts instead!"
      );
      return true;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        handleSetPushNotificationsEnabled(true);
        localStorage.setItem("push_notifications_simulated", "false");
        
        if (inIframe) {
          addToast(
            "Push Alerts Enabled!",
            "Note: Native notifications are blocked inside this iframe preview. Open the app in a new tab to see them in your system tray!"
          );
        } else {
          // Immediately subscribe and trigger an instant backend Web Push verification
          subscribeToWebPush(currentUser?.uid || null).then(async (sub) => {
            if (sub) {
              await fetch("/api/push/test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  endpoint: sub.endpoint,
                  title: "Push Notifications Verified!",
                  body: "Congratulations! Valley Reigns W3C standard Web Push notifications are active and working perfectly!"
                })
              });
            }
          }).catch(err => {
            console.error("[Web Push] Verification trigger failed:", err);
          });
        }
        return true;
      } else {
        console.warn("System notifications permission rejected. Falling back to Simulated Mode.");
        handleSetPushNotificationsEnabled(true);
        localStorage.setItem("push_notifications_simulated", "true");
        
        if (inIframe) {
          addToast(
            "Simulated Alerts Active",
            "Iframe preview is blocked from native push. High-fidelity simulated alerts are now active instead!"
          );
        } else {
          addToast(
            "Simulated Alerts Active",
            "Permission was blocked or denied. Active high-fidelity in-app simulated alerts instead!"
          );
        }
        return true;
      }
    } catch (e) {
      console.error("Error requesting notification permission, falling back to simulated mode:", e);
      handleSetPushNotificationsEnabled(true);
      localStorage.setItem("push_notifications_simulated", "true");
      
      if (inIframe) {
        addToast(
          "Iframe Sandbox Notice",
          "Standard notifications are blocked by the browser inside this editor iframe. Please click 'Open in New Tab' to test real native system notifications!"
        );
      } else {
        addToast(
          "Simulated Alerts Active",
          "Notification permission could not be queried. High-fidelity simulated alerts are active instead!"
        );
      }
      return true;
    }
  };

  // Helper to trigger standard browser notification and simulated in-app toast
  const sendPush = (title: string, body: string, options?: NotificationOptions) => {
    if (typeof window === "undefined") return;

    // Check if push notifications are enabled
    const isEnabled = localStorage.getItem("push_notifications_enabled") === "true";
    if (!isEnabled) {
      console.log("Push notifications are disabled. Suppressing alert.");
      return;
    }

    // Always display the beautiful simulated Toast inside the viewport so the user gets instant feedback
    addToast(title, body, options?.tag);

    // Also try standard native notification if allowed
    if ("Notification" in window && Notification.permission === "granted") {
      const notificationOptions: NotificationOptions = {
        body,
        icon: "/icon.svg",
        badge: "/icon.svg",
        tag: options?.tag || `alert-${Date.now()}`,
        requireInteraction: true,
        ...options
      };

      try {
        // Try the standard Notification constructor first (works instantly on desktop tabs)
        const notif = new Notification(title, notificationOptions);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch (err) {
        console.warn("Standard Notification constructor not supported or blocked (e.g. cross-origin iframe / mobile), trying ServiceWorker:", err);
        
        // Fallback to ServiceWorker registration if the constructor is blocked
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready
            .then((registration) => {
              registration.showNotification(title, notificationOptions)
                .catch((swErr) => {
                  console.warn("ServiceWorker showNotification failed:", swErr);
                });
            })
            .catch((swReadyErr) => {
              console.warn("ServiceWorker ready promise rejected:", swReadyErr);
            });
        }
      }
    }
  };

  // Initialize permission check on login
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
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
    <NotificationContext.Provider
      value={{
        permission,
        requestPermission,
        sendPush,
        pushNotificationsEnabled,
        setPushNotificationsEnabled: handleSetPushNotificationsEnabled
      }}
    >
      {children}

      {/* Floating Simulated Push Notifications Portal */}
      <div className="fixed top-20 right-4 z-[9999] space-y-3 pointer-events-none w-full max-w-sm">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 150, damping: 16 }}
              className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-150 rounded-[20px] shadow-2xl p-4 flex items-start gap-3.5 relative overflow-hidden"
            >
              {/* Highlight status line */}
              <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#0F5132]" />
              
              {/* Icon Container */}
              <div className="w-9 h-9 rounded-xl bg-[#0F5132]/10 flex items-center justify-center text-[#0F5132] shrink-0">
                <Bell className="w-5 h-5 animate-pulse" />
              </div>
              
              {/* Text content */}
              <div className="flex-1 space-y-0.5 text-left pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#0F5132] bg-[#0F5132]/10 px-1.5 py-0.5 rounded">
                    Push Notification
                  </span>
                  {localStorage.getItem("push_notifications_simulated") === "true" && (
                    <span className="text-[8px] font-mono text-slate-400">
                      (Simulated)
                    </span>
                  )}
                </div>
                <h4 className="text-xs font-bold text-[#0B3C49] leading-snug">
                  {toast.title}
                </h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {toast.body}
                </p>
              </div>
              
              {/* Close Button */}
              <button
                onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
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
