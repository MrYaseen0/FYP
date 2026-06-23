import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import LiveWallpaper from '../components/LiveWallpaper';
import './LoginScreen.css';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      // login() already stored token + user in context
      // Navigate happens via AppShell detecting isAuthenticated
      // AppShell reads user.role and redirects to /admin, /doctor, or /patient
      navigate('/');
    } else {
      setError(result.error || 'Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="lt-login-page">
      <LiveWallpaper variant="cool" />
      {/* Left Branding Panel */}
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
          <p className="lt-login-tagline">Trusted by medical professionals worldwide</p>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="lt-login-right">
        <div className="lt-login-card">
          <h1 className="lt-login-title">Sign In</h1>
          <p className="lt-login-subtext">Access your clinical workspace securely</p>
          <div className="lt-login-form-divider" />

          <form onSubmit={handleLogin} className="lt-login-form">
            {error && <div className="lt-login-error">{error}</div>}

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
                {email && email.includes('@') && <span className="lt-input-check">✓</span>}
              </div>
            </div>

            <div className="lt-input-group">
              <label className="lt-input-label">PASSWORD</label>
              <div className="lt-input-wrapper">
                <span className="lt-input-icon">🔒</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="lt-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="lt-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div className="lt-login-options">
              <label className="lt-checkbox-label">
                <input
                  type="checkbox"
                  className="lt-checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </label>
              <Link to="/forgot-password" className="lt-forgot-link">Forgot password?</Link>
            </div>

            <button
              type="submit"
              className={`lt-login-btn ${loading ? 'lt-loading' : ''}`}
              disabled={loading || !email || !password}
            >
              {loading ? (
                <span className="lt-spinner" />
              ) : (
                <>Sign In <span className="lt-btn-arrow">→</span></>
              )}
            </button>

            <p className="lt-register-link">
              Don't have an account? <Link to="/register" className="lt-register-a">Register</Link>
            </p>
          </form>

          <div className="lt-login-security">
            <span className="lt-security-icon">🔒</span>
            <span>All sessions are JWT-authenticated with full audit logging. Your privacy and data security are our priority.</span>
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
