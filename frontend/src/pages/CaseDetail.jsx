import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Tree from 'react-d3-tree';
import { getCase, rerunCase, multimodalAPI } from '../api';
import RadialOrbitalTimeline, { Icons } from '../components/RadialOrbitalTimeline';
import DRSDisplay from '../components/DRSDisplay';
import SocraticGate from '../components/SocraticGate';
import './CaseDetail.css';

function fmtId(id='') { return `#HLT-${id.replace(/-/g,'').slice(0,6).toUpperCase()}`; }

const AGENTS = {
  'Intake_Agent':        { label:'Intake',        sub:'Structured data extraction',   color:'#3b82f6', icon: Icons.FileText },
  'General_Practitioner':{ label:'GP',            sub:'Triage and routing',           color:'#10b981', icon: Icons.Stethoscope },
  'GP_Agent':            { label:'GP',            sub:'Triage and routing',           color:'#10b981', icon: Icons.Stethoscope },
  'Cardiologist':        { label:'Cardiologist',  sub:'Cardiovascular analysis',      color:'#ef4444', icon: Icons.Heart },
  'Neurologist':         { label:'Neurologist',   sub:'Neurological assessment',      color:'#8b5cf6', icon: Icons.Brain },
  'Pulmonologist':       { label:'Pulmonologist', sub:'Respiratory evaluation',       color:'#06b6d4', icon: Icons.Flask },
  'Pathologist':         { label:'Pathologist',   sub:'Investigation planning',       color:'#f59e0b', icon: Icons.Microscope },
  'Summarizer':          { label:'Summarizer',    sub:'Final report synthesis',       color:'#f97316', icon: Icons.Clipboard },
};
const PIPELINE_ORDER = ['Intake_Agent','General_Practitioner','Cardiologist','Neurologist','Pulmonologist','Pathologist','Summarizer'];
function agentCfg(name) { return AGENTS[name] || { label: name, sub:'Analysis', color:'#94a3b8', icon: Icons.Flask }; }

function downloadFile(content, filename, type='text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
function downloadHTML(html, filename) {
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${filename}</title>
  <style>body{font-family:Inter,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1a1a2e;line-height:1.7}
  h1{font-size:1.8rem;border-bottom:2px solid #067857;padding-bottom:8px}
  h2{font-size:1.3rem;color:#067857;margin-top:24px}
  table{width:100%;border-collapse:collapse;margin:16px 0}th,td{padding:8px 12px;border:1px solid #e5e7eb;text-align:left;font-size:0.9rem}
  th{background:#f8fafc;font-weight:600;color:#374151}</style></head><body>${html}</body></html>`;
  downloadFile(fullHtml, filename, 'text/html');
}

/* ═══════════════════════════════════════════════════════════════════════════
   GOD-MOD COMPONENTS (ambient particles, waveform)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Ambient Particles — floating in background ──────────────────────────── */
function AmbientParticles({ count = 20, color = '#d1fae5' }) {
  const particles = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 10,
      opacity: 0.15 + Math.random() * 0.25,
    })), [count]);
  return (
    <div className="ambient-particles">
      {particles.map(p => (
        <div key={p.id} className="ambient-particle" style={{
          left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size,
          background: color, opacity: p.opacity,
          animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s`,
        }} />
      ))}
    </div>
  );
}

/* ── Waveform — thinking visualization ───────────────────────────────────── */
function Waveform({ color = '#067857', barCount = 24 }) {
  return (
    <div className="waveform" style={{ '--wf-color': color }}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div key={i} className="waveform-bar" style={{
          animationDelay: `${i * 0.05}s`,
          background: color,
        }} />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATTACHMENT UPLOAD COMPONENT (inline)
   ═══════════════════════════════════════════════════════════════════════════ */
const ATTACHMENT_TYPES_UPLOAD = [
  { value: 'ecg', label: 'ECG', icon: '💓' },
  { value: 'xray', label: 'X-ray', icon: '🩻' },
  { value: 'lab_report', label: 'Lab', icon: '🧪' },
  { value: 'photo', label: 'Photo', icon: '📷' },
  { value: 'other', label: 'Other', icon: '📎' },
];

function AttachmentUpload({ caseId, onUploaded }) {
  const [isOpen, setIsOpen] = useState(false);
  const [files, setFiles] = useState([]);
  const [attType, setAttType] = useState('other');
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async () => {
    if (!files.length) return;
    setUploading(true); setResult(null);
    try {
      const data = await multimodalAPI.uploadAttachments(caseId, files, attType);
      setResult(data);
      if (data.uploaded > 0) {
        // Notify parent with the first uploaded attachment's data
        const uploaded = data.results.find(r => r.status === 'uploaded');
        if (uploaded && onUploaded) {
          onUploaded({
            id: uploaded.id,
            case_id: caseId,
            attachment_type: attType,
            original_filename: uploaded.filename,
            file_size: uploaded.size,
            ai_findings: uploaded.ai_findings,
            mime_type: files[0]?.type || '',
          });
        }
        setFiles([]);
      }
    } catch (err) {
      setResult({ error: err?.response?.data?.detail || 'Upload failed' });
    } finally { setUploading(false); }
  };

  if (!isOpen) {
    return (
      <div className="cd-section" style={{ textAlign: 'center', padding: '12px 20px' }}>
        <button onClick={() => setIsOpen(true)} style={{ background: 'none', border: '1px dashed #d1d5db', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', color: '#6b7280', fontSize: '0.82rem', width: '100%' }}>
          📎 Add medical attachments (ECG, X-ray, lab report, photo)
        </button>
      </div>
    );
  }

  return (
    <div className="cd-section" style={{ border: '2px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>📎 Add Attachments</div>
        <button onClick={() => { setIsOpen(false); setResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#9ca3af' }}>✕</button>
      </div>

      {/* Type selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10, flexWrap: 'wrap' }}>
        {ATTACHMENT_TYPES_UPLOAD.map(t => (
          <button key={t.value} onClick={() => setAttType(t.value)} style={{
            padding: '4px 10px', borderRadius: 6, fontSize: '0.72rem', fontWeight: 600,
            border: `1.5px solid ${attType === t.value ? '#067857' : '#e5e7eb'}`,
            background: attType === t.value ? '#ecfdf5' : 'white',
            color: attType === t.value ? '#065f46' : '#6b7280', cursor: 'pointer',
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* File input */}
      <div style={{ border: '1px dashed #d1d5db', borderRadius: 8, padding: 12, textAlign: 'center', marginBottom: 10, cursor: 'pointer', background: '#fafafa' }}
        onClick={() => document.getElementById('att-upload-input').click()}>
        <input id="att-upload-input" type="file" accept="image/*,.pdf,.dcm" multiple style={{ display: 'none' }}
          onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} />
        {files.length > 0 ? (
          <div style={{ fontSize: '0.78rem', color: '#065f46' }}>{files.length} file{files.length > 1 ? 's' : ''} selected</div>
        ) : (
          <div style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Click to select files (max 5)</div>
        )}
      </div>

      {/* Upload button */}
      <button onClick={handleUpload} disabled={uploading || !files.length} style={{
        width: '100%', padding: '8px 16px', borderRadius: 8, border: 'none',
        background: uploading ? '#9ca3af' : '#067857', color: 'white',
        fontWeight: 600, fontSize: '0.82rem', cursor: uploading ? 'default' : 'pointer',
      }}>
        {uploading ? '⏳ Uploading & analyzing…' : `⬆ Upload ${files.length > 0 ? files.length + ' file' + (files.length > 1 ? 's' : '') : ''}`}
      </button>

      {/* Result */}
      {result && !result.error && (
        <div style={{ marginTop: 8, padding: 8, background: '#ecfdf5', borderRadius: 6, fontSize: '0.75rem', color: '#065f46' }}>
          ✓ {result.uploaded} uploaded{result.rejected > 0 ? `, ${result.rejected} rejected` : ''}
          {result.results?.map((r, i) => r.ai_findings && <div key={i} style={{ marginTop: 4, color: '#065f46' }}>🤖 {r.filename}: AI analysis complete</div>)}
        </div>
      )}
      {result?.error && (
        <div style={{ marginTop: 8, padding: 8, background: '#fef2f2', borderRadius: 6, fontSize: '0.75rem', color: '#991b1b' }}>⚠ {result.error}</div>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function CaseDetail() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [thinking, setThinking] = useState([]);
  const [rerunning, setRerunning] = useState(false);
  const [approved, setApproved] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState(null);
  const [downloadMenu, setDownloadMenu] = useState(false);
  const [selectedSections, setSelectedSections] = useState({ summary:true, transcript:true, investigations:true, patientInfo:true });
  const [feedback, setFeedback] = useState(null); // null | 'up' | 'down'
  const [unlockedSteps, setUnlockedSteps] = useState(1); // 1=Intake visible, 2=after GP guess, 3=all unlocked
  const [similarCases, setSimilarCases] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [expandedAttachment, setExpandedAttachment] = useState(null);
  const pollRef = useRef(null);
  const timerRefs = useRef([]);
  const endRef = useRef(null);

  const fetchCase = useCallback(async () => {
    try { const d = await getCase(caseId); setData(d); setError(''); }
    catch { setError('Could not load case.'); }
    finally { setLoading(false); }
  }, [caseId]);

  useEffect(() => { fetchCase(); pollRef.current = setInterval(fetchCase, 4000); return () => clearInterval(pollRef.current); }, [fetchCase]);
  useEffect(() => { if (data?.status === 'done' || data?.status === 'failed') { clearInterval(pollRef.current); timerRefs.current.forEach(clearTimeout); } }, [data?.status]);

  useEffect(() => {
    const isProc = data?.status === 'processing' || data?.status === 'pending';
    const hasReal = (data?.transcript?.length || 0) > 0;
    if (isProc && !hasReal && thinking.length === 0) {
      const steps = [
        {delay:1000,agent:'Intake_Agent',text:'Structuring patient symptoms and history…'},
        {delay:5000,agent:'General_Practitioner',text:'Triaging — identifying red flags…'},
        {delay:10000,agent:'Cardiologist',text:'Evaluating cardiovascular differentials…'},
        {delay:15000,agent:'Neurologist',text:'Assessing neurological picture…'},
        {delay:20000,agent:'Pulmonologist',text:'Reviewing respiratory presentation…'},
        {delay:25000,agent:'Pathologist',text:'Compiling investigation basket…'},
        {delay:32000,agent:'Summarizer',text:'Generating final report…'},
      ];
      steps.forEach(s => {
        const t = setTimeout(() => setThinking(prev => [...prev, s]), s.delay);
        timerRefs.current.push(t);
      });
    }
  }, [data?.status, data?.transcript?.length]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [data?.transcript?.length, thinking.length]);

  // Fetch similar cases when done
  useEffect(() => {
    if (caseId && data?.status === 'done') {
      import('../api').then(m => m.default.get(`/similarity/cases/${caseId}/similar`))
        .then(res => { if (res.data?.similar_cases) setSimilarCases(res.data.similar_cases); })
        .catch(() => {});
    }
  }, [caseId, data?.status]);

  // Fetch attachments when case loads
  useEffect(() => {
    if (caseId && data) {
      multimodalAPI.listAttachments(caseId)
        .then(res => { if (res?.attachments) setAttachments(res.attachments); })
        .catch(() => {});
    }
  }, [caseId, data?.status]);

  const handleRerun = async () => {
    setRerunning(true);
    try { await rerunCase(caseId); setThinking([]); timerRefs.current.forEach(clearTimeout); timerRefs.current = []; pollRef.current = setInterval(fetchCase, 4000); fetchCase(); }
    catch { setError('Re-run failed.'); }
    finally { setRerunning(false); }
  };

  const handleFeedback = async (wasHelpful) => {
    try {
      await import('../api').then(m => m.default.post(`/cases/${caseId}/feedback?was_helpful=${wasHelpful}`));
      setFeedback(wasHelpful ? 'up' : 'down');
    } catch { /* ignore */ }
  };

  const generateReportHTML = (sections = selectedSections) => {
    const d = data;
    let html = '<h1>Healtheon Clinical Analysis Report</h1>';
    html += `<p><strong>Case:</strong> ${fmtId(caseId)} &nbsp;|&nbsp; <strong>Date:</strong> ${new Date().toLocaleDateString()}</p>`;
    if (sections.patientInfo) {
      html += '<h2>Patient Information</h2><table>';
      ['chief_complaint','severity','onset','duration','associated_symptoms','past_medical_history','current_medications','allergies'].forEach(k => {
        html += `<tr><td><strong>${k.replace(/_/g,' ')}</strong></td><td>${d[k] || '-'}</td></tr>`;
      });
      html += '</table>';
    }
    if (sections.transcript && d.transcript?.length) {
      html += '<h2>Agent Conference Transcript</h2>';
      d.transcript.forEach(msg => { const cfg = agentCfg(msg.agent); html += `<div style="margin:16px 0;padding:12px;border-left:3px solid ${cfg.color}"><strong style="color:${cfg.color}">${cfg.label}</strong><br/><div style="margin-top:8px;white-space:pre-wrap">${msg.content||''}</div></div>`; });
    }
    if (sections.investigations && d.investigations?.length) {
      html += '<h2>Investigation Suggestions</h2><table><thead><tr><th>Test</th><th>Rationale</th><th>Urgency</th></tr></thead><tbody>';
      d.investigations.forEach(inv => { html += `<tr><td>${inv.test}</td><td>${inv.rationale}</td><td>${inv.urgency}</td></tr>`; });
      html += '</tbody></table>';
    }
    if (sections.summary && d.summary?.summary_markdown) { html += '<h2>Clinical Summary</h2><div style="white-space:pre-wrap">'+d.summary.summary_markdown+'</div>'; }
    html += `<hr/><p style="color:#94a3b8;font-size:0.8rem">Generated by Healtheon Multi-Agent Clinical AI System</p>`;
    return html;
  };
  const handleDownloadFull = () => { downloadHTML(generateReportHTML({summary:true,transcript:true,investigations:true,patientInfo:true}),`Healtheon-Report-${fmtId(caseId).replace('#','')}.html`); setDownloadMenu(false); };
  const handleDownloadCustom = () => { downloadHTML(generateReportHTML(selectedSections),`Healtheon-Report-${fmtId(caseId).replace('#','')}-custom.html`); setDownloadMenu(false); };
  const handleDownloadSection = (s) => { downloadHTML(generateReportHTML({summary:false,transcript:false,investigations:false,patientInfo:false,[s]:true}),`Healtheon-${s}-${fmtId(caseId).replace('#','')}.html`); };
  const handleFhirExport = async () => {
    try {
      const api = (await import('../api')).default;
      const resp = await api.get(`/fhir/cases/${caseId}/fhir-bundle`, { responseType: 'json' });
      const blob = new Blob([JSON.stringify(resp.data, null, 2)], { type: 'application/fhir+json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `healtheon-fhir-${caseId.slice(0,8)}.json`; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('FHIR export failed. Make sure the case is complete.'); }
    setDownloadMenu(false);
  };

  if (loading) return <div className="cd-loading"><div className="cd-loader-ring"><div /><div /><div /><div /></div><div>Loading case…</div></div>;
  if (error && !data) return <div className="cd-loading"><div style={{color:'#ef4444'}}>{error}</div><button className="btn btn-outline btn-sm" onClick={() => navigate('/')}>← Back</button></div>;

  const isProcessing = data?.status === 'processing' || data?.status === 'pending';
  const isDone = data?.status === 'done';
  const isFailed = data?.status === 'failed';
  const transcript = data?.transcript || [];
  const investigations = data?.investigations || [];
  const summary = data?.summary;
  const summaryText = summary?.summary_markdown || '';
  const displayMessages = transcript.length > 0 ? transcript : thinking.map((t,i) => ({ id:`th-${i}`, agent:t.agent, content:t.text, _thinking:true }));

  const completedCount = PIPELINE_ORDER.filter(n => transcript.some(m => m.agent === n)).length;
  const progressPct = (completedCount / PIPELINE_ORDER.length) * 100;
  const currentAgent = isProcessing ? (transcript.at(-1)?.agent || thinking.at(-1)?.agent) : null;
  const currentIdx = currentAgent ? PIPELINE_ORDER.indexOf(currentAgent) : -1;

  const agentData = PIPELINE_ORDER.map((name, i) => {
    const cfg = agentCfg(name);
    const spoke = transcript.some(m => m.agent === name);
    const active = currentAgent === name;
    const msg = transcript.find(m => m.agent === name);
    const status = spoke && !active ? 'completed' : active ? 'in-progress' : 'pending';
    const energy = spoke ? (active ? 75 : 100) : Math.max(10, 100 - i * 12);
    // Build relatedIds: previous and next agents
    const relatedIds = [];
    if (i > 0) relatedIds.push(i); // id is 1-based, index is 0-based → i = prev index, id = i (wait, timelineData ids are 1-based)
    if (i < PIPELINE_ORDER.length - 1) relatedIds.push(i + 2);
    return {
      id: i + 1,
      title: cfg.label,
      date: 'Pipeline',
      content: msg ? msg.content?.slice(0, 120) + (msg.content?.length > 120 ? '…' : '') : cfg.sub,
      category: cfg.sub,
      icon: cfg.icon,
      relatedIds,
      status,
      energy,
    };
  });

  return (
    <div className="cd-page">
      {/* Ambient background particles */}
      <AmbientParticles count={15} color="#d1fae5" />

      {/* Header */}
      <div className="cd-header">
        <div className="cd-header-left">
          <button className="cd-back-btn" onClick={() => navigate('/')}>←</button>
          <div>
            <div className="cd-case-title">Patient Case {fmtId(caseId)}</div>
            <div className="cd-case-meta">
              {data?.severity && <span>Severity {data.severity}/10</span>}
              {data?.onset && <span>Onset: {data.onset}</span>}
            </div>
          </div>
        </div>
        <div className="cd-header-right">
          <span className={`cd-status ${isDone?'done':isProcessing?'processing':isFailed?'failed':''}`}>
            {isDone?'✓ Complete':isProcessing?'⏳ Processing':isFailed?'✗ Failed':'⏳ Pending'}
          </span>
          <div className="cd-download-wrap">
            <button className="cd-download-btn" onClick={() => setDownloadMenu(!downloadMenu)}>⬇ Report</button>
            {downloadMenu && (
              <div className="cd-download-menu">
                <div className="cd-download-title">Download Options</div>
                <button onClick={handleDownloadFull}>📄 Full Report</button>
                <div className="cd-download-divider" />
                <div className="cd-download-subtitle">Select Sections:</div>
                {['patientInfo','transcript','investigations','summary'].map(s => (
                  <label key={s} className="cd-download-check">
                    <input type="checkbox" checked={selectedSections[s]} onChange={e => setSelectedSections(p => ({...p,[s]:e.target.checked}))} />
                    <span>{s==='patientInfo'?'Patient Info':s.charAt(0).toUpperCase()+s.slice(1)}</span>
                  </label>
                ))}
                <button onClick={handleDownloadCustom} className="cd-download-custom">⬇ Download Selected</button>
                <div className="cd-download-divider" />
                <div className="cd-download-subtitle">Quick Downloads:</div>
                <button onClick={() => handleDownloadSection('summary')}>📋 Summary</button>
                <button onClick={() => handleDownloadSection('investigations')}>🔬 Investigations</button>
                <button onClick={() => handleDownloadSection('transcript')}>💬 Transcript</button>
                <div className="cd-download-divider" />
                <div className="cd-download-subtitle">Standards Export:</div>
                <button onClick={handleFhirExport}>🏥 FHIR R4 Bundle (JSON)</button>
              </div>
            )}
          </div>
          <button className="cd-rerun-btn" onClick={handleRerun} disabled={rerunning || isProcessing}>
            {rerunning?'⏳':'↻'} Re-Run
          </button>
        </div>
      </div>

      <div className="cd-body">
        <div className="cd-main">

          {/* ═══ GOD-MOD PIPELINE ═══ */}
          <div className="god-pipeline">
            {/* Header */}
            <div className="god-header">
              <div className="god-header-left">
                <div className="god-pulse-orb" />
                <span className="god-title">Agent Pipeline</span>
              </div>
              {isProcessing && <span className="god-live-badge">LIVE</span>}
              {isDone && <span className="god-done-badge">COMPLETE</span>}
            </div>

            {/* Progress Bar */}
            <div className="god-progress">
              <div className="god-progress-track">
                <div className="god-progress-fill" style={{ width: `${progressPct}%` }} />
                <div className="god-progress-glow" style={{ width: `${progressPct}%` }} />
                {/* Agent markers on progress bar */}
                {agentData.map((a, i) => (
                  <div key={a.id} className={`god-progress-marker ${a.status === 'completed' ? 'done' : ''} ${a.status === 'in-progress' ? 'active' : ''}`}
                    style={{ left: `${(i / (PIPELINE_ORDER.length - 1)) * 100}%`, '--marker-color': agentCfg(PIPELINE_ORDER[i]).color }}>
                    <div className="god-progress-dot" />
                  </div>
                ))}
              </div>
            </div>

            {/* ── Orbital Agent Pipeline ── */}
            <div className="god-orbital-wrap">
              <RadialOrbitalTimeline timelineData={agentData} />
            </div>

            {/* Particle field */}
            <div className="god-particle-field">
              {Array.from({length:30}).map((_,i) => (
                <div key={i} className="god-float-particle" style={{
                  left: `${Math.random()*100}%`,
                  top: `${Math.random()*100}%`,
                  width: 2+Math.random()*3,
                  height: 2+Math.random()*3,
                  animationDuration: `${10+Math.random()*20}s`,
                  animationDelay: `${Math.random()*10}s`,
                  opacity: 0.15+Math.random()*0.15,
                }} />
              ))}
            </div>
          </div>

          {/* ═══ Agent Messages ═══ */}
          {(isDone || isProcessing) && (
          <div className="cd-transcript">
            {displayMessages.length === 0 && (
              <div className="cd-empty">
                <div className="cd-empty-icon">🔬</div>
                <div>Initializing pipeline…</div>
              </div>
            )}
            {displayMessages.map((msg, i) => {
              const cfg = agentCfg(msg.agent);
              const isLast = isProcessing && i === displayMessages.length - 1;
              const isExpanded = expandedAgent === i;
              const content = msg.content || '';
              const isLong = content.length > 300;

              // Multi-step Socratic gating: only show messages up to current unlock level
              if (isDone) {
                if (unlockedSteps === 1 && i > 0) return null;       // Only Intake visible
                if (unlockedSteps === 2 && i > 1) return null;       // Intake + GP visible
                // unlockedSteps === 3: show all
              }

              return (
                <div key={msg.id || i} className={`cd-message ${msg._thinking?'thinking':''} ${isLast?'active':''}`}>
                  <div className="cd-message-line" style={{ background: `linear-gradient(to bottom, ${cfg.color}, transparent)` }} />
                  <div className="cd-message-dot" style={{ background: cfg.color }} />
                  <div className="cd-message-card">
                    <div className="cd-message-header">
                      <div className="cd-message-icon-wrap" style={{ background: cfg.gradient }}>{cfg.icon}</div>
                      <span className="cd-message-name" style={{ color: cfg.color }}>{cfg.label}</span>
                      {isLast && !msg._thinking && <span className="cd-analyzing" style={{ '--pulse-color': cfg.color }}>ANALYZING</span>}
                    </div>
                    <div className="cd-message-body">
                      {msg._thinking ? (
                        <span className="cd-thinking-text"><Waveform color={cfg.color} barCount={16} /> {content}</span>
                      ) : (
                        <>
                          <div className={`cd-message-content ${isExpanded?'expanded':''}`}>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
                          </div>
                          {isLong && <button className="cd-expand-btn" onClick={() => setExpandedAgent(isExpanded?null:i)}>{isExpanded?'Show less ↑':'Show full response ↓'}</button>}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ═══ Socratic Gates ═══ */}
            {isDone && unlockedSteps === 1 && displayMessages.length > 0 && (
              <SocraticGate
                caseId={caseId}
                stepNumber={1}
                nextAiMessages={[displayMessages[0]]}
                onNextStep={() => setUnlockedSteps(2)}
              />
            )}
            {isDone && unlockedSteps === 2 && displayMessages.length > 1 && (
              <SocraticGate
                caseId={caseId}
                stepNumber={2}
                nextAiMessages={[displayMessages[1]]}
                onNextStep={() => setUnlockedSteps(3)}
              />
            )}

            <div ref={endRef} />
          </div>
          )}

          {/* Investigations */}
          {investigations.length > 0 && (
            <div className="cd-section">
              <div className="cd-section-header"><span>🔬</span><span>Investigation Suggestions</span><button className="cd-section-dl" onClick={() => handleDownloadSection('investigations')}>⬇</button></div>
              <div className="cd-investigations">
                {investigations.map((inv,i) => (
                  <div key={i} className="cd-inv-row"><div className="cd-inv-test">{inv.test}</div><div className="cd-inv-rationale">{inv.rationale}</div><span className={`cd-inv-urgency ${inv.urgency==='STAT'?'stat':''}`}>{inv.urgency}</span></div>
                ))}
              </div>
            </div>
          )}

          {/* ═══ Medical Attachments ═══ */}
          {attachments.length > 0 && (
            <div className="cd-section">
              <div className="cd-section-header">
                <span>📎</span>
                <span>Medical Attachments ({attachments.length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {attachments.map(att => {
                  const isImage = att.mime_type?.startsWith('image/');
                  const isExpanded = expandedAttachment === att.id;
                  const typeLabels = { ecg: 'ECG', xray: 'X-ray', lab_report: 'Lab Report', photo: 'Photo', other: 'File' };
                  const typeColors = { ecg: '#ef4444', xray: '#3b82f6', lab_report: '#f59e0b', photo: '#8b5cf6', other: '#6b7280' };
                  const color = typeColors[att.attachment_type] || '#6b7280';

                  return (
                    <div key={att.id} style={{ border: `1px solid #e5e7eb`, borderRadius: 12, overflow: 'hidden', background: 'white' }}>
                      {/* Attachment header */}
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'pointer', background: '#fafafa', borderBottom: isExpanded ? '1px solid #e5e7eb' : 'none' }}
                        onClick={() => setExpandedAttachment(isExpanded ? null : att.id)}
                      >
                        <span style={{ fontSize: '1.2rem' }}>
                          {att.attachment_type === 'ecg' ? '💓' : att.attachment_type === 'xray' ? '🩻' : att.attachment_type === 'lab_report' ? '🧪' : att.attachment_type === 'photo' ? '📷' : '📎'}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{att.original_filename}</div>
                          <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>
                            <span style={{ padding: '1px 6px', borderRadius: 4, background: `${color}15`, color, fontWeight: 600, marginRight: 6 }}>{typeLabels[att.attachment_type]}</span>
                            {(att.file_size / 1024).toFixed(0)} KB
                            {att.ai_findings && <span style={{ color: '#067857', marginLeft: 6 }}>✓ AI analyzed</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {/* Expanded content */}
                      {isExpanded && (
                        <div style={{ padding: 16 }}>
                          {/* Image preview */}
                          {isImage && (
                            <div style={{ marginBottom: 12, textAlign: 'center' }}>
                              <img
                                src={multimodalAPI.getAttachmentUrl(att.id)}
                                alt={att.original_filename}
                                style={{ maxWidth: '100%', maxHeight: 400, borderRadius: 8, border: '1px solid #e5e7eb', objectFit: 'contain' }}
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            </div>
                          )}

                          {/* AI findings */}
                          {att.ai_findings && (
                            <div style={{ padding: 12, background: '#ecfdf5', borderRadius: 8, border: '1px solid #a7f3d0' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#065f46', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontSize: '0.9rem' }}>🤖</span> AI Analysis ({typeLabels[att.attachment_type]})
                              </div>
                              <div style={{ fontSize: '0.78rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#1f2937' }}>
                                {att.ai_findings}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                            <a
                              href={multimodalAPI.getAttachmentUrl(att.id)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.72rem', color: '#3b82f6', textDecoration: 'underline' }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              Open original file
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Report */}
          {isDone && summaryText && (
            <div className="cd-section cd-report">
              <div className="cd-section-header"><span>📋</span><span>Final Clinical Report</span><button className="cd-section-dl" onClick={() => handleDownloadSection('summary')}>⬇</button></div>
              <div className="cd-report-content"><ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryText}</ReactMarkdown></div>
              {summary?.latency_seconds && <div className="cd-report-stats"><span>⏱ {summary.latency_seconds.toFixed(1)}s</span><span>🔄 {summary.total_rounds} rounds</span><span>🔬 {investigations.length} tests</span></div>}
            </div>
          )}

          {/* ═══ Diagnostic Reasoning Score ═══ */}
          {isDone && summary?.drs_score_json && (
            <div className="cd-section">
              <DRSDisplay drsData={summary.drs_score_json} />
            </div>
          )}

          {/* ═══ Reasoning Trace Tree ═══ */}
          {isDone && summary?.trace_json && (
            <div className="cd-section">
              <div className="cd-section-header"><span>🌳</span><span>Reasoning Trace Tree</span></div>
              <div style={{width:'100%',height:'400px',borderRadius:12,overflow:'hidden',background:'white',border:'1px solid #e5e7eb'}}>
                <Tree
                  data={summary.trace_json}
                  orientation="vertical"
                  translate={{ x: 300, y: 40 }}
                  nodeSize={{ x: 160, y: 80 }}
                  separation={{ siblings: 1.5, nonSiblings: 2 }}
                  renderCustomNode={({ nodeData }) => {
                    const conf = nodeData.attributes?.confidence || 'N/A';
                    const bgColor = conf === 'HIGH' ? '#dcfce7' : conf === 'MED' ? '#fef9c3' : conf === 'LOW' ? '#fee2e2' : '#f3f4f6';
                    const borderColor = conf === 'HIGH' ? '#16a34a' : conf === 'MED' ? '#ca8a04' : conf === 'LOW' ? '#dc2626' : '#9ca3af';
                    return (
                      <div style={{padding:'8px 14px',borderRadius:8,border:`2px solid ${borderColor}`,background:bgColor,fontSize:'0.75rem',textAlign:'center',minWidth:100,boxShadow:'0 2px 8px rgba(0,0,0,0.08)'}}>
                        <div style={{fontWeight:700,marginBottom:2,color:'#1f2937'}}>{nodeData.name}</div>
                        {nodeData.attributes?.details && <div style={{color:'#6b7280',fontSize:'0.65rem'}}>{nodeData.attributes.details}</div>}
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          )}

          {isFailed && <div className="cd-error-box"><span>⚠</span><div><strong>Pipeline Failed</strong><div>{data?.error_message||'An error occurred.'}</div></div></div>}

          {isDone && <div className="cd-actions">
            <button className="cd-approve-btn" onClick={() => setApproved(true)} disabled={approved}>{approved?'✓ Approved':'✓ Approve Findings'}</button>
          </div>}

          {/* Feedback buttons */}
          {isDone && unlockedSteps >= 2 && (
            <div className="cd-section" style={{textAlign:'center',padding:'16px 20px'}}>
              <div style={{fontSize:'0.85rem',color:'#6b7280',marginBottom:10}}>Was this AI analysis helpful?</div>
              <div style={{display:'flex',gap:10,justifyContent:'center'}}>
                <button
                  onClick={() => handleFeedback(true)}
                  disabled={feedback !== null}
                  style={{padding:'8px 20px',borderRadius:8,border:feedback==='up'?'2px solid #10b981':'1px solid #d1d5db',background:feedback==='up'?'#d1fae5':'white',cursor:feedback?'default':'pointer',fontSize:'0.95rem',transition:'all 0.2s'}}
                >
                  👍 AI was right
                </button>
                <button
                  onClick={() => handleFeedback(false)}
                  disabled={feedback !== null}
                  style={{padding:'8px 20px',borderRadius:8,border:feedback==='down'?'2px solid #ef4444':'1px solid #d1d5db',background:feedback==='down'?'#fef2f2':'white',cursor:feedback?'default':'pointer',fontSize:'0.95rem',transition:'all 0.2s'}}
                >
                  👎 AI was wrong
                </button>
              </div>
              {feedback && <div style={{fontSize:'0.8rem',color:'#10b981',marginTop:8}}>Thank you for your feedback!</div>}
            </div>
          )}

          {/* ═══ Add More Attachments ═══ */}
          <AttachmentUpload caseId={caseId} onUploaded={(newAtt) => setAttachments(prev => [newAtt, ...prev])} />
        </div>

        {/* Sidebar */}
        <div className="cd-sidebar">
          <div className="cd-sidebar-card"><div className="cd-sidebar-title">Chief Complaint</div><div className="cd-complaint">{data?.chief_complaint}</div>{data?.associated_symptoms && <div className="cd-symptoms">{data.associated_symptoms}</div>}</div>

          {/* Attachments badge in sidebar */}
          {attachments.length > 0 && (
            <div className="cd-sidebar-card">
              <div className="cd-sidebar-title">📎 Attachments ({attachments.length})</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {attachments.map(att => (
                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: '#f8fafc', borderRadius: 6, fontSize: '0.75rem' }}>
                    <span>{att.attachment_type === 'ecg' ? '💓' : att.attachment_type === 'xray' ? '🩻' : att.attachment_type === 'lab_report' ? '🧪' : att.attachment_type === 'photo' ? '📷' : '📎'}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.original_filename}</span>
                    {att.ai_findings && <span style={{ color: '#067857', fontSize: '0.65rem' }}>✓</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(data?.past_medical_history||data?.current_medications||data?.allergies) && (
            <div className="cd-sidebar-card">
              <div className="cd-sidebar-title">Clinical Context</div>
              {data?.past_medical_history && <div className="cd-ctx-item"><div className="cd-ctx-label">Medical History</div><div className="cd-ctx-value">{data.past_medical_history}</div></div>}
              {data?.current_medications && <div className="cd-ctx-item"><div className="cd-ctx-label">Medications</div><div className="cd-ctx-tags">{data.current_medications.split(',').map((m,i)=><span key={i} className="cd-tag">{m.trim()}</span>)}</div></div>}
              {data?.allergies && <div className="cd-ctx-item"><div className="cd-ctx-label">Allergies</div><div className="cd-ctx-value cd-allergy">{data.allergies}</div></div>}
            </div>
          )}
          <div className="cd-sidebar-card">
            <div className="cd-sidebar-title">Agent Status ({completedCount}/{PIPELINE_ORDER.length})</div>
            <div className="cd-agent-list">
              {PIPELINE_ORDER.map(name => {
                const cfg = agentCfg(name); const spoke = transcript.some(m => m.agent === name); const active = currentAgent === name;
                return (
                  <div key={name} className={`cd-agent-item ${spoke?'done':''} ${active?'active':''}`}>
                    <div className="cd-agent-dot" style={{ background: spoke||active?cfg.color:'#e5e7eb', boxShadow: active?`0 0 8px ${cfg.color}`:'none' }} />
                    <span className="cd-agent-name" style={{ color: spoke?cfg.color:'#94a3b8' }}>{cfg.label}</span>
                    {spoke && !active && <span className="cd-agent-check" style={{ color: cfg.color }}>✓</span>}
                    {active && <div className="god-active-dot-sm" style={{ background: cfg.color }} />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Similar Cases */}
          {isDone && similarCases.length > 0 && (
            <div className="cd-sidebar-card">
              <div className="cd-sidebar-title">🔗 Similar Cases ({similarCases.length})</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {similarCases.slice(0, 5).map((sc, i) => (
                  <div key={i} onClick={() => navigate(`/cases/${sc.id}`)} style={{padding:'10px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'white',cursor:'pointer',transition:'all 0.2s'}} onMouseEnter={e=>{e.currentTarget.style.borderColor='#067857';e.currentTarget.style.boxShadow='0 2px 8px rgba(6,120,87,0.12)'}} onMouseLeave={e=>{e.currentTarget.style.borderColor='#e5e7eb';e.currentTarget.style.boxShadow='none'}}>
                    <div style={{fontSize:'0.82rem',fontWeight:600,color:'#1f2937',marginBottom:3}}>#{sc.id.slice(0,8)}</div>
                    <div style={{fontSize:'0.78rem',color:'#6b7280',lineHeight:1.4}}>{sc.chief_complaint?.slice(0,80)}{sc.chief_complaint?.length>80?'…':''}</div>
                    <div style={{display:'flex',gap:6,marginTop:6}}>
                      <span style={{fontSize:'0.7rem',padding:'2px 6px',borderRadius:4,background:'#f0fdf4',color:'#16a34a'}}>Score: {sc.similarity_score}</span>
                      {sc.severity && <span style={{fontSize:'0.7rem',padding:'2px 6px',borderRadius:4,background:sc.severity>=7?'#fef2f2':'#fffbeb',color:sc.severity>=7?'#dc2626':'#ca8a04'}}>Sev: {sc.severity}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
