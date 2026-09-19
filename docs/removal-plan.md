# Valley Reigns — Decommissioning & Removal Execution Plan
**Date**: September 2026  
**Auditor**: Full-Stack Architect & Reliability Engineer  
**Status**: All Phases (1 through 8) Successfully Executed & Verified

---

## 1. Phase 2 — WhatsApp Removal Plan

### A. Frontend Components & Hooks to Delete or Refactor:
1. **Delete**:
   * `src/components/WhatsAppConfigPage.tsx`
   * `src/components/WhatsAppSimulator.tsx`
   * `src/hooks/useWhatsAppConfig.ts`
2. **Refactor**:
   * `src/App.tsx`: Remove WhatsApp simulator, remove `/admin/whatsapp-config` route and navigation menu buttons, update meta descriptions.
   * `src/components/JobCard.tsx`: Remove `useWhatsAppConfig` hook; replace WhatsApp deep-link apply button with direct in-app inquiry or modal application.
   * `src/components/GuestChatWidget.tsx`: Remove WhatsApp link shortcuts; focus purely on live in-app guest inquiry.
   * `src/components/StaffPromotionView.tsx`: Remove `seedWhatsAppSessionsInitialData()` calls and WhatsApp wording.
   * `src/types.ts`: Remove `messagingPreference` ("whatsapp" | "in-app").
   * `src/lib/services.ts`:
     * Remove `seedWhatsAppSessionsInitialData()`.
     * Remove outbound `/api/whatsapp/send` dispatch calls in `sendChatMessage()` and `claimConversation()`.
     * Remove WhatsApp 24h SLA rule in `checkAndEnforceSLAs()`.
     * Remove `clearAllWhatsAppConversations()`.

### B. Backend Server (`server.ts` & `api/index.ts`):
1. **Remove All WhatsApp Endpoints**:
   * `GET /api/webhook/whatsapp` & `POST /api/webhook/whatsapp`
   * `GET /api/whatsapp/provider-status`
   * `POST /api/baileys/request-pairing-code`
   * `GET /api/whatsapp/received-messages`
   * `POST /api/whatsapp/simulate-incoming`
   * `POST /api/whatsapp/toggle-mode`
   * `POST /api/whatsapp/clear-conversations`
   * `POST /api/baileys/connect`
   * `POST /api/baileys/disconnect`
   * `POST /api/whatsapp/send`
2. **Remove Baileys Engine & Background Workers**:
   * Remove `@whiskeysockets/baileys` imports, socket initialization, pairing loops, auto-heal interval (`startBaileysAutoHealLoop`), LID-to-phone migration loops, and `baileys_auth_info` directory usage.
3. **Uninstall Packages**:
   * `@whiskeysockets/baileys`, `qrcode`, `@types/qrcode`.

---

## 2. Phase 3 — Realtime Database (RTDB) Removal Plan

### A. Codebase Changes:
1. **`src/lib/firebase.ts`**:
   * Remove `import { getDatabase } from "firebase/database"`.
   * Remove `export const rtdb = getDatabase(app)`.
   * Remove `ensureRTDBConnectionNodes()` function and its startup invocation.
2. **`src/context/AuthContext.tsx`**:
   * Remove `import { ref, onValue, onDisconnect } from "firebase/database"`.
   * Replace RTDB `onDisconnect` hook with a clean Firestore heartbeat mechanism (`staff_statuses/{uid}.lastActive`) and window `beforeunload` listener.
3. **`src/lib/services.ts`**:
   * Remove all `firebase/database` imports (`ref`, `onValue`, `set`, `update`, `push`, `runTransaction`, `get`, `remove`).
   * Clean `subscribeToConversations`: Stream exclusively from Firestore `onSnapshot`.
   * Clean `sendChatMessage`: Write exclusively to Firestore.
   * Clean `setStaffOnlineStatus`: Update Firestore `staff_statuses` collection directly.
4. **`server.ts` & `api/index.ts`**:
   * Remove `import { getDatabase, ref, set } from "firebase/database"` and RTDB presence updates in `checkAndCleanStaffStatuses`.
5. **Modals & Rules**:
   * Remove or simplify `DatabaseTesterModal.tsx` and `DatabaseSeederModal.tsx` to test only Firestore.
   * Deprecate `database.rules.json`.

---

## 3. Phase 4 — Security Hardening Plan

1. **Deploy Production Firestore Rules (`firestore.rules`)**:
   * Remove catch-all `allow read, write: if true;`.
   * Enforce role-based access control:
     * `jobs`: Publicly readable (`allow read: if true;`). Writable only by authenticated employers, staff, and admins.
     * `users`: Readable by authenticated users; writable only by self or admins.
     * `conversations`: Readable/writable only by participants (`seekerUid`, `assignedTo`, or `sharedWith`), staff, and admins.
     * `daily_reports`: Readable by submitter and admins; writable by staff and admins.
2. **Secret Management**:
   * Remove fallback hardcoded ImageKit private keys from `server.ts`.
   * Enforce that `IMAGEKIT_PRIVATE_KEY` is sourced strictly from `process.env`.
3. **Fix Admin Demotion Bug**:
   * In `AuthContext.tsx`, remove the logic that demoted non-`admin@valleyreigns.com` administrators back to `"seeker"`.
