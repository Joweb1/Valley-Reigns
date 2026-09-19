import { describe, it, expect, beforeEach } from 'vitest';
import { memoryStore, getUserProfile, saveUserProfile } from '../../lib/services';
import type { UserProfile } from '../../types';

describe('Integration Tests: Authentication & Profile State Pipeline', () => {
  beforeEach(() => {
    // Reset memory store state
    memoryStore.users = {};
    memoryStore.currentUser = null;
  });

  it('persists and retrieves user profiles across session state', async () => {
    const testProfile: UserProfile = {
      uid: 'user-integration-101',
      email: 'integratortest@example.com',
      displayName: 'Alex Integrator',
      role: 'employer',
      canPostJobs: true,
      canMessageSeekers: true,
      companyName: 'Integrator Corp',
      createdAt: Date.now(),
      messagingPreference: 'in-app'
    };

    // Save profile to integration store
    await saveUserProfile(testProfile);

    // Retrieve via getUserProfile
    const fetched = await getUserProfile('user-integration-101');
    expect(fetched).not.toBeNull();
    expect(fetched?.displayName).toBe('Alex Integrator');
    expect(fetched?.role).toBe('employer');
    expect(fetched?.companyName).toBe('Integrator Corp');
  });

  it('updates permissions and role elevation seamlessly', async () => {
    const candidate: UserProfile = {
      uid: 'candidate-99',
      email: 'candidate99@example.com',
      displayName: 'Candidate Nine',
      role: 'seeker',
      canPostJobs: false,
      createdAt: Date.now(),
      messagingPreference: 'in-app'
    };

    await saveUserProfile(candidate);

    // Elevate user to staff
    const elevated = {
      ...candidate,
      role: 'staff' as const,
      canPostJobs: true
    };
    await saveUserProfile(elevated);

    const result = await getUserProfile('candidate-99');
    expect(result?.role).toBe('staff');
    expect(result?.canPostJobs).toBe(true);
  });
});
