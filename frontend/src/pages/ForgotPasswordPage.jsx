import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api';
import Logo from '../components/Logo';
import './LoginScreen.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authAPI.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lt-login-page">
      <div className="lt-login-left">
        <div className="lt-login-left-content">
          <div className="lt-login-logo">
            <Logo size={56} />
            <h1 className="lt-login-logo-text">HEALTHEON</h1>
          </div>
          <p className="lt-login-subtitle">Clinical AI Orchestration System</p>
          <div className="lt-login-divider" />
          <ul className="lt-login-features">
            <li><span className="lt-feature-check">✓</span> Enterprise-Grade Security & Compliance</li>
            <li><span className="lt-feature-check">✓</span> Role-Based Clinical Access Control</li>
            <li><span className="lt-feature-check">✓</span> Real-Time Audit Trail & Monitoring</li>
          </ul>
        </div>
      </div>

      <div className="lt-login-right">
        <div className="lt-login-card" style={{ maxWidth: 420 }}>
          <h1 className="lt-login-title" style={{ fontSize: 28 }}>Reset Password</h1>
          <p className="lt-login-subtext">
            {sent
              ? `A password reset link has been sent to ${email}`
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
          <div className="lt-login-form-divider" />

          {sent ? (
            <div className="lt-enroll-card success" style={{ marginBottom: 20 }}>
              <h3 className="lt-enroll-title" style={{ fontSize: 16 }}>Check your email</h3>
              <p style={{ fontSize: 13, color: '#2c3e50', lineHeight: 1.6 }}>
                We've sent a password reset link to <strong>{email}</strong>.
                Please check your inbox and follow the instructions.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="lt-login-error" style={{ marginBottom: 16 }}>{error}</div>}
              <div className="lt-input-group">
                <label className="lt-input-label">EMAIL ADDRESS</label>
                <div className="lt-input-wrapper">
                  <span className="lt-input-icon">✉</span>
                  <input
                    type="email"
                    className="lt-input"
                    placeholder="your.clinical.email@hospital.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className={`lt-login-btn ${loading ? 'lt-loading' : ''}`}
                disabled={loading || !email}
              >
                {loading ? <span className="lt-spinner" /> : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="lt-register-link" style={{ marginTop: 20 }}>
            <Link to="/login" className="lt-register-a">← Back to Sign In</Link>
          </p>

          <div className="lt-login-security">
            <span className="lt-security-icon">🔒</span>
            <span>For security, reset links expire after 24 hours. Contact support if you need assistance.</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
            <Link to="/about" className="sm-trigger" style={{ textDecoration: 'none' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span>About Us</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
