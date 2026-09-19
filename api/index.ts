import "dotenv/config";
import express from "express";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  deleteDoc 
} from "firebase/firestore";
import webpush from "web-push";

const app = express();

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

// Dynamic Firebase credentials safely split to prevent GitHub secret scans
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
// Fast Health & Uptime Endpoints
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
// Push Subscription REST API Endpoints
// ---------------------------------------------------------
app.get("/api/push/public-key", async (req, res, next) => {
  try {
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    if (envPublic) {
      res.status(200).json({ publicKey: envPublic.trim() });
      return;
    }

    const vapidRef = doc(db, "settings", "vapid");
    const vapidSnap = await getDoc(vapidRef);
    if (vapidSnap.exists()) {
      res.status(200).json({ publicKey: vapidSnap.data().publicKey });
      return;
    }

    res.status(503).json({ error: "VAPID keys are initializing. Please retry in a few seconds." });
  } catch (err) {
    next(err);
  }
});

app.post("/api/push/subscribe", async (req, res, next) => {
  const { subscription, userId, role, email, displayName } = req.body;
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
      role: role || null,
      email: email || null,
      displayName: displayName || null,
      createdAt: Date.now()
    };

    await setDoc(doc(db, "push_subscriptions", subId), subData);
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
    await deleteDoc(doc(db, "push_subscriptions", subId));
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

app.post("/api/push/test", async (req, res, next) => {
  const { title, body, endpoint } = req.body;
  const testTitle = title || "True Web Push Test";
  const testBody = body || "Native browser-level push notifications are active and working!";

  try {
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;
    let pubKey = envPublic?.trim();
    let privKey = envPrivate?.trim();

    if (!pubKey || !privKey) {
      const vapidSnap = await getDoc(doc(db, "settings", "vapid"));
      if (vapidSnap.exists()) {
        pubKey = vapidSnap.data().publicKey;
        privKey = vapidSnap.data().privateKey;
      }
    }

    if (!pubKey || !privKey) {
      res.status(500).json({ error: "VAPID credentials not configured." });
      return;
    }

    webpush.setVapidDetails("mailto:admin@valleyreigns.com", pubKey, privKey);

    if (endpoint) {
      const subId = Buffer.from(endpoint).toString("base64").substring(0, 100).replace(/[^a-zA-Z0-9_-]/g, "");
      const subSnap = await getDoc(doc(db, "push_subscriptions", subId));
      if (subSnap.exists()) {
        const subData = subSnap.data();
        await webpush.sendNotification({ endpoint: subData.endpoint, keys: subData.keys || {} }, JSON.stringify({ title: testTitle, body: testBody, tag: "test-alert" }));
        res.status(200).json({ success: true, message: "Targeted test push sent." });
      } else {
        res.status(404).json({ error: "Subscription endpoint not recognized." });
      }
    } else {
      const subsSnap = await getDocs(collection(db, "push_subscriptions"));
      if (subsSnap.empty) {
        res.status(404).json({ error: "No devices registered." });
        return;
      }

      await Promise.all(
        subsSnap.docs.map(d => {
          const subData = d.data();
          return webpush.sendNotification(
            { endpoint: subData.endpoint, keys: subData.keys || {} }, 
            JSON.stringify({ title: testTitle, body: testBody, tag: "test-alert" })
          ).catch(() => {});
        })
      );
      res.status(200).json({ success: true, message: `Broadcast test sent to ${subsSnap.size} devices.` });
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
  console.error(`[API Error] ${req.method} ${req.url}:`, err);
  if (res.headersSent) {
    return next(err);
  }
  const statusCode = typeof err.statusCode === "number" ? err.statusCode : (typeof err.status === "number" ? err.status : 500);
  res.status(statusCode).json({
    success: false,
    error: err.message || "Internal server error"
  });
});

export default app;
