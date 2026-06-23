import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers, getPendingUsers, approveUser, rejectUser, changeUserRole } from '../api';

export default function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [allUsers, pendingUsers] = await Promise.allSettled([
        getAdminUsers(),
        getPendingUsers(),
      ]);
      if (allUsers.status === 'fulfilled') setUsers(allUsers.value.users || []);
      if (pendingUsers.status === 'fulfilled') setPending(pendingUsers.value.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(username) {
    try {
      await approveUser(username);
      loadData();
    } catch (err) {
      console.error('Failed to approve:', err);
    }
  }

  async function handleReject(username) {
    try {
      await rejectUser(username);
      loadData();
    } catch (err) {
      console.error('Failed to reject:', err);
    }
  }

  async function handleRoleChange(username, role) {
    try {
      await changeUserRole(username, role);
      loadData();
    } catch (err) {
      console.error('Failed to change role:', err);
    }
  }

  const displayedUsers = tab === 'pending' ? pending : users;

  const getStatusStyle = (status) => {
    const styles = {
      approved: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
      pending: { background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' },
      rejected: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    };
    return styles[status] || styles.pending;
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Users & Accounts</div>
          <div className="page-sub">{users.length} total users &middot; {pending.length} pending approval</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['all', 'pending'].map(t => (
          <button
            key={t}
            className={`btn btn-sm ${tab === t ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setTab(t)}
          >
            {t === 'all' ? `All Users (${users.length})` : `Pending (${pending.length})`}
          </button>
        ))}
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <table className="inv-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 20 }}>No users found</td>
                </tr>
              ) : displayedUsers.map(u => (
                <tr key={u.user_id || u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0891b2, #7c3aed)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, color: '#fff',
                      }}>
                        {u.avatar || u.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{u.full_name}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.78rem' }}>{u.email}</td>
                  <td>
                    <select
                      className="form-input"
                      style={{ width: 'auto', padding: '4px 8px', fontSize: '0.75rem' }}
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.username, e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="doctor">Doctor</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <span style={{
                      padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                      textTransform: 'uppercase', ...getStatusStyle(u.status),
                    }}>
                      {u.status}
                    </span>
                  </td>
                  <td>
                    {u.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => handleApprove(u.username)}>Approve</button>
                        <button className="btn btn-sm btn-danger" onClick={() => handleReject(u.username)}>Reject</button>
                      </div>
                    )}
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
