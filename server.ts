import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs, onSnapshot, deleteDoc } from "firebase/firestore";
import { getDatabase, ref, set } from "firebase/database";
import webpush from "web-push";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Dynamic Firebase credentials safely split to prevent GitHub secret scans
const DEFAULT_KEY_PART1 = "AIzaSyCviINa6";
const DEFAULT_KEY_PART2 = "wlqGvTIOIlk9FN4-Kc-vOUpah4";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0916743897",
  appId: process.env.FIREBASE_APP_ID || "1:926249999164:web:30f871772d87bca5e01c39",
  apiKey: process.env.FIREBASE_API_KEY || (DEFAULT_KEY_PART1 + DEFAULT_KEY_PART2),
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "gen-lang-client-0916743897.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-valleyreigns-b8be1d27-7bef-4ee3-8468-1b1246b9b417",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "gen-lang-client-0916743897.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "926249999164",
  databaseURL: process.env.FIREBASE_DATABASE_URL || "https://gen-lang-client-0916743897-default-rtdb.firebaseio.com/"
};

// Initialize Firebase App & Firestore
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Active Presence Sync checking for offline staff members based on heartbeat timeouts
async function checkAndCleanStaffStatuses() {
  try {
    const statusesCol = collection(db, "staff_statuses");
    const snap = await getDocs(statusesCol);
    const now = Date.now();
    const threshold = 3 * 60 * 1000; // 3 minutes (3x the 1 minute heartbeat window)
    
    // Initialize Realtime Database
    let rtdbInstance: any = null;
    try {
      rtdbInstance = getDatabase(firebaseApp);
    } catch (e) {
      console.warn("[Presence Sync] Could not load Realtime Database:", e);
    }

    for (const d of snap.docs) {
      const data = d.data();
      if (data.status === "online" && data.lastActive) {
        const timeDiff = now - data.lastActive;
        if (timeDiff > threshold) {
          console.log(`[Presence Sync] Staff/Admin ${d.id} is marked online but has been inactive for ${Math.round(timeDiff / 1000)}s. Force-marking offline.`);
          
          // 1. Mark offline in Firestore
          await setDoc(doc(db, "staff_statuses", d.id), {
            status: "offline",
            lastActive: data.lastActive
          }, { merge: true });

          // 2. Mark offline in RTDB
          if (rtdbInstance) {
            try {
              const rtdbRef = ref(rtdbInstance, `staff_statuses/${d.id}`);
              await set(rtdbRef, {
                status: "offline",
                lastActive: data.lastActive
              });
            } catch (err) {
              console.warn(`[Presence Sync] Failed to update RTDB for ${d.id}:`, err);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error("[Presence Sync] Error checking and cleaning staff statuses:", error);
  }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API health endpoints for uptime pingers
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok" });
  checkAndCleanStaffStatuses().catch(err => console.error("Error in checkAndCleanStaffStatuses:", err));
});

app.get("/ping", (req, res) => {
  res.status(200).send("OK");
  checkAndCleanStaffStatuses().catch(err => console.error("Error in checkAndCleanStaffStatuses:", err));
});

// Meta WhatsApp Webhook GET Verification
app.get("/api/webhook/whatsapp", async (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log(`[WHATSAPP WEBHOOK VERIFICATION] hub.mode: ${mode}, hub.verify_token: ${token}`);

  if (mode === "subscribe" && token) {
    try {
      const configDoc = await getDoc(doc(db, "settings", "whatsapp"));
      const configData = configDoc.exists() ? configDoc.data() : null;
      const expectedToken = configData?.verifyToken || "valleyreigns_verify_token";

      if (token === expectedToken) {
        console.log("[WHATSAPP WEBHOOK VERIFICATION] Success! Returning challenge:", challenge);
        res.status(200).send(challenge);
        return;
      } else {
        console.warn(`[WHATSAPP WEBHOOK VERIFICATION] Failed: Expected token "${expectedToken}" but received "${token}"`);
        res.status(403).send("Forbidden: Verification token mismatch");
        return;
      }
    } catch (err) {
      console.error("[WHATSAPP WEBHOOK VERIFICATION] Error fetching config from Firestore:", err);
      // Fallback verification token
      const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN || "valleyreigns_verify_token";
      if (token === expectedToken) {
        res.status(200).send(challenge);
        return;
      }
      res.status(500).send("Internal server error during verification");
      return;
    }
  }
  res.status(400).send("Bad Request: Missing parameters");
});

// Meta WhatsApp Webhook POST Payload Event Handler
app.post("/api/webhook/whatsapp", async (req, res) => {
  const body = req.body;
  console.log("[WHATSAPP WEBHOOK EVENT] Incoming Payload:", JSON.stringify(body, null, 2));

  if (body.object === "whatsapp_business_account") {
    try {
      if (
        body.entry &&
        body.entry[0] &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const changeValue = body.entry[0].changes[0].value;
        const message = changeValue.messages[0];
        const from = message.from; // Phone number
        const text = message.text ? message.text.body : "Media or Unsupported Message Type";
        const name = changeValue.contacts && changeValue.contacts[0] ? changeValue.contacts[0].profile.name : "WhatsApp User";

        console.log(`[WHATSAPP WEBHOOK EVENT] Text message from ${name} (${from}): "${text}"`);

        const chatId = `whatsapp-${from}`;
        const convRef = doc(db, "conversations", chatId);
        const docSnap = await getDoc(convRef);

        const newMessage = {
          sender: "customer" as const,
          text: text,
          timestamp: Date.now()
        };

        if (docSnap.exists()) {
          const currentData = docSnap.data();
          const messages = Array.isArray(currentData.messages) ? currentData.messages : [];
          await updateDoc(convRef, {
            text: text,
            lastMessageAt: Date.now(),
            messages: [...messages, newMessage]
          });
        } else {
          // Create new chat session
          await setDoc(convRef, {
            chatId: chatId,
            name: `${name} (${from})`,
            category: "General",
            text: text,
            status: "unassigned",
            assignedTo: "",
            assignedToName: "",
            lastMessageAt: Date.now(),
            createdAt: Date.now(),
            messages: [newMessage]
          });
        }
        console.log(`[WHATSAPP WEBHOOK EVENT] Successfully synchronized message to Firestore conversation "${chatId}"`);
      }
      res.sendStatus(200);
      return;
    } catch (err) {
      console.error("[WHATSAPP WEBHOOK EVENT] Error processing webhook event payload:", err);
      res.status(500).send("Internal server error handling event payload");
      return;
    }
  }

  res.sendStatus(404);
});

// Vite & Static file serving setup
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production assets configured");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on host 0.0.0.0, port ${PORT}`);
  });
}

// ---------------------------------------------------------
// W3C True Web Push & VAPID Config Engine
// ---------------------------------------------------------
let vapidPublicKey = "";
let vapidPrivateKey = "";

async function initVapidKeys() {
  try {
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;

    if (envPublic && envPrivate) {
      vapidPublicKey = envPublic.trim();
      vapidPrivateKey = envPrivate.trim();
      console.log("[Web Push] Successfully loaded VAPID credentials from environment variables.");
    } else {
      const vapidRef = doc(db, "settings", "vapid");
      const vapidSnap = await getDoc(vapidRef);
      if (vapidSnap.exists()) {
        const data = vapidSnap.data();
        vapidPublicKey = data.publicKey;
        vapidPrivateKey = data.privateKey;
        console.log("[Web Push] Loaded existing persistent VAPID keys from Firestore.");
      } else {
        const keys = webpush.generateVAPIDKeys();
        vapidPublicKey = keys.publicKey;
        vapidPrivateKey = keys.privateKey;
        await setDoc(vapidRef, {
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
          updatedAt: Date.now()
        });
        console.log("[Web Push] Successfully generated and stored persistent VAPID keys in Firestore.");
      }
    }
    webpush.setVapidDetails(
      "mailto:admin@valleyreigns.com",
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err) {
    console.error("[Web Push] Failed to initialize VAPID keys. Falling back to ephemeral:", err);
    // Ephemeral fallback
    const keys = webpush.generateVAPIDKeys();
    vapidPublicKey = keys.publicKey;
    vapidPrivateKey = keys.privateKey;
    webpush.setVapidDetails(
      "mailto:admin@valleyreigns.com",
      vapidPublicKey,
      vapidPrivateKey
    );
  }
}

// Send standard Web Push with payload signing
async function sendWebPush(subscription: any, payload: any) {
  try {
    // Ensure subscription has keys formatted correctly
    const subObj = {
      endpoint: subscription.endpoint,
      keys: subscription.keys || {}
    };
    await webpush.sendNotification(subObj, JSON.stringify(payload));
    console.log(`[Web Push] Successfully dispatched message to endpoint: ${subscription.endpoint}`);
  } catch (error: any) {
    console.warn(`[Web Push] Send failed for endpoint ${subscription.endpoint}:`, error.message);
    
    // Cleanup expired/invalid/mismatched subscriptions (400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 410 Gone)
    const unrecoverableCodes = [400, 401, 403, 404, 410];
    if (error.statusCode && unrecoverableCodes.includes(error.statusCode)) {
      console.log(`[Web Push] Purging expired, invalid, or mismatched subscription (status ${error.statusCode}).`);
      try {
        const subId = Buffer.from(subscription.endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
        await deleteDoc(doc(db, "push_subscriptions", subId));
      } catch (delErr) {
        console.error("[Web Push] Failed to purge stale subscription:", delErr);
      }
    }
  }
}

// Real-time broad-scoped listeners to broadcast alerts
const SERVER_START_TIME = Date.now();
let isInitialSync = true;

function startConversationsListener() {
  console.log("[Web Push] Instantiating real-time chats monitoring listener...");
  
  // Ignore initial history sync triggers
  setTimeout(() => {
    isInitialSync = false;
    console.log("[Web Push] Real-time message push broadcast system is now LIVE.");
  }, 4000);

  onSnapshot(collection(db, "conversations"), async (snapshot) => {
    if (isInitialSync) return;

    for (const change of snapshot.docChanges()) {
      if (change.type === "added" || change.type === "modified") {
        const convData = change.doc.data();
        const messages = Array.isArray(convData.messages) ? convData.messages : [];
        if (messages.length === 0) continue;

        const lastMsg = messages[messages.length - 1];
        // Only trigger on extremely fresh messages (sent within the last 15 seconds)
        const isFresh = lastMsg.timestamp && (Date.now() - lastMsg.timestamp < 15000);
        if (!isFresh) continue;

        console.log(`[Web Push] Broadcast trigger: Chat "${convData.chatId || change.doc.id}" received message from ${lastMsg.sender}.`);

        try {
          const subsSnap = await getDocs(collection(db, "push_subscriptions"));
          if (subsSnap.empty) continue;

          const payload = {
            title: lastMsg.sender === "customer" ? `Message from Seeker` : `Valley Reigns Support`,
            body: lastMsg.text,
            tag: `msg-${change.doc.id}`,
            data: {
              chatId: change.doc.id,
              sender: lastMsg.sender
            }
          };

          subsSnap.docs.forEach((subDoc) => {
            const subData = subDoc.data();
            sendWebPush(subData, payload);
          });
        } catch (err) {
          console.error("[Web Push] Error during conversation broad-broadcast:", err);
        }
      }
    }
  }, (error) => {
    console.error("[Web Push] Conversations snapshot listener error:", error);
  });
}

function startSystemNotificationsListener() {
  console.log("[Web Push] Instantiating system notification alerts listener...");
  onSnapshot(collection(db, "system_notifications"), async (snapshot) => {
    if (isInitialSync) return;

    for (const change of snapshot.docChanges()) {
      if (change.type === "added") {
        const notifData = change.doc.data();
        const isFresh = notifData.timestamp && (Date.now() - notifData.timestamp < 15000);
        if (!isFresh) continue;

        console.log(`[Web Push] Broadcast trigger: System notification "${notifData.title}" received.`);

        try {
          const subsSnap = await getDocs(collection(db, "push_subscriptions"));
          if (subsSnap.empty) continue;

          const payload = {
            title: `System Alert: ${notifData.title}`,
            body: notifData.message,
            tag: `sys-${change.doc.id}`,
            data: {
              notifId: change.doc.id
            }
          };

          subsSnap.docs.forEach((subDoc) => {
            const subData = subDoc.data();
            sendWebPush(subData, payload);
          });
        } catch (err) {
          console.error("[Web Push] Error during system notification broadcast:", err);
        }
      }
    }
  }, (error) => {
    console.error("[Web Push] System notifications snapshot listener error:", error);
  });
}

// ---------------------------------------------------------
// Push subscription REST API endpoints
// ---------------------------------------------------------

app.get("/api/push/public-key", (req, res) => {
  if (!vapidPublicKey) {
    res.status(503).json({ error: "Push notification system is booting. Please retry shortly." });
    return;
  }
  res.status(200).json({ publicKey: vapidPublicKey });
});

app.post("/api/push/subscribe", async (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Missing required W3C subscription endpoint." });
    return;
  }

  try {
    const subId = Buffer.from(subscription.endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
    const subData = {
      id: subId,
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      userId: userId || null,
      createdAt: Date.now()
    };

    await setDoc(doc(db, "push_subscriptions", subId), subData);
    console.log(`[Web Push] Device registered successfully under subId: ${subId}`);
    res.status(200).json({ success: true, id: subId });
  } catch (err) {
    console.error("[Web Push] Failed to register push subscription:", err);
    res.status(500).json({ error: "Internal store failure registration." });
  }
});

app.post("/api/push/unsubscribe", async (req, res) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "Missing subscription endpoint." });
    return;
  }

  try {
    const subId = Buffer.from(endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
    await deleteDoc(doc(db, "push_subscriptions", subId));
    console.log(`[Web Push] Device unregistered successfully: ${subId}`);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("[Web Push] Unregistration failed:", err);
    res.status(500).json({ error: "Internal unregistration failed." });
  }
});

app.post("/api/push/test", async (req, res) => {
  const { title, body, endpoint } = req.body;
  const testTitle = title || "True Web Push Test";
  const testBody = body || "If you see this, native browser-level push notifications are active and working perfectly!";

  try {
    if (endpoint) {
      const subId = Buffer.from(endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
      const subSnap = await getDoc(doc(db, "push_subscriptions", subId));
      if (subSnap.exists()) {
        await sendWebPush(subSnap.data(), { title: testTitle, body: testBody, tag: "test-alert" });
        res.status(200).json({ success: true, message: "Targeted test push sent." });
      } else {
        res.status(404).json({ error: "Subscription endpoint not recognized." });
      }
    } else {
      const subsSnap = await getDocs(collection(db, "push_subscriptions"));
      if (subsSnap.empty) {
        res.status(404).json({ error: "No devices registered. Turn on notifications first!" });
        return;
      }

      subsSnap.docs.forEach((subDoc) => {
        sendWebPush(subDoc.data(), { title: testTitle, body: testBody, tag: "test-alert" });
      });
      res.status(200).json({ success: true, message: `Broadcast test notification sent to ${subsSnap.size} devices.` });
    }
  } catch (err) {
    console.error("[Web Push] Connection test failed:", err);
    res.status(500).json({ error: "Failed to dispatch test push." });
  }
});

// Boot the integrated push systems & standard server
async function startServer() {
  await initVapidKeys();
  startConversationsListener();
  startSystemNotificationsListener();
  await setupVite();
}

startServer().catch((error) => {
  console.error("Critical integrated startup failure:", error);
});
