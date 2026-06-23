import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminStats, getAuditLogs, getAdminUsers, getPendingUsers,
  approveUser, rejectUser, changeUserRole, banUser, getUserDetail,
  getSystemHealth, getDatabaseTables, getTableData, getDatabaseSummary,
  getAdminCases, getAdminCaseDetail, deleteAdminCase,
  getAgentPatterns, getAgentStats,
  getAllPredictions, getAllFeedback, getDRSAnalytics,
  getAllHealthMetrics, getAllAppointments, getAllPrescriptions,
  getAllNotifications, getAllChatMessages, getAllMedicalRecords, getAllDepartments,
} from '../api';

const TABS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'users', label: 'Users', icon: '👥' },
  { key: 'cases', label: 'Cases', icon: '📋' },
  { key: 'agents', label: 'Agent Memory', icon: '🧠' },
  { key: 'learning', label: 'Learning', icon: '📚' },
  { key: 'drs', label: 'DRS Scores', icon: '🎯' },
  { key: 'database', label: 'Database', icon: '🗄️' },
  { key: 'health', label: 'System Health', icon: '💚' },
];

function fmtTime(iso) { return iso ? new Date(iso).toLocaleString() : '—'; }
function fmtSize(bytes) { return bytes ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : '—'; }

const statusColors = {
  pending: { bg: '#fffbeb', border: '#fde68a', color: '#b45309' },
  approved: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
  rejected: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
};

const caseStatusColors = {
  pending: { bg: '#f8fafc', border: '#e5e7eb', color: '#6b7280' },
  processing: { bg: '#eff6ff', border: '#bfdbfe', color: '#1d4ed8' },
  done: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46' },
  failed: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b' },
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Overview data
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [health, setHealth] = useState(null);

  // Users
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [userFilter, setUserFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  // Cases
  const [cases, setCases] = useState([]);
  const [casesTotal, setCasesTotal] = useState(0);
  const [casesPage, setCasesPage] = useState(0);
  const [caseFilter, setCaseFilter] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);

  // Agent memory
  const [agentPatterns, setAgentPatterns] = useState([]);
  const [agentStats, setAgentStats] = useState(null);
  const [patternFilter, setPatternFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  // Learning
  const [predictions, setPredictions] = useState([]);
  const [feedback, setFeedback] = useState([]);

  // DRS
  const [drsData, setDrsData] = useState(null);

  // Database browser
  const [dbTables, setDbTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableData, setTableData] = useState(null);
  const [tablePage, setTablePage] = useState(0);
  const [tableSearch, setTableSearch] = useState('');

  // All-table data
  const [healthMetrics, setHealthMetrics] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Initial load
  useEffect(() => {
    let alive = true;
    const init = async () => {
      try {
        const [s, l] = await Promise.all([getAdminStats(), getAuditLogs(50)]);
        if (!alive) return;
        setStats(s);
        setLogs(l.logs || []);
      } catch (err) {
        if (alive) setError(err?.response?.data?.detail || 'Failed to load');
      } finally {
        if (alive) setLoading(false);
      }
    };
    init();
    return () => { alive = false; };
  }, []);

  // Tab-specific loaders
  const loadTab = useCallback(async (tabKey) => {
    try {
      switch (tabKey) {
        case 'users': {
          const [allU, pendU] = await Promise.all([getAdminUsers(), getPendingUsers()]);
          setUsers(allU.users || []);
          setPending(pendU.users || []);
          break;
        }
        case 'cases': {
          const c = await getAdminCases(0, 50, caseFilter || undefined);
          setCases(c.cases || []);
          setCasesTotal(c.total || 0);
          break;
        }
        case 'agents': {
          const [p, s] = await Promise.all([getAgentPatterns(agentFilter, patternFilter), getAgentStats()]);
          setAgentPatterns(p.patterns || []);
          setAgentStats(s);
          break;
        }
        case 'learning': {
          const [preds, fbs] = await Promise.all([getAllPredictions(), getAllFeedback()]);
          setPredictions(preds.predictions || []);
          setFeedback(fbs.feedback || []);
          break;
        }
        case 'drs': {
          const d = await getDRSAnalytics();
          setDrsData(d);
          break;
        }
        case 'database': {
          const t = await getDatabaseTables();
          setDbTables(t.tables || []);
          if (!selectedTable && t.tables?.length) {
            setSelectedTable(t.tables[0].name);
          }
          break;
        }
        case 'health': {
          const h = await getSystemHealth();
          setHealth(h);
          break;
        }
      }
    } catch (err) {
      console.error(`Failed to load ${tabKey}:`, err);
    }
  }, [caseFilter, agentFilter, patternFilter, selectedTable]);

  useEffect(() => { loadTab(tab); }, [tab, loadTab]);

  // Load table data when selectedTable changes
  useEffect(() => {
    if (!selectedTable) return;
    setTablePage(0);
    setTableSearch('');
    const load = async () => {
      try {
        const d = await getTableData(selectedTable, 0, 50);
        setTableData(d);
      } catch (err) {
        console.error('Failed to load table:', err);
      }
    };
    load();
  }, [selectedTable]);

  if (loading) return (
    <div className="empty-state">
      <div className="spinner" style={{ margin: '0 auto' }} />
      <div style={{ marginTop: 16, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading superuser dashboard...</div>
    </div>
  );

  if (error) return (
    <div className="empty-state">
      <div style={{ color: 'var(--red)', marginBottom: 12 }}>⚠ {error}</div>
      <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back</button>
    </div>
  );

  // ─── Tab content renderers ──────────────────────────────────────────────

  function renderOverview() {
    if (!stats) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Main stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
          {[
            ['Total Cases', stats.cases?.total, 'var(--cyan)'],
            ['Done', stats.cases?.by_status?.done, 'var(--green)'],
            ['Processing', stats.cases?.by_status?.processing, '#f59e0b'],
            ['Failed', stats.cases?.by_status?.failed, 'var(--red)'],
            ['Users', stats.users?.total, 'var(--purple)'],
            ['Pending', stats.users?.pending, '#f59e0b'],
          ].map(([label, val, color]) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{val || 0}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          {/* Pipeline stats */}
          <div className="card">
            <div className="card-title">Pipeline</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Messages</span><span style={{ fontWeight: 700 }}>{stats.pipeline?.total_messages}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Investigations</span><span style={{ fontWeight: 700 }}>{stats.pipeline?.total_investigations}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Summaries</span><span style={{ fontWeight: 700 }}>{stats.pipeline?.total_summaries}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Avg Latency</span><span style={{ fontWeight: 700, color: 'var(--cyan)' }}>{stats.pipeline?.avg_latency_seconds}s</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Avg Rounds</span><span style={{ fontWeight: 700 }}>{stats.pipeline?.avg_rounds}</span></div>
            </div>
          </div>

          {/* Learning & DRS */}
          <div className="card">
            <div className="card-title">Learning & DRS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Feedback</span><span style={{ fontWeight: 700 }}>{stats.learning?.total_feedback} ({stats.learning?.feedback_rate}% positive)</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Predictions</span><span style={{ fontWeight: 700 }}>{stats.learning?.total_predictions}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Agent Patterns</span><span style={{ fontWeight: 700 }}>{stats.agents?.total_patterns}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>DRS Scored</span><span style={{ fontWeight: 700, color: 'var(--green)' }}>{stats.drs?.scored_cases}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Avg DRS</span><span style={{ fontWeight: 700, color: 'var(--green)' }}>{stats.drs?.avg_score}</span></div>
            </div>
          </div>

          {/* System status */}
          <div className="card">
            <div className="card-title">System</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
              {[
                ['API', 'operational', 'var(--green)'],
                ['Pipeline', 'operational', 'var(--green)'],
                ['Database', 'operational', 'var(--green)'],
                ['Audit', `${stats.audit?.actions_24h || 0}/24h`, 'var(--cyan)'],
              ].map(([label, val, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f8fafc', borderRadius: 6 }}>
                  <span>{label}</span>
                  <span style={{ color, fontWeight: 700, fontSize: '0.72rem' }}>{typeof val === 'string' ? val.toUpperCase() : val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Audit trail */}
        <div className="card">
          <div className="card-title">Audit Trail — Recent Activity</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table">
              <thead>
                <tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>Status</th></tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No audit logs</td></tr>
                ) : logs.slice(0, 20).map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontFamily: 'var(--mono)', fontSize: '0.72rem' }}>{fmtTime(log.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{log.username}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: log.action?.includes('login') ? '#ecfeff' : '#ecfdf5', color: log.action?.includes('login') ? 'var(--cyan)' : 'var(--green)', border: `1px solid ${log.action?.includes('login') ? '#a5f3fc' : '#a7f3d0'}` }}>{log.action}</span></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>{log.resource_type}</td>
                    <td><span style={{ color: log.status_code?.startsWith('2') ? 'var(--green)' : 'var(--red)', fontWeight: 600, fontSize: '0.78rem' }}>{log.status_code}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderUsers() {
    const filtered = users.filter(u => {
      if (userFilter !== 'all' && u.status !== userFilter) return false;
      if (userSearch) {
        const q = userSearch.toLowerCase();
        return u.username?.includes(q) || u.email?.includes(q) || u.full_name?.includes(q);
      }
      return true;
    });

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'pending', 'approved', 'rejected'].map(f => (
              <button key={f} className={`btn btn-sm ${userFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => setUserFilter(f)}>
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && pending.length > 0 && <span style={{ marginLeft: 4, background: '#f59e0b', color: '#fff', borderRadius: 999, padding: '0 6px', fontSize: '0.65rem' }}>{pending.length}</span>}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Search users..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ width: 200, fontSize: '0.78rem' }} />
          <button className="btn btn-outline btn-sm" onClick={() => loadTab('users')}>↻ Refresh</button>
        </div>

        {/* Users table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>User</th><th>Email</th><th>Role</th><th>Status</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No users found</td></tr>
              ) : filtered.map(u => (
                <tr key={u.user_id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 999, background: u.role === 'admin' ? 'var(--purple)' : u.role === 'doctor' ? 'var(--cyan)' : 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700 }}>{u.avatar || u.username?.[0]?.toUpperCase()}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{u.email}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: u.role === 'admin' ? '#f5f3ff' : u.role === 'doctor' ? '#ecfeff' : '#ecfdf5', color: u.role === 'admin' ? 'var(--purple)' : u.role === 'doctor' ? 'var(--cyan)' : 'var(--green)', border: `1px solid ${u.role === 'admin' ? '#ddd6fe' : u.role === 'doctor' ? '#a5f3fc' : '#a7f3d0'}` }}>{u.role_label || u.role}</span></td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, ...statusColors[u.status] }}>{u.status}</span></td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtTime(u.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {u.status === 'pending' && (
                        <>
                          <button className="btn btn-sm" style={{ background: 'var(--green)', color: '#fff', fontSize: '0.68rem', padding: '2px 8px' }} onClick={() => approveUser(u.username).then(() => loadTab('users'))}>Approve</button>
                          <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff', fontSize: '0.68rem', padding: '2px 8px' }} onClick={() => rejectUser(u.username).then(() => loadTab('users'))}>Reject</button>
                        </>
                      )}
                      {u.status === 'approved' && u.role !== 'admin' && (
                        <select className="input" value={u.role} onChange={e => changeUserRole(u.username, e.target.value).then(() => loadTab('users'))} style={{ fontSize: '0.68rem', padding: '2px 6px', width: 90 }}>
                          <option value="user">User</option>
                          <option value="doctor">Doctor</option>
                        </select>
                      )}
                      {u.status === 'approved' && u.role !== 'admin' && (
                        <button className="btn btn-sm" style={{ background: 'var(--red)', color: '#fff', fontSize: '0.68rem', padding: '2px 8px' }} onClick={() => banUser(u.username).then(() => loadTab('users'))}>Ban</button>
                      )}
                      <button className="btn btn-outline btn-sm" style={{ fontSize: '0.68rem', padding: '2px 8px' }} onClick={() => setSelectedUser(selectedUser === u.user_id ? null : u.user_id)}>
                        {selectedUser === u.user_id ? '▲' : '▼'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderCases() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['', 'pending', 'processing', 'done', 'failed'].map(f => (
              <button key={f} className={`btn btn-sm ${caseFilter === f ? 'btn-primary' : 'btn-outline'}`} onClick={() => { setCaseFilter(f); }}>
                {f || 'All'}
              </button>
            ))}
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{casesTotal} total cases</span>
          <button className="btn btn-outline btn-sm" onClick={() => loadTab('cases')}>↻ Refresh</button>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>Case ID</th><th>Chief Complaint</th><th>Severity</th><th>Status</th><th>Messages</th><th>Summary</th><th>DRS</th><th>Created</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No cases</td></tr>
              ) : cases.map(c => (
                <tr key={c.case_id}>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.case_id?.slice(0, 12)}…</td>
                  <td style={{ fontWeight: 600, fontSize: '0.82rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.chief_complaint}</td>
                  <td><span style={{ fontSize: '0.78rem', fontWeight: 700, color: c.severity >= 8 ? 'var(--red)' : c.severity >= 5 ? '#f59e0b' : 'var(--green)' }}>{c.severity}/10</span></td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, ...caseStatusColors[c.status] }}>{c.status}</span></td>
                  <td style={{ fontSize: '0.78rem' }}>{c.message_count}</td>
                  <td style={{ fontSize: '0.78rem' }}>{c.has_summary ? '✅' : '—'}</td>
                  <td style={{ fontSize: '0.78rem' }}>{c.has_drs ? '✅' : '—'}</td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtTime(c.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: '0.68rem', padding: '2px 8px' }} onClick={async () => {
                        try {
                          const detail = await getAdminCaseDetail(c.case_id);
                          setSelectedCase(c.case_id);
                          setCaseDetail(detail);
                        } catch (err) { console.error(err); }
                      }}>View</button>
                      <button className="btn btn-sm" style={{ fontSize: '0.68rem', padding: '2px 8px', background: 'var(--red)', color: '#fff' }} onClick={async () => {
                        if (!confirm('Delete this case and ALL related data?')) return;
                        try { await deleteAdminCase(c.case_id); loadTab('cases'); } catch (err) { console.error(err); }
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Case detail modal */}
        {caseDetail && (
          <div className="card" style={{ border: '2px solid var(--cyan)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div className="card-title" style={{ margin: 0 }}>Case Detail — {selectedCase?.slice(0, 12)}…</div>
              <button className="btn btn-outline btn-sm" onClick={() => { setSelectedCase(null); setCaseDetail(null); }}>✕ Close</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, fontSize: '0.78rem' }}>
              {/* Left: case info + messages */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Chief Complaint</div>
                  <div>{caseDetail.case?.chief_complaint}</div>
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div><span style={{ color: 'var(--text-muted)' }}>Severity: </span><strong>{caseDetail.case?.severity}/10</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Status: </span><strong>{caseDetail.case?.status}</strong></div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Onset: </span>{caseDetail.case?.onset}</div>
                    <div><span style={{ color: 'var(--text-muted)' }}>Duration: </span>{caseDetail.case?.duration}</div>
                  </div>
                  {caseDetail.case?.associated_symptoms && <div style={{ marginTop: 8 }}><span style={{ color: 'var(--text-muted)' }}>Symptoms: </span>{caseDetail.case?.associated_symptoms}</div>}
                  {caseDetail.case?.past_medical_history && <div><span style={{ color: 'var(--text-muted)' }}>History: </span>{caseDetail.case?.past_medical_history}</div>}
                  {caseDetail.case?.current_medications && <div><span style={{ color: 'var(--text-muted)' }}>Medications: </span>{caseDetail.case?.current_medications}</div>}
                  {caseDetail.case?.allergies && <div><span style={{ color: 'var(--text-muted)' }}>Allergies: </span>{caseDetail.case?.allergies}</div>}
                </div>

                {/* Messages */}
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Agent Messages ({caseDetail.messages?.length || 0})</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 300, overflowY: 'auto' }}>
                    {(caseDetail.messages || []).map((m, i) => (
                      <div key={i} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, borderLeft: `3px solid ${i === 0 ? 'var(--green)' : 'var(--cyan)'}` }}>
                        <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--cyan)', marginBottom: 2 }}>{m.agent}</div>
                        <div style={{ fontSize: '0.72rem', lineHeight: 1.5, maxHeight: 80, overflow: 'hidden' }}>{m.content?.slice(0, 300)}{m.content?.length > 300 ? '…' : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: investigations, summary, feedback, predictions, patterns */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Investigations */}
                {caseDetail.investigations?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Investigations ({caseDetail.investigations.length})</div>
                    <table className="inv-table">
                      <thead><tr><th>Test</th><th>Urgency</th><th>Rationale</th></tr></thead>
                      <tbody>
                        {caseDetail.investigations.map((inv, i) => (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{inv.test}</td>
                            <td><span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700, background: inv.urgency === 'STAT' ? '#fef2f2' : '#f0fdf4', color: inv.urgency === 'STAT' ? 'var(--red)' : 'var(--green)' }}>{inv.urgency}</span></td>
                            <td style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{inv.rationale?.slice(0, 100)}…</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Summary */}
                {caseDetail.summary && (
                  <div style={{ padding: 12, background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                    <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--green)' }}>Summary</div>
                    <div style={{ fontSize: '0.72rem', lineHeight: 1.5, maxHeight: 150, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{caseDetail.summary.summary_markdown?.slice(0, 500)}…</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 12, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      <span>Latency: {caseDetail.summary.latency_seconds}s</span>
                      <span>Rounds: {caseDetail.summary.total_rounds}</span>
                    </div>
                    {caseDetail.summary.drs_score_json && (
                      <div style={{ marginTop: 8, padding: 8, background: '#fff', borderRadius: 6 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.72rem', marginBottom: 4 }}>DRS Score</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.68rem' }}>
                          {Object.entries(caseDetail.summary.drs_score_json).filter(([k]) => k !== 'missed' && k !== 'strengths').map(([k, v]) => (
                            <div key={k}><span style={{ color: 'var(--text-muted)' }}>{k}: </span><strong>{typeof v === 'number' ? v : String(v)}</strong></div>
                          ))}
                        </div>
                        {caseDetail.summary.drs_score_json.strengths?.length > 0 && (
                          <div style={{ marginTop: 4 }}><span style={{ fontWeight: 700, fontSize: '0.68rem' }}>Strengths:</span> {caseDetail.summary.drs_score_json.strengths.join(', ')}</div>
                        )}
                        {caseDetail.summary.drs_score_json.missed?.length > 0 && (
                          <div style={{ marginTop: 2 }}><span style={{ fontWeight: 700, fontSize: '0.68rem', color: 'var(--red)' }}>Missed:</span> {caseDetail.summary.drs_score_json.missed.join(', ')}</div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Feedback */}
                {caseDetail.feedback?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Feedback ({caseDetail.feedback.length})</div>
                    {caseDetail.feedback.map((f, i) => (
                      <div key={i} style={{ padding: '6px 10px', background: f.was_helpful ? '#ecfdf5' : '#fef2f2', borderRadius: 6, marginBottom: 4, fontSize: '0.72rem' }}>
                        {f.was_helpful ? '👍 Positive' : '👎 Negative'} — {fmtTime(f.created_at)}
                      </div>
                    ))}
                  </div>
                )}

                {/* Predictions */}
                {caseDetail.predictions?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Student Predictions ({caseDetail.predictions.length})</div>
                    {caseDetail.predictions.map((p, i) => (
                      <div key={i} style={{ padding: '8px 10px', background: '#f8fafc', borderRadius: 6, marginBottom: 4, fontSize: '0.72rem' }}>
                        <div><strong>Step {p.step_number}</strong> — {p.student_urgency}</div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{p.student_diagnosis?.slice(0, 200)}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Agent patterns */}
                {caseDetail.agent_patterns?.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Agent Patterns ({caseDetail.agent_patterns.length})</div>
                    {caseDetail.agent_patterns.map((ap, i) => (
                      <div key={i} style={{ padding: '6px 10px', background: '#f5f3ff', borderRadius: 6, marginBottom: 4, fontSize: '0.72rem' }}>
                        <span style={{ fontWeight: 700 }}>{ap.agent_name}</span> — <span>{ap.pattern_type}</span> (confidence: {ap.confidence})
                        {ap.was_correct !== null && <span style={{ marginLeft: 6 }}>{ap.was_correct ? '✅' : '❌'}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderAgentMemory() {
    const agentNames = agentStats?.agents ? Object.keys(agentStats.agents) : [];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Agent stats cards */}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(agentNames.length, 1)}, 1fr)`, gap: 12 }}>
          {agentNames.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No agent patterns recorded yet</div>
          ) : agentNames.map(name => {
            const s = agentStats.agents[name];
            return (
              <div key={name} className="card">
                <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--purple)', marginBottom: 8 }}>{name}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.72rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Patterns</span><strong>{s.total_patterns}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Correct</span><strong style={{ color: 'var(--green)' }}>{s.correct}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Accuracy</span><strong style={{ color: s.accuracy >= 70 ? 'var(--green)' : s.accuracy >= 40 ? '#f59e0b' : 'var(--red)' }}>{s.accuracy !== null ? `${s.accuracy}%` : 'N/A'}</strong></div>
                  <div style={{ marginTop: 4 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>Types: </span>
                    {Object.entries(s.pattern_types || {}).map(([t, c]) => (
                      <span key={t} style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 4, background: '#f5f3ff', fontSize: '0.65rem', marginRight: 4 }}>{t} ({c})</span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="input" value={agentFilter} onChange={e => setAgentFilter(e.target.value)} style={{ width: 180, fontSize: '0.78rem' }}>
            <option value="">All Agents</option>
            {agentNames.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <select className="input" value={patternFilter} onChange={e => setPatternFilter(e.target.value)} style={{ width: 180, fontSize: '0.78rem' }}>
            <option value="">All Types</option>
            <option value="symptom_cluster">Symptom Cluster</option>
            <option value="diagnostic_rule">Diagnostic Rule</option>
            <option value="bias_detected">Bias Detected</option>
            <option value="guideline_ref">Guideline Reference</option>
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => loadTab('agents')}>↻ Refresh</button>
        </div>

        {/* Patterns table */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="inv-table">
            <thead>
              <tr><th>Agent</th><th>Type</th><th>Confidence</th><th>Correct?</th><th>Case</th><th>Created</th></tr>
            </thead>
            <tbody>
              {agentPatterns.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No patterns found</td></tr>
              ) : agentPatterns.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600, color: 'var(--purple)' }}>{p.agent_name}</td>
                  <td><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.68rem', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>{p.pattern_type}</span></td>
                  <td><strong>{(p.confidence * 100).toFixed(0)}%</strong></td>
                  <td>{p.was_correct === true ? '✅' : p.was_correct === false ? '❌' : '—'}</td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem' }}>{p.case_id?.slice(0, 12)}…</td>
                  <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtTime(p.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  function renderLearning() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Predictions */}
        <div className="card">
          <div className="card-title">Student Predictions ({predictions.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table">
              <thead>
                <tr><th>Student</th><th>Case</th><th>Step</th><th>Diagnosis</th><th>Urgency</th><th>Date</th></tr>
              </thead>
              <tbody>
                {predictions.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No predictions yet</td></tr>
                ) : predictions.map(p => (
                  <tr key={p.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{p.full_name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{p.username}</div>
                    </td>
                    <td style={{ fontSize: '0.72rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.chief_complaint}</td>
                    <td><span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700, background: p.step_number === 1 ? '#ecfeff' : p.step_number === 2 ? '#f5f3ff' : '#ecfdf5', color: p.step_number === 1 ? 'var(--cyan)' : p.step_number === 2 ? 'var(--purple)' : 'var(--green)' }}>Step {p.step_number}</span></td>
                    <td style={{ fontSize: '0.72rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.student_diagnosis?.slice(0, 120)}…</td>
                    <td><span style={{ fontWeight: 700, fontSize: '0.72rem', color: p.student_urgency === 'CRITICAL' ? 'var(--red)' : p.student_urgency === 'HIGH' ? '#f59e0b' : 'var(--green)' }}>{p.student_urgency}</span></td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtTime(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feedback */}
        <div className="card">
          <div className="card-title">Case Feedback ({feedback.length})</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table">
              <thead>
                <tr><th>User</th><th>Case</th><th>Rating</th><th>Date</th></tr>
              </thead>
              <tbody>
                {feedback.length === 0 ? (
                  <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No feedback yet</td></tr>
                ) : feedback.map(f => (
                  <tr key={f.id}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.78rem' }}>{f.full_name}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{f.username}</div>
                    </td>
                    <td style={{ fontSize: '0.72rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.chief_complaint}</td>
                    <td><span style={{ fontSize: '1rem' }}>{f.was_helpful ? '👍' : '👎'}</span></td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtTime(f.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderDRS() {
    if (!drsData || drsData.cases === 0) {
      return <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No DRS scores recorded yet. Cases must complete the pipeline first.</div>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {[
            ['Cases Scored', drsData.cases, 'var(--cyan)'],
            ['Average DRS', drsData.avg, 'var(--green)'],
            ['Min', drsData.min, '#f59e0b'],
            ['Max', drsData.max, 'var(--green)'],
            ['Distribution', `${drsData.distribution?.excellent_80_100 || 0} / ${drsData.distribution?.good_60_79 || 0} / ${drsData.distribution?.moderate_40_59 || 0} / ${drsData.distribution?.low_0_39 || 0}`, 'var(--text-primary)'],
          ].map(([label, val, color]) => (
            <div key={label} className="card" style={{ textAlign: 'center', padding: '16px 12px' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color }}>{typeof val === 'number' ? val : val}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Dimension averages */}
        <div className="card">
          <div className="card-title">Dimension Averages</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
            {Object.entries(drsData.dimension_avg || {}).map(([dim, avg]) => (
              <div key={dim} style={{ textAlign: 'center', padding: '12px 8px', background: '#f8fafc', borderRadius: 8 }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: avg >= 80 ? 'var(--green)' : avg >= 60 ? 'var(--cyan)' : '#f59e0b' }}>{avg}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{dim.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Per-case breakdown */}
        <div className="card">
          <div className="card-title">Case DRS Scores</div>
          <div style={{ overflowX: 'auto' }}>
            <table className="inv-table">
              <thead>
                <tr><th>Case</th><th>Overall</th><th>Strengths</th><th>Missed</th><th>Scored</th></tr>
              </thead>
              <tbody>
                {(drsData.cases_list || []).map(c => (
                  <tr key={c.case_id}>
                    <td style={{ fontWeight: 600, fontSize: '0.78rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.chief_complaint}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 8, background: '#e5e7eb', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${c.overall}%`, background: c.overall >= 80 ? 'var(--green)' : c.overall >= 60 ? '#f59e0b' : 'var(--red)', borderRadius: 999 }} />
                        </div>
                        <strong style={{ fontSize: '0.78rem', color: c.overall >= 80 ? 'var(--green)' : c.overall >= 60 ? '#f59e0b' : 'var(--red)' }}>{c.overall}</strong>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.72rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.strengths?.join(', ')?.slice(0, 80) || '—'}</td>
                    <td style={{ fontSize: '0.72rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--red)' }}>{c.missed?.join(', ')?.slice(0, 80) || '—'}</td>
                    <td style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{fmtTime(c.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  function renderDatabase() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Table selector */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {dbTables.map(t => (
            <button key={t.name} className={`btn btn-sm ${selectedTable === t.name ? 'btn-primary' : 'btn-outline'}`} onClick={() => setSelectedTable(t.name)} style={{ fontSize: '0.72rem' }}>
              {t.name} <span style={{ opacity: 0.6, marginLeft: 4 }}>({t.rows})</span>
            </button>
          ))}
        </div>

        {/* Table data */}
        {selectedTable && tableData && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700 }}>{selectedTable} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({tableData.total} rows)</span></div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input className="input" placeholder="Search..." value={tableSearch} onChange={e => setTableSearch(e.target.value)} onKeyDown={async (e) => {
                  if (e.key === 'Enter') {
                    const d = await getTableData(selectedTable, 0, 50, tableSearch);
                    setTableData(d);
                    setTablePage(0);
                  }
                }} style={{ width: 180, fontSize: '0.78rem' }} />
                <button className="btn btn-outline btn-sm" onClick={async () => {
                  const d = await getTableData(selectedTable, 0, 50, tableSearch);
                  setTableData(d);
                  setTablePage(0);
                }}>Search</button>
              </div>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: 500 }}>
              <table className="inv-table">
                <thead>
                  <tr>
                    {tableData.rows?.[0] && Object.keys(tableData.rows[0]).map(k => (
                      <th key={k} style={{ whiteSpace: 'nowrap' }}>{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows?.length === 0 ? (
                    <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>No data</td></tr>
                  ) : tableData.rows?.map((row, i) => (
                    <tr key={i}>
                      {Object.entries(row).map(([k, v]) => (
                        <td key={k} style={{ fontSize: '0.68rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: typeof v === 'number' ? 'var(--mono)' : 'inherit' }}>
                          {v === null ? <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>null</span> :
                            typeof v === 'boolean' ? (v ? '✅' : '❌') :
                            typeof v === 'string' && v.length > 80 ? v.slice(0, 80) + '…' :
                            String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div style={{ padding: '8px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Showing {tablePage * 50 + 1}–{Math.min((tablePage + 1) * 50, tableData.total)} of {tableData.total}</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn btn-outline btn-sm" disabled={tablePage === 0} onClick={async () => {
                  const newPage = tablePage - 1;
                  setTablePage(newPage);
                  const d = await getTableData(selectedTable, newPage * 50, 50, tableSearch);
                  setTableData(d);
                }}>← Prev</button>
                <button className="btn btn-outline btn-sm" disabled={(tablePage + 1) * 50 >= tableData.total} onClick={async () => {
                  const newPage = tablePage + 1;
                  setTablePage(newPage);
                  const d = await getTableData(selectedTable, newPage * 50, 50, tableSearch);
                  setTableData(d);
                }}>Next →</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderHealth() {
    if (!health) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* DB info */}
        <div className="card">
          <div className="card-title">Database</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              ['Size', health.database?.size_human],
              ['Driver', health.database?.driver],
              ['Total Rows', health.database?.total_rows],
              ['Tables', health.database?.total_tables],
            ].map(([label, val]) => (
              <div key={label} style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, textAlign: 'center' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cyan)' }}>{val}</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Table row counts */}
        <div className="card">
          <div className="card-title">Table Row Counts</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
            {Object.entries(health.database?.table_counts || {}).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#f8fafc', borderRadius: 6, fontSize: '0.78rem' }}>
                <span>{name}</span>
                <strong style={{ color: count > 0 ? 'var(--cyan)' : 'var(--text-muted)' }}>{count === -1 ? 'ERR' : count}</strong>
              </div>
            ))}
          </div>
        </div>

        {/* LLM status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-title">LLM Configuration</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Provider</span><strong>{health.llm?.provider}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>OpenAI</span><strong style={{ color: health.llm?.openai_configured ? 'var(--green)' : 'var(--red)' }}>{health.llm?.openai_configured ? '✅ Configured' : '❌ Not configured'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Groq</span><strong style={{ color: health.llm?.groq_configured ? 'var(--green)' : 'var(--red)' }}>{health.llm?.groq_configured ? '✅ Configured' : '❌ Not configured'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Ollama</span><strong style={{ color: health.llm?.ollama_running ? 'var(--green)' : 'var(--red)' }}>{health.llm?.ollama_running ? '✅ Running' : '❌ Not running'}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Demo Mode</span><strong style={{ color: health.llm?.demo_mode ? '#f59e0b' : 'var(--green)' }}>{health.llm?.demo_mode ? '⚠️ Active (no LLM)' : 'Off'}</strong></div>
            </div>
          </div>

          <div className="card">
            <div className="card-title">Runtime</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.78rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Python</span><strong>{health.runtime?.python_version}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Platform</span><strong>{health.runtime?.platform}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Hostname</span><strong>{health.runtime?.hostname}</strong></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Last Check</span><strong style={{ fontSize: '0.72rem' }}>{fmtTime(health.timestamp)}</strong></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.4rem' }}>🛡️</span> Superuser Dashboard
          </div>
          <div className="page-sub">Full system visibility — all databases, all agents, all data</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => loadTab(tab)}>↻ Refresh</button>
          <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Dashboard</button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 0', borderBottom: '1px solid #e5e7eb', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} className={`btn btn-sm ${tab === t.key ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(t.key)} style={{ fontSize: '0.72rem', whiteSpace: 'nowrap' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overview' && renderOverview()}
      {tab === 'users' && renderUsers()}
      {tab === 'cases' && renderCases()}
      {tab === 'agents' && renderAgentMemory()}
      {tab === 'learning' && renderLearning()}
      {tab === 'drs' && renderDRS()}
      {tab === 'database' && renderDatabase()}
      {tab === 'health' && renderHealth()}
    </div>
  );
}
