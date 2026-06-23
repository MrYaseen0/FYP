import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { patientAPI, messagesAPI, notificationsAPI } from '../api';
import Logo from '../components/Logo';
import './PatientDashboard.css';

export default function PatientDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [healthMetrics, setHealthMetrics] = useState([]);
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const userName = user?.full_name || user?.name || 'Patient';

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [appts, rxs, records, metrics, msgs, notifs] = await Promise.allSettled([
        patientAPI.getAppointments(),
        patientAPI.getPrescriptions(),
        patientAPI.getMedicalRecords(),
        patientAPI.getHealthMetrics(),
        messagesAPI.getAll(),
        notificationsAPI.getAll(),
      ]);

      if (appts.status === 'fulfilled') setAppointments(appts.value.appointments || []);
      if (rxs.status === 'fulfilled') setPrescriptions(rxs.value.prescriptions || []);
      if (records.status === 'fulfilled') setMedicalRecords(records.value.records || []);
      if (metrics.status === 'fulfilled') setHealthMetrics(metrics.value.metrics || []);
      if (msgs.status === 'fulfilled') setMessages(msgs.value.messages || []);
      if (notifs.status === 'fulfilled') setNotifications(notifs.value.notifications || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
      navigate('/login');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const upcomingAppointments = appointments.filter(a => a.status === 'scheduled').slice(0, 5);
  const activePrescriptions = prescriptions.filter(p => p.status === 'active');
  const recentRecords = medicalRecords.slice(0, 5);
  const unreadNotifications = notifications.filter(n => !n.is_read);

  const getLatestMetric = (type) => {
    const metric = healthMetrics.find(m => m.type === type);
    return metric ? `${metric.value} ${metric.unit}` : '--';
  };

  if (loading) {
    return (
      <div className="pd-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="pd-page">
      {/* Header */}
      <header className="pd-header">
        <div className="pd-logo">
          <Logo size={28} />
        </div>
        <div className="pd-greeting">
          Welcome back, <strong>{userName}</strong>!
        </div>
        <div className="pd-header-actions">
          <button className="pd-notification-btn" aria-label="Notifications" onClick={() => navigate('/notifications')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadNotifications.length > 0 && (
              <span className="pd-notification-badge">{unreadNotifications.length}</span>
            )}
          </button>
          <div className="pd-header-avatar" title={userName}>
            {user?.avatar || userName.charAt(0).toUpperCase()}
          </div>
          <button className="pd-logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </header>

      {/* Sidebar overlay for mobile */}
      <div
        className={`pd-sidebar-overlay ${sidebarOpen ? 'pd-overlay-visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <div className="pd-layout">
        {/* Sidebar */}
        <aside className={`pd-sidebar ${sidebarOpen ? 'pd-sidebar-open' : ''}`}>
          <div className="pd-sidebar-profile">
            <div className="pd-sidebar-avatar">
              {user?.avatar || userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="pd-sidebar-name">{userName}</div>
            <span className="pd-sidebar-role">Patient</span>
          </div>

          <nav className="pd-nav">
            <a className="pd-nav-item pd-nav-active" href="#" onClick={(e) => { e.preventDefault(); navigate('/patient'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
              </svg>
              Dashboard
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/appointments'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              My Appointments
              {upcomingAppointments.length > 0 && (
                <span className="pd-nav-badge pd-badge-warning">{upcomingAppointments.length}</span>
              )}
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/record'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              Medical Records
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/prescriptions'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" />
              </svg>
              Prescriptions
              {activePrescriptions.length > 0 && (
                <span className="pd-nav-badge">{activePrescriptions.length}</span>
              )}
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/messages'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Messages
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/health-metrics'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Health Metrics
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/billing'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
              </svg>
              Billing
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/notifications'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              Notifications
            </a>
            <a className="pd-nav-item" href="#" onClick={(e) => { e.preventDefault(); navigate('/settings'); }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Settings
            </a>
          </nav>

          <div className="pd-sidebar-footer">
            <a className="pd-nav-item pd-signout" href="#signout" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              Sign Out
            </a>
          </div>
        </aside>

        {/* Main content */}
        <main className="pd-main">
          {/* Quick Health Summary */}
          <h2 className="pd-section-title">Quick Health Summary</h2>
          <div className="pd-summary-grid">
            <div className="pd-summary-card pd-card-green">
              <div className="pd-summary-label">Heart Rate</div>
              <div className="pd-summary-value">{getLatestMetric('heart_rate')}</div>
              <div className="pd-summary-sub">Latest reading</div>
            </div>
            <div className="pd-summary-card pd-card-amber">
              <div className="pd-summary-label">Blood Pressure</div>
              <div className="pd-summary-value">{getLatestMetric('blood_pressure')}</div>
              <div className="pd-summary-sub">Latest reading</div>
            </div>
            <div className="pd-summary-card pd-card-blue">
              <div className="pd-summary-label">Active Prescriptions</div>
              <div className="pd-summary-value">{activePrescriptions.length}</div>
              <div className="pd-summary-sub">{activePrescriptions.length > 0 ? 'Current medications' : 'No active prescriptions'}</div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="pd-card">
            <div className="pd-card-header">
              <h3 className="pd-card-title">Upcoming Appointments</h3>
            </div>
            <div className="pd-card-body">
              {upcomingAppointments.length === 0 ? (
                <div className="pd-empty-state">No upcoming appointments</div>
              ) : (
                upcomingAppointments.map(appt => {
                  const d = new Date(appt.date);
                  return (
                    <div className="pd-appt-row" key={appt.id}>
                      <div className="pd-appt-date-box">
                        <span className="pd-appt-date-month">{d.toLocaleDateString('en-US', { month: 'short' })}</span>
                        <span className="pd-appt-date-day">{d.getDate()}</span>
                      </div>
                      <div className="pd-appt-info">
                        <div className="pd-appt-doctor">{appt.doctor_name}</div>
                        <div className="pd-appt-specialty">{appt.type}</div>
                        <div className="pd-appt-meta">
                          <span>{appt.time}</span>
                        </div>
                      </div>
                      <span className={`pd-status-badge pd-status-${appt.status === 'scheduled' ? 'confirmed' : appt.status}`}>
                        <span className="pd-status-dot" />
                        {appt.status}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Prescriptions + Records side by side */}
          <div className="pd-two-col">
            <div className="pd-card">
              <div className="pd-card-header">
                <h3 className="pd-card-title">Recent Prescriptions</h3>
              </div>
              <div className="pd-card-body">
                {activePrescriptions.length === 0 ? (
                  <div className="pd-empty-state">No active prescriptions</div>
                ) : (
                  activePrescriptions.slice(0, 5).map(rx => (
                    <div className="pd-rx-row" key={rx.id}>
                      <div className="pd-rx-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5" />
                          <rect x="9" y="10" width="6" height="8" rx="1" />
                        </svg>
                      </div>
                      <div className="pd-rx-info">
                        <div className="pd-rx-name">{rx.medication}</div>
                        <div className="pd-rx-detail">{rx.dosage} &middot; {rx.frequency}</div>
                      </div>
                      <span className="pd-status-badge pd-status-active">
                        <span className="pd-status-dot" />
                        Active
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pd-card">
              <div className="pd-card-header">
                <h3 className="pd-card-title">Medical Records</h3>
              </div>
              <div className="pd-card-body">
                {recentRecords.length === 0 ? (
                  <div className="pd-empty-state">No medical records</div>
                ) : (
                  recentRecords.map(rec => (
                    <div className="pd-record-row" key={rec.id}>
                      <div className="pd-record-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                      </div>
                      <div className="pd-record-info">
                        <div className="pd-record-type">{rec.title}</div>
                        <div className="pd-record-detail">{formatDate(rec.date)} &middot; {rec.doctor_name || rec.type}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Messages from Providers */}
          <div className="pd-card">
            <div className="pd-card-header">
              <h3 className="pd-card-title">Messages</h3>
            </div>
            <div className="pd-card-body">
              {messages.length === 0 ? (
                <div className="pd-empty-state">No messages</div>
              ) : (
                messages.slice(0, 5).map(msg => (
                  <div className="pd-msg-row" key={msg.id}>
                    <div className="pd-msg-avatar">{msg.sender_name?.charAt(0) || '?'}</div>
                    <div className="pd-msg-content">
                      <div className="pd-msg-top">
                        <span className="pd-msg-doctor">{msg.sender_name}</span>
                        <span className="pd-msg-time">{formatDate(msg.created_at)}</span>
                      </div>
                      <div className="pd-msg-preview">{msg.content}</div>
                    </div>
                    {!msg.is_read && <div className="pd-msg-unread" />}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile sidebar toggle */}
      <button
        className="pd-mobile-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? '\u2715' : '\u2630'}
      </button>
    </div>
  );
}
