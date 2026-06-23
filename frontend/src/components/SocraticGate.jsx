import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import api from '../api';
import './SocraticGate.css';

const STEP_LABELS = {
  1: { title: 'After Intake', desc: 'You have the patient\'s symptoms. What do you think so far?' },
  2: { title: 'After GP Triage', desc: 'The GP has triaged the case. What\'s your differential now?' },
  3: { title: 'After Specialists', desc: 'All specialists have weighed in. Final prediction?' },
};

const URGENCY_LEVELS = ['LOW', 'MODERATE', 'HIGH', 'CRITICAL'];

export default function SocraticGate({ caseId, stepNumber, nextAiMessages, onNextStep, completedCount }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [urgency, setUrgency] = useState('MODERATE');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  const stepInfo = STEP_LABELS[stepNumber] || STEP_LABELS[1];

  const handleSubmit = async () => {
    if (!diagnosis.trim()) return;
    setSaving(true);
    try {
      await api.post(`/learning/cases/${caseId}/predict`, {
        case_id: caseId,
        step_number: stepNumber,
        student_diagnosis: diagnosis,
        student_urgency: urgency,
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to save prediction', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReveal = () => {
    setShowComparison(true);
    onNextStep();
  };

  if (submitted && !showComparison) {
    return (
      <div className="sg-container sg-submitted">
        <div className="sg-submitted-icon">✅</div>
        <div className="sg-submitted-text">
          <strong>Prediction locked in!</strong> Scroll down to see the AI's analysis.
        </div>
        <button className="sg-reveal-btn" onClick={handleReveal}>
          Reveal AI Analysis →
        </button>
      </div>
    );
  }

  if (submitted && showComparison) {
    const aiSummary = nextAiMessages?.length > 0
      ? nextAiMessages.map(m => m.content).join('\n\n').slice(0, 1500)
      : 'No AI analysis available for this step.';

    return (
      <div className="sg-comparison">
        <div className="sg-comparison-header">
          <span className="sg-comparison-badge">Step {stepNumber} — You vs AI</span>
        </div>
        <div className="sg-comparison-grid">
          <div className="sg-comparison-card sg-your-card">
            <div className="sg-comparison-card-title">
              <span>🎓</span> Your Prediction
            </div>
            <div className="sg-comparison-dx">
              <strong>Diagnosis:</strong> {diagnosis}
            </div>
            <div className="sg-comparison-urgency">
              <strong>Urgency:</strong>
              <span className={`sg-urgency-badge sg-urgency-${urgency.toLowerCase()}`}>
                {urgency}
              </span>
            </div>
          </div>
          <div className="sg-comparison-card sg-ai-card">
            <div className="sg-comparison-card-title">
              <span>🤖</span> AI's Assessment
            </div>
            <div className="sg-comparison-ai-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{aiSummary}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sg-container">
      <div className="sg-header">
        <div className="sg-step-badge">Step {stepNumber}</div>
        <div className="sg-header-text">
          <div className="sg-title">🎓 Socratic Mode: {stepInfo.title}</div>
          <div className="sg-desc">{stepInfo.desc}</div>
        </div>
      </div>

      <div className="sg-form">
        <div className="sg-input-group">
          <label className="sg-label">Your Differential Diagnosis</label>
          <textarea
            className="sg-textarea"
            rows={3}
            placeholder="1. Most likely diagnosis&#10;2. Alternative diagnosis&#10;3. Must-not-miss diagnosis..."
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
          />
        </div>

        <div className="sg-input-group">
          <label className="sg-label">Urgency Assessment</label>
          <div className="sg-urgency-row">
            {URGENCY_LEVELS.map(level => (
              <label key={level} className={`sg-urgency-option ${urgency === level ? 'selected' : ''} sg-urgency-${level.toLowerCase()}`}>
                <input
                  type="radio"
                  name={`urgency-${stepNumber}`}
                  value={level}
                  checked={urgency === level}
                  onChange={(e) => setUrgency(e.target.value)}
                />
                <span>{level}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          className="sg-submit-btn"
          onClick={handleSubmit}
          disabled={!diagnosis.trim() || saving}
        >
          {saving ? '⏳ Saving...' : '🔓 Submit & Compare with AI →'}
        </button>
      </div>
    </div>
  );
}
