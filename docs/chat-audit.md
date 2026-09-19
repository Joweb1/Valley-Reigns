# Valley Reigns — Chat Architecture & Reliability Audit
**Date**: September 2026  
**Auditor**: Real-Time Messaging & Performance Specialist  
**Status**: Phase 1 Complete

---

## 1. Current Message Lifecycle & Flow Diagram

```
[Candidate / Seeker]                     [Cloud Firestore]                   [Recruiter Staff]
       │                                         │                                   │
       │ 1. Types message                        │                                   │
       │ 2. sendChatMessage()                    │                                   │
       ├────────────────────────────────────────►│                                   │
       │    - Reads full conversation doc        │                                   │
       │    - Appends message to array           │                                   │
       │    - Overwrites entire document         │                                   │
       │    - Writes copy to RTDB                │                                   │
       │                                         │                                   │
       │                                         │ 3. onSnapshot triggers            │
       │                                         │    (broadcasts entire doc)        │
       │                                         ├──────────────────────────────────►│
       │                                         │                                   │ 4. Updates full list
       │                                         │                                   │    in React state
       │                                         │                                   │
       │                                         │ 5. Backend broad listener         │
       │                                         │    triggers                       │
       │                                         ▼                                   │
       │                                 [Express Backend]                           │
       │                                 - Scans all push subs                       │
       │                                 - Reads all user docs                       │
       │                                 - Fires Web Push                            │
```

---

## 2. Inefficiencies & Flaws in Current Implementation

1. **Entire Message History Rewritten on Every Send**:
   * Storing messages inside a single document (`conversations/{chatId}.messages`) means sending 1 text message rewrites up to 1 MB of JSON data.
   * Concurrent writes by two users can overwrite each other's messages because writes are not appended atomically to a subcollection.
2. **Global Inbox Polling & Unbounded Subscription**:
   * `subscribeToConversations()` requests the **entire** collection of conversations without a `where()` filter or limit.
   * As the company handles thousands of candidate chats, every recruiter client receives all chats, leading to high browser memory usage and thousands of unnecessary document reads.
3. **Client-Side Privacy Leaks**:
   * `SeekerMessagesView.tsx` subscribes to all conversations across the entire platform, then runs JavaScript filtering:
     ```typescript
     const myChats = conversationsList.filter(c => c.seekerUid === currentUser.uid);
     ```
   * Any tech-savvy user can inspect browser network traffic or memory state to view other candidates' chat histories and contact details.
4. **Lack of Idempotent Message Identifiers**:
   * Messages currently lack deterministic client IDs (`clientMessageId`). If a network blip occurs during send, a retry creates a duplicate message.
5. **No Message Pagination**:
   * When opening a conversation with 500 messages, all 500 messages are transferred across the wire, decoded, and rendered into the DOM at once.

---

## 3. Target Production Chat Architecture

### A. Data Schema Migration
```
/conversations/{conversationId}
  ├── chatId: string
  ├── seekerUid: string
  ├── customerPhone: string
  ├── customerName: string
  ├── jobId: string
  ├── jobTitle: string
  ├── status: "pending" | "ongoing" | "finished" | "abandoned"
  ├── assignedTo: string | null
  ├── assignedToName: string | null
  ├── sharedWith: string[]
  ├── lastMessageText: string
  ├── lastMessageAt: number
  ├── lastMessageSender: "customer" | "staff" | "system" | "guest"
  ├── createdAt: number
  ├── unreadCountStaff: number
  ├── unreadCountSeeker: number
  └── candidateLists: Record<string, { addedAt: number; addedBy?: string }>

/conversations/{conversationId}/messages/{messageId}
  ├── id: string
  ├── clientMessageId: string (deterministic idempotency key)
  ├── sender: "customer" | "staff" | "system" | "guest"
  ├── senderUid?: string
  ├── text: string
  ├── timestamp: number (server timestamp or unix ms)
  ├── status: "sending" | "sent" | "failed"
  └── mediaUrl?: string
```

### B. Scoped Inbox Listeners
* **Staff Inbox**: Query only conversations where `status == "pending" && sharedWith.includes(uid)` OR `assignedTo == uid`, ordered by `lastMessageAt desc`, limited to the top 50 active threads.
* **Seeker Inbox**: Query only conversations where `seekerUid == currentUser.uid`, ordered by `lastMessageAt desc`.
* **Open Conversation**: A targeted listener on `conversations/{chatId}/messages` with `orderBy("timestamp", "desc")` and `limit(40)`. Older messages load on demand via `startAfter(lastVisibleDoc)`.

### C. Graceful Backward Compatibility
During the transition, `extractConversationMessages()` will seamlessly support reading from both the legacy `messages` array and the new `/messages` subcollection, ensuring zero data loss for existing conversations.
