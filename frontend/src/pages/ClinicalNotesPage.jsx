import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clinicalAPI, doctorAPI } from '../api';

export default function ClinicalNotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [patients, setPatients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ patient_id: '', title: '', content: '', note_type: 'progress_note' });
  const [filter, setFilter] = useState('');
  const isDoctor = user?.role === 'doctor' || user?.role === 'admin';

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [notesData, patientsData] = await Promise.allSettled([
        clinicalAPI.getNotes(),
        isDoctor ? doctorAPI.getPatients() : Promise.resolve({}),
      ]);
      if (notesData.status === 'fulfilled') setNotes(notesData.value.notes || []);
      if (patientsData.status === 'fulfilled' && patientsData.value.patients) setPatients(patientsData.value.patients);
    } catch (err) {
      console.error('Failed to load clinical notes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.patient_id || !form.title.trim()) return;
    try {
      setSaving(true);
      await clinicalAPI.createNote(form);
      setShowForm(false);
      setForm({ patient_id: '', title: '', content: '', note_type: 'progress_note' });
      await loadData();
    } catch (err) {
      console.error('Failed to create note:', err);
    } finally {
      setSaving(false);
    }
  }

  const filtered = notes.filter(n =>
    !filter || n.title?.toLowerCase().includes(filter.toLowerCase()) || n.type?.includes(filter)
  );

  const typeColors = { progress_note: '#067857', soap_note: '#2563eb', discharge_summary: '#7c3aed' };
  const typeLabels = { progress_note: 'Progress Note', soap_note: 'SOAP Note', discharge_summary: 'Discharge Summary' };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Clinical Notes</div>
          <div className="page-sub">{notes.length} note{notes.length !== 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isDoctor && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Note'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>New Clinical Note</div>
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
                <label className="form-label">Note Type</label>
                <select className="form-input" value={form.note_type} onChange={e => setForm(f => ({ ...f, note_type: e.target.value }))}>
                  <option value="progress_note">Progress Note</option>
                  <option value="soap_note">SOAP Note</option>
                  <option value="discharge_summary">Discharge Summary</option>
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Note title..." required />
            </div>
            <div>
              <label className="form-label">Content</label>
              <textarea className="form-input" rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Clinical notes..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Saving...' : 'Save Note'}</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <input className="form-input" placeholder="Search notes..." value={filter} onChange={e => setFilter(e.target.value)} style={{ maxWidth: 300 }} />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📝</div>
          <div className="empty-state-text">No clinical notes found</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(note => (
            <div key={note.id} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                      background: `${typeColors[note.type] || '#666'}15`, color: typeColors[note.type] || '#666',
                      border: `1px solid ${typeColors[note.type] || '#666'}30`,
                    }}>
                      {typeLabels[note.type] || note.type}
                    </span>
                    {note.status && (
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{note.status}</span>
                    )}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                    {note.title}
                  </div>
                  {note.description && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 60, overflow: 'hidden' }}>
                      {note.description}
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{note.date}</div>
                  {note.doctor_name && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--cyan)', marginTop: 2 }}>Dr. {note.doctor_name}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
