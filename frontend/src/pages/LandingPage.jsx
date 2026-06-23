import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icons } from '../components/RadialOrbitalTimeline';
import Logo from '../components/Logo';
import SupportModal from '../components/SupportModal';
import LiveWallpaper from '../components/LiveWallpaper';
import CursorTrail from '../components/CursorTrail';
import GlassCard from '../components/GlassCard';
import GlowCard from '../components/GlowCard';
import RippleButton from '../components/RippleButton';
import AnimatedBorder from '../components/AnimatedBorder';
import Typewriter from '../components/Typewriter';
import { ScrollReveal } from '../components/ScrollReveal';
import Confetti from '../components/Confetti';
import RadialOrbitalTimeline from '../components/RadialOrbitalTimeline';
import './LandingPage.css';

const FEATURES = [
  { icon: '🧠', title: 'Multi-Agent AI', desc: '7 specialist AI agents debate simultaneously for comprehensive clinical reasoning.', color: '#8b5cf6' },
  { icon: '⚡', title: 'Real-Time Streaming', desc: 'Watch agents confer live via WebSocket. See reasoning as it happens.', color: '#f59e0b' },
  { icon: '🔒', title: 'Enterprise Security', desc: 'JWT auth, role-based access, full audit logging, HIPAA-ready architecture.', color: '#06b6d4' },
  { icon: '📊', title: 'Clinical Dashboard', desc: 'Patients, appointments, prescriptions, lab orders, records — one place.', color: '#10b981' },
  { icon: '🔬', title: 'Diagnostic Insights', desc: 'AI-generated differentials, investigation suggestions, urgency levels.', color: '#ef4444' },
  { icon: '📋', title: 'Audit Trail', desc: 'Every action logged. Full transparency for compliance and QA.', color: '#6366f1' },
];

const AGENTS = [
  { name: 'Intake', color: '#3b82f6', icon: Icons.FileText, desc: 'Structured data extraction' },
  { name: 'GP', color: '#10b981', icon: Icons.Stethoscope, desc: 'Triage and routing' },
  { name: 'Cardiologist', color: '#ef4444', icon: Icons.Heart, desc: 'Cardiovascular analysis' },
  { name: 'Neurologist', color: '#8b5cf6', icon: Icons.Brain, desc: 'Neurological assessment' },
  { name: 'Pulmonologist', color: '#06b6d4', icon: Icons.Flask, desc: 'Respiratory evaluation' },
  { name: 'Pathologist', color: '#f59e0b', icon: Icons.Microscope, desc: 'Investigation planning' },
  { name: 'Summarizer', color: '#fcd34d', icon: Icons.Clipboard, desc: 'Final report synthesis' },
];

const PIPELINE_DATA = AGENTS.map((a, i) => ({
  id: i + 1,
  title: a.name,
  date: 'Pipeline',
  content: a.desc,
  category: a.desc,
  icon: a.icon,
  relatedIds: [i > 0 ? i : null, i < AGENTS.length - 1 ? i + 2 : null].filter(Boolean),
  status: i < 3 ? 'completed' : i === 3 ? 'in-progress' : 'pending',
  energy: Math.max(15, 100 - i * 12),
}));

function AnimatedCounter({ target, duration = 2000 }) {
  const [count, setCount] = useState(0);
  const [ref, visible] = useScrollReveal();
  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target, duration]);
  return <span ref={ref}>{count}</span>;
}

function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { enterGuestMode } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [confetti, setConfetti] = useState(false);

  useEffect(() => { setTimeout(() => setHeroVisible(true), 100); }, []);

  const handleFreeAccess = () => {
    setShowModal(false);
    setConfetti(true);
    setTimeout(() => {
      enterGuestMode();
      navigate('/submit');
    }, 800);
  };

  return (
    <div className="landing-page">
      <LiveWallpaper variant="default" />
      <CursorTrail />
      <Confetti active={confetti} />

      {/* Nav */}
      <header className={`landing-header ${heroVisible ? 'visible' : ''}`}>
        <div className="landing-header-inner">
          <Logo size={32} showText animate />
          <nav className="landing-nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#agents">AI Agents</a>
          </nav>
          <div className="landing-nav-actions">
            <button className="sm-trigger" onClick={() => navigate('/about')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
              <span>About Us</span>
            </button>
            <SupportModal />
            <RippleButton variant="ghost" onClick={() => navigate('/login')}>Sign In</RippleButton>
            <RippleButton variant="glow" onClick={() => setShowModal(true)}>Get Started</RippleButton>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className={`landing-hero ${heroVisible ? 'visible' : ''}`}>
        <div className="landing-hero-content">
          <ScrollReveal animation="fadeInUp" delay={0.2}>
            <div className="landing-badge">
              <span className="landing-badge-dot" /> Multi-Agent Clinical AI
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.4}>
            <h1 className="landing-title">
              The Future of<br />
              <span className="landing-title-gradient">
                <Typewriter
                  words={['Clinical Decision Support', 'Multi-Agent AI Analysis', 'Real-Time Diagnostics', 'Specialist Conference Simulation']}
                  speed={70}
                  deleteSpeed={40}
                  pause={2500}
                />
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.6}>
            <p className="landing-subtitle">
              7 specialist AI agents debate, challenge, and converge on diagnoses —
              delivering the depth of a multi-disciplinary conference in seconds.
            </p>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={0.8}>
            <div className="landing-hero-buttons">
              <RippleButton variant="glow" onClick={() => setShowModal(true)} style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
                Start for Free <span className="btn-arrow">→</span>
              </RippleButton>
              <RippleButton variant="outline" onClick={() => navigate('/login')} style={{ padding: '14px 28px', fontSize: '0.95rem' }}>
                Sign In
              </RippleButton>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fadeInUp" delay={1}>
            <div className="landing-hero-stats">
              <div className="landing-stat">
                <div className="landing-stat-value"><AnimatedCounter target={7} /></div>
                <div className="landing-stat-label">AI Agents</div>
              </div>
              <div className="landing-stat-divider" />
              <div className="landing-stat">
                <div className="landing-stat-value"><AnimatedCounter target={12} /></div>
                <div className="landing-stat-label">Max Rounds</div>
              </div>
              <div className="landing-stat-divider" />
              <div className="landing-stat">
                <div className="landing-stat-value">∞</div>
                <div className="landing-stat-label">Cases</div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Agent Pipeline */}
        <ScrollReveal animation="fadeInRight" delay={0.6}>
          <div className="landing-hero-visual">
            <div className="landing-orbital-card">
              <RadialOrbitalTimeline timelineData={PIPELINE_DATA} />
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Floating Stats */}
      <div className="landing-floating-stats">
        <div className="landing-floating-inner">
          <div className="landing-float-item"><span className="landing-float-icon">🏥</span><span>Trusted by <strong>500+</strong> Clinicians</span></div>
          <div className="landing-float-divider" />
          <div className="landing-float-item"><span className="landing-float-icon">⚡</span><span><strong>10,000+</strong> Cases Analyzed</span></div>
          <div className="landing-float-divider" />
          <div className="landing-float-item"><span className="landing-float-icon">🎯</span><span><strong>94%</strong> Diagnostic Accuracy</span></div>
          <div className="landing-float-divider" />
          <div className="landing-float-item"><span className="landing-float-icon">🌍</span><span>Available <strong>24/7</strong> Worldwide</span></div>
        </div>
      </div>

      {/* Features */}
      <section className="landing-features" id="features">
        <div className="landing-section-inner">
          <ScrollReveal>
            <div className="landing-section-badge">Features</div>
            <h2 className="landing-section-title">Everything You Need</h2>
            <p className="landing-section-subtitle">Built for clinicians. Every feature designed to enhance diagnostic accuracy.</p>
          </ScrollReveal>
          <div className="landing-features-grid">
            {FEATURES.map((f, i) => (
              <ScrollReveal key={i} animation="scaleIn" delay={i * 0.1}>
                <GlowCard color={f.color} style={{ padding: 0 }}>
                  <div className="landing-feature-card-inner">
                    <div className="landing-feature-icon-wrap" style={{ background: f.color + '12', color: f.color }}>
                      {f.icon}
                    </div>
                    <h3 className="landing-feature-title">{f.title}</h3>
                    <p className="landing-feature-desc">{f.desc}</p>
                  </div>
                </GlowCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-how" id="how-it-works">
        <div className="landing-section-inner">
          <ScrollReveal>
            <div className="landing-section-badge">How It Works</div>
            <h2 className="landing-section-title">Three Steps to Insight</h2>
          </ScrollReveal>
          <div className="landing-steps">
            {[
              { num: '01', title: 'Submit Case', desc: 'Enter patient symptoms, history, and vitals. Our intake agent structures the data.', icon: '📝', color: '#06b6d4' },
              { num: '02', title: 'AI Conference', desc: '7 specialist agents debate in real-time. Watch the reasoning unfold live.', icon: '🤖', color: '#8b5cf6' },
              { num: '03', title: 'Get Report', desc: 'Receive a comprehensive analysis with differentials and investigation suggestions.', icon: '📊', color: '#10b981' },
            ].map((step, i) => (
              <ScrollReveal key={i} animation="flipIn" delay={i * 0.2}>
                <GlassCard style={{ padding: 0 }}>
                  <div className="landing-step-inner">
                    <div className="landing-step-icon" style={{ background: step.color + '12' }}>{step.icon}</div>
                    <div className="landing-step-num" style={{ color: step.color + '30' }}>{step.num}</div>
                    <h3>{step.title}</h3>
                    <p>{step.desc}</p>
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Agent Showcase */}
      <section className="landing-agents" id="agents">
        <div className="landing-section-inner">
          <ScrollReveal>
            <div className="landing-section-badge">AI Agents</div>
            <h2 className="landing-section-title">Meet the Specialists</h2>
            <p className="landing-section-subtitle">Each agent brings domain expertise to the diagnostic conference.</p>
          </ScrollReveal>
          <div className="landing-agents-grid">
            {AGENTS.map((a, i) => (
              <ScrollReveal key={i} animation="scaleIn" delay={i * 0.08}>
                <GlassCard style={{ padding: 0, textAlign: 'center' }}>
                  <div className="landing-agent-card-inner" style={{ '--agent-color': a.color }}>
                    <div className="landing-agent-card-icon" style={{ background: a.color + '18' }}>{a.icon}</div>
                    <div className="landing-agent-card-name">{a.name}</div>
                    <div className="landing-agent-card-desc">{a.desc}</div>
                    <div className="landing-agent-card-bar" style={{ background: a.color }} />
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div className="landing-section-inner">
          <div className="landing-cta-glow" />
          <ScrollReveal animation="scaleIn">
            <h2>Ready to Transform Clinical Reasoning?</h2>
            <p>Join healthcare professionals using multi-agent AI for better diagnostic decisions.</p>
            <RippleButton variant="glow" onClick={() => setShowModal(true)} style={{ padding: '16px 36px', fontSize: '1rem', background: '#ffffff', color: '#067857' }}>
              Get Started Free →
            </RippleButton>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <Logo size={24} showText animate />
          <div className="landing-footer-text">© 2026 Healtheon. Clinical AI Platform.</div>
        </div>
      </footer>

      {/* Modal */}
      {showModal && (
        <div className="landing-modal-overlay" onClick={() => setShowModal(false)}>
          <GlassCard style={{ padding: 40, width: 460, maxWidth: '90vw', position: 'relative' }} className="landing-modal-glass">
            <button className="landing-modal-close" onClick={() => setShowModal(false)}>✕</button>
            <div className="landing-modal-logo"><Logo size={56} animate /></div>
            <h2 className="landing-modal-title">Welcome to Healtheon</h2>
            <p className="landing-modal-subtitle">Choose how you'd like to continue</p>

            <div className="landing-modal-options">
              <button className="landing-modal-option free" onClick={handleFreeAccess}>
                <div className="landing-modal-option-icon">▶</div>
                <div className="landing-modal-option-content">
                  <div className="landing-modal-option-title">Free Access</div>
                  <div className="landing-modal-option-desc">Try the platform instantly. No commitment.</div>
                </div>
                <span className="landing-modal-option-arrow">→</span>
              </button>
              <button className="landing-modal-option login" onClick={() => { setShowModal(false); navigate('/login'); }}>
                <div className="landing-modal-option-icon">🔐</div>
                <div className="landing-modal-option-content">
                  <div className="landing-modal-option-title">Sign In</div>
                  <div className="landing-modal-option-desc">Access your clinical workspace.</div>
                </div>
                <span className="landing-modal-option-arrow">→</span>
              </button>
              <button className="landing-modal-option register" onClick={() => { setShowModal(false); navigate('/register'); }}>
                <div className="landing-modal-option-icon">✦</div>
                <div className="landing-modal-option-content">
                  <div className="landing-modal-option-title">Create Account</div>
                  <div className="landing-modal-option-desc">Full access. Requires admin approval.</div>
                </div>
                <span className="landing-modal-option-arrow">→</span>
              </button>
            </div>
            <div className="landing-modal-footer">By continuing, you agree to our Terms of Service and Privacy Policy</div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
