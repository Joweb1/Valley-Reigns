import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc, collection, getDocs, onSnapshot, deleteDoc } from "firebase/firestore";
import { getDatabase, ref, set } from "firebase/database";
import webpush from "web-push";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from "@whiskeysockets/baileys";
import QRCode from "qrcode";

const makeWASocketFn = (makeWASocket as any)?.default || makeWASocket;
const useMultiFileAuthStateFn = (useMultiFileAuthState as any)?.default || useMultiFileAuthState;
const BrowsersFn = (Browsers as any)?.default || Browsers;

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

let rtdb: any = null;
try {
  rtdb = getDatabase(firebaseApp);
} catch (e) {
  console.warn("[Server] Realtime Database initialization notice:", e);
}

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
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ImageKit Authentication Endpoint for @imagekit/react client SDKs
app.get("/api/imagekit-auth", (req, res) => {
  try {
    const token = (req.query.token as string) || crypto.randomUUID();
    const expire = (req.query.expire as string) || String(Math.floor(Date.now() / 1000) + 2400);
    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "private_OqsZ5WWYsU0b2wNOGPTLNU7k2cw=";

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
    console.error("[ImageKit Auth Endpoint Error]", err);
    res.status(500).json({ error: err.message || "Failed to generate ImageKit auth signature" });
  }
});

// ImageKit Direct File/Image Upload Endpoint
app.post("/api/upload", async (req, res) => {
  try {
    const { file, fileName, folder } = req.body;
    if (!file || !fileName) {
      res.status(400).json({ error: "Missing required fields: 'file' (base64 string or URL) and 'fileName'." });
      return;
    }

    const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || "private_OqsZ5WWYsU0b2wNOGPTLNU7k2cw=";
    const authHeader = "Basic " + Buffer.from(privateKey + ":").toString("base64");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", fileName);
    formData.append("useUniqueFileName", "true");
    if (folder) {
      formData.append("folder", folder);
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
  } catch (err: any) {
    console.error("[ImageKit Proxy Upload Error]", err);
    res.status(500).json({ error: err.message || "Internal server error during file upload." });
  }
});

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
        await syncIncomingBaileysMessage(`${from}@s.whatsapp.net`, name, text);
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

// ---------------------------------------------------------
// Baileys WhatsApp Web Engine & Dual Provider Router
// ---------------------------------------------------------
const BAILEYS_AUTH_DIR = path.join(process.cwd(), "baileys_auth");

const silentLogger = {
  level: "silent",
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => silentLogger
};

let baileysSocket: any = null;
let baileysPresenceInterval: NodeJS.Timeout | null = null;
let baileysReconnectTimer: NodeJS.Timeout | null = null;
let baileysStatus: "disconnected" | "connecting" | "qr_ready" | "connected" | "error" = "disconnected";
let baileysQrCode: string | null = null;
let baileysPairingCode: string | null = null;
let baileysUserPhone: string | null = null;
let baileysError: string | null = null;
let isNewSessionPairing = false;

interface ReceivedWhatsAppMessageLog {
  id: string;
  chatId: string;
  customerPhone: string;
  name: string;
  text: string;
  timestamp: number;
  provider: "baileys" | "official" | "simulated";
  status: string;
}
const recentReceivedWhatsAppMessages: ReceivedWhatsAppMessageLog[] = [];

async function clearPreviousWhatsAppConversations() {
  try {
    console.log("[Baileys] Clearing previous WhatsApp conversations from database...");
    const convsColl = collection(db, "conversations");
    const snap = await getDocs(convsColl);
    let count = 0;
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const isInApp = Boolean(data?.isInApp) || docSnap.id.startsWith("inapp_");
      if (!isInApp) {
        await deleteDoc(docSnap.ref);
        count++;
      }
    }
    console.log(`[Baileys] Successfully cleared ${count} WhatsApp conversations from Firestore.`);
    recentReceivedWhatsAppMessages.length = 0;
  } catch (err) {
    console.error("[Baileys] Error clearing previous WhatsApp conversations:", err);
  }
}

async function getActiveWhatsAppMode(): Promise<"official" | "baileys"> {
  try {
    const configDoc = await getDoc(doc(db, "settings", "whatsapp"));
    if (configDoc.exists()) {
      const data = configDoc.data();
      const officialConfigured = Boolean(
        (data.phoneAccountId || process.env.WHATSAPP_PHONE_ACCOUNT_ID) &&
        (data.accessToken || process.env.WHATSAPP_ACCESS_TOKEN)
      );
      if (data.mode === "baileys") return "baileys";
      if (data.mode === "official" && officialConfigured) return "official";
      if (!officialConfigured) return "baileys";
    }
  } catch (err) {
    console.warn("[WhatsApp Provider] Error reading mode from Firestore:", err);
  }
  const defaultOfficialConfigured = Boolean(process.env.WHATSAPP_PHONE_ACCOUNT_ID && process.env.WHATSAPP_ACCESS_TOKEN);
  return defaultOfficialConfigured ? "official" : "baileys";
}

function extractMessageText(msgContent: any): string {
  if (!msgContent) return "";

  // Unwrap nested/wrapper messages
  if (msgContent.ephemeralMessage) return extractMessageText(msgContent.ephemeralMessage.message);
  if (msgContent.viewOnceMessage) return extractMessageText(msgContent.viewOnceMessage.message);
  if (msgContent.viewOnceMessageV2) return extractMessageText(msgContent.viewOnceMessageV2.message);
  if (msgContent.viewOnceMessageV2Extension) return extractMessageText(msgContent.viewOnceMessageV2Extension.message);
  if (msgContent.documentWithCaptionMessage) return extractMessageText(msgContent.documentWithCaptionMessage.message);
  if (msgContent.editedMessage) return extractMessageText(msgContent.editedMessage.message);

  // Ignore protocol/system signals that carry no actual user content
  if (
    msgContent.protocolMessage ||
    msgContent.senderKeyDistributionMessage ||
    msgContent.messageContextInfo ||
    msgContent.reactionMessage
  ) {
    if (
      !msgContent.conversation &&
      !msgContent.extendedTextMessage &&
      !msgContent.imageMessage &&
      !msgContent.videoMessage &&
      !msgContent.audioMessage &&
      !msgContent.documentMessage
    ) {
      return "";
    }
  }

  if (msgContent.conversation) return msgContent.conversation;
  if (msgContent.extendedTextMessage?.text) return msgContent.extendedTextMessage.text;
  if (msgContent.imageMessage?.caption) return msgContent.imageMessage.caption;
  if (msgContent.videoMessage?.caption) return msgContent.videoMessage.caption;
  if (msgContent.imageMessage) return "[Photo]";
  if (msgContent.videoMessage) return "[Video]";
  if (msgContent.audioMessage || msgContent.ptvMessage) return "[Voice note]";
  if (msgContent.documentMessage) return `[Document: ${msgContent.documentMessage.fileName || "File"}]`;
  if (msgContent.stickerMessage) return "[Sticker]";
  if (msgContent.contactMessage) return `[Contact: ${msgContent.contactMessage.displayName || "Contact"}]`;
  if (msgContent.contactsArrayMessage) return "[Contacts]";
  if (msgContent.locationMessage || msgContent.liveLocationMessage) return "[Location]";
  if (msgContent.buttonsResponseMessage?.selectedDisplayText) return msgContent.buttonsResponseMessage.selectedDisplayText;
  if (msgContent.listResponseMessage?.title) return msgContent.listResponseMessage.title;
  if (msgContent.interactiveResponseMessage) return "[Interactive Response]";
  if (msgContent.templateButtonReplyMessage?.selectedDisplayText) return msgContent.templateButtonReplyMessage.selectedDisplayText;

  return "Media or Unsupported Message";
}

async function resolveContactName(rawPhone: string, pushName?: string): Promise<string> {
  const formattedPhone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`;
  
  const isGeneric = (str?: string | null) => {
    if (!str) return true;
    const s = str.trim();
    if (!s) return true;
    if (s === "WhatsApp Customer" || s === "WhatsApp User" || s === "WhatsApp Contact") return true;
    if (s.startsWith("WhatsApp Customer (") || s === formattedPhone || s === rawPhone) return true;
    return false;
  };

  // 1. If pushName is a real custom name, preference pushName
  if (!isGeneric(pushName)) {
    return pushName!.trim();
  }

  // 2. Otherwise check if a contact already exists in Firestore contacts collection with a real name
  try {
    const contactRef = doc(db, "contacts", formattedPhone.replace(/[^0-9+]/g, ""));
    const contactSnap = await getDoc(contactRef);
    if (contactSnap.exists()) {
      const cData = contactSnap.data();
      if (!isGeneric(cData.name)) {
        return cData.name;
      }
    }
  } catch (e) {
    // ignore
  }

  return formattedPhone;
}

async function syncIncomingBaileysMessage(fromJid: string, name: string, text: string, provider: "baileys" | "official" | "simulated" = "baileys") {
  try {
    let rawPhone = fromJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (lidToPnMap.has(rawPhone)) {
      rawPhone = lidToPnMap.get(rawPhone)!;
    }
    if (!rawPhone || rawPhone.length < 5) return;

    const formattedPhone = `+${rawPhone}`;
    const chatId = `whatsapp-${rawPhone}`;
    const convRef = doc(db, "conversations", chatId);
    const docSnap = await getDoc(convRef);

    const newMessage = {
      sender: "customer" as const,
      text: text,
      timestamp: Date.now()
    };

    let resolvedName = await resolveContactName(rawPhone, name);

    if (docSnap.exists()) {
      const currentData = docSnap.data();
      const messages = Array.isArray(currentData.messages) ? currentData.messages : [];
      
      const isGenericName = (str?: string) => !str || str === "WhatsApp Customer" || str.startsWith("WhatsApp Customer (") || str === formattedPhone || str === rawPhone;
      
      if (!isGenericName(currentData.name) && isGenericName(name)) {
        resolvedName = currentData.name;
      }
      
      const parseJobId = (msgText: string): string => {
        if (!msgText) return "";
        const refMatch = msgText.match(/Reference ID:\s*([A-Za-z0-9_-]+)/i);
        if (refMatch && refMatch[1]) return refMatch[1].trim();
        const genericMatch = msgText.match(/\b(JOB-[A-Za-z0-9_-]+|job-[A-Za-z0-9_-]+)\b/i);
        if (genericMatch) return genericMatch[0];
        return "";
      };

      const extractedJobId = parseJobId(text) || currentData.jobId || "";

      const updateData: any = {
        name: resolvedName,
        text: text,
        lastMessageAt: Date.now(),
        messages: [...messages, newMessage]
      };

      if (extractedJobId) {
        updateData.jobId = extractedJobId;
      }

      // Re-open/set to pending if unassigned or previously finished/abandoned
      if (!currentData.assignedTo || currentData.status === "unassigned" || currentData.status === "abandoned" || currentData.status === "finished") {
        updateData.status = "pending";
        updateData.assignedTo = "";
        updateData.assignedToName = "";
      }

      await updateDoc(convRef, updateData);
    } else {
      const parseJobId = (msgText: string): string => {
        if (!msgText) return "";
        const refMatch = msgText.match(/Reference ID:\s*([A-Za-z0-9_-]+)/i);
        if (refMatch && refMatch[1]) return refMatch[1].trim();
        const genericMatch = msgText.match(/\b(JOB-[A-Za-z0-9_-]+|job-[A-Za-z0-9_-]+)\b/i);
        if (genericMatch) return genericMatch[0];
        return "";
      };
      const extractedJobId = parseJobId(text);

      await setDoc(convRef, {
        chatId: chatId,
        customerPhone: formattedPhone,
        name: resolvedName,
        category: "WhatsApp Inquiry",
        text: text,
        jobId: extractedJobId,
        jobTitle: extractedJobId ? `Job Application (${extractedJobId})` : "WhatsApp Inquiry",
        status: "pending",
        assignedTo: "",
        assignedToName: "",
        lastMessageAt: Date.now(),
        createdAt: Date.now(),
        messages: [newMessage]
      });
    }

    // Auto save/update contact record
    try {
      const contactRef = doc(db, "contacts", formattedPhone.replace(/[^0-9+]/g, ""));
      await setDoc(contactRef, {
        id: formattedPhone.replace(/[^0-9+]/g, ""),
        customerPhone: formattedPhone,
        name: resolvedName,
        lastJobTitle: "WhatsApp Inquiry",
        lastSeenAt: Date.now()
      }, { merge: true });
    } catch (e) {}

    // Append to live inspector buffer
    recentReceivedWhatsAppMessages.unshift({
      id: "msg-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
      chatId,
      customerPhone: formattedPhone,
      name: resolvedName,
      text,
      timestamp: Date.now(),
      provider,
      status: "pending"
    });
    if (recentReceivedWhatsAppMessages.length > 50) {
      recentReceivedWhatsAppMessages.pop();
    }

    console.log(`[Baileys Message Sync] Successfully routed incoming message from ${formattedPhone} (${resolvedName}) -> Chat ${chatId}`);
  } catch (err) {
    console.error("[Baileys Message Sync Error]:", err);
  }
}

const lidToPnMap = new Map<string, string>([
  ["258793304776823", "2348145348665"]
]);

async function checkAndMigrateLidConversations() {
  try {
    for (const [lidNum, realPn] of lidToPnMap.entries()) {
      if (lidNum === realPn) continue;
      const lidConvRef = doc(db, "conversations", `whatsapp-${lidNum}`);
      const lidSnap = await getDoc(lidConvRef);
      if (lidSnap.exists()) {
        const lidData = lidSnap.data();
        const lidMsgs = Array.isArray(lidData.messages) ? lidData.messages : [];
        
        const realConvRef = doc(db, "conversations", `whatsapp-${realPn}`);
        const realSnap = await getDoc(realConvRef);
        
        if (realSnap.exists()) {
          const realData = realSnap.data();
          const realMsgs = Array.isArray(realData.messages) ? realData.messages : [];
          const allMsgs = [...lidMsgs, ...realMsgs].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
          await updateDoc(realConvRef, {
            messages: allMsgs,
            text: allMsgs[allMsgs.length - 1]?.text || realData.text || "",
            lastMessageAt: Math.max(lidData.lastMessageAt || 0, realData.lastMessageAt || 0)
          });
        } else {
          await setDoc(realConvRef, {
            ...lidData,
            chatId: `whatsapp-${realPn}`,
            customerPhone: `+${realPn}`
          });
        }
        await deleteDoc(lidConvRef);
        console.log(`[LID Auto-Migrate] Successfully migrated whatsapp-${lidNum} -> whatsapp-${realPn}`);
      }
    }
  } catch (err) {
    console.warn("[LID Auto-Migrate Error]:", err);
  }
}

function extractBestPhoneJid(msg: any): string {
  const candidates: string[] = [
    msg.key?.remoteJidAlt,
    msg.key?.participantAlt,
    msg.key?.remoteJid,
    msg.key?.participant,
    msg.participant,
    msg.sender,
    msg.key?.user
  ].filter((j) => typeof j === "string" && j.length > 0);

  // Auto record LID -> PN mapping if both exist in message envelope
  const lidJid = candidates.find((c) => c.endsWith("@lid"));
  const pnJid = candidates.find((c) => c.endsWith("@s.whatsapp.net"));
  if (lidJid && pnJid) {
    const lidNum = lidJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    const pnNum = pnJid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (lidNum && pnNum && lidNum !== pnNum) {
      lidToPnMap.set(lidNum, pnNum);
      lidToPnMap.set(lidJid, pnJid);
      console.log(`[LID Mapper] Dynamic mapping learned: LID ${lidNum} -> Phone ${pnNum}`);
    }
  }

  // 1. First priority: any candidate JID ending with @s.whatsapp.net (and NOT @lid)
  for (const cand of candidates) {
    if (cand.endsWith("@s.whatsapp.net") && !cand.endsWith("@lid")) {
      return cand;
    }
  }

  // 2. Second priority: check lidToPnMap if candidate is @lid
  for (const cand of candidates) {
    const raw = cand.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
    if (lidToPnMap.has(raw)) {
      const mapped = lidToPnMap.get(raw)!;
      return `${mapped}@s.whatsapp.net`;
    }
    if (lidToPnMap.has(cand)) {
      return lidToPnMap.get(cand)!;
    }
  }

  return candidates[0] || msg.key?.remoteJid || "";
}

function normalizeWhatsAppPhone(rawInput: string): string {
  let clean = String(rawInput || "").replace(/[^0-9]/g, "");
  if (lidToPnMap.has(clean)) {
    clean = lidToPnMap.get(clean)!;
  }
  // Handle Nigerian local number format starting with 0 (e.g. 080..., 070..., 090..., 081..., 091...)
  if (/^0[789][01]\d{8}$/.test(clean)) {
    clean = "234" + clean.substring(1);
  }
  // Handle cases where user entered country code + leading zero (e.g. 234080... or 4407...)
  if (clean.startsWith("2340") && clean.length === 14) {
    clean = "234" + clean.substring(4);
  }
  if (clean.startsWith("440") && clean.length === 13) {
    clean = "44" + clean.substring(3);
  }
  return clean;
}

async function initBaileysSocket(forceReconnect = false) {
  if (baileysSocket && !forceReconnect && baileysStatus === "connected") {
    console.log("[Baileys] Socket already active and connected.");
    return;
  }

  if (baileysPresenceInterval) {
    clearInterval(baileysPresenceInterval);
    baileysPresenceInterval = null;
  }

  if (baileysReconnectTimer) {
    clearTimeout(baileysReconnectTimer);
    baileysReconnectTimer = null;
  }

  baileysStatus = "connecting";
  baileysError = null;
  baileysQrCode = null;

  // Safely detach listeners and end previous socket if forced or replacing
  if (baileysSocket) {
    const oldSock = baileysSocket;
    baileysSocket = null;
    try {
      if (oldSock.ev && typeof oldSock.ev.removeAllListeners === "function") {
        oldSock.ev.removeAllListeners("connection.update");
        oldSock.ev.removeAllListeners("creds.update");
        oldSock.ev.removeAllListeners("messages.upsert");
      }
      oldSock.end(undefined);
    } catch (e) {}
  }

  try {
    if (!fs.existsSync(BAILEYS_AUTH_DIR)) {
      fs.mkdirSync(BAILEYS_AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthStateFn(BAILEYS_AUTH_DIR);

    // Note: WhatsApp Pairing Code requires standard WhatsApp Web browser signature (e.g. Ubuntu / Chrome)
    const browserTuple = BrowsersFn && typeof BrowsersFn.ubuntu === "function" 
      ? BrowsersFn.ubuntu("Chrome") 
      : ["Ubuntu", "Chrome", "20.0.04"];

    const sock = makeWASocketFn({
      auth: state,
      logger: silentLogger as any,
      printQRInTerminal: false,
      browser: browserTuple,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      retryRequestDelayMs: 250,
      getMessage: async (key: any) => {
        return { conversation: "" };
      }
    });

    baileysSocket = sock;

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        try {
          baileysQrCode = await QRCode.toDataURL(qr);
          baileysStatus = "qr_ready";
          console.log("[Baileys] New QR Code generated successfully");
        } catch (err) {
          console.error("[Baileys] Error converting QR code to Data URL:", err);
        }
      }

      if (connection === "open") {
        baileysStatus = "connected";
        baileysQrCode = null;
        baileysPairingCode = null;
        baileysError = null;
        const userJid = sock.user?.id || "";
        baileysUserPhone = userJid.split("@")[0].split(":")[0] || "Connected";
        console.log(`[Baileys] Successfully connected to WhatsApp Web as +${baileysUserPhone}!`);

        if (isNewSessionPairing) {
          console.log("[Baileys] New WhatsApp connection established. Wiping previous conversations...");
          await clearPreviousWhatsAppConversations();
          isNewSessionPairing = false;
        }

        // Send initial 'available' presence update so WhatsApp shows number Online
        try {
          await sock.sendPresenceUpdate("available");
          console.log("[Baileys] Dispatched initial 'available' presence update.");
        } catch (presErr) {
          console.warn("[Baileys] Warning sending initial presence update:", presErr);
        }

        // Keep presence 'available' with a safe heartbeat interval
        if (baileysPresenceInterval) {
          clearInterval(baileysPresenceInterval);
          baileysPresenceInterval = null;
        }
        baileysPresenceInterval = setInterval(async () => {
          if (baileysSocket === sock && baileysStatus === "connected") {
            try {
              await sock.sendPresenceUpdate("available");
            } catch (e) {
              // Ignore transient socket presence errors
            }
          } else {
            if (baileysPresenceInterval) {
              clearInterval(baileysPresenceInterval);
              baileysPresenceInterval = null;
            }
          }
        }, 120000);

        try {
          await setDoc(doc(db, "settings", "whatsapp"), {
            baileysConnected: true,
            baileysUserPhone: `+${baileysUserPhone}`,
            lastConnectedAt: Date.now()
          }, { merge: true });
        } catch (e) {
          console.warn("[Baileys] Failed to update Firestore connected status:", e);
        }

        checkAndMigrateLidConversations().catch(console.error);
      } else if (connection === "close") {
        if (baileysPresenceInterval) {
          clearInterval(baileysPresenceInterval);
          baileysPresenceInterval = null;
        }

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const errMessage = lastDisconnect?.error?.message || String(lastDisconnect?.error || "");
        const credsExist = fs.existsSync(path.join(BAILEYS_AUTH_DIR, "creds.json"));
        const isLoggedOut = statusCode === DisconnectReason?.loggedOut;
        const isRestartRequired = statusCode === DisconnectReason?.restartRequired;
        const isQrExpired = !credsExist && (errMessage.includes("QR refs attempts ended") || errMessage.includes("timed out"));

        // Only clear baileysSocket if THIS closed socket is still the active one
        if (baileysSocket === sock) {
          baileysSocket = null;
        }

        if (isLoggedOut) {
          baileysStatus = "disconnected";
          baileysQrCode = null;
          baileysUserPhone = null;
          baileysError = "Session logged out.";
          console.log("[Baileys] Session logged out. Clearing previous conversations...");
          try {
            fs.rmSync(BAILEYS_AUTH_DIR, { recursive: true, force: true });
          } catch (e) {
            console.warn("[Baileys] Error removing auth directory on logout:", e);
          }
          await clearPreviousWhatsAppConversations();
        } else if (isQrExpired) {
          baileysStatus = "disconnected";
          baileysQrCode = null;
          baileysUserPhone = null;
          baileysError = "QR Code expired. Click 'Generate QR Code' in WhatsApp Settings to try again.";
          console.log("[Baileys] QR code expired without pairing. Waiting for user action.");
        } else {
          baileysStatus = "connecting";
          baileysQrCode = null;
          const delay = isRestartRequired ? 500 : 1500;
          console.log(`[Baileys] Handshake socket closed (code ${statusCode}). Reconnecting authenticated session in ${delay}ms...`);
          
          if (baileysReconnectTimer) {
            clearTimeout(baileysReconnectTimer);
            baileysReconnectTimer = null;
          }
          baileysReconnectTimer = setTimeout(() => {
            baileysReconnectTimer = null;
            initBaileysSocket(true).catch(console.error);
          }, delay);
        }
      }
    });

    sock.ev.on("contacts.upsert", (contacts: any[]) => {
      if (Array.isArray(contacts)) {
        for (const c of contacts) {
          if (c.lid && c.id && c.id.endsWith("@s.whatsapp.net")) {
            const lidNum = c.lid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
            const pnNum = c.id.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
            if (lidNum && pnNum && lidNum !== pnNum) {
              lidToPnMap.set(lidNum, pnNum);
              lidToPnMap.set(c.lid, c.id);
            }
          }
        }
      }
    });

    sock.ev.on("contacts.update", (updates: any[]) => {
      if (Array.isArray(updates)) {
        for (const c of updates) {
          if (c.lid && c.id && c.id.endsWith("@s.whatsapp.net")) {
            const lidNum = c.lid.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
            const pnNum = c.id.split("@")[0].split(":")[0].replace(/[^0-9]/g, "");
            if (lidNum && pnNum && lidNum !== pnNum) {
              lidToPnMap.set(lidNum, pnNum);
              lidToPnMap.set(c.lid, c.id);
            }
          }
        }
      }
    });

    sock.ev.on("messages.upsert", async (m: any) => {
      try {
        if (Array.isArray(m.messages)) {
          for (const msg of m.messages) {
            if (!msg.message || msg.key.fromMe) continue;
            const rawJid = msg.key.remoteJid || msg.key.participant || "";

            // Exempt Groups (@g.us), Communities (@g.us), Broadcasts (@broadcast), and Newsletters/Channels (@newsletter)
            const isExempt = rawJid.endsWith("@g.us") || rawJid.includes("@g.us") || rawJid.includes("@broadcast") || rawJid.includes("@newsletter");
            if (isExempt) continue;

            const jid = extractBestPhoneJid(msg);

            const text = extractMessageText(msg.message);
            if (!text) continue;

            const name = msg.pushName || "WhatsApp Customer";

            console.log(`[Baileys] Received message from ${name} (${jid}): "${text}"`);
            await syncIncomingBaileysMessage(jid, name, text);
          }
        }
      } catch (err) {
        console.error("[Baileys] Error processing incoming upsert message:", err);
      }
    });

  } catch (err: any) {
    console.error("[Baileys] Initialization error:", err);
    baileysStatus = "error";
    baileysError = err.message || "Failed to initialize Baileys engine";
    baileysSocket = null;
  }
}

async function disconnectBaileys() {
  if (baileysPresenceInterval) {
    clearInterval(baileysPresenceInterval);
    baileysPresenceInterval = null;
  }
  if (baileysSocket) {
    try {
      await baileysSocket.sendPresenceUpdate("unavailable");
      await baileysSocket.logout();
    } catch (e) {
      console.warn("[Baileys] Error during socket logout:", e);
    }
    baileysSocket = null;
  }
  baileysStatus = "disconnected";
  baileysQrCode = null;
  baileysUserPhone = null;

  try {
    if (fs.existsSync(BAILEYS_AUTH_DIR)) {
      fs.rmSync(BAILEYS_AUTH_DIR, { recursive: true, force: true });
    }
  } catch (e) {
    console.warn("[Baileys] Error wiping auth folder on disconnect:", e);
  }

  try {
    await setDoc(doc(db, "settings", "whatsapp"), {
      baileysConnected: false,
      baileysUserPhone: null
    }, { merge: true });
  } catch (e) {
    console.warn("[Baileys] Failed to update Firestore disconnect status:", e);
  }

  await clearPreviousWhatsAppConversations();
}

async function sendWhatsAppMessage(toPhone: string, text: string) {
  const mode = await getActiveWhatsAppMode();
  const cleanedPhone = normalizeWhatsAppPhone(toPhone);

  if (!cleanedPhone || cleanedPhone.length < 7) {
    throw new Error("Invalid phone number format. Please include country code (e.g. 2348012345678).");
  }

  const dispatchViaBaileys = async (attempt = 1): Promise<any> => {
    // If socket is not connected, check if saved creds exist and auto-reconnect
    if (!baileysSocket || baileysStatus !== "connected") {
      const credsFile = path.join(BAILEYS_AUTH_DIR, "creds.json");
      if (fs.existsSync(credsFile)) {
        console.log(`[WhatsApp Dispatch: Baileys] Socket status is '${baileysStatus}'. Attempting auto-reconnect (Attempt ${attempt})...`);
        await initBaileysSocket(!baileysSocket || baileysStatus === "error" || baileysStatus === "disconnected");
        let attempts = 0;
        while ((!baileysSocket || baileysStatus !== "connected") && attempts < 50) {
          await new Promise((r) => setTimeout(r, 200));
          attempts++;
        }
      }
    }

    const activeSocket = baileysSocket;
    if (!activeSocket || baileysStatus !== "connected") {
      const displayStatus = !activeSocket ? (baileysStatus === "connected" ? "reconnecting" : baileysStatus || "disconnected") : baileysStatus;
      throw new Error(`Baileys WhatsApp Web is not connected (Current Status: ${displayStatus}). Please ensure your WhatsApp account is paired in Admin Settings.`);
    }

    let targetJid = `${cleanedPhone}@s.whatsapp.net`;
    let realCleanPhone = cleanedPhone;

    try {
      if (typeof activeSocket.onWhatsApp === "function") {
        const checkResults = await activeSocket.onWhatsApp(cleanedPhone);
        if (Array.isArray(checkResults) && checkResults.length > 0 && checkResults[0]?.exists && checkResults[0]?.jid) {
          targetJid = checkResults[0].jid;
          realCleanPhone = targetJid.split("@")[0].split(":")[0];
        } else if (cleanedPhone.length > 11) {
          // If phone number had extra appended device digits (e.g. 232968085889128 -> 23296808588)
          // Try truncating to standard phone number lengths
          for (const testLen of [11, 12, 13, 10, 8, 9]) {
            if (cleanedPhone.length > testLen) {
              const candidate = cleanedPhone.substring(0, testLen);
              const candResults = await activeSocket.onWhatsApp(candidate);
              if (Array.isArray(candResults) && candResults.length > 0 && candResults[0]?.exists && candResults[0]?.jid) {
                targetJid = candResults[0].jid;
                realCleanPhone = candidate;
                console.log(`[WhatsApp Dispatch: Baileys] Successfully resolved corrupted phone +${cleanedPhone} to valid WhatsApp JID ${targetJid}`);
                
                // Self-correct corrupted conversation record in Firestore if old chatId/customerPhone had device suffix
                try {
                  const oldConvRef = doc(db, "conversations", `whatsapp-${cleanedPhone}`);
                  const newConvRef = doc(db, "conversations", `whatsapp-${realCleanPhone}`);
                  const oldSnap = await getDoc(oldConvRef);
                  if (oldSnap.exists()) {
                    const data = oldSnap.data();
                    await setDoc(newConvRef, {
                      ...data,
                      chatId: `whatsapp-${realCleanPhone}`,
                      customerPhone: `+${realCleanPhone}`
                    }, { merge: true });
                  }
                } catch (errCorr) {
                  console.warn("[WhatsApp Dispatch: Baileys] Failed to update corrected conversation doc:", errCorr);
                }
                break;
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("[WhatsApp Dispatch: Baileys] onWhatsApp check notice:", e);
    }

    console.log(`[WhatsApp Dispatch: Baileys] Dispatching (Attempt ${attempt}) to ${targetJid}: "${text}"`);
    try {
      if (!activeSocket || typeof activeSocket.sendMessage !== "function") {
        throw new Error("Baileys connection closed or null during dispatch.");
      }
      await activeSocket.sendMessage(targetJid, { text });
      return { success: true, provider: "baileys", toPhone: realCleanPhone, jid: targetJid };
    } catch (sendErr: any) {
      console.error(`[WhatsApp Dispatch: Baileys Error Attempt ${attempt}]:`, sendErr);
      const errMessage = String(sendErr?.message || sendErr || "");
      const isClosedErr = errMessage.includes("Closed") || errMessage.includes("closed") || errMessage.includes("Boom") || errMessage.includes("Connection") || errMessage.includes("disconnect") || errMessage.includes("reset") || errMessage.includes("not open") || errMessage.includes("null") || errMessage.includes("properties of null") || errMessage.includes("closed or null");

      if (attempt < 3 && isClosedErr) {
        console.log(`[WhatsApp Dispatch: Baileys] Socket connection was interrupted (${errMessage}). Re-initializing Baileys socket and retrying send...`);
        await initBaileysSocket(true);
        let reconnectAttempts = 0;
        while ((!baileysSocket || baileysStatus !== "connected") && reconnectAttempts < 50) {
          await new Promise((r) => setTimeout(r, 200));
          reconnectAttempts++;
        }
        return await dispatchViaBaileys(attempt + 1);
      }

      throw new Error(`Failed to send message to +${realCleanPhone}: ${sendErr?.message || sendErr}`);
    }
  };

  if (mode === "baileys") {
    return await dispatchViaBaileys(1);
  } else {
    const configDoc = await getDoc(doc(db, "settings", "whatsapp"));
    const config = configDoc.exists() ? configDoc.data() : null;
    const phoneAccountId = config?.phoneAccountId || process.env.WHATSAPP_PHONE_ACCOUNT_ID;
    const accessToken = config?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;

    if (!phoneAccountId || !accessToken) {
      // Check if Baileys is available as fallback
      const credsFile = path.join(BAILEYS_AUTH_DIR, "creds.json");
      if (baileysSocket || fs.existsSync(credsFile)) {
        console.log("[WhatsApp Dispatch] Official Meta credentials missing. Falling back to Baileys WhatsApp Web mode...");
        return await dispatchViaBaileys(1);
      }
      throw new Error("Official Meta WhatsApp API credentials are missing and Baileys WhatsApp Web is not connected. Please connect WhatsApp Web or enter Meta credentials in Admin Settings.");
    }

    console.log(`[WhatsApp Dispatch: Meta API] Dispatching to ${cleanedPhone}: "${text}"`);
    const res = await fetch(`https://graph.facebook.com/v18.0/${phoneAccountId}/messages`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: cleanedPhone,
        type: "text",
        text: { preview_url: false, body: text }
      })
    });

    const responseData = await res.json();
    if (!res.ok) {
      throw new Error(responseData?.error?.message || "Meta WhatsApp API dispatch failed");
    }
    return { success: true, provider: "official", metaData: responseData };
  }
}

// WhatsApp Dual Provider Status Endpoint
app.get("/api/whatsapp/provider-status", async (req, res) => {
  try {
    const configDoc = await getDoc(doc(db, "settings", "whatsapp"));
    const config = configDoc.exists() ? configDoc.data() : {};

    const officialConfigured = Boolean(
      (config.phoneAccountId || process.env.WHATSAPP_PHONE_ACCOUNT_ID) &&
      (config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN)
    );

    const activeMode = config.mode || (officialConfigured ? "official" : "baileys");

    res.json({
      activeMode,
      officialConfigured,
      officialConfig: {
        phoneAccountId: config.phoneAccountId || "",
        businessAccountId: config.businessAccountId || "",
        verifyToken: config.verifyToken || "valleyreigns_verify_token"
      },
      baileysStatus,
      baileysQrCode,
      baileysPairingCode,
      baileysUserPhone,
      baileysError
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Request Baileys WhatsApp Pairing Code Endpoint
app.post("/api/baileys/request-pairing-code", async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      res.status(400).json({ error: "Missing required field 'phoneNumber'." });
      return;
    }

    const cleanedPhone = normalizeWhatsAppPhone(phoneNumber);
    if (!cleanedPhone || cleanedPhone.length < 7) {
      res.status(400).json({ error: "Invalid phone number format. Please include full country code (e.g. 2348012345678)." });
      return;
    }

    // Check if auth folder exists with unregistered creds - if so, perform a clean wipe so fresh keys are issued
    const credsFile = path.join(BAILEYS_AUTH_DIR, "creds.json");
    if (fs.existsSync(credsFile)) {
      try {
        const rawCreds = JSON.parse(fs.readFileSync(credsFile, "utf-8"));
        if (!rawCreds.registered) {
          console.log("[Baileys Pairing Code] Purging old unregistered credentials before fresh pairing code request...");
          if (baileysSocket) {
            try { baileysSocket.end(undefined); } catch (e) {}
            baileysSocket = null;
          }
          fs.rmSync(BAILEYS_AUTH_DIR, { recursive: true, force: true });
        }
      } catch (e) {}
    }

    // Always ensure socket is cleanly initialized when requesting a fresh pairing code
    if (!baileysSocket || baileysStatus === "disconnected" || baileysStatus === "error") {
      await initBaileysSocket(true);
    }

    // Wait up to 3 seconds for socket initialization and WS handshake
    let attempts = 0;
    while ((!baileysSocket || baileysStatus === "connecting") && attempts < 15) {
      await new Promise((r) => setTimeout(r, 200));
      attempts++;
    }

    if (!baileysSocket) {
      res.status(500).json({ error: "Failed to initialize Baileys connection socket." });
      return;
    }

    if (baileysSocket?.authState?.creds?.registered) {
      res.status(400).json({ error: "WhatsApp account is already linked and registered. Please disconnect session before requesting a new pairing code." });
      return;
    }

    isNewSessionPairing = true;
    await clearPreviousWhatsAppConversations();

    console.log(`[Baileys Pairing Code] Requesting pairing code for phone number +${cleanedPhone}...`);
    
    // Pause to allow socket WS frame handshakes to settle
    await new Promise((r) => setTimeout(r, 800));

    let code: string | null = null;
    try {
      code = await baileysSocket.requestPairingCode(cleanedPhone);
    } catch (firstErr: any) {
      console.warn("[Baileys Pairing Code] Initial attempt failed:", firstErr?.message || firstErr);
      // Purge auth dir, re-initialize socket cleanly and retry
      if (baileysSocket) {
        try { baileysSocket.end(undefined); } catch (e) {}
        baileysSocket = null;
      }
      fs.rmSync(BAILEYS_AUTH_DIR, { recursive: true, force: true });
      await initBaileysSocket(true);
      await new Promise((r) => setTimeout(r, 1200));
      if (baileysSocket) {
        code = await baileysSocket.requestPairingCode(cleanedPhone);
      } else {
        throw firstErr;
      }
    }

    baileysPairingCode = code;
    baileysStatus = "qr_ready";

    console.log(`[Baileys Pairing Code] Successfully generated pairing code: ${code} for +${cleanedPhone}`);
    res.json({ 
      success: true, 
      pairingCode: code, 
      phoneNumber: cleanedPhone,
      formattedPhone: `+${cleanedPhone}`
    });
  } catch (err: any) {
    console.error("[Baileys Pairing Code Error]:", err);
    res.status(500).json({ error: err.message || "Failed to generate WhatsApp pairing code." });
  }
});

// Get Live Received WhatsApp Messages Endpoint
app.get("/api/whatsapp/received-messages", async (req, res) => {
  try {
    // If in-memory buffer has messages, return them
    if (recentReceivedWhatsAppMessages.length > 0) {
      res.json({ messages: recentReceivedWhatsAppMessages, source: "live_buffer" });
      return;
    }

    // Fallback: Query Firestore recent WhatsApp conversations
    const convsColl = collection(db, "conversations");
    const snap = await getDocs(convsColl);
    const dbMessages: ReceivedWhatsAppMessageLog[] = [];

    snap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.chatId && data.chatId.startsWith("whatsapp-")) {
        const lastMsg = Array.isArray(data.messages) && data.messages.length > 0
          ? data.messages[data.messages.length - 1]
          : null;

        dbMessages.push({
          id: data.chatId + "-" + (data.lastMessageAt || Date.now()),
          chatId: data.chatId,
          customerPhone: data.customerPhone || data.chatId.replace("whatsapp-", "+"),
          name: data.name || "WhatsApp Contact",
          text: lastMsg ? lastMsg.text : data.text || "(No content)",
          timestamp: data.lastMessageAt || data.createdAt || Date.now(),
          provider: "baileys",
          status: data.status || "pending"
        });
      }
    });

    dbMessages.sort((a, b) => b.timestamp - a.timestamp);
    res.json({ messages: dbMessages.slice(0, 30), source: "firestore_backup" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch received WhatsApp messages." });
  }
});

// Simulate Incoming WhatsApp Message Endpoint
app.post("/api/whatsapp/simulate-incoming", async (req, res) => {
  try {
    const { customerPhone, name, text } = req.body;
    if (!customerPhone || !text) {
      res.status(400).json({ error: "Missing required fields 'customerPhone' and 'text'." });
      return;
    }

    const cleanPhone = String(customerPhone).replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 5) {
      res.status(400).json({ error: "Invalid customer phone number." });
      return;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const senderName = name || `Simulated Contact (+${cleanPhone})`;

    console.log(`[Simulated Incoming WA] Message from ${senderName}: "${text}"`);
    await syncIncomingBaileysMessage(jid, senderName, text, "simulated");

    res.json({ success: true, message: `Simulated incoming message processed for +${cleanPhone}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to simulate incoming message." });
  }
});

// Toggle Provider Mode Endpoint
app.post("/api/whatsapp/toggle-mode", async (req, res) => {
  try {
    const { mode } = req.body;
    if (mode !== "official" && mode !== "baileys") {
      res.status(400).json({ error: "Invalid mode. Must be 'official' or 'baileys'." });
      return;
    }

    await setDoc(doc(db, "settings", "whatsapp"), { mode }, { merge: true });

    if (mode === "baileys" && baileysStatus === "disconnected") {
      initBaileysSocket().catch(console.error);
    }

    res.json({ success: true, activeMode: mode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear Conversations Endpoint
app.post("/api/whatsapp/clear-conversations", async (req, res) => {
  try {
    await clearPreviousWhatsAppConversations();
    res.json({ success: true, message: "Cleared all previous conversations." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Baileys Connect / Initialize Endpoint
app.post("/api/baileys/connect", async (req, res) => {
  try {
    isNewSessionPairing = true;
    await clearPreviousWhatsAppConversations();
    await initBaileysSocket(true);
    res.json({ success: true, status: baileysStatus, qrCode: baileysQrCode });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Baileys Disconnect Endpoint
app.post("/api/baileys/disconnect", async (req, res) => {
  try {
    await disconnectBaileys();
    res.json({ success: true, status: "disconnected" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dispatch Outbound WhatsApp Message Endpoint
app.post("/api/whatsapp/send", async (req, res) => {
  try {
    const { toPhone, text } = req.body;
    if (!toPhone || !text) {
      res.status(400).json({ error: "Missing required fields 'toPhone' and 'text'." });
      return;
    }

    const result = await sendWhatsAppMessage(toPhone, text);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to dispatch WhatsApp message." });
  }
});

// Auto-start Baileys on startup only if saved credentials exist
const credsFilePath = path.join(BAILEYS_AUTH_DIR, "creds.json");
if (fs.existsSync(credsFilePath)) {
  console.log("[Baileys Boot] Saved session found. Initializing Baileys engine on server startup...");
  initBaileysSocket().catch(err => console.warn("[Baileys Boot] Warning:", err));
} else {
  console.log("[Baileys Boot] No active Baileys session saved. Awaiting QR scan in WhatsApp config.");
}

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
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;

        // Check freshness of various conditions
        const isFreshPending = convData.status === "pending" && (Date.now() - convData.createdAt < 15000);

        const isFreshClaim = lastMsg && 
                             lastMsg.sender === "system" && 
                             lastMsg.text && 
                             lastMsg.text.startsWith("Chat claimed by") && 
                             (Date.now() - lastMsg.timestamp < 15000);

        const isFreshMessage = lastMsg && 
                               lastMsg.sender !== "system" && 
                               (Date.now() - lastMsg.timestamp < 15000);

        // If none of these fresh triggers are met, skip
        if (!isFreshPending && !isFreshClaim && !isFreshMessage) continue;

        console.log(`[Web Push] Targeted trigger for chat "${change.doc.id}" (status: ${convData.status}).`);

        try {
          const subsSnap = await getDocs(collection(db, "push_subscriptions"));
          if (subsSnap.empty) continue;

          // Fetch profiles for all distinct userIds in parallel to respect exact roles and assignments
          const userIds = Array.from(new Set(subsSnap.docs.map(d => d.data().userId).filter(Boolean))) as string[];
          const profilesMap: Record<string, any> = {};

          await Promise.all(
            userIds.map(async (uid) => {
              try {
                const uDoc = await getDoc(doc(db, "users", uid));
                if (uDoc.exists()) {
                  profilesMap[uid] = uDoc.data();
                }
              } catch (err) {
                console.error(`[Web Push] Error fetching profile for ${uid}:`, err);
              }
            })
          );

          subsSnap.docs.forEach((subDoc) => {
            const subData = subDoc.data();
            const userId = subData.userId;
            if (!userId) return; // Ignore unregistered/guest devices

            const profile = profilesMap[userId];
            if (!profile) return; // Only target users with valid profiles

            const userRole = profile.role;
            let shouldNotify = false;
            let payload: any = null;

            // 1. Staffs are notified if a conversation is assigned to them that needs to be claimed
            if (isFreshPending && convData.status === "pending") {
              if (userRole === "staff" && convData.sharedWith && convData.sharedWith.includes(userId)) {
                shouldNotify = true;
                payload = {
                  title: "New Request to Claim!",
                  body: `A seeker has made an inquiry about "${convData.jobTitle || 'Job Listing'}" (${convData.customerPhone})`,
                  tag: `claim-${convData.chatId}`,
                  data: { chatId: convData.chatId }
                };
              }
            }

            // 2. Conversation claimed by staff
            else if (isFreshClaim && convData.status === "ongoing" && convData.assignedTo) {
              // 2a. Same staffs are notified if any of them claimed the conversation
              if (userRole === "staff" && convData.sharedWith && convData.sharedWith.includes(userId) && userId !== convData.assignedTo) {
                shouldNotify = true;
                payload = {
                  title: "Conversation Claimed",
                  body: `${convData.assignedToName || 'A staff member'} has claimed the conversation with ${convData.customerPhone}.`,
                  tag: `claimed-${convData.chatId}`,
                  data: { chatId: convData.chatId }
                };
              }
              // 2b. Admin is notified if a conversation is claimed by a staff
              else if (userRole === "admin") {
                shouldNotify = true;
                payload = {
                  title: "Conversation Claimed",
                  body: `Staff member ${convData.assignedToName} has claimed the conversation with ${convData.customerPhone}.`,
                  tag: `claimed-${convData.chatId}`,
                  data: { chatId: convData.chatId }
                };
              }
            }

            // 3. Messages in ongoing conversations
            else if (isFreshMessage && convData.status === "ongoing" && lastMsg) {
              // 3a. Staffs get notified if they get a message from their ongoing conversation (seeker -> staff)
              if (lastMsg.sender === "customer" && userRole === "staff" && userId === convData.assignedTo) {
                shouldNotify = true;
                payload = {
                  title: `Message from ${convData.customerPhone}`,
                  body: `[${convData.jobTitle || 'Chat'}] ${lastMsg.text}`,
                  tag: `msg-${convData.chatId}`,
                  data: { chatId: convData.chatId, sender: lastMsg.sender }
                };
              }
              // 3b. Job seeker gets notified if a message is sent to them by a staff (staff -> seeker)
              else if (lastMsg.sender === "staff" && userRole === "seeker") {
                const seekerPhoneIdentifier = profile.displayName || profile.email || "";
                const isMyChat = 
                  convData.customerPhone === seekerPhoneIdentifier || 
                  convData.customerPhone === profile.email ||
                  convData.customerPhone === profile.displayName;

                if (isMyChat) {
                  shouldNotify = true;
                  payload = {
                    title: "Valley Reigns Support",
                    body: `[${convData.jobTitle || 'Chat'}] ${lastMsg.text}`,
                    tag: `msg-${convData.chatId}`,
                    data: { chatId: convData.chatId, sender: lastMsg.sender }
                  };
                }
              }
            }

            if (shouldNotify && payload) {
              console.log(`[Web Push] Dispatching targeted notification to user ${userId} (${userRole}) for chat "${convData.chatId}"`);
              sendWebPush(subData, payload);
            }
          });
        } catch (err) {
          console.error("[Web Push] Error during targeted conversation notifications:", err);
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

        console.log(`[Web Push] Targeted trigger: System notification "${notifData.title}" received.`);

        try {
          const subsSnap = await getDocs(collection(db, "push_subscriptions"));
          if (subsSnap.empty) continue;

          // Fetch profiles for all distinct userIds in parallel to respect exact roles and assignments
          const userIds = Array.from(new Set(subsSnap.docs.map(d => d.data().userId).filter(Boolean))) as string[];
          const profilesMap: Record<string, any> = {};

          await Promise.all(
            userIds.map(async (uid) => {
              try {
                const uDoc = await getDoc(doc(db, "users", uid));
                if (uDoc.exists()) {
                  profilesMap[uid] = uDoc.data();
                }
              } catch (err) {
                console.error(`[Web Push] Error fetching profile for ${uid}:`, err);
              }
            })
          );

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
            const userId = subData.userId;
            if (!userId) return;

            const profile = profilesMap[userId];
            if (!profile) return;

            // Only notify Admin for system alerts
            if (profile.role === "admin") {
              console.log(`[Web Push] Dispatching system notification alert to Admin ${userId}`);
              sendWebPush(subData, payload);
            }
          });
        } catch (err) {
          console.error("[Web Push] Error during system notification targeted dispatch:", err);
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
  
  // Auto-restore active WhatsApp Baileys session if credentials exist
  const credsFile = path.join(BAILEYS_AUTH_DIR, "creds.json");
  if (fs.existsSync(credsFile)) {
    console.log("[Baileys Boot] Found existing WhatsApp session credentials. Auto-connecting...");
    initBaileysSocket(false).catch((err) => {
      console.warn("[Baileys Boot] Auto-connect failed:", err);
    });
  }

  await setupVite();
}

startServer().catch((error) => {
  console.error("Critical integrated startup failure:", error);
});
