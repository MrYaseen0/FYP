import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { healthAnalysisAPI } from '../api';

const RISK_COLORS = {
  low: { bg: '#ecfdf5', border: '#a7f3d0', color: '#065f46', icon: '✅' },
  moderate: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', icon: '⚠️' },
  high: { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', icon: '🔴' },
  critical: { bg: '#7f1d1d', border: '#991b1b', color: '#fef2f2', icon: '🚨' },
  unknown: { bg: '#f8fafc', border: '#e5e7eb', color: '#6b7280', icon: '❓' },
};

const STATUS_COLORS = {
  normal: '#065f46', borderline: '#92400e', high: '#dc2626', low: '#2563eb', critical: '#7f1d1d',
};

const FLAG_COLORS = { info: '#3b82f6', warning: '#f59e0b', critical: '#dc2626' };

const DOC_TYPES = {
  blood_test: { icon: '🩸', color: '#dc2626' },
  metabolic_panel: { icon: '🔬', color: '#06b6d4' },
  lipid_panel: { icon: '🫀', color: '#ef4444' },
  thyroid: { icon: '🦋', color: '#8b5cf6' },
  diabetes: { icon: '💉', color: '#f59e0b' },
  urine_test: { icon: '🧫', color: '#10b981' },
  ecg: { icon: '💓', color: '#ef4444' },
  chest_xray: { icon: '🩻', color: '#3b82f6' },
  dna_genetic: { icon: '🧬', color: '#8b5cf6' },
  hormone_panel: { icon: '⚗️', color: '#f97316' },
  coagulation: { icon: '🩹', color: '#dc2626' },
  cardiac_marker: { icon: '❤️', color: '#ef4444' },
  vitamin_mineral: { icon: '💊', color: '#10b981' },
  infectious_disease: { icon: '🦠', color: '#06b6d4' },
  imaging_other: { icon: '📋', color: '#6b7280' },
  unknown: { icon: '📄', color: '#9ca3af' },
};

function fmtTime(iso) { return iso ? new Date(iso).toLocaleString() : '—'; }
function fmtSize(bytes) { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`; }

export default function HealthAnalysisPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('upload'); // upload | history
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [historyDetail, setHistoryDetail] = useState(null);

  const loadHistory = useCallback(async (page = 0) => {
    try {
      const res = await healthAnalysisAPI.getAnalyses(page * 20, 20);
      setHistory(res.analyses || []);
      setHistoryTotal(res.total || 0);
      setHistoryPage(page);
    } catch (err) {
      console.error('Failed to load history:', err);
    }
  }, []);

  useEffect(() => { if (tab === 'history') loadHistory(); }, [tab, loadHistory]);

  const handleFileSelect = (e) => {
    const f = e.target.files?.[0];
    if (f) { setSelectedFile(f); setAnalysis(null); setError(''); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) { setSelectedFile(f); setAnalysis(null); setError(''); }
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true); setError('');
    try {
      const result = await healthAnalysisAPI.analyze(selectedFile);
      setAnalysis(result);
    } catch (err) {
      setError(err?.response?.data?.detail || 'Analysis failed. Please try again.');
    } finally { setAnalyzing(false); }
  };

  const handleViewHistory = async (id) => {
    try {
      const res = await healthAnalysisAPI.getAnalysis(id);
      setHistoryDetail(res.analysis);
      setSelectedHistory(id);
    } catch (err) { console.error(err); }
  };

  const handleDeleteHistory = async (id) => {
    if (!confirm('Delete this analysis?')) return;
    try {
      await healthAnalysisAPI.deleteAnalysis(id);
      loadHistory(historyPage);
      if (selectedHistory === id) { setSelectedHistory(null); setHistoryDetail(null); }
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1.3rem' }}>🩺</span> Health Document Analysis
          </div>
          <div className="page-sub">Upload any medical test — our AI will analyze it and give you clear health insights</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${tab === 'upload' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('upload')}>📤 Upload</button>
          <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab('history')}>📋 History ({historyTotal})</button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          UPLOAD TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Supported types info */}
          <div className="card" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 100%)' }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 10, color: '#065f46' }}>📋 Supported Documents</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {Object.entries(DOC_TYPES).filter(([k]) => k !== 'unknown').map(([k, v]) => (
                <span key={k} style={{ padding: '3px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 600, background: 'white', border: '1px solid #e5e7eb', color: v.color }}>
                  {v.icon} {k.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 8 }}>
              System auto-detects the document type. Accepts images (JPEG, PNG) and PDFs up to 15MB.
            </div>
          </div>

          {/* Upload zone */}
          <div className="card">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => !analyzing && document.getElementById('health-file-input').click()}
              style={{
                border: `3px dashed ${dragOver ? '#067857' : analyzing ? '#d1d5db' : '#c0c0c0'}`,
                borderRadius: 16, padding: '40px 32px', textAlign: 'center',
                background: dragOver ? '#ecfdf5' : analyzing ? '#f9fafb' : '#fafafa',
                cursor: analyzing ? 'default' : 'pointer',
                transition: 'all 0.3s',
              }}
            >
              <input id="health-file-input" type="file" accept="image/*,.pdf" style={{ display: 'none' }}
                onChange={handleFileSelect} disabled={analyzing} />

              {analyzing ? (
                <div>
                  <div style={{ fontSize: '2.5rem', marginBottom: 12, animation: 'pulse 1.5s infinite' }}>🔬</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#065f46', marginBottom: 6 }}>Analyzing your document...</div>
                  <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>AI is detecting document type and performing deep analysis</div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 6 }}>
                    {[0, 1, 2, 3, 4].map(i => (
                      <div key={i} style={{
                        width: 8, height: 8, borderRadius: 999, background: '#067857',
                        animation: `bounce 1.4s ${i * 0.16}s infinite ease-in-out`,
                      }} />
                    ))}
                  </div>
                  <style>{`
                    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
                    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
                  `}</style>
                </div>
              ) : selectedFile ? (
                <div>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📄</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: 12 }}>{fmtSize(selectedFile.size)} · {selectedFile.type || 'Unknown type'}</div>
                  <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setAnalysis(null); }}
                    style={{ fontSize: '0.78rem', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
                    Remove and choose different file
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: '3rem', marginBottom: 12 }}>🩺</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                    Upload Your Medical Document
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#6b7280', marginBottom: 16, lineHeight: 1.6 }}>
                    Drag & drop or click to upload blood tests, urine analysis,<br/>
                    ECG, X-rays, DNA reports, hormone panels, and more
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 12, fontSize: '0.78rem', color: '#9ca3af' }}>
                    <span>📷 Images</span><span>📄 PDF</span><span>📦 Max 15MB</span>
                  </div>
                </div>
              )}
            </div>

            {/* Analyze button */}
            {selectedFile && !analyzing && (
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <button onClick={handleAnalyze} className="btn btn-primary" style={{ padding: '12px 40px', fontSize: '1rem' }}>
                  🔍 Analyze Document
                </button>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ marginTop: 12, padding: '12px 16px', background: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.85rem' }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* ═══ ANALYSIS RESULTS ═══ */}
          {analysis && <AnalysisResults analysis={analysis} />}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          HISTORY TAB
          ═══════════════════════════════════════════════════════════════════ */}
      {tab === 'history' && (
        <div style={{ display: 'grid', gridTemplateColumns: historyDetail ? '380px 1fr' : '1fr', gap: 20, alignItems: 'start' }}>
          {/* History list */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: '0.85rem' }}>
              Past Analyses ({historyTotal})
            </div>
            <div style={{ maxHeight: 600, overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
                  <div>No analyses yet. Upload a document to get started!</div>
                </div>
              ) : history.map(a => {
                const dc = DOC_TYPES[a.detected_type] || DOC_TYPES.unknown;
                const rc = RISK_COLORS[a.risk_level] || RISK_COLORS.unknown;
                return (
                  <div key={a.id}
                    onClick={() => handleViewHistory(a.id)}
                    style={{
                      padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
                      background: selectedHistory === a.id ? '#ecfdf5' : 'white',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => { if (selectedHistory !== a.id) e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (selectedHistory !== a.id) e.currentTarget.style.background = 'white'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: '1.1rem' }}>{dc.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{a.type_label || a.detected_type?.replace(/_/g, ' ')}</div>
                        <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>{a.original_filename}</div>
                      </div>
                      <span style={{ padding: '2px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, background: rc.bg, color: rc.color, border: `1px solid ${rc.border}` }}>
                        {rc.icon} {a.risk_level}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{fmtTime(a.created_at)}</div>
                  </div>
                );
              })}
            </div>
            {/* Pagination */}
            {historyTotal > 20 && (
              <div style={{ padding: '8px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                <button className="btn btn-outline btn-sm" disabled={historyPage === 0} onClick={() => loadHistory(historyPage - 1)}>← Prev</button>
                <span style={{ color: '#9ca3af' }}>Page {historyPage + 1} of {Math.ceil(historyTotal / 20)}</span>
                <button className="btn btn-outline btn-sm" disabled={(historyPage + 1) * 20 >= historyTotal} onClick={() => loadHistory(historyPage + 1)}>Next →</button>
              </div>
            )}
          </div>

          {/* Detail view */}
          {historyDetail ? (
            <AnalysisResults analysis={historyDetail} onDelete={() => handleDeleteHistory(selectedHistory)} />
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>👈</div>
              <div style={{ fontSize: '1rem' }}>Select an analysis to view details</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   ANALYSIS RESULTS COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
function AnalysisResults({ analysis, onDelete }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (k) => setExpanded(prev => ({ ...prev, [k]: !prev[k] }));

  const risk = analysis.risk_level || 'unknown';
  const rc = RISK_COLORS[risk] || RISK_COLORS.unknown;
  const findings = analysis.key_findings || [];
  const recs = analysis.recommendations || [];
  const flags = analysis.flags || [];
  const riskData = analysis.analysis?.risk_assessment || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Detected type banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, #ecfdf5 0%, #f0f9ff 100%)', padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '2rem' }}>{analysis.detected_type_icon || '📋'}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#1f2937' }}>{analysis.detected_type_label || analysis.detected_type?.replace(/_/g, ' ')}</div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              Subtype: {analysis.detected_subtype || 'general'} · File: {analysis.filename} ({fmtSize(analysis.file_size)})
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span style={{ padding: '6px 16px', borderRadius: 999, fontSize: '0.82rem', fontWeight: 700, background: rc.bg, color: rc.color, border: `2px solid ${rc.border}` }}>
              {rc.icon} Risk: {risk.charAt(0).toUpperCase() + risk.slice(1)}
              {analysis.risk_score != null && ` (${analysis.risk_score}/100)`}
            </span>
          </div>
        </div>
      </div>

      {/* Overall health message */}
      {analysis.overall_health_message && (
        <div className="card" style={{ borderLeft: '4px solid #067857', background: '#f0fdf4' }}>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#065f46', marginBottom: 6 }}>💬 Health Summary</div>
          <div style={{ fontSize: '0.9rem', lineHeight: 1.7, color: '#1f2937', whiteSpace: 'pre-wrap' }}>{analysis.overall_health_message}</div>
        </div>
      )}

      {/* Patient Summary */}
      {analysis.summary && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 8, color: '#1f2937' }}>📝 Detailed Summary</div>
          <div style={{ fontSize: '0.85rem', lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>{analysis.summary}</div>
        </div>
      )}

      {/* Critical Flags */}
      {flags.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            🚩 Alerts & Flags ({flags.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {flags.map((f, i) => (
              <div key={i} style={{ padding: '10px 16px', borderBottom: i < flags.length - 1 ? '1px solid #f3f4f6' : 'none', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1rem', marginTop: 1 }}>{f.severity === 'critical' ? '🚨' : f.severity === 'warning' ? '⚠️' : 'ℹ️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: FLAG_COLORS[f.severity] || '#6b7280' }}>{f.message}</div>
                  {f.action && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>→ {f.action}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Key Findings */}
      {findings.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
            🔬 Key Findings ({findings.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>Parameter</th>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>Value</th>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>Reference</th>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '8px 16px', textAlign: 'left', fontWeight: 600 }}>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {findings.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 16px', fontWeight: 600 }}>{f.parameter}</td>
                    <td style={{ padding: '8px 16px', fontFamily: 'var(--mono, monospace)' }}>{f.value}</td>
                    <td style={{ padding: '8px 16px', color: '#6b7280', fontSize: '0.75rem' }}>{f.reference_range}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                        background: f.status === 'normal' ? '#ecfdf5' : f.status === 'critical' ? '#7f1d1d' : '#fef2f2',
                        color: STATUS_COLORS[f.status] || '#6b7280',
                      }}>{f.status}</span>
                    </td>
                    <td style={{ padding: '8px 16px', color: '#6b7280', fontSize: '0.75rem', maxWidth: 250 }}>{f.explanation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recs.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: 12, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
            💡 Recommendations ({recs.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recs.map((r, i) => (
              <div key={i} style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, borderLeft: `4px solid ${r.priority === 'urgent' ? '#dc2626' : r.priority === 'high' ? '#f59e0b' : r.priority === 'medium' ? '#3b82f6' : '#10b981'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', background: r.priority === 'urgent' ? '#fef2f2' : r.priority === 'high' ? '#fffbeb' : '#eff6ff', color: r.priority === 'urgent' ? '#dc2626' : r.priority === 'high' ? '#92400e' : '#1d4ed8' }}>
                    {r.priority}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase' }}>{r.category}</span>
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1f2937', marginBottom: 2 }}>{r.recommendation}</div>
                {r.reasoning && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{r.reasoning}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Follow-up timeline */}
      {analysis.follow_up_timeline && (
        <div className="card" style={{ textAlign: 'center', padding: '16px 20px' }}>
          <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>📅 Recommended Follow-up</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#065f47', marginTop: 4 }}>{analysis.follow_up_timeline}</div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#9ca3af', lineHeight: 1.5 }}>
        <strong>⚠ Disclaimer:</strong> This analysis is for educational purposes only and does not constitute medical advice, diagnosis, or treatment. 
        Always consult a qualified healthcare provider for medical decisions. AI analysis may not capture all relevant clinical context.
      </div>

      {/* Delete button (for history view) */}
      {onDelete && (
        <div style={{ textAlign: 'center' }}>
          <button onClick={onDelete} className="btn btn-outline btn-sm" style={{ color: '#ef4444', borderColor: '#fecaca' }}>🗑 Delete this analysis</button>
        </div>
      )}
    </div>
  );
}
