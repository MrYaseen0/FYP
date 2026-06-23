import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers } from '../api';

export default function AdminProvidersPage() {
  const navigate = useNavigate();
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => { loadProviders(); }, []);

  async function loadProviders() {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      const doctors = (data.users || []).filter(u => u.role === 'doctor');
      setProviders(doctors);
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = providers.filter(p =>
    !filter || p.full_name?.toLowerCase().includes(filter.toLowerCase()) ||
    p.email?.toLowerCase().includes(filter.toLowerCase()) ||
    p.institution?.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Provider Directory</div>
          <div className="page-sub">{providers.length} provider{providers.length !== 1 ? 's' : ''}</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>← Back</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Search providers..." value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏥</div>
          <div className="empty-state-text">No providers found</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {filtered.map(provider => (
            <div key={provider.user_id} className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #067857, #0891b2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem', fontWeight: 700, color: '#fff',
                }}>
                  {provider.avatar || provider.full_name?.charAt(0) || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>{provider.full_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{provider.email}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Institution</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{provider.institution || '—'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Status</span>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                    background: provider.status === 'approved' ? '#22c55e15' : '#f59e0b15',
                    color: provider.status === 'approved' ? '#22c55e' : '#f59e0b',
                  }}>
                    {provider.status}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Joined</span>
                  <span style={{ color: 'var(--text-primary)' }}>
                    {provider.created_at ? new Date(provider.created_at).toLocaleDateString() : '—'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
