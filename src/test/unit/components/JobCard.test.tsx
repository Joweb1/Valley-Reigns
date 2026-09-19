import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JobCard } from '../../../components/JobCard';
import type { Job } from '../../../types';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid: 'test-user-1',
      email: 'seeker@example.com',
      displayName: 'Jane Doe',
      role: 'seeker',
    },
    loading: false,
    loginWithEmail: vi.fn(),
    signupUser: vi.fn(),
    logout: vi.fn(),
  })
}));

const mockJob: Job = {
  id: 'job-test-101',
  title: 'Lead Frontend Developer',
  company: 'Apex Systems Global',
  category: 'Tech / IT',
  location: 'Victoria Island, Lagos',
  salary: '₦1,200,000 / month',
  type: 'Full-time',
  description: 'Building world-class web applications with React and TypeScript.',
  requirements: ['React', 'TypeScript', 'Tailwind CSS', 'GraphQL'],
  createdAt: Date.now() - 3600000,
  impressions: 120,
};

describe('Unit Tests: JobCard Component', () => {
  it('renders job title and location accurately', () => {
    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>
    );

    expect(screen.getByText('Lead Frontend Developer')).toBeTruthy();
    expect(screen.getAllByText(/Victoria Island/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Vacancy')).toBeTruthy();
  });

  it('renders apply action button', () => {
    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>
    );

    expect(screen.getByText(/Apply Now|Copy Link/i)).toBeTruthy();
  });

  it('expands description and toggles details state when Show Details button is clicked', () => {
    render(
      <MemoryRouter>
        <JobCard job={mockJob} />
      </MemoryRouter>
    );

    const showDetailsBtn = screen.getByText(/Show Details/i);
    expect(showDetailsBtn).toBeTruthy();
    fireEvent.click(showDetailsBtn);

    // After expanding, details are rendered
    expect(screen.getByText(/Hide Details/i)).toBeTruthy();
  });
});
