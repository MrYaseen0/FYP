import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { clinicalAPI, doctorAPI } from '../api';

export default function LabOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [form, setForm] = useState({ patient_id: '', test_name: '', urgency: 'routine', clinical_indication: '', notes: '' });
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [ordersData, patientsData] = await Promise.allSettled([
        clinicalAPI.getLabOrders(),
        isDoctor ? doctorAPI.getPatients() : Promise.resolve({}),
      ]);
      if (ordersData.status === 'fulfilled') setOrders(ordersData.value.lab_orders || []);
      if (patientsData.status === 'fulfilled' && patientsData.value.patients) setPatients(patientsData.value.patients);
    } catch (err) {
      console.error('Failed to load lab orders:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.patient_id || !form.test_name.trim()) return;
    try {
      setSaving(true);
      await clinicalAPI.createLabOrder(form);
      setShowForm(false);
      setForm({ patient_id: '', test_name: '', urgency: 'routine', clinical_indication: '', notes: '' });
      await loadData();
    } catch (err) {
      console.error('Failed to create lab order:', err);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleStatus(orderId) {
    try {
      await clinicalAPI.updateLabOrderStatus(orderId);
      await loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  const filtered = orders.filter(o => {
    if (statusFilter !== 'all' && o.status !== statusFilter) return false;
    if (filter && !o.title?.toLowerCase().includes(filter.toLowerCase())) return false;
    return true;
  });

  const urgencyColors = { routine: '#067857', urgent: '#f59e0b', stat: '#ef4444' };
  const statusColors = { pending: '#f59e0b', completed: '#067857', active: '#2563eb' };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Lab Orders</div>
          <div className="page-sub">{orders.length} order{orders.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isDoctor && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Order'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>New Lab Order</div>
          <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label className="form-label">Patient *</label>
                <select className="form-input" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} required>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Urgency</label>
                <select className="form-input" value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))}>
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="stat">STAT</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Test Name *</label>
              <input className="form-input" value={form.test_name} onChange={e => setForm(f => ({ ...f, test_name: e.target.value }))} placeholder="e.g., Complete Blood Count, Lipid Panel..." required />
            </div>
            <div>
              <label className="form-label">Clinical Indication</label>
              <input className="form-input" value={form.clinical_indication} onChange={e => setForm(f => ({ ...f, clinical_indication: e.target.value }))} placeholder="Reason for test..." />
            </div>
            <div>
              <label className="form-label">Additional Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Fasting required, special instructions..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Submitting...' : 'Submit Order'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <input className="form-input" placeholder="Search tests..." value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 250 }} />
        <select className="form-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🔬</div>
          <div className="empty-state-text">No lab orders found</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', background: 'var(--bg-glass)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Test</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urgency</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                {isDoctor && <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{order.title}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{order.doctor_name || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    {(() => {
                      const desc = order.description || '';
                      const urg = desc.includes('URGENT') ? 'urgent' : desc.includes('STAT') ? 'stat' : 'routine';
                      return (
                        <span style={{
                          fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                          background: `${urgencyColors[urg]}15`,
                          color: urgencyColors[urg],
                        }}>
                          {urg.charAt(0).toUpperCase() + urg.slice(1)}
                        </span>
                      );
                    })()}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: `${statusColors[order.status] || '#666'}15`,
                      color: statusColors[order.status] || '#666',
                    }}>
                      {order.status || 'pending'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{order.date}</td>
                  {isDoctor && (
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button className="btn btn-outline btn-sm" style={{ fontSize: '0.7rem', padding: '4px 10px' }} onClick={() => handleToggleStatus(order.id)}>
                        {order.status === 'pending' ? 'Complete' : order.status === 'completed' ? 'Reactivate' : 'Reset'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
