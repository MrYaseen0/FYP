import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientAPI, doctorAPI } from '../api';

export default function AppointmentsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ patient_id: '', appointment_date: '', appointment_time: '', appointment_type: 'consultation', notes: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [apptData, patientData] = await Promise.allSettled([
        isDoctor ? doctorAPI.getAppointments() : patientAPI.getAppointments(),
        isDoctor ? doctorAPI.getPatients() : Promise.resolve(null),
      ]);
      if (apptData.status === 'fulfilled') setAppointments(apptData.value.appointments || []);
      if (patientData.status === 'fulfilled' && patientData.value) setPatients(patientData.value.patients || []);
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.patient_id || !form.appointment_date || !form.appointment_time) {
      setError('Patient, date, and time are required');
      return;
    }
    try {
      setSubmitting(true);
      await doctorAPI.createAppointment(form);
      setForm({ patient_id: '', appointment_date: '', appointment_time: '', appointment_type: 'consultation', notes: '' });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to book appointment');
    } finally {
      setSubmitting(false);
    }
  }

  const getStatusStyle = (status) => {
    const styles = {
      scheduled: { background: '#ecfeff', color: '#0891b2', border: '1px solid #a5f3fc' },
      completed: { background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0' },
      cancelled: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
      'no-show': { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' },
    };
    return styles[status] || { background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' };
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Appointments</div>
          <div className="page-sub">{appointments.length} appointment{appointments.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isDoctor && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Book Appointment'}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>Book New Appointment</div>
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
              <label className="form-label">Type</label>
              <select className="form-input" value={form.appointment_type} onChange={e => setForm(f => ({ ...f, appointment_type: e.target.value }))}>
                <option value="consultation">Consultation</option>
                <option value="follow_up">Follow-up</option>
                <option value="emergency">Emergency</option>
                <option value="telehealth">Telehealth</option>
              </select>
            </div>
            <div>
              <label className="form-label">Date *</label>
              <input type="date" className="form-input" value={form.appointment_date} onChange={e => setForm(f => ({ ...f, appointment_date: e.target.value }))} required />
            </div>
            <div>
              <label className="form-label">Time *</label>
              <input type="time" className="form-input" value={form.appointment_time} onChange={e => setForm(f => ({ ...f, appointment_time: e.target.value }))} required />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Booking...' : 'Book Appointment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {appointments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">No appointments scheduled</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {appointments.map(appt => {
            const d = new Date(appt.date);
            return (
              <div key={appt.id} className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 10,
                    background: '#f0f9ff', border: '1px solid #bae6fd',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <div style={{ fontSize: '0.6rem', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase' }}>
                      {d.toLocaleDateString('en-US', { month: 'short' })}
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0369a1' }}>
                      {d.getDate()}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                      {isDoctor ? appt.patient_name : `Dr. ${appt.doctor_name}`}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                      {appt.type} &middot; {appt.time}
                    </div>
                    {appt.notes && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {appt.notes}
                      </div>
                    )}
                  </div>
                  <span style={{
                    padding: '4px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                    ...getStatusStyle(appt.status),
                  }}>
                    {appt.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
