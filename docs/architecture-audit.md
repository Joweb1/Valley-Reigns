# Valley Reigns — Architecture Audit
**Date**: September 2026  
**Auditor**: Senior Full-Stack Software Architect & Reliability Engineer  
**Status**: Phase 1 Complete (Baseline Established)

---

## 1. Executive System Overview

Valley Reigns is a recruitment, talent sourcing, and candidate management web application. It connects four distinct user groups:
1. **Job Seekers**: Browse job listings, view company details, and initiate real-time inquiries/applications.
2. **Employers**: Post and manage jobs (subject to admin verification and listing quotas), review applicant pipelines, and request staffing assistance.
3. **Recruitment Staff**: Monitor live candidate queues, claim inquiries, chat in real-time, categorize candidates into progressive pipeline stages, and submit daily performance audit reports.
4. **Administrators**: System oversight, staff promotion and access control, live KPI dashboards, SLA supervision, job moderation, and system diagnostics.

---

## 2. Technology Stack & Runtime Environment

| Layer | Component | Version / Specification | Role in Architecture |
|---|---|---|---|
| **Runtime** | Node.js (Linux x86_64) | Node v22.x | Backend runtime and build execution environment |
| **Backend Server** | Express.js | 4.21.2 | Custom HTTP server, API proxy, static asset serving, and Vite dev middleware |
| **Bundler & Build** | Vite + esbuild | Vite 6.2.3 / esbuild 0.25.0 | TypeScript compilation, frontend bundling, and backend CJS bundling |
| **Frontend Framework** | React + React DOM | 19.0.1 | Single-Page Application (SPA) UI framework |
| **Language** | TypeScript | 5.8.2 | End-to-end static typing |
| **Routing** | React Router DOM | 7.18.1 | Client-side routing with browser history |
| **CSS & Design** | Tailwind CSS | 4.1.14 | Utility-first styling via `@tailwindcss/vite` |
| **Database (Primary)** | Cloud Firestore | Firebase SDK 12.16.0 / Admin 14.1.0 | Persistent document database for all application domain data |
| **Database (Secondary)** | Firebase Realtime Database | Firebase SDK 12.16.0 (to be removed) | Legacy dual-write presence, diagnostics, and sync layer |
| **Authentication** | Firebase Authentication | Firebase SDK 12.16.0 | Email/password, Google OAuth, session state |
| **Media Storage** | ImageKit.io | @imagekit/react 5.0.2 | File, CV, resume, and audit report screenshot CDN |
| **Push Notifications** | Web Push (W3C / VAPID) | web-push 3.6.7 | Browser push notifications for new chats and claims |
| **Icons & UI** | Lucide React & Motion | lucide-react 0.546.0 / motion 12.23.24 | UI iconography and motion animations |
| **Charts** | Recharts | 3.9.2 | Administrative analytics and KPI trend visualizers |

---

## 3. Entry Points & Request Flows

### A. Backend Entry Point (`server.ts`)
* Compiled by `esbuild` into a standalone CommonJS bundle: `dist/server.cjs`.
* **Port**: 3000 (binds to host `0.0.0.0`).
* **Development Mode**: Mounts Vite in middleware mode (`createViteServer({ server: { middlewareMode: true }, appType: "spa" })`).
* **Production Mode**: Serves compiled static assets from `./dist` using `express.static`, with a catch-all route `app.get("*")` redirecting to `dist/index.html`.
* **API Endpoints**:
  * Health probes: `GET /api/health`, `GET /ping`
  * Media upload proxy: `GET /api/imagekit-auth`, `POST /api/upload`
  * Push notifications: `GET /api/push/public-key`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`, `POST /api/push/test`
  * WhatsApp endpoints (identified for complete removal): 11 distinct routes covering QR codes, pairing codes, webhooks, provider status, and message dispatch.

### B. Frontend Entry Point (`index.html` -> `src/main.tsx` -> `src/App.tsx`)
* Single HTML entry point serving the React root.
* Global context tree:
  ```
  <BrowserRouter>
    <AuthProvider>
      <NotificationProvider>
        <AppContent />
      </NotificationProvider>
    </AuthProvider>
  </BrowserRouter>
  ```
* **Critical Finding**: All application views (Admin, Employer, Seeker, Chat Inbox, Diagnostics, WhatsApp simulators) are statically imported directly inside `src/App.tsx`. There is currently **zero route-level code splitting**.

---

## 4. Architectural Vulnerabilities & Critical Findings

1. **Monolithic Bundle Size**:
   * Initial JavaScript bundle is **3,410.40 kB (gzip: 769.87 kB)**. Every visitor on the public homepage downloads all administrative code, Recharts charting libraries, chat widgets, and diagnostic tooling upfront.
2. **Unbounded Database Reads via Global Listeners**:
   * The backend server maintains a global listener: `onSnapshot(collection(db, "conversations"))`. Every conversation change triggers an unbounded scan of `push_subscriptions` followed by $N$ separate `getDoc(doc(db, "users", uid))` calls.
   * Frontend components (`ChatInbox`, `SeekerMessagesView`, `GuestChatWidget`) call `subscribeToConversations()`, which queries the **entire** `conversations` collection across the entire company, downloading full message histories into memory and filtering in JavaScript.
3. **Database Security Open to the Public**:
   * `firestore.rules` contains `match /{document=**} { allow read, write: if true; }`, allowing any unauthenticated user to read, modify, or delete any record in the database.
   * `database.rules.json` similarly contains `.read: true, .write: true`.
4. **Hardcoded Fallback Credentials**:
   * `server.ts` contains hardcoded private ImageKit keys as fallbacks: `private_OqsZ5WWYsU0b2wNOGPTLNU7k2cw=`.
   * `src/lib/firebase.ts` contains split string fallback API keys.
5. **Inefficient Chat Message Schema**:
   * All conversation messages are serialized as an array inside the single conversation document (`conversations/{chatId}.messages`).
   * Every message sent fetches the conversation document, decodes the full history, appends one message, and rewrites the entire array back to Firestore and RTDB.
6. **Dual Database Complexity**:
   * Simultaneous writes to Cloud Firestore and Firebase Realtime Database create race conditions, double network traffic, and unnecessary configuration overhead.
