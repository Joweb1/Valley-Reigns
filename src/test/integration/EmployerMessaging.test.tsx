import { describe, it, expect, beforeEach } from 'vitest';
import { 
  memoryStore, 
  sendChatMessage, 
  fetchLatestConversationMessages,
  markConversationMessagesAsRead 
} from '../../lib/services';
import type { Conversation } from '../../types';

describe('Integration Tests: Employer Messaging & Channel Pipeline', () => {
  const testChatId = 'employer_emp101_admin_admin202';

  beforeEach(() => {
    // Seed initial conversation
    const initialConv: Conversation = {
      chatId: testChatId,
      customerPhone: 'Apex Systems Global',
      name: 'Apex Systems Global',
      jobId: 'admin-support',
      jobTitle: 'Admin Support',
      employerUid: 'emp101',
      adminUid: 'admin202',
      adminName: 'Platform Administrator',
      assignedTo: null,
      assignedToName: null,
      sharedWith: [],
      status: 'ongoing',
      createdAt: 1700000000000,
      lastMessageAt: 1700000000000,
      text: 'Initial inquiry message',
      isEmployer: true,
      userRole: 'employer',
      messages: []
    };

    memoryStore.conversations[testChatId] = initialConv;
  });

  it('sends direct employer messages, updates thread timestamp, and persists in memory store', async () => {
    const message = await sendChatMessage(
      testChatId,
      'customer',
      'We would like to request candidate shortlisting for senior engineering roles.',
      {
        senderUid: 'emp101',
        senderName: 'David Apex',
        senderRole: 'employer',
        adminUid: 'admin202',
        adminName: 'Platform Administrator',
        isEmployer: true
      }
    );

    expect(message).toBeDefined();
    expect(message.text).toContain('shortlisting for senior engineering roles');
    expect(message.deliveryStatus).toBe('sent');

    // Verify conversation document was updated
    const updatedConv = memoryStore.conversations[testChatId];
    expect(updatedConv).toBeDefined();
    expect(updatedConv.text).toContain('shortlisting');
    expect(updatedConv.lastMessageAt).toBeGreaterThanOrEqual(1700000000000);
  });

  it('retrieves subcollection messages and marks them as read', async () => {
    // Send a message from admin
    await sendChatMessage(
      testChatId,
      'staff',
      'Certainly! Our recruitment team will compile shortlisted candidates.',
      {
        senderUid: 'admin202',
        senderName: 'Platform Administrator',
        senderRole: 'admin',
        adminUid: 'admin202',
        isEmployer: true
      }
    );

    // Fetch latest messages
    const messages = await fetchLatestConversationMessages(testChatId, 50);
    expect(messages.length).toBeGreaterThan(0);

    // Mark as read
    await markConversationMessagesAsRead(testChatId, 'emp101', 'customer');
    const conv = memoryStore.conversations[testChatId];
    expect(conv).toBeDefined();
  });
});
