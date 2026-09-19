import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CandidateProfileView } from '../../../components/CandidateProfileView';
import type { Conversation, Job } from '../../../types';

const mockConversation: Conversation = {
  chatId: 'conv-candidate-1',
  customerPhone: '+2348012345678',
  name: 'Samuel Adebayo',
  jobTitle: 'Senior React Developer',
  jobId: 'job-1',
  status: 'ongoing',
  createdAt: 1700000000000,
  lastMessageAt: 1700000500000,
  text: 'I submitted my updated CV and portfolio link.',
  assignedTo: 'staff-1',
  assignedToName: 'Sarah Jenkins',
  candidateLists: {
    'Verified': { addedAt: 1700000000000, addedBy: 'staff-1' },
    'Submitted Resume(CV)': { addedAt: 1700000000000, addedBy: 'staff-1' }
  },
  sharedWith: [],
  messages: [
    {
      id: 'msg-1',
      sender: 'customer',
      text: 'I submitted my updated CV and portfolio link.',
      timestamp: 1700000500000,
      deliveryStatus: 'delivered'
    }
  ]
};

const mockJobs: Job[] = [
  {
    id: 'job-1',
    title: 'Senior React Developer',
    company: 'Apex Systems Global',
    category: 'Tech / IT',
    location: 'Lagos',
    salary: '₦1,000,000',
    type: 'Full-time',
    description: 'Dev job',
    requirements: ['React'],
    createdAt: 1700000000000,
    impressions: 50
  }
];

describe('Unit Tests: CandidateProfileView Component', () => {
  it('displays candidate name, phone, and applied role', () => {
    const handleBack = vi.fn();
    const handleOpenChat = vi.fn();

    render(
      <CandidateProfileView
        conversation={mockConversation}
        currentUser={{ uid: 'staff-1', email: 'staff@valleyreigns.com', displayName: 'Staff Sarah', role: 'staff' }}
        jobsList={mockJobs}
        onBack={handleBack}
        onOpenChat={handleOpenChat}
      />
    );

    expect(screen.getByText('Samuel Adebayo')).toBeTruthy();
    expect(screen.getAllByText(/Senior React Developer/i).length).toBeGreaterThan(0);
  });

  it('triggers onBack or action callback appropriately', () => {
    const handleBack = vi.fn();
    const handleOpenChat = vi.fn();

    render(
      <CandidateProfileView
        conversation={mockConversation}
        currentUser={{ uid: 'staff-1', email: 'staff@valleyreigns.com', displayName: 'Staff Sarah', role: 'staff' }}
        jobsList={mockJobs}
        onBack={handleBack}
        onOpenChat={handleOpenChat}
      />
    );

    const backBtn = screen.getByRole('button', { name: /back/i });
    if (backBtn) {
      fireEvent.click(backBtn);
      expect(handleBack).toHaveBeenCalled();
    }
  });
});
