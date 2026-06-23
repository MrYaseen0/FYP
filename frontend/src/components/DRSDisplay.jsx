import { useState } from 'react';
import './DRSDisplay.css';

const DIMENSIONS = [
  { key: 'differentials', label: 'Differentials', icon: '🩺', desc: 'Diagnoses considered and ranked' },
  { key: 'evidence_use', label: 'Evidence Use', icon: '📚', desc: 'Guidelines and studies cited' },
  { key: 'bias_avoidance', label: 'Bias Avoidance', icon: '🧠', desc: 'Cognitive bias awareness' },
  { key: 'completeness', label: 'Completeness', icon: '✅', desc: 'No important items missed' },
  { key: 'urgency_detection', label: 'Urgency Detection', icon: '🚨', desc: 'Appropriate urgency level' },
];

function getScoreColor(score) {
  if (score >= 80) return '#067857';
  if (score >= 60) return '#ca8a04';
  return '#dc2626';
}

function getScoreLabel(score) {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 60) return 'Fair';
  return 'Needs Work';
}

function AnimatedBar({ score, color, delay }) {
  return (
    <div className="drs-bar-track">
      <div
        className="drs-bar-fill"
        style={{ width: `${score}%`, backgroundColor: color, animationDelay: `${delay}ms` }}
      />
    </div>
  );
}

export default function DRSDisplay({ drsData }) {
  const [expanded, setExpanded] = useState(false);

  if (!drsData) return null;

  const overallColor = getScoreColor(drsData.overall);
  const overallLabel = getScoreLabel(drsData.overall);

  return (
    <div className="drs-container">
      {/* Header */}
      <div className="drs-header">
        <div className="drs-header-left">
          <div className="drs-overall-badge" style={{ borderColor: overallColor }}>
            <span className="drs-overall-score" style={{ color: overallColor }}>{drsData.overall}</span>
            <span className="drs-overall-label">/ 100</span>
          </div>
          <div>
            <div className="drs-title">Diagnostic Reasoning Score</div>
            <div className="drs-subtitle" style={{ color: overallColor }}>{overallLabel}</div>
          </div>
        </div>
        <button className="drs-expand-btn" onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Hide Details' : 'Show Details'}
        </button>
      </div>

      {/* Compact always-visible bars */}
      <div className="drs-dimensions-compact">
        {DIMENSIONS.map((dim, i) => {
          const score = drsData[dim.key] || 0;
          const color = getScoreColor(score);
          return (
            <div key={dim.key} className="drs-dim-row">
              <span className="drs-dim-icon">{dim.icon}</span>
              <span className="drs-dim-label">{dim.label}</span>
              <div className="drs-dim-bar-wrap">
                <AnimatedBar score={score} color={color} delay={i * 120} />
              </div>
              <span className="drs-dim-score" style={{ color }}>{score}</span>
            </div>
          );
        })}
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="drs-expanded">
          {/* Strengths */}
          {drsData.strengths?.length > 0 && (
            <div className="drs-section">
              <div className="drs-section-title drs-strengths-title">
                <span>✅</span> Strengths
              </div>
              <ul className="drs-list drs-strengths-list">
                {drsData.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missed */}
          {drsData.missed?.length > 0 && (
            <div className="drs-section">
              <div className="drs-section-title drs-missed-title">
                <span>⚠️</span> Missed Considerations
              </div>
              <ul className="drs-list drs-missed-list">
                {drsData.missed.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
