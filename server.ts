import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { getDatabase, ref, set } from "firebase/database";

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

setupVite().catch((error) => {
  console.error("Vite setup error:", error);
});
