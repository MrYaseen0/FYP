import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createCase } from '../api';
import AutocompleteInput from '../components/AutocompleteInput';
import { DICT_MAP } from '../data/medicalDict';

const EMPTY = {
  chief_complaint:'', onset:'', duration:'', severity:5,
  associated_symptoms:'', past_medical_history:'', current_medications:'', allergies:''
};

const ATTACHMENT_TYPES = [
  { value: 'ecg', label: 'ECG / EKG', icon: '💓', desc: 'Electrocardiogram strips or images' },
  { value: 'xray', label: 'X-ray / Imaging', icon: '🩻', desc: 'Radiographs, CT scans, MRI' },
  { value: 'lab_report', label: 'Lab Report', icon: '🧪', desc: 'Blood work, cultures, pathology' },
  { value: 'photo', label: 'Clinical Photo', icon: '📷', desc: 'Physical examination photos' },
  { value: 'other', label: 'Other File', icon: '📎', desc: 'Any medical document or file' },
];

export default function PatientForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [attachmentType, setAttachmentType] = useState('other');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const pre = location.state?.prefill;
    if (pre) setForm({ ...EMPTY, ...pre });
  }, [location.state]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5));
  };

  const removeFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.chief_complaint.trim()) { setError('Chief complaint is required.'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await createCase({ ...form, severity: Number(form.severity) });
      // Upload attachments if any were selected
      if (selectedFiles.length > 0) {
        try {
          const { multimodalAPI } = await import('../api');
          await multimodalAPI.uploadAttachments(res.case_id, selectedFiles, attachmentType);
        } catch { /* image upload failure is non-fatal */ }
      }
      navigate(`/cases/${res.case_id}`);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to submit. Is the backend running?');
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">New Case Submission</div>
          <div className="page-sub">Submit a clinical case for multi-agent analysis.</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back</button>
      </div>

      <form onSubmit={submit}>
        <div className="card">
          <div className="card-title">Patient Presentation</div>

          {error && (
            <div style={{background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'var(--r-md)',padding:'10px 14px',fontSize:'0.82rem',color:'#dc2626',marginBottom:16}}>
              ⚠ {error}
            </div>
          )}

          <div className="form-grid">
            {/* Chief Complaint */}
            <div>
              <label className="form-label">Chief Complaint *</label>
              <AutocompleteInput
                value={form.chief_complaint}
                onChange={v => set('chief_complaint', v)}
                suggestions={DICT_MAP.chief_complaint}
                placeholder="e.g. Crushing chest pain radiating to left arm"
                required
              />
            </div>

            {/* Onset + Duration */}
            <div className="form-grid form-grid-2">
              <div>
                <label className="form-label">Onset</label>
                <AutocompleteInput
                  value={form.onset}
                  onChange={v => set('onset', v)}
                  suggestions={DICT_MAP.onset}
                  placeholder="e.g. 2 hours ago"
                />
              </div>
              <div>
                <label className="form-label">Duration</label>
                <AutocompleteInput
                  value={form.duration}
                  onChange={v => set('duration', v)}
                  suggestions={DICT_MAP.duration}
                  placeholder="e.g. Ongoing"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="form-label">Severity: <span style={{color:'var(--cyan)',fontFamily:'var(--mono)'}}>{form.severity} / 10</span></label>
              <input type="range" min="1" max="10" value={form.severity}
                onChange={e => set('severity', e.target.value)}
                style={{width:'100%',accentColor:'var(--cyan)',cursor:'pointer'}} />
              <div className="flex justify-between text-xs text-muted" style={{marginTop:4}}>
                <span>Mild (1)</span><span>Moderate (5)</span><span>Severe (10)</span>
              </div>
            </div>

            {/* Associated Symptoms */}
            <div>
              <label className="form-label">Associated Symptoms</label>
              <AutocompleteInput
                multiline
                value={form.associated_symptoms}
                onChange={v => set('associated_symptoms', v)}
                suggestions={DICT_MAP.associated_symptoms}
                placeholder="e.g. Diaphoresis, nausea, shortness of breath"
              />
            </div>

            {/* PMH + Medications */}
            <div className="form-grid form-grid-2">
              <div>
                <label className="form-label">Past Medical History</label>
                <AutocompleteInput
                  multiline
                  value={form.past_medical_history}
                  onChange={v => set('past_medical_history', v)}
                  suggestions={DICT_MAP.past_medical_history}
                  placeholder="e.g. Hypertension, T2DM"
                />
              </div>
              <div>
                <label className="form-label">Current Medications</label>
                <AutocompleteInput
                  multiline
                  value={form.current_medications}
                  onChange={v => set('current_medications', v)}
                  suggestions={DICT_MAP.current_medications}
                  placeholder="e.g. Metformin 500mg BD"
                />
              </div>
            </div>

            {/* Allergies */}
            <div>
              <label className="form-label">Allergies</label>
              <AutocompleteInput
                value={form.allergies}
                onChange={v => set('allergies', v)}
                suggestions={DICT_MAP.allergies}
                placeholder="e.g. Penicillin — rash, None known"
              />
            </div>

            {/* ═══ Medical Image / File Upload ═══ */}
            <div>
              <label className="form-label">Medical Attachments (optional)</label>

              {/* Attachment type selector */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {ATTACHMENT_TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setAttachmentType(t.value)}
                    style={{
                      padding: '6px 12px', borderRadius: 8, fontSize: '0.75rem', fontWeight: 600,
                      border: `2px solid ${attachmentType === t.value ? 'var(--green)' : '#e5e7eb'}`,
                      background: attachmentType === t.value ? '#ecfdf5' : 'white',
                      color: attachmentType === t.value ? '#065f46' : '#6b7280',
                      cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginBottom: 8 }}>
                {ATTACHMENT_TYPES.find(t => t.value === attachmentType)?.desc}
              </div>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('medical-files-input').click()}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--green)' : '#d1d5db'}`,
                  borderRadius: 12, padding: '20px 24px', textAlign: 'center',
                  background: dragOver ? '#ecfdf5' : '#f9fafb',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              >
                <input
                  id="medical-files-input"
                  type="file"
                  accept="image/*,.pdf,.dcm"
                  multiple
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                {selectedFiles.length > 0 ? (
                  <div>
                    <div style={{ fontSize: '1.2rem', marginBottom: 8 }}>📎</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065f46', marginBottom: 8 }}>
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400, margin: '0 auto' }}>
                      {selectedFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 10px', background: 'white', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.78rem' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 250 }}>
                            <span style={{ marginRight: 6 }}>{f.type?.startsWith('image/') ? '🖼️' : '📄'}</span>
                            {f.name}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ color: '#9ca3af', fontSize: '0.68rem' }}>{(f.size / 1024).toFixed(0)} KB</span>
                            <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(i); }} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem' }}>✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFiles([]); }} style={{ marginTop: 8, color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline' }}>Clear all</button>
                  </div>
                ) : (
                  <div style={{ color: '#6b7280' }}>
                    <div style={{ fontSize: '1.4rem', marginBottom: 6 }}>📷</div>
                    <div style={{ fontSize: '0.85rem' }}>Drag & drop files here, or click to browse</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 4 }}>
                      ECG strips, X-rays, lab reports, clinical photos — Max 10MB each, up to 5 files
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-sm mt-md" style={{marginTop:20}}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? <><div className="spinner" style={{width:16,height:16,borderWidth:2}} /> Launching Agents…</> : '▶ Launch Agent Pipeline'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => { setForm(EMPTY); setSelectedFiles([]); }}>Clear</button>
          </div>
        </div>
      </form>
    </div>
  );
}
