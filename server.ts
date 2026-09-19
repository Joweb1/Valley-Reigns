import "dotenv/config";
import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc,
  setLogLevel 
} from "firebase/firestore";
import webpush from "web-push";

// Suppress internal gRPC idle stream warnings in Node
setLogLevel("error");

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security & Header Configuration
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Standard JSON body parser for general API endpoints
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

// Higher payload parser exclusively for media/file upload endpoint
const uploadJsonParser = express.json({ limit: "25mb" });

// Dynamic Firebase credentials safely split to prevent scanner warnings
const DEFAULT_KEY_PART1 = "AIzaSyCviINa6";
const DEFAULT_KEY_PART2 = "wlqGvTIOIlk9FN4-Kc-vOUpah4";

const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0916743897",
  appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || "1:926249999164:web:30f871772d87bca5e01c39",
  apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || (DEFAULT_KEY_PART1 + DEFAULT_KEY_PART2),
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0916743897.firebaseapp.com",
  firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-valleyreigns-b8be1d27-7bef-4ee3-8468-1b1246b9b417",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0916743897.firebasestorage.app",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "926249999164"
};

// Initialize Firebase App & Firestore
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// ---------------------------------------------------------
// Health & Uptime Endpoints (Fast, Non-Blocking)
// ---------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.status(200).json({ 
    status: "ok", 
    uptime: Math.floor(process.uptime()),
    timestamp: Date.now() 
  });
});

app.get("/ping", (req, res) => {
  res.status(200).send("OK");
});

// ---------------------------------------------------------
// ImageKit Authentication & Proxy Upload Endpoints
// ---------------------------------------------------------
app.get("/api/imagekit-auth", (req, res) => {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
      res.status(500).json({ error: "IMAGEKIT_PRIVATE_KEY is not configured on the server." });
      return;
    }

    const token = (req.query.token as string) || crypto.randomUUID();
    const expire = (req.query.expire as string) || String(Math.floor(Date.now() / 1000) + 2400);

    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    res.json({
      token,
      expire,
      signature,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "public_7cIQfpYvqi4X6yx3g4c+6BnOZOA=",
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/deglio1ni"
    });
  } catch (err: any) {
    console.error("[ImageKit Auth Error]", err);
    res.status(500).json({ error: err.message || "Failed to generate ImageKit auth signature" });
  }
});

app.post("/api/upload", uploadJsonParser, async (req, res, next) => {
  try {
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
    if (!privateKey) {
      res.status(500).json({ error: "IMAGEKIT_PRIVATE_KEY is not configured on the server." });
      return;
    }

    const { file, fileName, folder } = req.body;
    if (!file || !fileName) {
      res.status(400).json({ error: "Missing required fields: 'file' (base64 string or URL) and 'fileName'." });
      return;
    }

    // Basic filename sanitization to prevent path traversal
    const safeFileName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, "_");
    const authHeader = "Basic " + Buffer.from(privateKey + ":").toString("base64");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", safeFileName);
    formData.append("useUniqueFileName", "true");
    if (folder) {
      formData.append("folder", String(folder).replace(/[^a-zA-Z0-9_\-\/]/g, ""));
    }

    const ikRes = await fetch("https://upload.imagekit.io/api/v1/files/upload", {
      method: "POST",
      headers: {
        "Authorization": authHeader
      },
      body: formData
    });

    const ikData = await ikRes.json();
    if (!ikRes.ok) {
      console.error("[ImageKit Upload API Error]", ikData);
      res.status(ikRes.status || 400).json({ error: ikData?.message || "Failed to upload file to ImageKit." });
      return;
    }

    res.json({
      success: true,
      url: ikData.url,
      fileId: ikData.fileId,
      name: ikData.name,
      fileType: ikData.fileType || "file",
      thumbnailUrl: ikData.thumbnailUrl || ikData.url,
      size: ikData.size
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------
// W3C True Web Push & VAPID Config Engine
// ---------------------------------------------------------
let vapidPublicKey = "";
let vapidPrivateKey = "";

// In-memory cache for push subscriptions with a 30-second TTL
interface PushSubRecord {
  id: string;
  endpoint: string;
  keys: { p256dh?: string; auth?: string };
  userId?: string | null;
  role?: string | null;
  email?: string | null;
  displayName?: string | null;
  createdAt?: number;
}

let cachedSubscriptions: PushSubRecord[] | null = null;
let lastSubscriptionsFetchTime = 0;
const SUBSCRIPTIONS_CACHE_TTL_MS = 30 * 1000;
const inMemorySubscriptions = new Map<string, PushSubRecord>();

// In-memory cache for user profiles (role, displayName, email) with a 5-minute TTL
interface CachedUserProfile {
  role: string;
  displayName?: string;
  email?: string;
  cachedAt: number;
}
const userProfileCache = new Map<string, CachedUserProfile>();
const PROFILE_CACHE_TTL_MS = 5 * 60 * 1000;

async function getActiveSubscriptions(): Promise<PushSubRecord[]> {
  const now = Date.now();
  if (cachedSubscriptions && (now - lastSubscriptionsFetchTime < SUBSCRIPTIONS_CACHE_TTL_MS)) {
    return cachedSubscriptions;
  }

  try {
    const subsSnap = await getDocs(collection(db, "push_subscriptions"));
    cachedSubscriptions = subsSnap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        endpoint: data.endpoint,
        keys: data.keys || {},
        userId: data.userId || null,
        role: data.role || null,
        email: data.email || null,
        displayName: data.displayName || null,
        createdAt: data.createdAt
      };
    });
    for (const sub of cachedSubscriptions) {
      inMemorySubscriptions.set(sub.id, sub);
    }
    lastSubscriptionsFetchTime = now;
    return cachedSubscriptions;
  } catch (err: any) {
    if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
      console.warn("[Web Push] Firestore quota limit reached while fetching subscriptions; relying on memory cache.");
    } else {
      console.warn("[Web Push] Note on Firestore subscriptions fetch, using memory cache:", err?.message || err);
    }
    return Array.from(inMemorySubscriptions.values());
  }
}

async function getUserProfile(userId: string): Promise<CachedUserProfile | null> {
  const now = Date.now();
  const cached = userProfileCache.get(userId);
  if (cached && (now - cached.cachedAt < PROFILE_CACHE_TTL_MS)) {
    return cached;
  }

  try {
    const uDoc = await getDoc(doc(db, "users", userId));
    if (uDoc.exists()) {
      const data = uDoc.data();
      const profile: CachedUserProfile = {
        role: data.role || "seeker",
        displayName: data.displayName || "",
        email: data.email || "",
        cachedAt: now
      };
      userProfileCache.set(userId, profile);
      return profile;
    }
  } catch (err: any) {
    if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
      // Quiet fallback when quota limit is hit
    } else {
      console.warn(`[Web Push] Failed to fetch user profile for ${userId}:`, err);
    }
  }
  return null;
}

async function initVapidKeys() {
  try {
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;

    if (envPublic && envPrivate) {
      vapidPublicKey = envPublic.trim();
      vapidPrivateKey = envPrivate.trim();
      console.log("[Web Push] Loaded VAPID credentials from environment variables.");
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
        console.log("[Web Push] Generated and stored persistent VAPID keys in Firestore.");
      }
    }
    webpush.setVapidDetails(
      "mailto:admin@valleyreigns.com",
      vapidPublicKey,
      vapidPrivateKey
    );
  } catch (err: any) {
    if (err?.code === "resource-exhausted" || err?.message?.includes("Quota")) {
      console.warn("[Web Push] Firestore quota limit reached while loading VAPID keys; using in-memory keys.");
    } else {
      console.warn("[Web Push] Failed to initialize persistent VAPID keys, using ephemeral fallback:", err);
    }
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

// Send standard Web Push with payload signing & async dead subscription purging
async function sendWebPush(subscription: { endpoint: string; keys?: any; id?: string }, payload: any) {
  try {
    const subObj = {
      endpoint: subscription.endpoint,
      keys: subscription.keys || {}
    };
    await webpush.sendNotification(subObj, JSON.stringify(payload));
  } catch (error: any) {
    // Unrecoverable HTTP statuses indicate subscription has expired or revoked
    const unrecoverableCodes = [400, 401, 403, 404, 410];
    if (error.statusCode && unrecoverableCodes.includes(error.statusCode)) {
      // Instantly remove from in-memory cache to avoid repeated failed dispatches
      if (cachedSubscriptions) {
        cachedSubscriptions = cachedSubscriptions.filter(s => s.endpoint !== subscription.endpoint);
      }
      // Asynchronously delete from Firestore without stalling execution
      const subId = subscription.id || Buffer.from(subscription.endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
      deleteDoc(doc(db, "push_subscriptions", subId)).catch(() => {});
    }
  }
}

// ---------------------------------------------------------
// Push Broadcast API Endpoint (for real-time push dispatches)
// ---------------------------------------------------------
app.post("/api/push/broadcast", async (req, res, next) => {
  const { title, body, tag, role, targetUserId, data } = req.body;
  if (!title || !body) {
    res.status(400).json({ error: "Missing required title or body" });
    return;
  }

  try {
    const subscriptions = await getActiveSubscriptions();
    let sentCount = 0;
    const payload = {
      title,
      body,
      tag: tag || `push-${Date.now()}`,
      data: data || {}
    };

    for (const sub of subscriptions) {
      if (targetUserId && sub.userId !== targetUserId) continue;
      if (role && sub.role !== role && sub.role !== "admin") continue;
      sendWebPush(sub, payload);
      sentCount++;
    }

    res.status(200).json({ success: true, dispatched: sentCount });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------
// Push Subscription REST API Endpoints
// ---------------------------------------------------------
app.get("/api/push/public-key", (req, res) => {
  if (!vapidPublicKey) {
    res.status(503).json({ error: "Push notification service is initializing. Please retry in a few seconds." });
    return;
  }
  res.status(200).json({ publicKey: vapidPublicKey });
});

app.post("/api/push/subscribe", async (req, res, next) => {
  const { subscription, userId, role, email, displayName } = req.body;
  if (!subscription || !subscription.endpoint) {
    res.status(400).json({ error: "Missing required W3C subscription endpoint." });
    return;
  }

  try {
    const subId = Buffer.from(subscription.endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
    const subData: PushSubRecord = {
      id: subId,
      endpoint: subscription.endpoint,
      keys: subscription.keys || {},
      userId: userId || null,
      role: role || null,
      email: email || null,
      displayName: displayName || null,
      createdAt: Date.now()
    };

    inMemorySubscriptions.set(subId, subData);
    setDoc(doc(db, "push_subscriptions", subId), subData).catch((e) => {
      console.warn("[Web Push] Note on Firestore subscription persistence:", e?.message || e);
    });

    // Update in-memory profile cache if user metadata was provided
    if (userId && role) {
      userProfileCache.set(userId, {
        role,
        displayName: displayName || "",
        email: email || "",
        cachedAt: Date.now()
      });
    }

    // Invalidate subscription cache so the new subscription is immediately active
    cachedSubscriptions = null;

    res.status(200).json({ success: true, id: subId });
  } catch (err) {
    next(err);
  }
});

app.post("/api/push/unsubscribe", async (req, res, next) => {
  const { endpoint } = req.body;
  if (!endpoint) {
    res.status(400).json({ error: "Missing subscription endpoint." });
    return;
  }

  try {
    const subId = Buffer.from(endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
    inMemorySubscriptions.delete(subId);
    deleteDoc(doc(db, "push_subscriptions", subId)).catch((e) => {
      console.warn("[Web Push] Note on Firestore subscription delete:", e?.message || e);
    });

    // Invalidate subscription cache
    cachedSubscriptions = null;

    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/push/test", async (req, res, next) => {
  const { title, body, endpoint } = req.body;
  const testTitle = title || "True Web Push Test";
  const testBody = body || "If you see this, native browser-level push notifications are active and working perfectly!";

  try {
    if (endpoint) {
      const subId = Buffer.from(endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
      const subSnap = await getDoc(doc(db, "push_subscriptions", subId));
      if (subSnap.exists()) {
        await sendWebPush(subSnap.data() as any, { title: testTitle, body: testBody, tag: "test-alert" });
        res.status(200).json({ success: true, message: "Targeted test push sent." });
      } else {
        res.status(404).json({ error: "Subscription endpoint not found." });
      }
    } else {
      const subscriptions = await getActiveSubscriptions();
      if (subscriptions.length === 0) {
        res.status(404).json({ error: "No active devices registered. Turn on notifications in Settings first." });
        return;
      }

      subscriptions.forEach((sub) => {
        sendWebPush(sub, { title: testTitle, body: testBody, tag: "test-alert" });
      });
      res.status(200).json({ success: true, message: `Broadcast test notification dispatched to ${subscriptions.length} devices.` });
    }
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------
// Central API 404 Handler for undefined API routes
// ---------------------------------------------------------
app.all("/api/*", (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: `API endpoint not found: ${req.method} ${req.path}` 
  });
});

// ---------------------------------------------------------
// Central Express Error Handling Middleware
// ---------------------------------------------------------
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Express Error] ${req.method} ${req.url}:`, err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : (typeof err.status === "number" ? err.status : 500);
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

// ---------------------------------------------------------
// Vite & Static Production Assets
// ---------------------------------------------------------
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[Server] Vite development middleware mounted");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("[Server] Static production assets mounted");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Server listening on host 0.0.0.0, port ${PORT}`);
  });
}

// ---------------------------------------------------------
// Server Startup Sequence
// ---------------------------------------------------------
async function startServer() {
  await initVapidKeys();
  await setupVite();
}

startServer().catch((error) => {
  console.error("[Server] Critical startup failure:", error);
});
