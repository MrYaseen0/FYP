import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientAPI, doctorAPI } from '../api';

export default function PrescriptionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ patient_id: '', medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [rxData, patientData] = await Promise.allSettled([
        isDoctor ? doctorAPI.getPrescriptions() : patientAPI.getPrescriptions(),
        isDoctor ? doctorAPI.getPatients() : Promise.resolve(null),
      ]);
      if (rxData.status === 'fulfilled') setPrescriptions(rxData.value.prescriptions || []);
      if (patientData.status === 'fulfilled' && patientData.value) setPatients(patientData.value.patients || []);
    } catch (err) {
      console.error('Failed to load prescriptions:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.patient_id || !form.medication_name) {
      setError('Patient and medication name are required');
      return;
    }
    try {
      setSubmitting(true);
      await doctorAPI.createPrescription(form);
      setForm({ patient_id: '', medication_name: '', dosage: '', frequency: '', duration: '', instructions: '' });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusStyle = (status) => {
    const styles = {
      active: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
      completed: { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' },
      discontinued: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    };
    return styles[status] || styles.active;
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Prescriptions</div>
          <div className="page-sub">{prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isDoctor && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Prescription'}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>Create New Prescription</div>
          {error && <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label className="form-label">Patient *</label>
              <select className="form-input" value={form.patient_id} onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))} required>
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Medication Name *</label>
              <input className="form-input" value={form.medication_name} onChange={e => setForm(f => ({ ...f, medication_name: e.target.value }))} placeholder="e.g. Amoxicillin" required />
            </div>
            <div>
              <label className="form-label">Dosage</label>
              <input className="form-input" value={form.dosage} onChange={e => setForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" />
            </div>
            <div>
              <label className="form-label">Frequency</label>
              <input className="form-input" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))} placeholder="e.g. Twice daily" />
            </div>
            <div>
              <label className="form-label">Duration</label>
              <input className="form-input" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 7 days" />
            </div>
            <div>
              <label className="form-label">Instructions</label>
              <input className="form-input" value={form.instructions} onChange={e => setForm(f => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Take with food" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Prescription'}
              </button>
            </div>
          </form>
        </div>
      )}

      {prescriptions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💊</div>
          <div className="empty-state-text">No prescriptions</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {prescriptions.map(rx => (
            <div key={rx.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 10,
                  background: '#fef3c7', border: '1px solid #fde68a',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.2rem', flexShrink: 0,
                }}>
                  💊
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {rx.medication}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                    {rx.dosage} &middot; {rx.frequency} &middot; {rx.duration}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {isDoctor ? `Prescribed to ${rx.patient_name}` : `Prescribed by ${rx.doctor_name}`} on {rx.prescribed_date}
                  </div>
                  {rx.instructions && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                      {rx.instructions}
                    </div>
                  )}
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                  ...getStatusStyle(rx.status),
                }}>
                  {rx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
