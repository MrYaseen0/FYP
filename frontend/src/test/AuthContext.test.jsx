import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

// Mock the authAPI module
vi.mock('../api', () => ({
  authAPI: {
    login: vi.fn(),
    me: vi.fn(),
    guestToken: vi.fn(),
    logout: vi.fn(),
  },
}));

import { authAPI } from '../api';

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('provides initial loading state', () => {
    authAPI.me.mockRejectedValue(new Error('no token'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    // Initially loading or authenticated depending on localStorage
    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
  });

  it('initializes as unauthenticated when no token', async () => {
    authAPI.me.mockRejectedValue(new Error('no token'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it('initializes as authenticated when valid token exists', async () => {
    localStorage.setItem('ht_token', 'valid-token');
    authAPI.me.mockResolvedValue({ id: 'usr_1', username: 'testuser', role: 'user' });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.username).toBe('testuser');
  });

  it('clears invalid token on mount', async () => {
    localStorage.setItem('ht_token', 'bad-token');
    authAPI.me.mockRejectedValue(new Error('invalid'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('ht_token')).toBeNull();
  });

  it('login stores token and sets user on success', async () => {
    authAPI.me.mockRejectedValue(new Error('not init'));
    const { result } = renderHook(() => useAuth(), { wrapper });

    authAPI.login.mockResolvedValue({
      access_token: 'new-token',
      user: { id: 'usr_1', username: 'doctor1', role: 'doctor' },
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('doc@test.com', 'Doctor123!');
    });

    expect(loginResult.success).toBe(true);
    expect(loginResult.user.role).toBe('doctor');
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.user.username).toBe('doctor1');
    expect(localStorage.getItem('ht_token')).toBe('new-token');
  });

  it('login returns error on failure', async () => {
    authAPI.me.mockRejectedValue(new Error('not init'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    authAPI.login.mockRejectedValue({
      response: { data: { detail: 'Invalid credentials' } },
    });

    let loginResult;
    await act(async () => {
      loginResult = await result.current.login('bad@test.com', 'wrong');
    });

    expect(loginResult.success).toBe(false);
    expect(loginResult.error).toBe('Invalid credentials');
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('logout clears state and localStorage', async () => {
    localStorage.setItem('ht_token', 'some-token');
    authAPI.me.mockResolvedValue({ id: 'usr_1', username: 'testuser', role: 'user' });
    authAPI.logout.mockResolvedValue();

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

    await act(async () => {
      await result.current.logout();
    });

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('ht_token')).toBeNull();
  });

  it('enterGuestMode sets guest state', async () => {
    authAPI.me.mockRejectedValue(new Error('not init'));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    authAPI.guestToken.mockResolvedValue({
      access_token: 'guest-token-123',
      user: { id: 'guest_abc', username: 'guest', role: 'user' },
    });

    await act(async () => {
      await result.current.enterGuestMode();
    });

    expect(result.current.isGuest).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem('ht_guest')).toBe('true');
    expect(localStorage.getItem('ht_token')).toBe('guest-token-123');
  });

  it('exitGuestMode clears guest state', async () => {
    localStorage.setItem('ht_guest', 'true');
    localStorage.setItem('ht_token', 'guest-token');
    authAPI.me.mockResolvedValue({ id: 'guest_abc', username: 'guest', role: 'user' });
    authAPI.logout.mockResolvedValue();

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isGuest).toBe(true));

    await act(async () => {
      await result.current.exitGuestMode();
    });

    expect(result.current.isGuest).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem('ht_guest')).toBeNull();
  });

  it('useAuth throws when used outside provider', () => {
    // Suppress React error boundary console noise
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');
    spy.mockRestore();
  });

  it('handles guest mode init from localStorage', async () => {
    localStorage.setItem('ht_guest', 'true');
    authAPI.me.mockResolvedValue({ id: 'guest_xyz', username: 'guest', role: 'user' });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.isGuest).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
  });
});
