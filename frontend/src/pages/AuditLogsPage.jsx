import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuditLogs } from '../api';

export default function AuditLogsPage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getAuditLogs(100);
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  }

  const fmtTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Audit Logs</div>
          <div className="page-sub">{logs.length} log entries</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={loadData}>Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Resource</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No audit logs yet</td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem' }}>{fmtTime(log.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{log.username}</td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                      background: log.action?.includes('login') ? '#ecfeff' : log.action?.includes('create') ? '#ecfdf5' : '#f8fafc',
                      color: log.action?.includes('login') ? 'var(--cyan)' : log.action?.includes('create') ? 'var(--green)' : 'var(--text-secondary)',
                      border: `1px solid ${log.action?.includes('login') ? '#a5f3fc' : log.action?.includes('create') ? '#a7f3d0' : '#e5e7eb'}`,
                    }}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.resource_type}</td>
                  <td>
                    <span style={{
                      color: log.status_code?.startsWith('2') ? 'var(--green)' : 'var(--red)',
                      fontWeight: 600, fontSize: '0.78rem',
                    }}>
                      {log.status_code}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
