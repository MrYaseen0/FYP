import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientAPI, doctorAPI, getCase, listCases } from '../api';

export default function PatientRecord() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const caseId = searchParams.get('case');

  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseMessages, setCaseMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caseLoading, setCaseLoading] = useState(false);
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (caseId) loadCase(caseId);
  }, [caseId]);

  async function loadData() {
    try {
      setLoading(true);
      const promises = isDoctor
        ? [doctorAPI.getProfile(), doctorAPI.getPatients(), doctorAPI.getAppointments(), doctorAPI.getPrescriptions(), doctorAPI.getCases()]
        : [patientAPI.getProfile(), patientAPI.getMedicalRecords(), patientAPI.getAppointments(), patientAPI.getPrescriptions(), patientAPI.getHealthMetrics()];

      const results = await Promise.allSettled(promises);
      if (results[0].status === 'fulfilled') setProfile(results[0].value);
      if (isDoctor) {
        if (results[2].status === 'fulfilled') setAppointments(results[2].value.appointments || []);
        if (results[3].status === 'fulfilled') setPrescriptions(results[3].value.prescriptions || []);
        if (results[4].status === 'fulfilled') setCases(results[4].value.cases || []);
      } else {
        if (results[1].status === 'fulfilled') setRecords(results[1].value.records || []);
        if (results[2].status === 'fulfilled') setAppointments(results[2].value.appointments || []);
        if (results[3].status === 'fulfilled') setPrescriptions(results[3].value.prescriptions || []);
        if (results[4].status === 'fulfilled') setMetrics(results[4].value.metrics || []);
      }
    } catch (err) {
      console.error('Failed to load patient record:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCase(id) {
    try {
      setCaseLoading(true);
      const data = await getCase(id);
      setSelectedCase(data);
      setCaseMessages(data.messages || []);
    } catch (err) {
      console.error('Failed to load case:', err);
    } finally {
      setCaseLoading(false);
    }
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  const userInfo = profile?.user || user;
  const stats = profile?.stats || {};

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Patient Record</div>
          <div className="page-sub">{userInfo?.full_name || 'Unknown Patient'}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              ['Appointments', stats.appointments || appointments.length, '#067857'],
              ['Records', stats.medical_records || records.length, '#2563eb'],
              ['Prescriptions', stats.prescriptions || prescriptions.length, '#7c3aed'],
            ].map(([label, count, color]) => (
              <div key={label} className="card" style={{ padding: 16, borderLeft: `3px solid ${color}` }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, color }}>{count}</div>
              </div>
            ))}
          </div>

          {/* Cases (doctor view) */}
          {isDoctor && cases.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-primary)' }}>Cases</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cases.slice(0, 5).map(c => (
                  <div
                    key={c.id}
                    style={{
                      padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)',
                      cursor: 'pointer', background: selectedCase?.id === c.id ? 'var(--cyan)10' : 'var(--bg-glass)',
                    }}
                    onClick={() => navigate(`/record?case=${c.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {c.title || `Case ${c.id?.slice(0, 8)}`}
                      </div>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: c.status === 'done' ? '#22c55e15' : c.status === 'running' ? '#06785715' : '#f59e0b15',
                        color: c.status === 'done' ? '#22c55e' : c.status === 'running' ? '#067857' : '#f59e0b',
                      }}>
                        {c.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Case Detail (when selected) */}
          {selectedCase && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  {selectedCase.title || `Case ${selectedCase.id?.slice(0, 8)}`}
                </div>
                <button className="btn btn-outline btn-sm" style={{ fontSize: '0.7rem' }} onClick={() => { setSelectedCase(null); setCaseMessages([]); }}>Close</button>
              </div>
              {selectedCase.description && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  {selectedCase.description}
                </div>
              )}
              {caseLoading ? (
                <div className="spinner" style={{ margin: '20px auto' }} />
              ) : caseMessages.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 400, overflowY: 'auto' }}>
                  {caseMessages.map(msg => (
                    <div key={msg.id} style={{
                      padding: '10px 14px', borderRadius: 8,
                      background: msg.agent_name ? '#f0f9ff' : '#f8fafc',
                      border: '1px solid var(--border)',
                    }}>
                      {msg.agent_name && (
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#067857', marginBottom: 4 }}>{msg.agent_name}</div>
                      )}
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>{msg.content}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No messages in this case yet.</div>
              )}
            </div>
          )}

          {/* Medical Records */}
          {records.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-primary)' }}>Medical Records</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {records.map(r => (
                  <div key={r.id} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: '#06785715', color: '#067857', marginRight: 8 }}>
                          {r.type}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{r.title}</span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.date}</span>
                    </div>
                    {r.description && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.4 }}>{r.description}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Health Metrics */}
          {metrics.length > 0 && (
            <div className="card" style={{ padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-primary)' }}>Health Metrics</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {metrics.slice(0, 6).map(m => (
                  <div key={m.id} style={{ padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{m.type?.replace('_', ' ')}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{m.value} <span style={{ fontSize: '0.7rem', fontWeight: 400 }}>{m.unit}</span></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Appointments */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-primary)' }}>Appointments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {appointments.slice(0, 5).map(a => (
                <div key={a.id} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{a.type}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{a.date} at {a.time}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isDoctor ? `Patient: ${a.patient_name}` : `Dr. ${a.doctor_name}`}
                  </div>
                </div>
              ))}
              {appointments.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No appointments</div>}
            </div>
          </div>

          {/* Prescriptions */}
          <div className="card" style={{ padding: 16 }}>
            <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 12, color: 'var(--text-primary)' }}>Prescriptions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {prescriptions.slice(0, 5).map(p => (
                <div key={p.id} style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-glass)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{p.medication}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{p.dosage} — {p.frequency}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {isDoctor ? `For: ${p.patient_name}` : `By: Dr. ${p.doctor_name}`}
                  </div>
                </div>
              ))}
              {prescriptions.length === 0 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No prescriptions</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
