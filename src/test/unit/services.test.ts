import { describe, it, expect } from 'vitest';
import { 
  normalizePhoneNumber, 
  sanitizeForFirestore, 
  extractConversationMessages,
  generateMessageId,
  isInternalStaffChat
} from '../../lib/services';
import { isBootstrapAdminEmail } from '../../context/AuthContext';
import type { ChatMessage } from '../../types';

describe('Unit Tests: Core Services & Utility Logic', () => {
  describe('normalizePhoneNumber', () => {
    it('normalizes local Nigerian 080... numbers to standard +234 format', () => {
      const result = normalizePhoneNumber('08012345678');
      expect(result).toBe('+2348012345678');
    });

    it('retains international numbers with leading + sign', () => {
      const result = normalizePhoneNumber('+234 812 345 6789');
      expect(result).toBe('+2348123456789');
    });

    it('returns original input when input is empty or invalid', () => {
      expect(normalizePhoneNumber('')).toBe('');
      expect(normalizePhoneNumber(null as any)).toBe('');
    });
  });

  describe('sanitizeForFirestore', () => {
    it('removes undefined fields recursively while preserving valid nested data', () => {
      const input = {
        title: 'Senior Software Engineer',
        salary: '$120,000',
        optionalField: undefined,
        metadata: {
          views: 42,
          notes: undefined,
          tags: ['React', 'TypeScript']
        }
      };

      const sanitized = sanitizeForFirestore(input);
      expect(sanitized).toEqual({
        title: 'Senior Software Engineer',
        salary: '$120,000',
        metadata: {
          views: 42,
          tags: ['React', 'TypeScript']
        }
      });
      expect('optionalField' in sanitized).toBe(false);
      expect('notes' in sanitized.metadata).toBe(false);
    });

    it('handles primitive values and arrays correctly', () => {
      expect(sanitizeForFirestore('hello')).toBe('hello');
      expect(sanitizeForFirestore(123)).toBe(123);
      expect(sanitizeForFirestore([1, 2, undefined, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('extractConversationMessages', () => {
    it('returns structured messages list when message array is provided', () => {
      const mockMessages: ChatMessage[] = [
        {
          id: 'msg-1',
          sender: 'customer',
          text: 'Hello, I have a question about the job.',
          timestamp: 1700000000000,
          deliveryStatus: 'delivered'
        },
        {
          id: 'msg-2',
          sender: 'staff',
          text: 'Sure! How can I help you today?',
          timestamp: 1700000060000,
          deliveryStatus: 'delivered'
        }
      ];

      const extracted = extractConversationMessages(mockMessages, 'fallback', 1700000000000, 'customer', 'chat-1');
      expect(extracted).toHaveLength(2);
      expect(extracted[0].text).toBe('Hello, I have a question about the job.');
      expect(extracted[1].sender).toBe('staff');
    });

    it('generates single fallback message when messages array is empty but legacy text exists', () => {
      const extracted = extractConversationMessages([], 'Legacy inquiry message', 1700000000000, 'customer', 'chat-2');
      expect(extracted).toHaveLength(1);
      expect(extracted[0].text).toBe('Legacy inquiry message');
      expect(extracted[0].sender).toBe('customer');
    });
  });

  describe('isBootstrapAdminEmail', () => {
    it('identifies predefined platform administrator emails', () => {
      expect(isBootstrapAdminEmail('admin@valleyreigns.com')).toBe(true);
      expect(isBootstrapAdminEmail('genesisjosephoghene+admin@gmail.com')).toBe(true);
      expect(isBootstrapAdminEmail('ADMIN@VALLEYREIGNS.COM')).toBe(true);
    });

    it('returns false for standard job seeker and employer emails', () => {
      expect(isBootstrapAdminEmail('seeker@example.com')).toBe(false);
      expect(isBootstrapAdminEmail('employer@apexsystems.com')).toBe(false);
    });
  });

  describe('generateMessageId', () => {
    it('creates deterministic unique message IDs', () => {
      const id1 = generateMessageId('chat-101', 1700000000000);
      const id2 = generateMessageId('chat-101', 1700000000001);
      expect(id1).toContain('msg_');
      expect(typeof id1).toBe('string');
      expect(id1).not.toBe(id2);
    });
  });

  describe('isInternalStaffChat', () => {
    it('identifies 1-on-1 office chats and staff direct messages', () => {
      expect(isInternalStaffChat({ conversationType: 'staff_direct' })).toBe(true);
      expect(isInternalStaffChat({ chatId: 'direct_user1_user2' })).toBe(true);
      expect(isInternalStaffChat({ directChatId: 'direct_user1_user2' })).toBe(true);
    });

    it('identifies staff team hub group chats', () => {
      expect(isInternalStaffChat({ conversationType: 'staff_group' })).toBe(true);
      expect(isInternalStaffChat({ chatId: 'group_staff_team_hub' })).toBe(true);
      expect(isInternalStaffChat({ channelId: 'staff_team_hub' })).toBe(true);
    });

    it('identifies test diagnostic runs and logs', () => {
      expect(isInternalStaffChat({ conversationType: 'test_report' })).toBe(true);
      expect(isInternalStaffChat({ chatId: 'test_log_run_123' })).toBe(true);
      expect(isInternalStaffChat({ chatId: 'test_run_456' })).toBe(true);
    });

    it('returns false for public candidate and job applicant conversations', () => {
      expect(isInternalStaffChat({ chatId: 'chat_08012345678', customerPhone: '+2348012345678' })).toBe(false);
      expect(isInternalStaffChat({ chatId: 'applicant_123', status: 'pending' })).toBe(false);
    });

    it('returns false for employer conversations', () => {
      expect(isInternalStaffChat({ chatId: 'employer_google_nigeria', isEmployer: true })).toBe(false);
      expect(isInternalStaffChat({ chatId: 'employer_08123456789', userRole: 'employer' })).toBe(false);
    });

    it('returns false for null/undefined objects', () => {
      expect(isInternalStaffChat(null)).toBe(false);
      expect(isInternalStaffChat(undefined)).toBe(false);
    });
  });
});
