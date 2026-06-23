import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { patientAPI } from '../api';

const METRIC_TYPES = [
  { value: 'heart_rate', label: 'Heart Rate', unit: 'bpm', placeholder: 'e.g. 72' },
  { value: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', placeholder: 'e.g. 120/80' },
  { value: 'weight', label: 'Weight', unit: 'kg', placeholder: 'e.g. 70' },
  { value: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', placeholder: 'e.g. 95' },
  { value: 'temperature', label: 'Temperature', unit: '°C', placeholder: 'e.g. 36.8' },
  { value: 'oxygen_saturation', label: 'Oxygen Saturation', unit: '%', placeholder: 'e.g. 98' },
];

export default function HealthMetricsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isPatient = !user?.role || user?.role === 'user';

  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ metric_type: 'heart_rate', value: '' });
  const [error, setError] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      setLoading(true);
      const data = await patientAPI.getHealthMetrics();
      setMetrics(data.metrics || []);
    } catch (err) {
      console.error('Failed to load health metrics:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!form.value || !form.value.trim()) {
      setError('Value is required');
      return;
    }
    try {
      setSubmitting(true);
      await patientAPI.logHealthMetric(form.metric_type, form.value.trim());
      setForm({ metric_type: 'heart_rate', value: '' });
      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err?.response?.data?.detail || 'Failed to log metric');
    } finally {
      setSubmitting(false);
    }
  }

  const getMetricIcon = (type) => {
    const icons = { heart_rate: '❤️', blood_pressure: '🩺', weight: '⚖️', blood_sugar: '🩸', temperature: '🌡️', oxygen_saturation: '💨' };
    return icons[type] || '📊';
  };

  const getMetricColor = (type) => {
    const colors = { heart_rate: '#ef4444', blood_pressure: '#f59e0b', weight: '#3b82f6', blood_sugar: '#8b5cf6', temperature: '#10b981', oxygen_saturation: '#06b6d4' };
    return colors[type] || 'var(--cyan)';
  };

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div className="page-title">Health Metrics</div>
          <div className="page-sub">Your latest health readings</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isPatient && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ Log Vitals'}
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>← Back</button>
        </div>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 20, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 16, color: 'var(--text-primary)' }}>Log Health Metric</div>
          {error && <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 6, fontSize: '0.8rem', marginBottom: 12 }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Metric Type</label>
              <select className="form-input" value={form.metric_type} onChange={e => setForm(f => ({ ...f, metric_type: e.target.value }))}>
                {METRIC_TYPES.map(mt => <option key={mt.value} value={mt.value}>{mt.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Value *</label>
              <input
                className="form-input"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder={METRIC_TYPES.find(mt => mt.value === form.metric_type)?.placeholder || 'Enter value'}
                required
              />
            </div>
            <div style={{ flex: '0 0 auto', display: 'flex', gap: 8 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                {submitting ? 'Saving...' : 'Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {metrics.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <div className="empty-state-text">No health metrics recorded</div>
          {isPatient && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Click "Log Vitals" to record your first health metric.
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 16 }}>
          {metrics.map(metric => (
            <div key={metric.id} className="card" style={{ padding: 20, borderLeft: `4px solid ${getMetricColor(metric.type)}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: '1.2rem' }}>{getMetricIcon(metric.type)}</span>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    {metric.type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: getMetricColor(metric.type) }}>
                {metric.value} <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>{metric.unit}</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                {metric.recorded_at ? new Date(metric.recorded_at).toLocaleString() : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
