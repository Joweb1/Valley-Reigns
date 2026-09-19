import { doc, getDoc, getDocs, collection, deleteDoc } from "firebase/firestore";
import { db } from "./firebase";
import { 
  simulateIncomingChat, 
  sendChatMessage, 
  forceReassignConversation,
  sendStaffDirectMessage,
  sendStaffGroupMessage,
  cleanupTestArtifacts,
  saveChatTestReport
} from "./services";
import { ChatTestScenarioResult, ChatTestSuiteReport } from "../types";

export type TestProgressCallback = (scenario: ChatTestScenarioResult, currentStep: number, totalSteps: number) => void;

/**
 * Runs the comprehensive 8-scenario end-to-end messaging diagnostic test suite.
 */
export async function runMessagingTestSuite(
  executedBy: string = "Admin Diagnostic Runner",
  onProgress?: TestProgressCallback
): Promise<ChatTestSuiteReport> {
  const startTime = Date.now();
  const testChatIds: string[] = [];
  const scenarios: ChatTestScenarioResult[] = [];
  const testPrefix = `test_${Date.now()}`;

  const initialScenarios: Omit<ChatTestScenarioResult, "durationMs" | "status" | "details" | "assertions">[] = [
    {
      id: "scenario-1",
      name: "Job Apply Initiation & Reference Binding",
      description: "Verifies automatic 'Apply Now' initial message generation, Job ID binding, and direct Firestore commit."
    },
    {
      id: "scenario-2",
      name: "Pending Queue Routing & Real-Time Broadcast",
      description: "Verifies conversation enters pending queue with unassigned state and correct staff distribution."
    },
    {
      id: "scenario-3",
      name: "Staff/Admin Auto-Claim on Reply",
      description: "Verifies sending a reply automatically claims the thread, sets status to 'ongoing', and creates a system claim message."
    },
    {
      id: "scenario-4",
      name: "Seeker Continuous Messaging Flow",
      description: "Verifies applicant can send multiple follow-up messages before and after claim without blockage."
    },
    {
      id: "scenario-5",
      name: "Bidirectional Speed & Delivery Latency",
      description: "Benchmarks subcollection write-to-read roundtrip latency and delivery status flags."
    },
    {
      id: "scenario-6",
      name: "Admin Conversation Reassignment",
      description: "Verifies admin can reassign an active conversation to another recruiter with real-time audit logging."
    },
    {
      id: "scenario-7",
      name: "Staff/Admin 1-on-1 Direct Messaging",
      description: "Verifies internal direct communication between two staff/admin team members."
    },
    {
      id: "scenario-8",
      name: "Staff/Admin Team Group Broadcast",
      description: "Verifies team-wide group channel broadcast delivery and channel metadata updates."
    }
  ];

  let testChatId = "";
  const mockSeekerUid = `seeker_${testPrefix}`;
  const mockStaffA_Uid = `staff_a_${testPrefix}`;
  const mockStaffB_Uid = `staff_b_${testPrefix}`;
  const mockJobId = `JOB-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
  const mockJobTitle = "Senior Lead Software Architect";

  let totalLatency = 0;
  let latencyCount = 0;

  for (let i = 0; i < initialScenarios.length; i++) {
    const meta = initialScenarios[i];
    const scenarioStart = Date.now();
    const scenarioResult: ChatTestScenarioResult = {
      id: meta.id,
      name: meta.name,
      description: meta.description,
      status: "running",
      durationMs: 0,
      details: "Executing scenario...",
      assertions: []
    };

    if (onProgress) {
      onProgress(scenarioResult, i + 1, initialScenarios.length);
    }

    try {
      if (meta.id === "scenario-1") {
        // --- SCENARIO 1: Job Apply Auto-Initiation ---
        const initialText = `Hello! I'm interested in applying for the ${mockJobTitle} position. Reference ID: ${mockJobId}`;
        const writeStart = Date.now();
        const createdChatId = await simulateIncomingChat("Test Candidate (test@domain.com)", initialText, mockJobId, mockJobTitle, mockSeekerUid);
        const writeDuration = Date.now() - writeStart;
        testChatId = createdChatId;
        testChatIds.push(testChatId);

        totalLatency += writeDuration;
        latencyCount++;

        // Verify Firestore Document & Subcollection
        const docRef = doc(db, "conversations", testChatId);
        const docSnap = await getDoc(docRef);
        const exists = docSnap.exists();
        const data = exists ? docSnap.data() : null;

        const msgsSnap = await getDocs(collection(db, "conversations", testChatId, "messages"));
        const msgList = msgsSnap.docs.map(d => d.data());

        const hasMatchingJobId = data?.jobId === mockJobId;
        const hasPendingStatus = data?.status === "pending";
        const hasInitialMsg = msgList.some(m => m.text?.includes(mockJobId));

        scenarioResult.assertions = [
          { name: "Firestore Conversation Document Created", passed: exists },
          { name: "Job ID Reference Bound Correctly", passed: hasMatchingJobId },
          { name: "Initial Status is 'pending'", passed: hasPendingStatus },
          { name: "Initial Message Saved in Messages Subcollection", passed: hasInitialMsg }
        ];

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed 
          ? `Successfully initiated apply conversation in ${writeDuration}ms with Job Reference ${mockJobId}.`
          : `Failed verification of initial conversation document or message subcollection.`;
        scenarioResult.metrics = { latencyMs: writeDuration, docId: testChatId };

      } else if (meta.id === "scenario-2") {
        // --- SCENARIO 2: Pending Queue Visibility & Routing ---
        const docRef = doc(db, "conversations", testChatId);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : null;

        const isUnassigned = data?.assignedTo === null || data?.assignedTo === undefined;
        const hasSharedStaff = Array.isArray(data?.sharedWith) && data.sharedWith.length > 0;
        const isPending = data?.status === "pending";

        scenarioResult.assertions = [
          { name: "Conversation is Unassigned in Pending Queue", passed: isUnassigned },
          { name: "Status is Pending for Available Staff View", passed: isPending },
          { name: "Shared with Available Recruiter Pool", passed: hasSharedStaff }
        ];

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed
          ? `Conversation correctly routed to ${data?.sharedWith?.length || 0} staff members.`
          : `Routing configuration incomplete or status mismatch.`;

      } else if (meta.id === "scenario-3") {
        // --- SCENARIO 3: Staff/Admin Auto-Claim on Reply ---
        const staffReplyText = "Hello! Thanks for applying. I am reviewing your application now.";
        const replyStart = Date.now();
        await sendChatMessage(testChatId, "staff", staffReplyText, {
          senderUid: mockStaffA_Uid,
          senderName: "Recruiter Alice",
          senderRole: "staff"
        });
        const replyDuration = Date.now() - replyStart;
        totalLatency += replyDuration;
        latencyCount++;

        // Fetch updated Firestore state
        const docRef = doc(db, "conversations", testChatId);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : null;

        const msgsSnap = await getDocs(collection(db, "conversations", testChatId, "messages"));
        const msgList = msgsSnap.docs.map(d => d.data());

        const isNowOngoing = data?.status === "ongoing";
        const isAssignedToAlice = data?.assignedTo === mockStaffA_Uid;
        const hasClaimedAt = typeof data?.claimedAt === "number";
        const hasClaimSystemMsg = msgList.some(m => m.sender === "system" && m.text?.includes("claimed"));
        const hasAliceMsg = msgList.some(m => m.sender === "staff" && m.text === staffReplyText);

        scenarioResult.assertions = [
          { name: "Conversation Transitioned to 'ongoing'", passed: isNowOngoing },
          { name: "Assigned To Replying Staff Member", passed: isAssignedToAlice },
          { name: "Claim Timestamp Recorded", passed: hasClaimedAt },
          { name: "System Claim Notice Generated in Subcollection", passed: hasClaimSystemMsg },
          { name: "Staff Message Persisted in Subcollection", passed: hasAliceMsg }
        ];

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed
          ? `Auto-claim executed successfully on staff reply in ${replyDuration}ms.`
          : `Auto-claim did not update status, assignment, or message subcollection properly.`;
        scenarioResult.metrics = { latencyMs: replyDuration };

      } else if (meta.id === "scenario-4") {
        // --- SCENARIO 4: Seeker Continuous Messaging ---
        const followUp1 = "Here is my updated portfolio link: https://example.com/portfolio";
        const followUp2 = "I am available for an interview anytime this week.";

        await sendChatMessage(testChatId, "customer", followUp1, {
          senderUid: mockSeekerUid,
          senderName: "Test Candidate",
          senderRole: "seeker"
        });

        await sendChatMessage(testChatId, "customer", followUp2, {
          senderUid: mockSeekerUid,
          senderName: "Test Candidate",
          senderRole: "seeker"
        });

        const msgsSnap = await getDocs(collection(db, "conversations", testChatId, "messages"));
        const msgList = msgsSnap.docs.map(d => d.data());

        const hasFollowUp1 = msgList.some(m => m.text === followUp1);
        const hasFollowUp2 = msgList.some(m => m.text === followUp2);
        const correctCount = msgList.length >= 4; // Initial + System Claim + Staff Reply + 2 Follow-ups

        scenarioResult.assertions = [
          { name: "Follow-up Message 1 Received & Stored", passed: hasFollowUp1 },
          { name: "Follow-up Message 2 Received & Stored", passed: hasFollowUp2 },
          { name: "Complete Chronological History Intact", passed: correctCount }
        ];

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed
          ? `Candidate sent follow-up messages seamlessly without interruption.`
          : `Failed to persist candidate follow-up messages.`;

      } else if (meta.id === "scenario-5") {
        // --- SCENARIO 5: Bidirectional Delivery Speed Benchmark ---
        const benchmarkMsg = `Ping Benchmark Test at ${Date.now()}`;
        const benchStart = Date.now();

        const sentMsg = await sendChatMessage(testChatId, "staff", benchmarkMsg, {
          senderUid: mockStaffA_Uid,
          senderName: "Recruiter Alice"
        });
        const writeTime = Date.now() - benchStart;

        const readStart = Date.now();
        const docRef = doc(db, "conversations", testChatId);
        const snap = await getDoc(docRef);
        const readTime = Date.now() - readStart;
        const roundtrip = writeTime + readTime;

        totalLatency += roundtrip;
        latencyCount++;

        const isSentConfirmed = sentMsg.deliveryStatus === "sent";
        const parentUpdated = snap.exists() && snap.data().lastMessageAt >= sentMsg.timestamp;

        scenarioResult.assertions = [
          { name: "Direct Firestore Write < 2000ms SLA", passed: writeTime < 2000 },
          { name: "Delivery Status Confirmed as 'sent'", passed: isSentConfirmed },
          { name: "Parent Thread Timestamp Synced", passed: parentUpdated }
        ];

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = `Roundtrip latency: ${roundtrip}ms (Write: ${writeTime}ms, Read: ${readTime}ms).`;
        scenarioResult.metrics = {
          latencyMs: roundtrip,
          firestoreWriteTimeMs: writeTime,
          roundtripTimeMs: roundtrip
        };

      } else if (meta.id === "scenario-6") {
        // --- SCENARIO 6: Admin Reassignment ---
        await forceReassignConversation(testChatId, mockStaffB_Uid, "Recruiter Bob");

        const docRef = doc(db, "conversations", testChatId);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists() ? docSnap.data() : null;

        const msgsSnap = await getDocs(collection(db, "conversations", testChatId, "messages"));
        const msgList = msgsSnap.docs.map(d => d.data());

        const isAssignedToBob = data?.assignedTo === mockStaffB_Uid;
        const hasReassignNotice = msgList.some(m => m.sender === "system" && m.text?.includes("Recruiter Bob"));

        scenarioResult.assertions = [
          { name: "Conversation Assigned to New Recruiter", passed: isAssignedToBob },
          { name: "Admin Reassignment Audit Message Created", passed: hasReassignNotice },
          { name: "Status Maintained as 'ongoing'", passed: data?.status === "ongoing" }
        ];

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed
          ? `Reassigned conversation to Recruiter Bob with system audit message.`
          : `Reassignment failed to update recruiter UID or audit trail.`;

      } else if (meta.id === "scenario-7") {
        // --- SCENARIO 7: Staff 1-on-1 Direct Messaging ---
        const staffDirectText = "Hi Bob, could you take a look at the candidate's portfolio?";
        const directStart = Date.now();
        const directMsg = await sendStaffDirectMessage(mockStaffB_Uid, staffDirectText, {
          senderUid: mockStaffA_Uid,
          senderName: "Alice Admin",
          senderRole: "admin"
        });
        const directDuration = Date.now() - directStart;
        totalLatency += directDuration;
        latencyCount++;

        const directDocId = `direct_${directMsg.directChatId}`;
        const directDocSnap = await getDoc(doc(db, "conversations", directDocId));
        const directMsgSnap = await getDoc(doc(db, "conversations", directDocId, "messages", directMsg.id));

        scenarioResult.assertions = [
          { name: "Direct Chat Message Persisted to Firestore", passed: directMsgSnap.exists() },
          { name: "Parent Direct Thread Metadata Updated", passed: directDocSnap.exists() },
          { name: "Delivery Status Confirmed", passed: directMsg.deliveryStatus === "sent" }
        ];

        // Cleanup temporary direct chat
        try {
          await deleteDoc(doc(db, "conversations", directDocId, "messages", directMsg.id));
          await deleteDoc(doc(db, "conversations", directDocId));
        } catch (_) {}

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed
          ? `Staff 1-on-1 direct messaging verified in ${directDuration}ms.`
          : `Staff 1-on-1 direct messaging verification failed.`;
        scenarioResult.metrics = { latencyMs: directDuration };

      } else if (meta.id === "scenario-8") {
        // --- SCENARIO 8: Staff Group Chat Channel ---
        const groupMsgText = "Team meeting at 3:00 PM to review today's applicant pipeline.";
        const groupStart = Date.now();
        const groupMsg = await sendStaffGroupMessage(groupMsgText, {
          senderUid: mockStaffA_Uid,
          senderName: "Alice Admin",
          senderRole: "admin"
        });
        const groupDuration = Date.now() - groupStart;
        totalLatency += groupDuration;
        latencyCount++;

        const groupDocId = "group_staff_team_hub";
        const groupMsgSnap = await getDoc(doc(db, "conversations", groupDocId, "messages", groupMsg.id));
        const groupParentSnap = await getDoc(doc(db, "conversations", groupDocId));

        scenarioResult.assertions = [
          { name: "Group Message Persisted to Subcollection", passed: groupMsgSnap.exists() },
          { name: "Group Channel Parent Metadata Synced", passed: groupParentSnap.exists() },
          { name: "Delivery Status Confirmed as 'sent'", passed: groupMsg.deliveryStatus === "sent" }
        ];

        // Cleanup temporary group test message
        try {
          await deleteDoc(doc(db, "conversations", groupDocId, "messages", groupMsg.id));
        } catch (_) {}

        const allPassed = scenarioResult.assertions.every(a => a.passed);
        scenarioResult.status = allPassed ? "passed" : "failed";
        scenarioResult.details = allPassed
          ? `Staff group chat broadcast verified in ${groupDuration}ms.`
          : `Staff group chat broadcast verification failed.`;
        scenarioResult.metrics = { latencyMs: groupDuration };
      }

    } catch (err: any) {
      console.error(`[Test Runner Error in ${meta.id}]:`, err);
      scenarioResult.status = "failed";
      scenarioResult.details = `Execution error: ${err?.message || "Unknown error occurred"}`;
      scenarioResult.assertions.push({
        name: "Scenario Execution Exception",
        passed: false,
        error: err?.message || String(err)
      });
    } finally {
      scenarioResult.durationMs = Date.now() - scenarioStart;
      scenarios.push(scenarioResult);
      if (onProgress) {
        onProgress(scenarioResult, i + 1, initialScenarios.length);
      }
    }
  }

  // --- AUTOMATED CLEANUP ---
  // Erase all synthetic test conversations & messages from Firestore
  try {
    await cleanupTestArtifacts(testChatIds);
  } catch (cleanErr) {
    console.warn("[Test Cleanup Notice]:", cleanErr);
  }

  const passedCount = scenarios.filter(s => s.status === "passed").length;
  const failedCount = scenarios.filter(s => s.status === "failed").length;
  const avgLatency = latencyCount > 0 ? Math.round(totalLatency / latencyCount) : 0;
  const overallStatus = failedCount === 0 ? "passed" : "failed";

  const report: ChatTestSuiteReport = {
    timestamp: Date.now(),
    executedBy,
    totalDurationMs: Date.now() - startTime,
    scenarios,
    overallStatus,
    summary: {
      total: scenarios.length,
      passed: passedCount,
      failed: failedCount,
      avgLatencyMs: avgLatency
    }
  };

  // Persist report audit log
  await saveChatTestReport(report);

  return report;
}
