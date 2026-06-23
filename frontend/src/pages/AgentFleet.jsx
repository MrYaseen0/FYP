import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, listCases } from '../api';

const AGENTS = [
  { id: 'AGT-GP-01', name: 'General Practitioner', role: 'Initial triage and symptom analysis', color: '#3b82f6', status: 'online' },
  { id: 'AGT-CRD-03', name: 'Cardiologist', role: 'Cardiovascular differential diagnosis', color: '#ef4444', status: 'online' },
  { id: 'AGT-NEU-04', name: 'Neurologist', role: 'Neurological assessment', color: '#8b5cf6', status: 'online' },
  { id: 'AGT-PUL-05', name: 'Pulmonologist', role: 'Respiratory system evaluation', color: '#06b6d4', status: 'online' },
  { id: 'AGT-PTH-06', name: 'Pathologist', role: 'Lab investigations and biomarkers', color: '#f59e0b', status: 'online' },
  { id: 'AGT-SUM-07', name: 'Summarizer', role: 'Final report generation', color: '#10b981', status: 'online' },
];

export default function AgentFleet() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [c, s] = await Promise.allSettled([listCases(0, 20), getAdminStats()]);
      if (c.status === 'fulfilled') setCases(c.value.cases || []);
      if (s.status === 'fulfilled') setStats(s.value);
    } catch (err) {
      console.error('Failed to load fleet data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Agent Fleet</div>
          <div className="page-sub">{AGENTS.length} agents in fleet &middot; {stats?.pipeline?.total_messages || 0} total messages processed</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={loadData}>Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      {/* Fleet Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {AGENTS.map(agent => (
          <div key={agent.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${agent.color}`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#10b981',
                display: 'inline-block', animation: 'pulse-live 2s ease-in-out infinite',
              }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', marginBottom: 4 }}>
              {agent.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--mono)', marginBottom: 8 }}>
              {agent.id}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              {agent.role}
            </div>
          </div>
        ))}
      </div>

      {/* Recent Cases */}
      <div className="card">
        <div className="card-title">Recent Cases Processed</div>
        {cases.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No cases yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Case</th>
                  <th>Complaint</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {cases.slice(0, 10).map(c => (
                  <tr key={c.case_id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.case_id}`)}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--cyan)' }}>
                      #HLT-{c.case_id?.replace(/-/g, '').slice(0, 6).toUpperCase()}
                    </td>
                    <td style={{ fontWeight: 500 }}>{c.chief_complaint}</td>
                    <td>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                        textTransform: 'uppercase',
                        background: c.status === 'done' ? '#ecfdf5' : c.status === 'processing' ? '#ecfeff' : c.status === 'failed' ? '#fef2f2' : '#f3f4f6',
                        color: c.status === 'done' ? '#059669' : c.status === 'processing' ? '#0891b2' : c.status === 'failed' ? '#dc2626' : '#6b7280',
                        border: `1px solid ${c.status === 'done' ? '#a7f3d0' : c.status === 'processing' ? '#a5f3fc' : c.status === 'failed' ? '#fecaca' : '#e5e7eb'}`,
                      }}>
                        {c.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
