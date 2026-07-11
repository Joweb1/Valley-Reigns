import express from "express";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

const app = express();

// Initialize Firebase App & Firestore
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API health endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
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

export default app;
