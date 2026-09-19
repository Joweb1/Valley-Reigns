# Valley Reigns — Database Architecture & Security Audit
**Date**: September 2026  
**Auditor**: Database Architect & Security Specialist  
**Status**: Phase 1 Complete

---

## 1. Cloud Firestore: Collections & Schemas

Cloud Firestore is the primary persistent database for Valley Reigns.

| Collection Name | Document ID | Purpose & Access Pattern | Current Schema Issues |
|---|---|---|---|
| `jobs` | Auto-generated or `job-{id}` | Public job board listings and specifications | High read frequency. Impressions incremented on click. |
| `categories` | Category slug | Industry categories and salary ranges | Read on search and filter views. |
| `users` | Firebase Auth `uid` | User profiles, roles, and administrative permissions | Queried by role (`staff`, `employer`). Demotion bug identified in `AuthContext`. |
| `conversations` | `chatId` (e.g. `inapp_{id}`) | Chat thread metadata, SLA status, recruiter assignment | 🚨 **Severe defect**: Stores entire message history inside `messages` array in the document. |
| `staff_statuses` | Staff `uid` | Online/offline availability and heartbeat timestamp | Written every 60s per active recruiter. Read by routing algorithm. |
| `daily_reports` | Auto-generated | Recruiter end-of-day KPI reports and screenshot proofs | Read by staff (own reports) and admins (all reports). |
| `daily_stats` | Date `YYYY-MM-DD` | Aggregated daily platform metrics | Read by `AdminOverview` for KPI chart visualizations. |
| `contacts` | Auto-generated | Candidate contact records and inquiry counts | Sourced from inquiries for recruiter reference. |
| `candidate_list_logs`| Auto-generated | Audit log of candidate pipeline movements | Immutable log entries for managerial review. |
| `staff_resumptions` | Auto-generated | Staff morning sign-in / check-in timestamps | Written once per day per staff member. |
| `staff_report_reopens`| Staff `uid` | Temporary 6-hour admin deadline overrides | Checked before allowing late daily report submissions. |
| `recruitment_requests`| Auto-generated | Corporate employer candidate sourcing tickets | Employer creates; staff and admins manage. |
| `employer_applicants` | Auto-generated | Seeker job applications submitted to employer postings | Filtered by `employerUid` and `seekerUid`. |
| `push_subscriptions` | Subscription hash | Browser Web Push notification endpoints | Queried by backend notification dispatcher. |
| `settings` | E.g. `app`, `whatsapp` | Global application configuration | WhatsApp config to be removed. |
| `whatsapp_sessions` | E.g. `default_session_*` | Baileys cryptographic keys and session tokens | ❌ **TO BE REMOVED COMPLETELY**. |

---

## 2. Critical Security Vulnerabilities Identified

### A. Firestore Rules Wide Open (`firestore.rules`)
```javascript
// CURRENT STATE in firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // 🚨 CRITICAL: Completely unrestricted
    }
  }
}
```
**Impact**: Any client with the Firebase project ID can read, modify, or permanently delete every document in the database, including user profiles, reports, conversations, and admin permissions.

### B. Realtime Database Wide Open (`database.rules.json`)
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```
**Impact**: Complete public read and write access to all RTDB nodes.

---

## 3. Realtime Database (RTDB) Deep-Dive & Removal Plan

### Where RTDB is Currently Used:
1. **`src/lib/firebase.ts`**:
   * Initialized via `getDatabase(app)`.
   * Exported as `rtdb`.
   * `ensureRTDBConnectionNodes()` sends raw PUT requests on every page load.
2. **`src/context/AuthContext.tsx`**:
   * Imports `ref`, `onValue`, `onDisconnect` from `firebase/database`.
   * Attaches an `onDisconnect` hook on `staff_statuses/${user.uid}`.
3. **`src/lib/services.ts`**:
   * Imports 8 functions from `firebase/database`.
   * `subscribeToConversations` dual-subscribes to RTDB and auto-backs up to Firestore.
   * `sendChatMessage` parallelizes writes to both Firestore and RTDB.
   * `setStaffOnlineStatus` writes to RTDB.
4. **`server.ts` & `api/index.ts`**:
   * Imports `getDatabase`, `ref`, `set` to clean up inactive staff statuses.
5. **`DatabaseTesterModal.tsx` & `DatabaseSeederModal.tsx`**:
   * Diagnostic UI controls that test RTDB connectivity.

### Why RTDB Can Be Safely Removed:
* Firestore's real-time listeners (`onSnapshot`) natively provide sub-second synchronization across all clients.
* Staff presence can be managed via a lightweight periodic heartbeat timestamp (`lastActive: Date.now()`) in `staff_statuses/{uid}`. Any staff member with `Date.now() - lastActive > 3 minutes` is considered offline by the routing logic and UI.
* Clean disconnection can be handled via `window.addEventListener("beforeunload", ...)` and user sign-out handlers.
* Removing RTDB eliminates dual-writes, eliminates double network requests per message, and cuts Firebase configuration complexity in half.
