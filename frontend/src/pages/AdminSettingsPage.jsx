import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function AdminSettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    siteName: 'Healtheon',
    maxCasesPerDay: 50,
    sessionTimeout: 60,
    requireApproval: true,
    allowSelfRegister: true,
    enableWebSocket: true,
    enableAuditLog: true,
    maxAgentsPerCase: 6,
    defaultLlmModel: 'gpt-4o-mini',
    dataRetentionDays: 365,
    maintenanceMode: false,
    emailNotifications: true,
  });
  const [saved, setSaved] = useState(false);

  const set = (key, value) => {
    setSettings(s => ({ ...s, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    localStorage.setItem('healtheon_admin_settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">System Settings</div>
          <div className="page-sub">Configure platform-wide settings</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>← Back</button>
      </div>

      {/* General */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>General</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Site Name</label>
            <input className="form-input" value={settings.siteName} onChange={e => set('siteName', e.target.value)} />
          </div>
          <div>
            <label className="form-label">Default LLM Model</label>
            <input className="form-input" value={settings.defaultLlmModel} onChange={e => set('defaultLlmModel', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Limits */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>Limits & Quotas</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label className="form-label">Max Cases Per Day</label>
            <input className="form-input" type="number" value={settings.maxCasesPerDay} onChange={e => set('maxCasesPerDay', Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Session Timeout (min)</label>
            <input className="form-input" type="number" value={settings.sessionTimeout} onChange={e => set('sessionTimeout', Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Max Agents Per Case</label>
            <input className="form-input" type="number" value={settings.maxAgentsPerCase} onChange={e => set('maxAgentsPerCase', Number(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Data Retention (days)</label>
            <input className="form-input" type="number" value={settings.dataRetentionDays} onChange={e => set('dataRetentionDays', Number(e.target.value))} />
          </div>
        </div>
      </div>

      {/* Toggles */}
      <div className="card" style={{ padding: 20, marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>Features</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            ['requireApproval', 'Require Admin Approval', 'New registrations need admin approval'],
            ['allowSelfRegister', 'Allow Self-Registration', 'Users can register without invitation'],
            ['enableWebSocket', 'Enable WebSocket Streaming', 'Real-time case updates via WebSocket'],
            ['enableAuditLog', 'Enable Audit Logging', 'Track all API operations'],
            ['emailNotifications', 'Email Notifications', 'Send email alerts for important events'],
            ['maintenanceMode', 'Maintenance Mode', 'Block all non-admin access'],
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

      {/* Save */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        {saved && (
          <span style={{ fontSize: '0.8rem', color: 'var(--green)', alignSelf: 'center', fontWeight: 600 }}>
            ✓ Settings saved
          </span>
        )}
        <button className="btn btn-primary" onClick={saveSettings}>Save Settings</button>
      </div>
    </div>
  );
}
