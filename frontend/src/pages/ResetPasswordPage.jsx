import { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import Logo from '../components/Logo';
import './LoginScreen.css';

function PasswordStrength({ password }) {
  let score = 0;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]/.test(password)) score++;

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  const colors = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#067857'];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 4, flex: 1, borderRadius: 2,
            background: i < score ? colors[score - 1] : '#e5e7eb',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score - 1] || '#9ca3af' }}>
        {score > 0 ? labels[score - 1] : 'Enter a password'}
      </span>
    </div>
  );
}

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No reset token found. Please request a new reset link.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to reset password. The link may have expired.';
      setError(msg);
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
          <h1 className="lt-login-title" style={{ fontSize: 28 }}>
            {success ? 'Password Reset' : 'Create New Password'}
          </h1>
          <p className="lt-login-subtext">
            {success
              ? 'Your password has been reset successfully. Redirecting to sign in...'
              : 'Enter your new password below'}
          </p>
          <div className="lt-login-form-divider" />

          {success ? (
            <div className="lt-enroll-card success" style={{ marginBottom: 20 }}>
              <h3 className="lt-enroll-title" style={{ fontSize: 16, color: '#067857' }}>✓ Success</h3>
              <p style={{ fontSize: 13, color: '#2c3e50', lineHeight: 1.6 }}>
                Your password has been updated. You will be redirected to the sign in page shortly.
              </p>
              <Link to="/login" className="lt-register-a" style={{ display: 'inline-block', marginTop: 12 }}>
                Sign In Now →
              </Link>
            </div>
          ) : !token ? (
            <div className="lt-login-error" style={{ marginBottom: 20 }}>
              {error || 'No reset token found. Please request a new reset link from the forgot password page.'}
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && <div className="lt-login-error" style={{ marginBottom: 16 }}>{error}</div>}

              <div className="lt-input-group">
                <label className="lt-input-label">NEW PASSWORD</label>
                <div className="lt-input-wrapper">
                  <span className="lt-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="lt-input"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                  <button
                    type="button"
                    className="lt-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁'}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div className="lt-input-group" style={{ marginTop: 16 }}>
                <label className="lt-input-label">CONFIRM PASSWORD</label>
                <div className="lt-input-wrapper">
                  <span className="lt-input-icon">🔒</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="lt-input"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  {confirmPassword && password === confirmPassword && (
                    <span className="lt-input-check">✓</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className={`lt-login-btn ${loading ? 'lt-loading' : ''}`}
                disabled={loading || !password || !confirmPassword || !token}
                style={{ marginTop: 20 }}
              >
                {loading ? <span className="lt-spinner" /> : 'Reset Password'}
              </button>
            </form>
          )}

          <p className="lt-register-link" style={{ marginTop: 20 }}>
            <Link to="/login" className="lt-register-a">← Back to Sign In</Link>
          </p>

          <div className="lt-login-security">
            <span className="lt-security-icon">🔒</span>
            <span>Password must be at least 10 characters with uppercase, lowercase, digit, and special character.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
