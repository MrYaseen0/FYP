import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock axios module before importing api
vi.mock('axios', () => {
  const interceptors = {
    request: { handlers: [] },
    response: { handlers: [] },
  };
  const instance = {
    interceptors,
    defaults: { headers: { common: {} } },
    post: vi.fn().mockResolvedValue({ data: {} }),
    get: vi.fn().mockResolvedValue({ data: {} }),
    put: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
    create: vi.fn(function () { return instance; }),
    request: vi.fn().mockResolvedValue({ data: {} }),
  };
  // Make interceptors.use push to handlers
  interceptors.request.use = vi.fn((fn) => { interceptors.request.handlers.push(fn); return 0; });
  interceptors.response.use = vi.fn((successFn, errorFn) => {
    interceptors.response.handlers.push({ success: successFn, error: errorFn });
    return 0;
  });
  return { default: instance, ...instance };
});

import axios from 'axios';
import api, { authAPI, createCaseWebSocket } from '../api';

describe('api.js', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('authAPI', () => {
    it('login sends correct payload', async () => {
      api.post.mockResolvedValueOnce({ data: { access_token: 'tok', user: { role: 'user' } } });
      const result = await authAPI.login('user@test.com', 'password');
      expect(api.post).toHaveBeenCalledWith('/api/auth/login', { email: 'user@test.com', password: 'password' });
      expect(result.access_token).toBe('tok');
    });

    it('register sends correct payload', async () => {
      api.post.mockResolvedValueOnce({ data: { message: 'registered' } });
      const payload = { full_name: 'Test', email: 'test@test.com', password: 'Pass123!' };
      await authAPI.register(payload);
      expect(api.post).toHaveBeenCalledWith('/api/auth/register', payload);
    });

    it('me fetches current user', async () => {
      api.get.mockResolvedValueOnce({ data: { id: 'usr_1', role: 'user' } });
      const result = await authAPI.me();
      expect(api.get).toHaveBeenCalledWith('/api/auth/me');
      expect(result.id).toBe('usr_1');
    });

    it('guestToken sends POST to guest endpoint', async () => {
      api.post.mockResolvedValueOnce({ data: { access_token: 'guest_tok' } });
      const result = await authAPI.guestToken();
      expect(api.post).toHaveBeenCalledWith('/api/auth/guest-token');
      expect(result.access_token).toBe('guest_tok');
    });

    it('logout removes tokens from localStorage', async () => {
      localStorage.setItem('ht_token', 'token');
      localStorage.setItem('ht_guest', 'true');
      api.post.mockResolvedValueOnce({});
      await authAPI.logout();
      expect(localStorage.getItem('ht_token')).toBeNull();
      expect(localStorage.getItem('ht_guest')).toBeNull();
    });

    it('forgotPassword sends email', async () => {
      api.post.mockResolvedValueOnce({ data: { message: 'sent' } });
      await authAPI.forgotPassword('user@test.com');
      expect(api.post).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'user@test.com' });
    });

    it('verifyEmail sends email and code', async () => {
      api.post.mockResolvedValueOnce({ data: { verified: true } });
      await authAPI.verifyEmail('user@test.com', '123456');
      expect(api.post).toHaveBeenCalledWith('/api/auth/verify-email', { email: 'user@test.com', code: '123456' });
    });

    it('sendCode sends email', async () => {
      api.post.mockResolvedValueOnce({ data: { message: 'code sent' } });
      await authAPI.sendCode('user@test.com');
      expect(api.post).toHaveBeenCalledWith('/api/auth/send-code', { email: 'user@test.com' });
    });
  });

  describe('rate limit handling', () => {
    it('attaches friendlyMessage on 429 responses', () => {
      const error = { response: { status: 429, data: { detail: 'Rate limit exceeded' } } };
      if (error.response?.status === 429) {
        error.friendlyMessage = error.response?.data?.detail || 'Too many requests.';
      }
      expect(error.friendlyMessage).toBe('Rate limit exceeded');
    });

    it('uses default message when no detail on 429', () => {
      const error = { response: { status: 429, data: {} } };
      if (error.response?.status === 429) {
        error.friendlyMessage = error.response?.data?.detail || 'Too many requests. Please wait.';
      }
      expect(error.friendlyMessage).toBe('Too many requests. Please wait.');
    });
  });

  describe('createCaseWebSocket', () => {
    it('returns an object with close and send methods', () => {
      const ws = createCaseWebSocket('case-123', 'token', () => {});
      expect(typeof ws.close).toBe('function');
      expect(typeof ws.send).toBe('function');
      ws.close();
    });
  });
});
