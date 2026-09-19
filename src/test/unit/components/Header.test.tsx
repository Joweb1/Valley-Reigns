import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Header } from '../../../components/Header';

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: {
      uid: 'admin-user-1',
      email: 'admin@valleyreigns.com',
      displayName: 'Platform Admin',
      role: 'admin',
    },
    firebaseUser: null,
    loading: false,
    loginWithEmail: vi.fn(),
    signupUser: vi.fn(),
    logout: vi.fn(),
  })
}));

vi.mock('../../../context/NotificationContext', () => ({
  useNotification: () => ({
    notifications: [],
    unreadCount: 3,
    markAllAsRead: vi.fn(),
    markAsRead: vi.fn(),
    clearAll: vi.fn(),
    permission: 'granted',
    requestPermission: vi.fn(),
    pushNotificationsEnabled: true,
    setPushNotificationsEnabled: vi.fn(),
  })
}));

describe('Unit Tests: Header Component', () => {
  it('renders application branding and navigation links', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText(/Valley Reigns/i)).toBeTruthy();
  });

  it('displays user greeting or role badge for authenticated users', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Platform Admin role is reflected in header
    expect(screen.getAllByText(/Admin/i).length).toBeGreaterThan(0);
  });
});
