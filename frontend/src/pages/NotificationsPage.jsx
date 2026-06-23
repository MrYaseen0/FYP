import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationsAPI } from '../api';

const ICON_MAP = {
  appointment: '📅',
  lab_result: '🔬',
  prescription: '💊',
  info: 'ℹ️',
  warning: '⚠️',
  success: '✅',
};

const COLOR_MAP = {
  appointment: 'var(--cyan)',
  lab_result: 'var(--green)',
  prescription: '#f59e0b',
  info: 'var(--cyan)',
  warning: '#f59e0b',
  success: 'var(--green)',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      setLoading(true);
      const data = await notificationsAPI.getAll();
      setNotifications(data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }

  const markRead = async (id) => {
    try {
      await notificationsAPI.markRead(id);
      setNotifications(ns => ns.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification read:', err);
    }
  };

  const markAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      setNotifications(ns => ns.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Notifications</div>
          <div className="page-sub">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {unreadCount > 0 && (
            <button className="btn btn-outline btn-sm" onClick={markAllRead}>
              Mark all read
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Dashboard</button>
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="spinner" style={{ margin: '0 auto' }} />
          <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading notifications...</div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔔</div>
          <div className="empty-state-text">No notifications</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
            You're all caught up. New alerts will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className="card"
              style={{
                padding: '14px 18px',
                cursor: 'pointer',
                borderLeft: `3px solid ${COLOR_MAP[n.type] || 'var(--border)'}`,
                opacity: n.is_read ? 0.65 : 1,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, flex: 1 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: (COLOR_MAP[n.type] || 'var(--cyan)') + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.9rem', flexShrink: 0,
                  }}>
                    {ICON_MAP[n.type] || '•'}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                      {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--cyan)', display: 'inline-block', marginRight: 6 }} />}
                      {n.title}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', marginLeft: 12 }}>
                  {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
