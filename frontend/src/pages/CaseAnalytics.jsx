import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listCases, getAdminStats, doctorAPI } from '../api';

export default function CaseAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const promises = user?.role === 'admin'
        ? [listCases(), getAdminStats()]
        : [listCases(), doctorAPI.getStats()];
      const [casesData, statsData] = await Promise.allSettled(promises);
      if (casesData.status === 'fulfilled') setCases(casesData.value.cases || []);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const statusCounts = { done: 0, running: 0, pending: 0, failed: 0 };
  cases.forEach(c => {
    if (statusCounts[c.status] !== undefined) statusCounts[c.status]++;
    else statusCounts.pending++;
  });

  const totalCases = cases.length;
  const doneRate = totalCases ? Math.round((statusCounts.done / totalCases) * 100) : 0;
  const failRate = totalCases ? Math.round((statusCounts.failed / totalCases) * 100) : 0;

  const recentCases = cases.slice(0, 10);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Case Analytics</div>
          <div className="page-sub">Overview of all diagnostic cases</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #067857' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Cases</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#067857' }}>{totalCases}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #22c55e' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Completed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e' }}>{statusCounts.done}</div>
          <div style={{ fontSize: '0.7rem', color: '#22c55e', marginTop: 2 }}>{doneRate}% success rate</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #067857' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Running</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#067857' }}>{statusCounts.running}</div>
        </div>
        <div className="card" style={{ padding: 20, borderLeft: '4px solid #ef4444' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Failed</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#ef4444' }}>{statusCounts.failed}</div>
          {failRate > 0 && <div style={{ fontSize: '0.7rem', color: '#ef4444', marginTop: 2 }}>{failRate}% failure rate</div>}
        </div>
      </div>

      {/* Completion Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 16, color: 'var(--text-primary)' }}>Case Status Distribution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              ['Completed', statusCounts.done, '#22c55e'],
              ['Running', statusCounts.running, '#067857'],
              ['Pending', statusCounts.pending, '#f59e0b'],
              ['Failed', statusCounts.failed, '#ef4444'],
            ].map(([label, count, color]) => (
              <div key={label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                  <span style={{ fontWeight: 700, color }}>{count}</span>
                </div>
                <div style={{ background: 'var(--border)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                  <div style={{
                    width: `${totalCases ? (count / totalCases) * 100 : 0}%`,
                    background: color, height: '100%', borderRadius: 4, transition: 'width 0.5s',
                  }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 20 }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 16, color: 'var(--text-primary)' }}>Completion Rate</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
            <div style={{ position: 'relative', width: 160, height: 160 }}>
              <svg viewBox="0 0 160 160" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="80" cy="80" r="70" fill="none" stroke="var(--border)" strokeWidth="12" />
                <circle
                  cx="80" cy="80" r="70" fill="none"
                  stroke="#067857" strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 70}`}
                  strokeDashoffset={`${2 * Math.PI * 70 * (1 - doneRate / 100)}`}
                  strokeLinecap="round"
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '2rem', fontWeight: 700, color: '#067857' }}>{doneRate}%</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Success</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Cases Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '2px solid var(--border)', fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
          Recent Cases
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Case</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Messages</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created</th>
              <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {recentCases.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.title || `Case ${c.id?.slice(0, 8)}`}</td>
                <td style={{ padding: '10px 16px' }}>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 4,
                    background: c.status === 'done' ? '#22c55e15' : c.status === 'running' ? '#06785715' : c.status === 'failed' ? '#ef444415' : '#f59e0b15',
                    color: c.status === 'done' ? '#22c55e' : c.status === 'running' ? '#067857' : c.status === 'failed' ? '#ef4444' : '#f59e0b',
                  }}>
                    {c.status}
                  </span>
                </td>
                <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{c.message_count || c.messages?.length || 0}</td>
                <td style={{ padding: '10px 16px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <button className="btn btn-outline btn-sm" style={{ fontSize: '0.68rem', padding: '3px 10px' }} onClick={() => navigate(`/cases/${c.id}`)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
            {recentCases.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>No cases found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
