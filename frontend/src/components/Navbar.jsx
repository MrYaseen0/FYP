import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import SupportModal from './SupportModal';

const PAGE_NAMES = {
  '/': 'Dashboard',
  '/submit': 'New Case',
  '/orchestration': 'System Orchestration',
  '/fleet': 'Agent Fleet',
  '/lab': 'Agent Lab',
  '/record': 'Patient Record',
  '/analytics': 'Case Analytics',
  '/settings': 'Settings',
  '/notifications': 'Notifications',
  '/patients': 'My Patients',
  '/appointments': 'Appointments',
  '/prescriptions': 'Prescriptions',
  '/notes': 'Clinical Notes',
  '/lab-orders': 'Lab Orders',
  '/messages': 'Messages',
  '/health-metrics': 'Health Metrics',
  '/billing': 'Billing',
  '/admin': 'Administration',
  '/admin/users': 'Users & Accounts',
  '/admin/roles': 'Roles & Permissions',
  '/admin/audit': 'Audit Logs',
  '/admin/providers': 'Providers',
  '/admin/settings': 'System Settings',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const crumb = pathname.startsWith('/cases/')
    ? `Case ${pathname.split('/cases/')[1].slice(0, 8).toUpperCase()}`
    : PAGE_NAMES[pathname] || 'Healtheon';

  return (
    <>
      <header className="app-navbar">
        <div className="navbar-left">
          <span className="navbar-logo" onClick={() => navigate('/')}>
            <Logo size={24} />
          </span>
          <nav className="navbar-tabs">
            <span className={`navbar-tab ${pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>Dashboard</span>
            {pathname.startsWith('/cases/') && (
              <>
                <span className="navbar-sep">·</span>
                <span className="navbar-tab active">{crumb}</span>
              </>
            )}
          </nav>
        </div>

        <div className="navbar-right">
          {user?.role !== 'admin' && (
            <button className="sm-trigger" onClick={() => navigate('/about')} title="About Developer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span>About Us</span>
            </button>
          )}
          <SupportModal />

          <div className="navbar-status-widget">
            <span className="status-indicator online">●</span>
            <span className="status-text">System Online</span>
          </div>

          {user && (
            <div className="navbar-user">
              <div className="navbar-user-info">
                <span className="navbar-user-name">{user.full_name || user.username}</span>
                <span className="navbar-user-role">{user.role_label || user.role}</span>
              </div>
              <div className="navbar-avatar">{user.avatar}</div>
            </div>
          )}

          <button className="navbar-icon-btn" onClick={() => navigate('/notifications')}>🔔</button>
          <button className="navbar-icon-btn" onClick={() => navigate('/settings')}>⚙️</button>
        </div>
      </header>
    </>
  );
}
