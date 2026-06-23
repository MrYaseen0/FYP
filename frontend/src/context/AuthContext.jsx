import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { authAPI } from '../api';

const AuthContext = createContext(null);

const GUEST_USER = {
  user_id: 'guest',
  username: 'Guest User',
  email: 'guest@healtheon.local',
  role: 'guest',
  full_name: 'Guest User',
};

// Guest access token expires in 15 minutes. Refresh at 13 minutes.
const GUEST_REFRESH_INTERVAL = 13 * 60 * 1000;

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  // ── Auto-refresh timer for guest sessions ──────────────────────────────
  function startGuestRefreshTimer() {
    stopGuestRefreshTimer();
    refreshTimer.current = setInterval(async () => {
      try {
        await authAPI.me(); // Trigger refresh interceptor if token expired
      } catch {
        // If refresh fails, guest session is over
        stopGuestRefreshTimer();
        localStorage.removeItem('ht_token');
        localStorage.removeItem('ht_guest');
        setIsGuest(false);
        setIsAuthenticated(false);
        setUser(null);
      }
    }, GUEST_REFRESH_INTERVAL);
  }

  function stopGuestRefreshTimer() {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }

  // ── Initialize auth state on mount ─────────────────────────────────────
  useEffect(() => {
    const guestMode = localStorage.getItem('ht_guest');
    if (guestMode === 'true') {
      // Guest mode: try to validate via httpOnly cookie refresh
      authAPI.me()
        .then((data) => {
          setUser(data);
          setIsGuest(true);
          setIsAuthenticated(true);
          setLoading(false);
          startGuestRefreshTimer();
        })
        .catch(() => {
          // Cookie expired or invalid — clear and stay unauthenticated
          localStorage.removeItem('ht_token');
          localStorage.removeItem('ht_guest');
          setUser(null);
          setIsGuest(false);
          setIsAuthenticated(false);
          setLoading(false);
        });
      return;
    }

    const token = localStorage.getItem('ht_token');
    if (!token) {
      setLoading(false);
      return;
    }

    authAPI.me()
      .then((data) => {
        setUser(data);
        setIsAuthenticated(true);
        setLoading(false);
      })
      .catch(() => {
        localStorage.removeItem('ht_token');
        setIsAuthenticated(false);
        setUser(null);
        setLoading(false);
      });
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => stopGuestRefreshTimer();
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const data = await authAPI.login(email, password);
      // Store access token in localStorage as fallback (httpOnly cookie is primary)
      localStorage.setItem('ht_token', data.access_token);
      localStorage.removeItem('ht_guest');
      stopGuestRefreshTimer();
      setUser(data.user);
      setIsAuthenticated(true);
      setIsGuest(false);
      return { success: true, user: data.user };
    } catch (error) {
      const msg = error?.response?.data?.detail || error.message || 'Login failed';
      return { success: false, error: typeof msg === 'string' ? msg : 'Login failed' };
    } finally {
      setLoading(false);
    }
  }, []);

  const enterGuestMode = useCallback(async () => {
    try {
      const data = await authAPI.guestToken();
      // Store access token as fallback; httpOnly cookie is primary
      localStorage.setItem('ht_token', data.access_token);
      localStorage.setItem('ht_guest', 'true');
      setUser(data.user);
      setIsGuest(true);
      setIsAuthenticated(true);
      startGuestRefreshTimer();
    } catch (err) {
      console.error('Failed to get guest token:', err);
    }
  }, []);

  const exitGuestMode = useCallback(async () => {
    stopGuestRefreshTimer();
    localStorage.removeItem('ht_guest');
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('ht_token');
    setIsGuest(false);
    setIsAuthenticated(false);
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    stopGuestRefreshTimer();
    try { await authAPI.logout(); } catch {}
    localStorage.removeItem('ht_token');
    localStorage.removeItem('ht_guest');
    setIsAuthenticated(false);
    setIsGuest(false);
    setUser(null);
  }, []);

  if (loading && !isAuthenticated) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', background: '#f9f8f6', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #e8e8e8', borderTopColor: '#067857',
          borderRadius: '50%', animation: 'ltSpin 0.8s linear infinite',
        }} />
        <div style={{ fontSize: '0.82rem', color: '#7f8c8d', fontFamily: 'Inter, sans-serif' }}>
          Loading Healtheon...
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isGuest, user, loading, login, logout, enterGuestMode, exitGuestMode }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
