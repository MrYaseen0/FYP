import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { doctorAPI, messagesAPI, notificationsAPI } from '../api';
import Logo from '../components/Logo';
import './DoctorDashboard.css';

export default function DoctorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState({ total_patients: 0, total_appointments: 0, total_prescriptions: 0, total_cases: 0 });
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const doctorName = user?.full_name || 'Doctor';
  const doctorInitials = user?.avatar || doctorName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [pts, appts, st, msgs, notifs] = await Promise.allSettled([
        doctorAPI.getPatients(),
        doctorAPI.getAppointments(),
        doctorAPI.getStats(),
        messagesAPI.getAll(),
        notificationsAPI.getAll(),
      ]);

      if (pts.status === 'fulfilled') setPatients(pts.value.patients || []);
      if (appts.status === 'fulfilled') setAppointments(appts.value.appointments || []);
      if (st.status === 'fulfilled') setStats(st.value);
      if (msgs.status === 'fulfilled') setMessages(msgs.value.messages || []);
      if (notifs.status === 'fulfilled') setNotifications(notifs.value.notifications || []);
    } catch (err) {
      console.error('Failed to load doctor data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to log out?')) {
      logout();
      navigate('/login');
    }
  };

  const todayAppointments = appointments.filter(a => {
    const today = new Date().toISOString().split('T')[0];
    return a.date === today;
  });

  const scheduledAppointments = appointments.filter(a => a.status === 'scheduled');

  const getStatusClass = (status) => {
    const map = {
      confirmed: 'dd-schedule__status--confirmed',
      scheduled: 'dd-schedule__status--confirmed',
      pending: 'dd-schedule__status--pending',
      in_progress: 'dd-schedule__status--in_progress',
      completed: 'dd-schedule__status--completed',
      cancelled: 'dd-schedule__status--cancelled',
    };
    return map[status] || '';
  };

  if (loading) {
    return (
      <div className="dd-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <div className="spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="dd-page">
      {/* Sidebar */}
      <aside className={`dd-sidebar ${sidebarOpen ? 'dd-sidebar--open' : ''}`}>
        <div className="dd-sidebar__profile">
          <div className="dd-sidebar__avatar">{doctorInitials}</div>
          <div className="dd-sidebar__name">{doctorName}</div>
          <span className="dd-sidebar__role">Healthcare Provider</span>
        </div>

        <nav className="dd-sidebar__nav">
          <a href="#" className="dd-sidebar__nav-item dd-sidebar__nav-item--active" onClick={(e) => { e.preventDefault(); navigate('/doctor'); }}>
            <span className="dd-sidebar__nav-icon">📊</span>
            Dashboard
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/patients'); }}>
            <span className="dd-sidebar__nav-icon">👥</span>
            My Patients
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/appointments'); }}>
            <span className="dd-sidebar__nav-icon">📅</span>
            Appointments
            {scheduledAppointments.length > 0 && (
              <span className="dd-sidebar__nav-badge">{scheduledAppointments.length}</span>
            )}
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/prescriptions'); }}>
            <span className="dd-sidebar__nav-icon">💊</span>
            Prescriptions
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/record'); }}>
            <span className="dd-sidebar__nav-icon">📋</span>
            Medical Records
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/messages'); }}>
            <span className="dd-sidebar__nav-icon">💬</span>
            Messages
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/notes'); }}>
            <span className="dd-sidebar__nav-icon">📝</span>
            Clinical Notes
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/lab-orders'); }}>
            <span className="dd-sidebar__nav-icon">🔬</span>
            Lab Orders
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/analytics'); }}>
            <span className="dd-sidebar__nav-icon">📊</span>
            Analytics
          </a>
          <a href="#" className="dd-sidebar__nav-item" onClick={(e) => { e.preventDefault(); navigate('/notifications'); }}>
            <span className="dd-sidebar__nav-icon">🔔</span>
            Notifications
          </a>
        </nav>

        <div className="dd-sidebar__footer">
          <a href="#" className="dd-sidebar__footer-item" onClick={(e) => { e.preventDefault(); navigate('/settings'); }}>
            <span className="dd-sidebar__footer-icon">⚙️</span>
            Settings
          </a>
          <a href="#" className="dd-sidebar__footer-item dd-sidebar__footer-item--logout" onClick={handleLogout}>
            <span className="dd-sidebar__footer-icon">🚪</span>
            Log Out
          </a>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      <div
        className={`dd-sidebar-overlay ${sidebarOpen ? 'dd-sidebar-overlay--visible' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Header */}
      <header className="dd-header">
        <div className="dd-header__left">
          <button
            className="dd-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            ☰
          </button>
          <span className="dd-header__logo-icon"><Logo size={22} /></span>
          <span className="dd-header__logo">Healtheon</span>
        </div>

        <div className="dd-header__center">
          <div className="dd-header__greeting">
            {doctorName} | Clinical Dashboard
          </div>
          <div className="dd-header__subtitle">
            {user?.institution || 'Medical Provider'}
          </div>
        </div>

        <div className="dd-header__right">
          <button className="dd-header__notification-btn" aria-label="Notifications" onClick={() => navigate('/notifications')}>
            🔔
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="dd-header__notification-badge">{notifications.filter(n => !n.is_read).length}</span>
            )}
          </button>
          <div className="dd-header__avatar">{doctorInitials}</div>
          <button className="dd-header__logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dd-main">
        {/* Quick Stats */}
        <section className="dd-stats">
          <div className="dd-stat-card dd-stat-card--green">
            <div className="dd-stat-card__header">
              <span className="dd-stat-card__title">Total Patients</span>
              <div className="dd-stat-card__icon dd-stat-card__icon--green">👥</div>
            </div>
            <div className="dd-stat-card__value">{stats.total_patients}</div>
            <div className="dd-stat-card__description">Assigned to you</div>
          </div>

          <div className="dd-stat-card dd-stat-card--blue">
            <div className="dd-stat-card__header">
              <span className="dd-stat-card__title">Appointments</span>
              <div className="dd-stat-card__icon dd-stat-card__icon--blue">📅</div>
            </div>
            <div className="dd-stat-card__value">{stats.total_appointments}</div>
            <div className="dd-stat-card__description">{scheduledAppointments.length} scheduled</div>
          </div>

          <div className="dd-stat-card dd-stat-card--amber">
            <div className="dd-stat-card__header">
              <span className="dd-stat-card__title">Prescriptions</span>
              <div className="dd-stat-card__icon dd-stat-card__icon--amber">💊</div>
            </div>
            <div className="dd-stat-card__value">{stats.total_prescriptions}</div>
            <div className="dd-stat-card__description">Written by you</div>
          </div>

          <div className="dd-stat-card dd-stat-card--purple">
            <div className="dd-stat-card__header">
              <span className="dd-stat-card__title">Clinical Cases</span>
              <div className="dd-stat-card__icon dd-stat-card__icon--purple">📋</div>
            </div>
            <div className="dd-stat-card__value">{stats.total_cases}</div>
            <div className="dd-stat-card__description">In system</div>
          </div>
        </section>

        {/* Today's Appointments */}
        <section className="dd-card">
          <div className="dd-card__header">
            <h2 className="dd-card__title">
              <span className="dd-card__title-icon">🗓️</span>
              Today's Appointments
            </h2>
          </div>
          <div className="dd-card__body">
            {todayAppointments.length === 0 ? (
              <div className="dd-empty-state">No appointments scheduled for today</div>
            ) : (
              <div className="dd-schedule">
                {todayAppointments.map((appt) => (
                  <div key={appt.id} className="dd-schedule__item">
                    <div className="dd-schedule__time">{appt.time}</div>
                    <div className="dd-schedule__details">
                      <div className="dd-schedule__patient">{appt.patient_name}</div>
                      <div className="dd-schedule__reason">{appt.type}</div>
                    </div>
                    <span className={`dd-schedule__status ${getStatusClass(appt.status)}`}>
                      {appt.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Patient Queue */}
        <section className="dd-card">
          <div className="dd-card__header">
            <h2 className="dd-card__title">
              <span className="dd-card__title-icon">👥</span>
              Patients
            </h2>
          </div>
          <div className="dd-card__body">
            {patients.length === 0 ? (
              <div className="dd-empty-state">No patients assigned yet</div>
            ) : (
              <div className="dd-table-wrapper">
                <table className="dd-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Email</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {patients.map((patient) => (
                      <tr key={patient.id}>
                        <td data-label="Patient">
                          <div className="dd-table__patient-cell">
                            <div className="dd-table__patient-avatar">{patient.avatar || patient.name?.charAt(0)}</div>
                            <div className="dd-table__patient-name">{patient.name}</div>
                          </div>
                        </td>
                        <td data-label="Email">{patient.email}</td>
                        <td data-label="Joined">{patient.created_at ? new Date(patient.created_at).toLocaleDateString() : '--'}</td>
                        <td data-label="Actions">
                          <div className="dd-table__actions">
                            <button className="dd-table__action-btn dd-table__action-btn--view" onClick={() => navigate('/record')}>View</button>
                            <button className="dd-table__action-btn dd-table__action-btn--message" onClick={() => navigate('/messages')}>Message</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Recent Notifications */}
        <section className="dd-card">
          <div className="dd-card__header">
            <h2 className="dd-card__title">
              <span className="dd-card__title-icon">🔔</span>
              Recent Notifications
            </h2>
          </div>
          <div className="dd-card__body dd-card__body--padded">
            {notifications.length === 0 ? (
              <div className="dd-empty-state">No notifications</div>
            ) : (
              <div className="dd-alerts">
                {notifications.slice(0, 5).map((notif) => (
                  <div key={notif.id} className="dd-alert">
                    <div className="dd-alert__icon">
                      {notif.type === 'warning' ? '⚠️' : notif.type === 'success' ? '✅' : 'ℹ️'}
                    </div>
                    <div className="dd-alert__content">
                      <div className="dd-alert__message">{notif.title}: {notif.message}</div>
                      <div className="dd-alert__time">{notif.created_at ? new Date(notif.created_at).toLocaleString() : ''}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
