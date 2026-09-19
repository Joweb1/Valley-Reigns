# Valley Reigns — Dependency Audit
**Date**: September 2026  
**Auditor**: Software Architect & Security Engineer  
**Status**: Phase 1 Complete

---

## 1. Production Dependencies (`dependencies` in `package.json`)

| Package | Version | Current Purpose | Action / Recommendation |
|---|---|---|---|
| `@whiskeysockets/baileys` | `^7.0.0-rc13` | WhatsApp Web socket client & Signal crypto engine | ❌ **REMOVE COMPLETELY**. Pulls in 12+ sub-dependencies (`libsignal`, `protobufjs`, `whatsapp-rust-bridge`, `pino`, `ws`). Heavy memory and CPU overhead. |
| `qrcode` | `^1.5.4` | QR Code terminal and canvas generator for WhatsApp Web pairing | ❌ **REMOVE COMPLETELY**. Not needed once WhatsApp pairing is eliminated. |
| `@imagekit/react` | `^5.0.2` | ImageKit React components and upload helpers | ✅ **KEEP**. Used for recruiter report screenshots, resumes, and chat media. |
| `express` | `^4.21.2` | Core backend HTTP framework | ✅ **KEEP & OPTIMIZE**. Powers API routes, upload proxies, and static asset delivery. |
| `firebase` | `^12.16.0` | Client Firebase SDK (Auth, Firestore, RTDB) | 🟡 **KEEP AUTH & FIRESTORE; REMOVE RTDB**. Eliminate all imports from `firebase/database`. |
| `firebase-admin` | `^14.1.0` | Node.js Firebase Admin SDK | ✅ **KEEP**. Used for privileged backend operations and token verification. |
| `react` & `react-dom` | `^19.0.1` | Core React library | ✅ **KEEP**. Modern React 19 concurrent features. |
| `react-router-dom` | `^7.18.1` | Application routing | ✅ **KEEP**. Foundation for client-side navigation. |
| `lucide-react` | `^0.546.0` | Standard icon set | ✅ **KEEP**. Consistent UI iconography across all views. |
| `motion` | `^12.23.24` | Animation engine | ✅ **KEEP**. Smooth UI transitions. |
| `recharts` | `^3.9.2` | Data visualizer for admin KPIs | ✅ **KEEP (LAZY-LOAD)**. Heavy library; must be code-split away from the main bundle into the admin chunk. |
| `web-push` | `^3.6.7` | W3C standard VAPID Web Push | ✅ **KEEP**. Powers desktop/mobile browser notifications for staff and seekers. |
| `sharp` | `^0.35.3` | Native image manipulation library | ✅ **KEEP**. Server-side image optimizations. |
| `dotenv` | `^17.2.3` | Environment variable loader | ✅ **KEEP**. Loads local configuration safely. |
| `@tailwindcss/vite` | `^4.1.14` | Tailwind v4 Vite integration | ✅ **KEEP**. Zero-config modern styling. |
| `@google/genai` | `^2.4.0` | Google Gemini GenAI SDK | ✅ **KEEP**. Available for AI job descriptions and smart features. |

---

## 2. Development Dependencies (`devDependencies`)

| Package | Version | Purpose | Action |
|---|---|---|---|
| `@types/qrcode` | `^1.5.6` | TypeScript types for qrcode | ❌ **REMOVE**. Dead dependency after WhatsApp removal. |
| `@types/express` | `^4.17.21` | Express TypeScript types | ✅ **KEEP**. Required for `server.ts`. |
| `@types/node` | `^22.14.0` | Node.js type definitions | ✅ **KEEP**. Required for server execution. |
| `@types/web-push` | `^3.6.4` | Web Push types | ✅ **KEEP**. Required for push endpoints. |
| `esbuild` | `^0.25.0` | Server TypeScript bundler | ✅ **KEEP**. Compiles `server.ts` to `dist/server.cjs` in <10ms. |
| `tsx` | `^4.21.0` | TypeScript execution engine for dev | ✅ **KEEP**. Powers `npm run dev`. |
| `typescript` | `~5.8.2` | TypeScript compiler | ✅ **KEEP**. Codebase type validation (`tsc --noEmit`). |
| `vite` | `^6.2.3` | Frontend bundler and dev server | ✅ **KEEP**. Production build and dev middleware. |
| `tailwindcss` | `^4.1.14` | Tailwind CSS core | ✅ **KEEP**. Global styles. |
| `autoprefixer` | `^10.4.21` | CSS vendor prefixes | ✅ **KEEP**. |

---

## 3. Post-Removal Savings Estimation

* **Node.js Memory Footprint**: Eliminating `@whiskeysockets/baileys` and its associated WebSocket listeners frees up ~80–120 MB of active resident memory (RSS) in the Node.js process.
* **Security Surface**: Removes binary dependencies (`whatsapp-rust-bridge`) and third-party WebSocket protocols.
* **Lockfile Simplification**: Pruning Baileys removes over 30 transitive dependencies from `node_modules` and `package-lock.json`.
