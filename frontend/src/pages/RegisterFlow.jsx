import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import './RegisterFlow.css';

const STEPS = ['Account', 'Verification', 'Profile', 'Enrollment'];

export default function RegisterFlow() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
    role: '', licenseNumber: '', specialty: '', yearsExperience: '',
    institution: '', dob: '', gender: '', bloodType: '',
    emergencyName: '', emergencyPhone: '', staffId: '', department: '',
    certifications: '', agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [codeError, setCodeError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const codeRefs = useRef([]);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (resendTimer > 0) {
      const t = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendTimer]);

  const passwordChecks = {
    length: formData.password.length >= 8,
    upper: /[A-Z]/.test(formData.password),
    number: /[0-9]/.test(formData.password),
    special: /[!@#$%^&*]/.test(formData.password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  const validateStep1 = () => {
    const e = {};
    if (!formData.firstName || formData.firstName.length < 2) e.firstName = 'First name is required (min 2 chars)';
    if (!formData.lastName || formData.lastName.length < 2) e.lastName = 'Last name is required (min 2 chars)';
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.email = 'Please enter a valid email';
    if (passwordStrength < 4) e.password = 'Password does not meet requirements';
    if (formData.password !== formData.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e = {};
    if (!formData.role) e.role = 'Please select a role';
    if (formData.role === 'doctor') {
      if (!formData.licenseNumber) e.licenseNumber = 'License number is required';
      if (!formData.specialty) e.specialty = 'Please select your specialty';
      if (!formData.yearsExperience) e.yearsExperience = 'Required';
    }
    if (formData.role === 'patient') {
      if (!formData.dob) e.dob = 'Date of birth is required';
    }
    if (formData.role === 'staff') {
      if (!formData.staffId) e.staffId = 'Staff ID is required';
      if (!formData.department) e.department = 'Department is required';
    }
    if (!formData.agreeTerms) e.agreeTerms = 'You must agree to the terms';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 3 && !validateStep3()) return;
    setErrors({});

    if (step === 1) {
      // Send verification code to email
      setSendingCode(true);
      try {
        await authAPI.sendCode(formData.email);
        setResendTimer(60);
        setStep(2);
      } catch (err) {
        setErrors({ email: err?.response?.data?.detail || 'Failed to send verification code. Please try again.' });
      } finally {
        setSendingCode(false);
      }
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep(step - 1);
  };

  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value.slice(-1);
    setVerificationCode(newCode);
    setCodeError('');
    if (value && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
    if (newCode.every(d => d.length === 1)) {
      setTimeout(async () => {
        const entered = newCode.join('');
        setVerifying(true);
        try {
          await authAPI.verifyEmail(formData.email, entered);
          setStep(3);
        } catch (err) {
          setCodeError(err?.response?.data?.detail || 'Invalid verification code. Please try again.');
          codeRefs.current[0]?.focus();
        } finally {
          setVerifying(false);
        }
      }, 200);
    }
  };

  const handleCodeKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendAttempts >= 3) return;
    setResendAttempts(resendAttempts + 1);
    setResendTimer(60);
    setVerificationCode(['', '', '', '', '', '']);
    setCodeError('');
    try {
      await authAPI.sendCode(formData.email);
    } catch (err) {
      setCodeError(err?.response?.data?.detail || 'Failed to resend code.');
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    try {
      const payload = {
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        password: formData.password,
        institution: formData.institution || '',
        role_request: formData.role === 'doctor' ? 'doctor' : 'user',
      };
      const data = await authAPI.register(payload);
      setStep(4);
    } catch (err) {
      setErrors({ submit: err?.response?.data?.detail || 'Registration failed' });
      setLoading(false);
    }
  };

  const handleGoToLogin = () => navigate('/login');

  const update = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const SPECIALTIES = [
    'General Medicine', 'Cardiology', 'Neurology', 'Psychiatry', 'Pediatrics',
    'Surgery', 'Emergency Medicine', 'Radiology', 'Pathology', 'Pharmacology',
    'Dermatology', 'Oncology', 'Orthopedics', 'Ophthalmology', 'ENT',
  ];

  const DEPARTMENTS = [
    'Administration', 'Reception', 'Billing/Finance', 'IT Support',
    'Clinical Support', 'Nursing', 'Lab', 'Pharmacy',
  ];

  return (
    <div className="lt-reg-page">
      <div className="lt-reg-card">
        {/* Step Indicator */}
        <div className="lt-step-bar">
          {STEPS.map((label, i) => (
            <div key={label} className={`lt-step-item ${i + 1 <= step ? 'active' : ''} ${i + 1 < step ? 'done' : ''}`}>
              <div className="lt-step-circle">
                {i + 1 < step ? '✓' : i + 1}
              </div>
              <span className="lt-step-label">{label}</span>
              {i < STEPS.length - 1 && <div className={`lt-step-line ${i + 1 < step ? 'done' : ''}`} />}
            </div>
          ))}
        </div>

        {/* STEP 1: Account Creation */}
        {step === 1 && (
          <div className="lt-reg-step">
            <h2 className="lt-reg-title">Create Your Account</h2>
            <p className="lt-reg-subtitle">Join our clinical network</p>

            {errors.submit && <div className="lt-reg-error">{errors.submit}</div>}

            <div className="lt-field-row">
              <div className="lt-input-group">
                <label className="lt-input-label">FIRST NAME</label>
                <div className="lt-input-wrapper">
                  <span className="lt-input-icon">👤</span>
                  <input className={`lt-input ${errors.firstName ? 'lt-error' : ''}`} placeholder="John" value={formData.firstName} onChange={e => update('firstName', e.target.value)} />
                </div>
                {errors.firstName && <span className="lt-field-error">{errors.firstName}</span>}
              </div>
              <div className="lt-input-group">
                <label className="lt-input-label">LAST NAME</label>
                <div className="lt-input-wrapper">
                  <span className="lt-input-icon">👤</span>
                  <input className={`lt-input ${errors.lastName ? 'lt-error' : ''}`} placeholder="Doe" value={formData.lastName} onChange={e => update('lastName', e.target.value)} />
                </div>
                {errors.lastName && <span className="lt-field-error">{errors.lastName}</span>}
              </div>
            </div>

            <div className="lt-input-group">
              <label className="lt-input-label">CLINICAL EMAIL</label>
              <div className="lt-input-wrapper">
                <span className="lt-input-icon">✉</span>
                <input className={`lt-input ${errors.email ? 'lt-error' : ''}`} type="email" placeholder="john.doe@hospital.com" value={formData.email} onChange={e => update('email', e.target.value)} />
                {formData.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && <span className="lt-input-check">✓</span>}
              </div>
              {errors.email && <span className="lt-field-error">{errors.email}</span>}
            </div>

            <div className="lt-input-group">
              <label className="lt-input-label">CREATE PASSWORD</label>
              <div className="lt-input-wrapper">
                <span className="lt-input-icon">🔒</span>
                <input className={`lt-input ${errors.password ? 'lt-error' : ''}`} type={passwordVisible ? 'text' : 'password'} placeholder="••••••••" value={formData.password} onChange={e => update('password', e.target.value)} />
                <button type="button" className="lt-password-toggle" onClick={() => setPasswordVisible(!passwordVisible)}>
                  {passwordVisible ? '🙈' : '👁'}
                </button>
              </div>
              {formData.password && (
                <div className="lt-pw-checks">
                  <span className={passwordChecks.length ? 'met' : ''}>✓ At least 8 characters</span>
                  <span className={passwordChecks.upper ? 'met' : ''}>✓ At least 1 uppercase letter</span>
                  <span className={passwordChecks.number ? 'met' : ''}>✓ At least 1 number</span>
                  <span className={passwordChecks.special ? 'met' : ''}>✓ At least 1 special character</span>
                  {passwordStrength === 4 && <span className="lt-pw-strong">Strong password</span>}
                </div>
              )}
              {errors.password && <span className="lt-field-error">{errors.password}</span>}
            </div>

            <div className="lt-input-group">
              <label className="lt-input-label">CONFIRM PASSWORD</label>
              <div className="lt-input-wrapper">
                <span className="lt-input-icon">🔒</span>
                <input className={`lt-input ${errors.confirmPassword ? 'lt-error' : ''}`} type="password" placeholder="••••••••" value={formData.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} />
                {formData.confirmPassword && formData.password === formData.confirmPassword && <span className="lt-input-check">✓</span>}
              </div>
              {errors.confirmPassword && <span className="lt-field-error">{errors.confirmPassword}</span>}
            </div>

            <div className="lt-reg-buttons">
              <Link to="/login" className="lt-reg-back-link">← Back to Sign In</Link>
              <button className="lt-reg-btn primary" onClick={handleNext}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 2: Email Verification */}
        {step === 2 && (
          <div className="lt-reg-step">
            <h2 className="lt-reg-title">Verify Your Email</h2>
            <p className="lt-reg-subtitle">We've sent a verification code to <strong>{formData.email}</strong></p>

            {codeError && <div className="lt-reg-error">{codeError}</div>}

            <div className="lt-code-row">
              {verificationCode.map((digit, i) => (
                <input
                  key={i}
                  ref={el => codeRefs.current[i] = el}
                  className={`lt-code-input ${codeError ? 'lt-shake' : ''}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleCodeChange(i, e.target.value)}
                  onKeyDown={e => handleCodeKeyDown(i, e)}
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <div className="lt-code-info">
              <p>Didn't receive a code? {resendAttempts < 3 ? (
                <button className="lt-resend-btn" onClick={handleResend} disabled={resendTimer > 0}>
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend'}
                </button>
              ) : (
                <span className="lt-code-exhausted">Too many attempts. Contact support.</span>
              )}</p>
            </div>

            <div className="lt-reg-buttons">
              <button className="lt-reg-back" onClick={handleBack}>← Back to Account Creation</button>
            </div>
          </div>
        )}

        {/* STEP 3: Professional Profile */}
        {step === 3 && (
          <div className="lt-reg-step">
            <h2 className="lt-reg-title">Complete Your Professional Profile</h2>
            <p className="lt-reg-subtitle">Help us serve you better</p>

            {errors.submit && <div className="lt-reg-error">{errors.submit}</div>}

            <div className="lt-role-select">
              {[
                { id: 'patient', label: 'I am a Patient / Healthcare Consumer', desc: 'Access personal medical records, appointments, prescriptions', icon: '❤️' },
                { id: 'doctor', label: 'I am a Healthcare Provider / Clinician', desc: 'Manage patients, view medical histories, prescribe treatments', icon: '🩺' },
                { id: 'staff', label: 'I am Hospital/Clinic Staff', desc: 'Administrative staff, reception, billing support', icon: '🏥' },
              ].map(r => (
                <label key={r.id} className={`lt-role-option ${formData.role === r.id ? 'selected' : ''}`}>
                  <input type="radio" name="role" value={r.id} checked={formData.role === r.id} onChange={e => update('role', e.target.value)} />
                  <div className="lt-role-option-content">
                    <span className="lt-role-option-text">{r.label}</span>
                    <span className="lt-role-option-desc">{r.desc}</span>
                  </div>
                  <span className="lt-role-option-icon">{r.icon}</span>
                </label>
              ))}
              {errors.role && <span className="lt-field-error">{errors.role}</span>}
            </div>

            {/* Patient Fields */}
            {formData.role === 'patient' && (
              <div className="lt-conditional-fields">
                <div className="lt-input-group">
                  <label className="lt-input-label">DATE OF BIRTH</label>
                  <div className="lt-input-wrapper">
                    <span className="lt-input-icon">📅</span>
                    <input className={`lt-input ${errors.dob ? 'lt-error' : ''}`} type="date" value={formData.dob} onChange={e => update('dob', e.target.value)} />
                  </div>
                  {errors.dob && <span className="lt-field-error">{errors.dob}</span>}
                </div>
                <div className="lt-field-row">
                  <div className="lt-input-group">
                    <label className="lt-input-label">GENDER (OPTIONAL)</label>
                    <select className="lt-input" value={formData.gender} onChange={e => update('gender', e.target.value)}>
                      <option value="">Not specified</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not">Prefer not to say</option>
                    </select>
                  </div>
                  <div className="lt-input-group">
                    <label className="lt-input-label">BLOOD TYPE (OPTIONAL)</label>
                    <select className="lt-input" value={formData.bloodType} onChange={e => update('bloodType', e.target.value)}>
                      <option value="">Not specified</option>
                      <option>O+</option><option>O-</option><option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option><option>AB+</option><option>AB-</option>
                    </select>
                  </div>
                </div>
                <div className="lt-field-row">
                  <div className="lt-input-group">
                    <label className="lt-input-label">EMERGENCY CONTACT NAME</label>
                    <input className="lt-input" placeholder="Full name" value={formData.emergencyName} onChange={e => update('emergencyName', e.target.value)} />
                  </div>
                  <div className="lt-input-group">
                    <label className="lt-input-label">EMERGENCY CONTACT PHONE</label>
                    <input className="lt-input" type="tel" placeholder="+1 (555) 123-4567" value={formData.emergencyPhone} onChange={e => update('emergencyPhone', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Doctor Fields */}
            {formData.role === 'doctor' && (
              <div className="lt-conditional-fields">
                <div className="lt-input-group">
                  <label className="lt-input-label">MEDICAL LICENSE NUMBER *</label>
                  <div className="lt-input-wrapper">
                    <span className="lt-input-icon">📋</span>
                    <input className={`lt-input ${errors.licenseNumber ? 'lt-error' : ''}`} placeholder="e.g., LIC-12345678" value={formData.licenseNumber} onChange={e => update('licenseNumber', e.target.value)} />
                  </div>
                  {errors.licenseNumber && <span className="lt-field-error">{errors.licenseNumber}</span>}
                </div>
                <div className="lt-input-group">
                  <label className="lt-input-label">MEDICAL SPECIALTY *</label>
                  <select className={`lt-input ${errors.specialty ? 'lt-error' : ''}`} value={formData.specialty} onChange={e => update('specialty', e.target.value)}>
                    <option value="">Select specialty...</option>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {errors.specialty && <span className="lt-field-error">{errors.specialty}</span>}
                </div>
                <div className="lt-field-row">
                  <div className="lt-input-group">
                    <label className="lt-input-label">YEARS IN PRACTICE *</label>
                    <input className={`lt-input ${errors.yearsExperience ? 'lt-error' : ''}`} type="number" min="0" max="70" placeholder="10" value={formData.yearsExperience} onChange={e => update('yearsExperience', e.target.value)} />
                    {errors.yearsExperience && <span className="lt-field-error">{errors.yearsExperience}</span>}
                  </div>
                  <div className="lt-input-group">
                    <label className="lt-input-label">AFFILIATED INSTITUTION</label>
                    <input className="lt-input" placeholder="Search hospital or clinic..." value={formData.institution} onChange={e => update('institution', e.target.value)} />
                  </div>
                </div>
                <div className="lt-input-group">
                  <label className="lt-input-label">ADDITIONAL CERTIFICATIONS</label>
                  <textarea className="lt-input lt-textarea" rows="3" maxLength="500" placeholder="List any additional certifications, fellowships, etc." value={formData.certifications} onChange={e => update('certifications', e.target.value)} />
                  <span className="lt-char-count">{formData.certifications.length}/500</span>
                </div>
              </div>
            )}

            {/* Staff Fields */}
            {formData.role === 'staff' && (
              <div className="lt-conditional-fields">
                <div className="lt-input-group">
                  <label className="lt-input-label">FACILITY STAFF ID *</label>
                  <div className="lt-input-wrapper">
                    <span className="lt-input-icon">🪪</span>
                    <input className={`lt-input ${errors.staffId ? 'lt-error' : ''}`} placeholder="Your staff ID" value={formData.staffId} onChange={e => update('staffId', e.target.value)} />
                  </div>
                  {errors.staffId && <span className="lt-field-error">{errors.staffId}</span>}
                </div>
                <div className="lt-input-group">
                  <label className="lt-input-label">DEPARTMENT *</label>
                  <select className={`lt-input ${errors.department ? 'lt-error' : ''}`} value={formData.department} onChange={e => update('department', e.target.value)}>
                    <option value="">Select department...</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.department && <span className="lt-field-error">{errors.department}</span>}
                </div>
                <div className="lt-input-group">
                  <label className="lt-input-label">AFFILIATED FACILITY</label>
                  <input className="lt-input" placeholder="Hospital or clinic name..." value={formData.institution} onChange={e => update('institution', e.target.value)} />
                </div>
              </div>
            )}

            {/* Terms */}
            <label className="lt-checkbox-label lt-terms">
              <input type="checkbox" className="lt-checkbox" checked={formData.agreeTerms} onChange={e => update('agreeTerms', e.target.checked)} />
              <span>I agree to the platform's terms of service and privacy policy</span>
            </label>
            {errors.agreeTerms && <span className="lt-field-error">{errors.agreeTerms}</span>}
            <p className="lt-terms-note">By registering, you agree to our data handling practices as outlined in our Privacy Policy.</p>

            <div className="lt-reg-buttons">
              <button className="lt-reg-back" onClick={handleBack}>← Back</button>
              <button className="lt-reg-btn primary" onClick={handleNext} disabled={!formData.role}>Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 4: Enrollment & Verification */}
        {step === 4 && (
          <div className="lt-reg-step">
            {formData.role === 'patient' && (
              <>
                <div className="lt-enroll-card success">
                  <h2 className="lt-enroll-title">Welcome to Healtheon, {formData.firstName}!</h2>
                  <ul className="lt-enroll-list">
                    <li>✓ Your account is created and verified</li>
                    <li>✓ You can now view your medical history</li>
                    <li>✓ Book appointments with healthcare providers</li>
                    <li>✓ Receive prescriptions digitally</li>
                    <li>✓ Track your health metrics</li>
                    <li>✓ Communicate securely with your doctor</li>
                  </ul>
                </div>
                <div className="lt-enroll-grid">
                  <div className="lt-enroll-card-sm"><span className="lt-enroll-sm-icon">📅</span><h4>Book Appointment</h4><p>Schedule a consultation</p></div>
                  <div className="lt-enroll-card-sm"><span className="lt-enroll-sm-icon">📄</span><h4>View Records</h4><p>Access your medical history</p></div>
                  <div className="lt-enroll-card-sm"><span className="lt-enroll-sm-icon">🔑</span><h4>Security Settings</h4><p>Set up two-factor auth</p></div>
                </div>
              </>
            )}

            {formData.role === 'doctor' && (
              <>
                <div className="lt-enroll-card warning">
                  <h2 className="lt-enroll-title">Verification in Progress</h2>
                  <p className="lt-enroll-text">Your medical license and credentials are being verified by our compliance team. This typically takes 24-48 hours. You'll receive an email confirmation when approved.</p>
                </div>
                <div className="lt-timeline">
                  {['License verification', 'Background check', 'Credentials validation', 'Account activation'].map((item, i) => (
                    <div key={item} className="lt-timeline-item">
                      <div className="lt-timeline-dot" />
                      <div className="lt-timeline-content">
                        <span className="lt-timeline-label">{item}</span>
                        <span className="lt-timeline-status">Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="lt-enroll-card info">
                  <p>You can browse patient data and familiarize yourself with the system. Full prescription/treatment capabilities unlock after verification.</p>
                </div>
              </>
            )}

            {formData.role === 'staff' && (
              <div className="lt-enroll-card success">
                <h2 className="lt-enroll-title">Welcome to Healtheon, {formData.firstName}!</h2>
                <ul className="lt-enroll-list">
                  <li>✓ Your staff account is created</li>
                  <li>✓ You can access administrative functions</li>
                  <li>✓ Manage patient check-in and appointments</li>
                  <li>✓ Handle billing and insurance</li>
                  <li>✓ Support clinical teams</li>
                  <li>✓ Generate facility reports</li>
                </ul>
              </div>
            )}

            <div className="lt-reg-buttons lt-enroll-actions">
              <button className="lt-reg-btn primary" onClick={handleGoToLogin}>
                {formData.role === 'patient' ? 'Go to Dashboard' : formData.role === 'doctor' ? 'Complete Your Profile' : 'Go to Admin Panel'} →
              </button>
              <button className="lt-reg-back" onClick={handleGoToLogin}>Skip for now</button>
            </div>
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
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
  );
}
