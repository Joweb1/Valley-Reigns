# Valley Reigns — Deployment & Infrastructure Audit
**Date**: September 2026  
**Auditor**: Cloud Infrastructure & Reliability Specialist  
**Status**: Phase 1 Complete

---

## 1. Hosting Architecture & Service Type

Valley Reigns runs as a unified **full-stack containerized service**:
* **Container Port**: 3000 (binds to `0.0.0.0`).
* **Dev Server**: `tsx server.ts`
* **Production Build**: `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
* **Production Start**: `node dist/server.cjs`

This architecture allows a single Render Web Service or Cloud Run container to serve both:
1. High-speed compiled static frontend assets (`dist/`) via `express.static` with caching headers.
2. Production API endpoints (`/api/*`) and SPA fallback routing (`app.get("*", ...)`).

---

## 2. Startup Time & Resource Profile

* **Server Bundle**: `dist/server.cjs` is compiled into a single CommonJS file in ~9 milliseconds.
* **Server Boot Time**: Evaluates in < 25 milliseconds on cold-start.
* **Memory Usage**:
  * Currently, the active Baileys socket and cryptographic workers consume ~100–150 MB of resident memory (RSS).
  * Removing WhatsApp drops baseline Node.js server memory to **~35–50 MB**, allowing comfortable operation even on minimal 512 MB Render / Cloud Run instances.

---

## 3. Environment Variable Requirements

### Required Variables:
| Variable Name | Environment | Purpose |
|---|---|---|
| `PORT` | System / Render | Internal port (defaults to 3000) |
| `NODE_ENV` | Server | Must be set to `production` in live environments |
| `FIREBASE_PROJECT_ID` | Both | Cloud project identifier |
| `FIREBASE_API_KEY` | Both | Firebase Web API key |
| `FIREBASE_AUTH_DOMAIN` | Both | Auth domain for OAuth callbacks |
| `FIREBASE_FIRESTORE_DATABASE_ID` | Both | Dedicated Firestore database ID |
| `FIREBASE_STORAGE_BUCKET` | Both | Cloud Storage bucket |
| `FIREBASE_MESSAGING_SENDER_ID` | Both | Cloud Messaging sender ID |
| `FIREBASE_APP_ID` | Both | Firebase Web App ID |
| `IMAGEKIT_PUBLIC_KEY` | Both | Public ImageKit key for client SDK |
| `IMAGEKIT_PRIVATE_KEY` | Server Only | **Secret**: Used exclusively by `/api/upload` and `/api/imagekit-auth` |
| `IMAGEKIT_URL_ENDPOINT` | Both | ImageKit CDN endpoint URL |
| `VAPID_PUBLIC_KEY` | Both | Web Push VAPID public key |
| `VAPID_PRIVATE_KEY` | Server Only | **Secret**: Used by backend to sign push notifications |
| `VAPID_SUBJECT` | Server Only | Email address (mailto:) for push service contact |

### Deprecated Variables to Purge:
* `FIREBASE_DATABASE_URL` (Realtime Database)
* `WHATSAPP_PHONE_NUMBER_ID`
* `WHATSAPP_ACCESS_TOKEN`
* `WHATSAPP_BUSINESS_ACCOUNT_ID`
* `WHATSAPP_VERIFY_TOKEN`
* `WHATSAPP_APP_SECRET`
