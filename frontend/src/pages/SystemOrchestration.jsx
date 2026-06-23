import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAdminStats } from '../api';

export default function SystemOrchestration() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load system stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">System Orchestration</div>
          <div className="page-sub">Monitor system health and agent pipeline performance</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">System Administrator</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem', fontWeight: 700, color: '#fff',
          }}>
            {user?.avatar || 'SA'}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>{user?.full_name || 'Admin'}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--cyan)', marginTop: 2 }}>Role: {user?.role?.toUpperCase()}</div>
          </div>
        </div>
      </div>

      {/* System Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {[
          ['Total Cases', stats?.cases?.total || 0, 'var(--cyan)'],
          ['Active Users', stats?.users?.total || 0, 'var(--green)'],
          ['Pipeline Messages', stats?.pipeline?.total_messages || 0, '#8b5cf6'],
          ['Avg Latency', `${stats?.pipeline?.avg_latency_seconds || 0}s`, '#f59e0b'],
        ].map(([label, value, color]) => (
          <div key={label} className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* System Status */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">System Status</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            ['API Service', 'OPERATIONAL', '#ecfdf5', '#a7f3d0', 'var(--green)'],
            ['Agent Pipeline', 'OPERATIONAL', '#ecfdf5', '#a7f3d0', 'var(--green)'],
            ['Database', 'OPERATIONAL', '#ecfdf5', '#a7f3d0', 'var(--green)'],
            ['Audit Logging', `ACTIVE (${stats?.audit?.actions_24h || 0} / 24h)`, '#ecfeff', '#a5f3fc', 'var(--cyan)'],
          ].map(([label, status, bg, border, color]) => (
            <div key={label} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: bg, borderRadius: 8, border: `1px solid ${border}`,
            }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: '0.72rem', color, fontWeight: 700 }}>{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline Performance */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-title">Pipeline Performance</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            ['Total Messages', stats?.pipeline?.total_messages || 0],
            ['Investigations', stats?.pipeline?.total_investigations || 0],
            ['Summaries', stats?.pipeline?.total_summaries || 0],
            ['Avg Rounds', stats?.pipeline?.avg_rounds || 0],
          ].map(([label, value]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--cyan)', marginTop: 4 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-title">Quick Actions</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {user?.role === 'admin' && (
            <>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/audit')}>View Audit Logs</button>
              <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin/users')}>Manage Users</button>
            </>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/fleet')}>Agent Fleet</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/analytics')}>Case Analytics</button>
        </div>
      </div>
    </div>
  );
}
