import { describe, it, expect, beforeEach } from 'vitest';
import { 
  memoryStore, 
  addJob, 
  getJobById, 
  incrementJobImpressions 
} from '../../lib/services';
import type { Job } from '../../types';

describe('Integration Tests: Job Posting & Retrieval Flow', () => {
  beforeEach(() => {
    memoryStore.jobs = [];
  });

  it('creates new job openings, persists in memoryStore, and enables instant retrieval', async () => {
    const rawJob: Omit<Job, 'id' | 'impressions' | 'createdAt'> = {
      title: 'DevOps & Kubernetes Engineer',
      company: 'CloudNova Systems',
      category: 'Tech / IT',
      location: 'Lekki Phase 1, Lagos',
      salary: '₦1,800,000 / month',
      type: 'Full-time',
      description: 'Managing cloud infrastructure and CI/CD pipelines.',
      requirements: ['Kubernetes', 'Docker', 'AWS', 'Terraform'],
      postedByUid: 'employer-cloudnova'
    };

    const created = await addJob(rawJob);
    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.impressions).toBe(0);
    expect(created.title).toBe('DevOps & Kubernetes Engineer');

    // Retrieve via ID
    const retrieved = await getJobById(created.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.company).toBe('CloudNova Systems');
  });

  it('tracks and increments job impressions correctly', async () => {
    const created = await addJob({
      title: 'UI/UX Designer',
      company: 'Creative Hub',
      category: 'Design',
      location: 'Remote',
      salary: '₦800,000',
      type: 'Full-time',
      description: 'Designing intuitive interfaces.',
      requirements: ['Figma'],
    });

    expect(created.impressions).toBe(0);

    // Increment impressions
    await incrementJobImpressions(created.id);
    const updated = await getJobById(created.id);
    expect(updated?.impressions).toBe(1);
  });
});
