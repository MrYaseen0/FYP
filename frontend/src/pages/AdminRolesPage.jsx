import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminUsers } from '../api';

const ROLE_PERMISSIONS = {
  admin: {
    label: 'System Administrator',
    color: '#ef4444',
    permissions: [
      'User Management', 'Role Assignment', 'System Settings',
      'Audit Logs', 'View All Cases', 'View All Records',
      'Approve Registrations', 'Delete Users', 'Manage Departments',
    ],
  },
  doctor: {
    label: 'Doctor / Physician',
    color: '#067857',
    permissions: [
      'View Assigned Patients', 'Create Medical Records', 'Write Prescriptions',
      'Order Lab Tests', 'Book Appointments', 'View Case Transcripts',
      'Send Messages', 'Create Clinical Notes',
    ],
  },
  user: {
    label: 'Patient',
    color: '#2563eb',
    permissions: [
      'View Own Records', 'View Own Appointments', 'View Own Prescriptions',
      'Log Health Metrics', 'Send Messages', 'View Billing',
      'Submit Cases',
    ],
  },
};

export default function AdminRolesPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const data = await getAdminUsers();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const roleCounts = { admin: 0, doctor: 0, user: 0 };
  users.forEach(u => { if (roleCounts[u.role] !== undefined) roleCounts[u.role]++; });

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Roles & Permissions</div>
          <div className="page-sub">Manage role-based access control</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/admin')}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {Object.entries(ROLE_PERMISSIONS).map(([key, role]) => (
          <div key={key} className="card" style={{ padding: 20, borderTop: `3px solid ${role.color}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: role.color }}>{role.label}</div>
              <div style={{
                minWidth: 28, height: 28, borderRadius: 14, background: `${role.color}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: role.color,
              }}>
                {roleCounts[key]}
              </div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--text-primary)' }}>Permissions:</div>
              {role.permissions.map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0' }}>
                  <span style={{ color: role.color, fontSize: '0.65rem' }}>●</span> {p}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{ padding: 20 }}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>User Role Distribution</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {Object.entries(ROLE_PERMISSIONS).map(([key, role]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 140, fontSize: '0.8rem', fontWeight: 600, color: role.color }}>{role.label}</div>
              <div style={{ flex: 1, background: 'var(--border)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${users.length ? (roleCounts[key] / users.length) * 100 : 0}%`,
                  background: role.color, height: '100%', borderRadius: 6, transition: 'width 0.3s',
                }} />
              </div>
              <div style={{ width: 40, textAlign: 'right', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {roleCounts[key]}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
