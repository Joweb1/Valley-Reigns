import { describe, it, expect, beforeEach } from 'vitest';
import { 
  memoryStore, 
  addJob, 
  sendChatMessage, 
  saveUserProfile, 
  getUserProfile,
  toggleCandidateListTag 
} from '../../lib/services';
import type { Job, UserProfile } from '../../types';

describe('End-to-End (E2E) Critical User Journeys (5–10%)', () => {
  beforeEach(() => {
    // Reset test memory store
    memoryStore.jobs = [];
    memoryStore.conversations = {};
    memoryStore.users = {};
  });

  it('Journey 1: Seeker Discovery -> Job Application & Direct Inquiry Pipeline', async () => {
    // 1. Employer creates a job posting
    const jobData: Omit<Job, 'id' | 'impressions' | 'createdAt'> = {
      title: 'Full Stack Engineer',
      company: 'Apex Systems',
      category: 'Tech / IT',
      location: 'Victoria Island, Lagos',
      salary: '₦1,500,000 / month',
      type: 'Full-time',
      description: 'Full stack development role.',
      requirements: ['TypeScript', 'React', 'Node.js']
    };
    const postedJob = await addJob(jobData);
    expect(postedJob.id).toBeTruthy();

    // 2. Seeker creates account & profile
    const seekerProfile: UserProfile = {
      uid: 'seeker-alex-101',
      email: 'alex.rivera@example.com',
      displayName: 'Alex Rivera',
      role: 'seeker',
      canPostJobs: false,
      jobTitle: 'Full Stack Developer',
      phoneNumber: '+2348012345678',
      createdAt: Date.now(),
      messagingPreference: 'in-app'
    };
    await saveUserProfile(seekerProfile);
    const verifiedSeeker = await getUserProfile('seeker-alex-101');
    expect(verifiedSeeker?.displayName).toBe('Alex Rivera');

    // 3. Seeker initiates direct inquiry for the job
    const chatId = 'conv_seeker-alex-101_job_' + postedJob.id;
    const initialMessage = await sendChatMessage(
      chatId,
      'customer',
      'Hello, I have submitted my portfolio and would like to follow up on this role.',
      {
        senderUid: 'seeker-alex-101',
        senderName: 'Alex Rivera',
        senderRole: 'seeker',
        jobId: postedJob.id,
        jobTitle: postedJob.title
      }
    );
    expect(initialMessage.deliveryStatus).toBe('sent');

    // 4. Staff receives inquiry, responds, and tags candidate as 'Submitted Resume(CV)'
    const staffReply = await sendChatMessage(
      chatId,
      'staff',
      'Thank you Alex! Your profile has been received and tagged for hiring team review.',
      {
        senderUid: 'staff-marcus-1',
        senderName: 'Marcus Vance',
        senderRole: 'staff'
      }
    );
    expect(staffReply.sender).toBe('staff');

    // 5. Verify conversation status
    await toggleCandidateListTag(chatId, 'Submitted Resume(CV)', 'staff-marcus-1');
    const updatedConv = memoryStore.conversations[chatId];
    expect(updatedConv).toBeDefined();
    expect(updatedConv.candidateLists?.['Submitted Resume(CV)']).toBeDefined();
  }, 20000);

  it('Journey 2: Employer Onboarding -> Direct Admin Chat -> Candidate Shortlisting Request', async () => {
    // 1. Employer registers on platform
    const employerProfile: UserProfile = {
      uid: 'employer-apex-202',
      email: 'hiring@apexsystems.com',
      displayName: 'David Apex',
      companyName: 'Apex Systems Global',
      companyIndustry: 'Technology',
      role: 'employer',
      canPostJobs: true,
      canMessageSeekers: true,
      isVerifiedEmployer: true,
      createdAt: Date.now(),
      messagingPreference: 'in-app'
    };
    await saveUserProfile(employerProfile);

    // 2. Employer contacts Platform Administration for custom talent shortlisting
    const adminChatId = 'employer_employer-apex-202_admin_admin-seed';
    const inquiryMsg = await sendChatMessage(
      adminChatId,
      'customer',
      'Hello Admin, we need 3 Senior Backend Engineers urgently.',
      {
        senderUid: 'employer-apex-202',
        senderName: 'David Apex',
        senderRole: 'employer',
        adminUid: 'admin-seed',
        adminName: 'Valley Reigns Admin',
        companyName: 'Apex Systems Global',
        isEmployer: true
      }
    );
    expect(inquiryMsg.text).toContain('Senior Backend Engineers');

    // 3. Admin acknowledges and claims thread
    const adminResponse = await sendChatMessage(
      adminChatId,
      'staff',
      'We have matching pre-screened candidates available and will share the shortlists shortly.',
      {
        senderUid: 'admin-seed',
        senderName: 'Valley Reigns Admin',
        senderRole: 'admin',
        adminUid: 'admin-seed',
        isEmployer: true
      }
    );
    expect(adminResponse.deliveryStatus).toBe('sent');

    const conversation = memoryStore.conversations[adminChatId];
    expect(conversation.isEmployer).toBe(true);
    expect(conversation.companyName).toBe('Apex Systems Global');
  }, 20000);
});
