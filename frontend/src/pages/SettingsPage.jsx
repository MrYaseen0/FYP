import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientAPI } from '../api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const isPatient = !user?.role || user?.role === 'user';

  const [profile, setProfile] = useState({
    full_name: user?.full_name || user?.username || '',
    institution: user?.institution || '',
    avatar: user?.avatar || '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');

  const [settings, setSettings] = useState({
    notifications: true,
    soundAlerts: true,
    autoRefresh: true,
    refreshInterval: 5,
    theme: 'light',
    language: 'en',
    defaultSeverity: 5,
    showDisclaimer: false,
  });
  const [saved, setSaved] = useState(false);

  const set = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    localStorage.setItem('healtheon_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  async function saveProfile() {
    if (!isPatient) return;
    setProfileError('');
    if (!profile.full_name.trim()) {
      setProfileError('Display name is required');
      return;
    }
    try {
      setProfileSaving(true);
      const result = await patientAPI.updateProfile(profile);
      if (result.user) {
        const stored = localStorage.getItem('ht_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          Object.assign(parsed, result.user);
          localStorage.setItem('ht_user', JSON.stringify(parsed));
        }
      }
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err) {
      setProfileError(err?.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  }

  const handleLogout = () => {
    if (confirm('Are you sure you want to terminate the session?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-sub">Configure your workspace preferences</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => {
          if (user?.role === 'admin') navigate('/admin');
          else if (user?.role === 'doctor') navigate('/doctor');
          else navigate('/patient');
        }}>← Dashboard</button>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">User Profile</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--cyan)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 700, color: '#000',
          }}>
            {profile.avatar || user?.avatar || '??'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>{user?.username}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.role}</div>
          </div>
        </div>
        {profileError && <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>{profileError}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Display Name</label>
            <input
              className="form-input"
              value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))}
              disabled={!isPatient}
            />
          </div>
          <div>
            <label className="form-label">Email</label>
            <input className="form-input" defaultValue={user?.email} disabled />
          </div>
          <div>
            <label className="form-label">Institution</label>
            <input
              className="form-input"
              value={profile.institution}
              onChange={e => setProfile(p => ({ ...p, institution: e.target.value }))}
              disabled={!isPatient}
            />
          </div>
          <div>
            <label className="form-label">Avatar (2 letters)</label>
            <input
              className="form-input"
              value={profile.avatar}
              onChange={e => setProfile(p => ({ ...p, avatar: e.target.value.substring(0, 2) }))}
              maxLength={2}
              disabled={!isPatient}
            />
          </div>
        </div>
        {isPatient && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            {profileSaved && (
              <span style={{ fontSize: '0.8rem', color: 'var(--green)', alignSelf: 'center', fontWeight: 600 }}>
                ✓ Profile updated
              </span>
            )}
            <button className="btn btn-primary btn-sm" onClick={saveProfile} disabled={profileSaving}>
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Notifications</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['notifications', 'Enable Notifications', 'Receive alerts for case updates'],
            ['soundAlerts', 'Sound Alerts', 'Play sound when agents complete analysis'],
            ['autoRefresh', 'Auto-Refresh Dashboard', `Refresh case list every ${settings.refreshInterval}s`],
            ['showDisclaimer', 'Show Disclaimers', 'Display usage guidance on reports'],
          ].map(([key, label, desc]) => (
            <div key={key} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', background: 'var(--bg-glass)', borderRadius: 8,
              border: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{label}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{desc}</div>
              </div>
              <button
                onClick={() => set(key, !settings[key])}
                style={{
                  width: 44, height: 24, borderRadius: 12, border: 'none',
                  background: settings[key] ? 'var(--cyan)' : 'var(--border)',
                  cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  left: settings[key] ? 23 : 3,
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Display */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Display</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Refresh Interval (seconds)</label>
            <select
              className="form-input"
              value={settings.refreshInterval}
              onChange={e => set('refreshInterval', Number(e.target.value))}
            >
              <option value={3}>3s</option>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </div>
          <div>
            <label className="form-label">Default Severity</label>
            <input
              type="range" min="1" max="10"
              value={settings.defaultSeverity}
              onChange={e => set('defaultSeverity', Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--cyan)', marginTop: 8 }}
            />
            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--cyan)', fontWeight: 700 }}>
              {settings.defaultSeverity}/10
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'space-between' }}>
        <button className="btn btn-outline" style={{ color: 'var(--red)', borderColor: '#fecaca' }} onClick={handleLogout}>
          Terminate Session
        </button>
        <div style={{ display: 'flex', gap: 12 }}>
          {saved && (
            <span style={{ fontSize: '0.8rem', color: 'var(--green)', alignSelf: 'center', fontWeight: 600 }}>
              ✓ Settings saved
            </span>
          )}
          <button className="btn btn-primary" onClick={saveSettings}>
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
