import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { listCases, getCase } from '../api';

export default function AgentLab() {
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseDetail, setCaseDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    try {
      setLoading(true);
      const data = await listCases(0, 20);
      setCases(data.cases || []);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCaseDetail(caseId) {
    try {
      setDetailLoading(true);
      const data = await getCase(caseId);
      setCaseDetail(data);
    } catch (err) {
      console.error('Failed to load case detail:', err);
    } finally {
      setDetailLoading(false);
    }
  }

  const handleSelectCase = (c) => {
    setSelectedCase(c);
    loadCaseDetail(c.case_id);
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Agent Lab</div>
          <div className="page-sub">Inspect agent transcripts and case processing details</div>
        </div>
        <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Cases List */}
        <div className="card">
          <div className="card-title">Cases ({cases.length})</div>
          {cases.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>No cases found</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {cases.map(c => (
                <div
                  key={c.case_id}
                  onClick={() => handleSelectCase(c)}
                  style={{
                    padding: '12px 14px', cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    background: selectedCase?.case_id === c.case_id ? '#f0f9ff' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                      {c.chief_complaint}
                    </div>
                    <span style={{
                      padding: '2px 6px', borderRadius: 999, fontSize: '0.6rem', fontWeight: 700,
                      textTransform: 'uppercase',
                      background: c.status === 'done' ? '#ecfdf5' : c.status === 'processing' ? '#ecfeff' : '#f3f4f6',
                      color: c.status === 'done' ? '#059669' : c.status === 'processing' ? '#0891b2' : '#6b7280',
                    }}>
                      {c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    {c.severity}/10 severity &middot; {c.onset || 'Unknown onset'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Case Detail */}
        <div className="card">
          <div className="card-title">Case Transcript</div>
          {!selectedCase ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              Select a case to view its agent transcript
            </div>
          ) : detailLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
          ) : !caseDetail ? (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No data available</div>
          ) : (
            <div style={{ maxHeight: 500, overflowY: 'auto' }}>
              {/* Case Info */}
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 8, marginBottom: 12 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Chief Complaint</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{caseDetail.chief_complaint}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                  Severity: {caseDetail.severity}/10 &middot; Onset: {caseDetail.onset || 'N/A'} &middot; Duration: {caseDetail.duration || 'N/A'}
                </div>
              </div>

              {/* Agent Messages */}
              {caseDetail.transcript && caseDetail.transcript.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {caseDetail.transcript.map((msg, i) => (
                    <div key={i} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 8, borderLeft: '3px solid var(--cyan)' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                        {msg.agent}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>
                  {caseDetail.status === 'processing' ? 'Pipeline still processing...' : 'No transcript available'}
                </div>
              )}

              {/* Summary */}
              {caseDetail.summary && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.72rem', color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
                    Final Summary
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {caseDetail.summary.summary_markdown}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
