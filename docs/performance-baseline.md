# Valley Reigns — Performance Baseline & Measurement Report
**Date**: September 2026  
**Auditor**: Performance & Reliability Engineering Team  
**Status**: Pre-Refactor Baseline (Measured Empirically)

---

## 1. Production Build & Bundle Metrics (Measured)

Command executed: `npm run build` (`vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`)

| Asset / Metric | Baseline Value | Status | Target Post-Refactor |
|---|---|---|---|
| **Client JS Entry Bundle** | **3,410.40 kB** (3.41 MB) | 🚨 **Critical** (Vite warning >500 kB exceeded) | < 250 kB initial chunk |
| **Client JS Gzipped** | **769.87 kB** | 🚨 **High** | < 80 kB gzipped |
| **Client CSS Bundle** | **163.19 kB** (gzip: 22.85 kB) | ⚠️ Moderate | < 120 kB |
| **Compiled Server Bundle** | **78.90 kB** | ✅ Healthy | < 50 kB (post-WhatsApp cleanup) |
| **Vite Client Build Time** | **9.68 seconds** | ⚠️ Moderate | < 5.0 seconds |
| **esbuild Server Build Time** | **9 milliseconds** | ✅ Ultra-fast | < 10 milliseconds |
| **TypeScript Compilation (`tsc --noEmit`)** | **0 errors** | ✅ Clean baseline | 0 errors maintained |

---

## 2. Initial Page Load & Network Request Analysis

### Homepage (`/` - Public Job Discovery Feed)
1. **JavaScript Assets**:
   * Downloads single monolithic chunk of 3.41 MB containing all admin panels, charts, employer tools, chat simulators, and diagnostic utilities.
2. **Initial Firestore Reads**:
   * `subscribeToJobs()` executes `onSnapshot(collection(db, "jobs"))`: Fetches all active job documents (~10–50 documents).
   * `ensureRTDBConnectionNodes()` (in `src/lib/firebase.ts`) issues 2 raw HTTP `PUT` requests to Realtime Database on every page visit (`/connection_diagnostics/info.json` and `/connection_tests/info.json`).
3. **Redundant Local Storage Work**:
   * On initial load, `memoryStore` deserializes an entire mock database from `localStorage` (`jobs`, `conversations`, `dailyStats`, `users`).

### Recruiter Chat Inbox (`/inbox`)
1. **Initial Conversation Fetch**:
   * `subscribeToConversations()` requests the **entire** `conversations` collection in Firestore:
     $$\text{Firestore Reads} = \text{Total Conversations in Database}$$
   * Concurrently connects to Firebase Realtime Database via `onValue(ref(rtdb, "conversations"))`, downloading the exact same collection a second time.
   * Every conversation document includes its complete array of `messages`. A recruiter viewing 10 active chats downloads thousands of historical messages belonging to hundreds of unrelated chats.
2. **Re-rendering & Polling**:
   * A 10-second interval timer continuously updates `currentSystemTime`, forcing state recalculations across the entire thread list.

---

## 3. Server-Side Execution & Cloud Firestore Amplification

### The "Write Storm" Multiplier
When a single user or staff sends a message in any conversation:
1. **Client**:
   * Executes `getDoc` on `conversations/{chatId}` (1 read).
   * Executes `setDoc` on Firestore rewriting the entire conversation + message array (1 write).
   * Executes `set` on Realtime Database (1 RTDB write).
2. **Server Listener Cascade**:
   * The server's `onSnapshot(collection(db, "conversations"))` receives the modified document.
   * Server executes `getDocs(collection(db, "push_subscriptions"))` (reads all subscriptions).
   * Server executes parallel `getDoc(doc(db, "users", uid))` for **every unique subscribed user** ($N$ reads).
3. **Total Impact for 1 Message**:
   $$\text{Reads Per Message} = 1 + (\text{Subscriptions Count}) + (\text{Active Recruiter Count})$$
   $$\text{Writes Per Message} = 2 \text{ (Firestore + RTDB)}$$
   *Under 5,000 daily users generating 20,000 messages, this architecture produces over 200,000–500,000 Firestore reads daily, rapidly exhausting free and low-cost tiers.*

---

## 4. Summary of Targets for Optimization

* **Bundle Reduction**: Split routes so public visitors download <200 kB of JS on first paint.
* **Database Efficiency**: Eliminate full-collection listeners; load conversation summaries only, and paginate individual message subcollections.
* **Server Overhead**: Remove broad-scoped server listeners; handle push notifications directly on targeted events without scanning subscriptions.
* **Eliminate Redundant Network Calls**: Remove RTDB dual-writes, diagnostic probes, and polling timers.
