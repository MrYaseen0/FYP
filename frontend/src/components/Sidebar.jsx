import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { messagesAPI, notificationsAPI } from '../api';

const NAV_BY_ROLE = {
  admin: [
    { icon: '⊞', label: 'Dashboard', to: '/admin' },
    { icon: '🩺', label: 'Health Analysis', to: '/health-analysis' },
    { icon: '👥', label: 'Users & Accounts', to: '/admin/users' },
    { icon: '🔐', label: 'Roles & Permissions', to: '/admin/roles' },
    { icon: '📋', label: 'Audit Logs', to: '/admin/audit' },
    { icon: '🏥', label: 'Providers', to: '/admin/providers' },
    { icon: '⚙', label: 'System Settings', to: '/admin/settings' },
  ],
  doctor: [
    { icon: '⊞', label: 'Dashboard', to: '/doctor' },
    { icon: '🩺', label: 'Health Analysis', to: '/health-analysis' },
    { icon: '▶', label: 'New Case', to: '/submit' },
    { icon: '👥', label: 'My Patients', to: '/patients' },
    { icon: '📄', label: 'Patient Records', to: '/record' },
    { icon: '📅', label: 'Appointments', to: '/appointments' },
    { icon: '💊', label: 'Prescriptions', to: '/prescriptions' },
    { icon: '📝', label: 'Clinical Notes', to: '/notes' },
    { icon: '🔬', label: 'Lab Orders', to: '/lab-orders' },
    { icon: '💬', label: 'Messages', to: '/messages' },
    { icon: '📊', label: 'Analytics', to: '/analytics' },
    { icon: '🧪', label: 'Agent Lab', to: '/lab' },
  ],
  user: [
    { icon: '⊞', label: 'Dashboard', to: '/patient' },
    { icon: '🩺', label: 'Health Analysis', to: '/health-analysis' },
    { icon: '▶', label: 'New Case', to: '/submit' },
    { icon: '📅', label: 'My Appointments', to: '/appointments' },
    { icon: '📄', label: 'Medical Records', to: '/record' },
    { icon: '💊', label: 'Prescriptions', to: '/prescriptions' },
    { icon: '💬', label: 'Messages', to: '/messages' },
    { icon: '📊', label: 'Health Metrics', to: '/health-metrics' },
    { icon: '💳', label: 'Billing', to: '/billing' },
  ],
};

const BOTTOM_NAV = [
  { icon: '⚙', label: 'Settings', to: '/settings' },
  { icon: '🔔', label: 'Notifications', to: '/notifications' },
];

function isActive(to, pathname) {
  if (to === '/') return pathname === '/';
  if (to === '/admin') return pathname === '/admin';
  return pathname === to || pathname.startsWith(to + '/');
}

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const role = user?.role || 'user';
  const navItems = NAV_BY_ROLE[role] || NAV_BY_ROLE.user;
  const [badges, setBadges] = useState({});

  useEffect(() => {
    loadBadges();
    const interval = setInterval(loadBadges, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadBadges() {
    try {
      const [convos, notifs] = await Promise.allSettled([
        messagesAPI.getConversations(),
        notificationsAPI.getAll(),
      ]);
      const newBadges = {};
      if (convos.status === 'fulfilled') {
        const totalUnread = (convos.value.conversations || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
        if (totalUnread > 0) newBadges['/messages'] = totalUnread;
      }
      if (notifs.status === 'fulfilled') {
        const unreadNotifs = (notifs.value.notifications || []).filter(n => !n.is_read).length;
        if (unreadNotifs > 0) newBadges['/notifications'] = unreadNotifs;
      }
      setBadges(newBadges);
    } catch {}
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to terminate the session?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        <Logo size={36} />
        <div>
          <div className="sb-title">HEALTHEON</div>
          <div className="sb-version">V2.1 · {user?.role_label || role}</div>
        </div>
      </div>

      <nav className="sb-nav">
        {navItems.map(({ icon, label, to }) => {
          const active = isActive(to, pathname);
          const badgeCount = badges[to];
          return (
            <div
              key={to}
              className={'sb-nav-item' + (active ? ' active' : '')}
              onClick={() => navigate(to)}
            >
              <span className="sb-nav-icon">{icon}</span>
              <span>{label}</span>
              {badgeCount > 0 && <span className="sb-nav-badge">{badgeCount}</span>}
            </div>
          );
        })}
      </nav>

      <div className="sb-footer">
        {BOTTOM_NAV.map(({ icon, label, to }) => {
          const active = pathname === to;
          const badgeCount = badges[to];
          return (
            <div
              key={to}
              className={'sb-footer-item' + (active ? ' active' : '')}
              onClick={() => navigate(to)}
              style={{ cursor: 'pointer', position: 'relative' }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {badgeCount > 0 && <span className="sb-nav-badge">{badgeCount}</span>}
            </div>
          );
        })}

        <div className="sb-footer-item">
          <span className="live-dot" /> System Status
        </div>

        {user && (
          <div className="sb-user-profile">
            <div className="sb-user-info">
              <div className="sb-user-avatar">{(user.full_name || user.username || 'U').split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
              <div>
                <div className="sb-user-name">{user.full_name || user.username}</div>
                <div className="sb-user-role">{user.role_label || role}</div>
              </div>
            </div>
            <button className="sb-logout-btn" onClick={handleLogout} title="Sign out">
              🚪
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
