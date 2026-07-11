# Valley Reigns 🌟

Valley Reigns is an advanced, enterprise-grade conversational recruitment, support routing, and candidate experience platform. Fully integrated with Firebase Firestore and Authentication, it connects Job Seekers with career opportunities, provides Staff and Admins with live support workspaces, and simulates seamless high-throughput WhatsApp Business integrations.

---

## 🎨 Core Architectural Modules

The application is structured as a full-stack dashboard featuring role-based user portals:

1. **Job Seekers Portal**
   - Clean, aesthetic interface to view verified opportunities.
   - Live messaging with automated status trackers.
   - Dynamic resume/profile builder with offline fallback storage.

2. **Support & Messaging Workspace (Chat Inbox)**
   - Real-time communication interface built with Firebase Firestore.
   - Live ticket status boards to track, claim, or close conversation threads.
   - Support for custom routing rules and instant responder assignment.

3. **Admin and Staff Panel**
   - **Performance Overview**: Comprehensive workspace telemetry including total conversations, open tickets, response metrics, and active recruiters.
   - **Staff & Recruiter Management**: Add, update, or revoke access permissions for staffing personnel.
   - **Job Management**: Complete CRUD operations for real-time job listings with immediate synchronization to seeker dashboards.

4. **WhatsApp Business Gateway & Simulator**
   - Configure Meta/WhatsApp Developer access, Phone Number IDs, Verification Tokens, and Webhook status directly inside a secure control view.
   - Live Sandbox WhatsApp Simulator enabling end-to-end testing of candidate messages and ticket routing without active billing lines.

---

## ⚙️ Technology Stack

- **Frontend**: React 18+ (TypeScript), Vite, Tailwind CSS
- **State & Databases**: Firebase Firestore (multi-user synchronization), React Context
- **Security & Authentication**: Firebase Auth, Custom Firestore Security Rules (`firestore.rules`)
- **Backend & Middleware**: Custom Express development server (`server.ts`)
- **Animations**: Framer Motion (`motion/react`)
- **Iconography & Styling**: Lucide React Icons

---

## 🚀 Quick Start Guide

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### Installation & Run

1. **Clone the repository and navigate into the folder:**
   ```bash
   cd valley-reigns
   ```

2. **Install all project dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` or `.env.local` file in the root directory based on `.env.example`:
   ```env
   # Firebase Web Configuration API Keys
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   The application will be accessible at [http://localhost:3000](http://localhost:3000).

---

## 🗺️ Future Roadmap & Upcoming Updates

The following items are planned as future enhancement cycles for the Valley Reigns ecosystem:

### 1. Advanced Analytics & Reporting
* **Admin Traffic Chart**: Update the administrator overview traffic charts to be fully functional, plotting real-time message load, response time distribution, and job search interactions.
* **Staff Performance Chart**: Introduce a dedicated leaderboard and analytic chart module detailing staffing efficiency, resolution times, and individual ticket volume completed.

### 2. Rich Communication Services
* **File Attachments & Cloud Storage**: Enable candidates, recruiters, and support agents to upload, send, and preview files (resumes, certifications, ID documentation) through direct Firebase Storage integration.

### 3. User & Staff Management Enhancements
* **User Management Console**: Build robust search, filter, and modify views within the Admin panel to audit, suspend, or update job seeker profiles, permissions, and history logs directly.

### 4. Interactive Outreach & Campaign Engines
* **In-App Messaging Outreach**: Launch custom messaging campaigns aimed at specific segments of registered job seekers directly within the web application.
* **WhatsApp Marketing Outreach**: Support broad messaging outreach for the company's active WhatsApp users, including importing external `.csv` / `.xlsx` contact lists to trigger structured transactional notifications or recruitment announcements.

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
