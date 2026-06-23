import { useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import './AboutUsPage.css';

const SKILLS = [
  { name: 'React / Next.js', level: 92, color: '#61dafb', icon: '⚛️' },
  { name: 'Node.js / Express', level: 88, color: '#68a063', icon: '🟢' },
  { name: 'Python / FastAPI', level: 85, color: '#3776ab', icon: '🐍' },
  { name: 'MongoDB / PostgreSQL', level: 82, color: '#47a248', icon: '🗄️' },
  { name: 'TypeScript', level: 87, color: '#3178c6', icon: '📘' },
  { name: 'Docker / AWS', level: 78, color: '#2496ed', icon: '🐳' },
  { name: 'AI / ML Integration', level: 80, color: '#ff6f61', icon: '🧠' },
  { name: 'UI/UX Design', level: 75, color: '#ff61a6', icon: '🎨' },
];

const STATS = [
  { label: 'Projects Delivered', value: '15+', icon: '🚀' },
  { label: 'GitHub Commits', value: '500+', icon: '💻' },
  { label: 'Technologies', value: '20+', icon: '🛠️' },
  { label: 'Years Experience', value: '4+', icon: '📅' },
];

const TIMELINE = [
  { year: '2022', title: 'Started Coding', desc: 'Began journey with C++ and Python fundamentals at CECOS University.' },
  { year: '2023', title: 'Web Development', desc: 'Mastered React, Node.js, and MongoDB. Built first full-stack applications.' },
  { year: '2024', title: 'AI Integration', desc: 'Integrated LLMs and multi-agent systems into clinical platforms.' },
  { year: '2025', title: 'Healtheon OS', desc: 'Architecting a multi-agent clinical AI orchestration system for FYP.' },
];

export default function AboutUsPage() {
  const navigate = useNavigate();

  return (
    <div className="about-page">

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="about-hero">
        <div className="about-hero-bg">
          <div className="about-orb about-orb-1" />
          <div className="about-orb about-orb-2" />
          <div className="about-orb about-orb-3" />
        </div>

        <header className="about-topbar">
          <span className="about-topbar-logo" onClick={() => navigate('/')}>
            <Logo size={22} />
          </span>
          <button className="about-back-btn" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            Back
          </button>
        </header>

        <div className="about-hero-content">
          <div className="about-photo-container">
            <img src="/yaseen-1.jpeg" alt="Yaseen Ahmad" className="about-photo" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
            <div className="about-photo-fallback" style={{ display: 'none' }}>YA</div>
            <div className="about-photo-ring" />
            <div className="about-photo-glow" />
          </div>

          <h1 className="about-name">Yaseen Ahmad</h1>
          <p className="about-handle">@yaseenahmadexe · he/him</p>
          <p className="about-tagline">Software Engineer · MERN Stack · Python</p>
          <p className="about-tagline-sub">Building Scalable Web Applications & AI Solutions</p>

          <div className="about-hero-actions">
            <a href="https://wa.me/923189370042" target="_blank" rel="noopener noreferrer" className="about-hero-btn about-hero-btn--primary">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a href="https://www.linkedin.com/in/yaseen-ahmad-489967280" target="_blank" rel="noopener noreferrer" className="about-hero-btn about-hero-btn--linkedin">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn
            </a>
            <a href="https://github.com/MrYaseen0" target="_blank" rel="noopener noreferrer" className="about-hero-btn about-hero-btn--github">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ────────────────────────────────────────── */}
      <section className="about-section about-stats-section">
        <div className="about-container">
          <div className="about-stats-grid">
            {STATS.map(s => (
              <div key={s.label} className="about-stat-card">
                <span className="about-stat-icon">{s.icon}</span>
                <div className="about-stat-value">{s.value}</div>
                <div className="about-stat-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bio ──────────────────────────────────────────── */}
      <section className="about-section">
        <div className="about-container">
          <div className="about-grid-2">
            <div className="about-card">
              <h2 className="about-card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                About Me
              </h2>
              <p className="about-bio-text">
                I don't just write code — I build solutions. As a Software Engineering student at CECOS University, Peshawar, I'm passionate about creating responsive, user-friendly applications that solve real-world problems.
              </p>
              <p className="about-bio-text">
                My focus is on full-stack development with the MERN stack and Python, building scalable web applications and AI-powered solutions. I believe in writing clean, maintainable code and creating products that make a genuine impact.
              </p>
              <div className="about-bio-highlight">
                Software Engineer · MERN Stack · Building Scalable Web Applications & AI Solutions · Python
              </div>
            </div>

            <div className="about-card">
              <h2 className="about-card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                Details
              </h2>
              <div className="about-detail-list">
                <div className="about-detail-row">
                  <span className="about-detail-label">Location</span>
                  <span className="about-detail-value">Peshawar, Khyber Pakhtunkhwa, Pakistan</span>
                </div>
                <div className="about-detail-row">
                  <span className="about-detail-label">Education</span>
                  <span className="about-detail-value">CECOS University, Peshawar</span>
                </div>
                <div className="about-detail-row">
                  <span className="about-detail-label">Role</span>
                  <span className="about-detail-value">Full-Stack Developer & AI Engineer</span>
                </div>
                <div className="about-detail-row">
                  <span className="about-detail-label">Email</span>
                  <span className="about-detail-value">yaseenahmad.exe@outlook.com</span>
                </div>
                <div className="about-detail-row">
                  <span className="about-detail-label">Phone</span>
                  <span className="about-detail-value">+92 318 937 0042</span>
                </div>
                <div className="about-detail-row">
                  <span className="about-detail-label">Status</span>
                  <span className="about-detail-value about-detail-status">
                    <span className="about-status-dot" /> Open to opportunities
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Skills ───────────────────────────────────────── */}
      <section className="about-section about-section--alt">
        <div className="about-container">
          <h2 className="about-section-title">Skills & Expertise</h2>
          <p className="about-section-sub">Technologies and tools I work with daily</p>
          <div className="about-skills-grid">
            {SKILLS.map(s => (
              <div key={s.name} className="about-skill-card">
                <div className="about-skill-header">
                  <span className="about-skill-icon">{s.icon}</span>
                  <span className="about-skill-name">{s.name}</span>
                  <span className="about-skill-pct">{s.level}%</span>
                </div>
                <div className="about-skill-bar">
                  <div className="about-skill-fill" style={{ width: `${s.level}%`, background: s.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journey Timeline ─────────────────────────────── */}
      <section className="about-section">
        <div className="about-container">
          <h2 className="about-section-title">My Journey</h2>
          <p className="about-section-sub">Key milestones in my development career</p>
          <div className="about-timeline">
            {TIMELINE.map((t, i) => (
              <div key={t.year} className="about-timeline-item">
                <div className="about-timeline-dot" />
                <div className="about-timeline-line" />
                <div className="about-timeline-year">{t.year}</div>
                <div className="about-timeline-card">
                  <h3 className="about-timeline-title">{t.title}</h3>
                  <p className="about-timeline-desc">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Social + Contact ─────────────────────────────── */}
      <section className="about-section about-section--alt">
        <div className="about-container">
          <h2 className="about-section-title">Let's Connect</h2>
          <p className="about-section-sub">Find me across the web</p>
          <div className="about-social-grid">
            <a href="https://wa.me/923189370042" target="_blank" rel="noopener noreferrer" className="about-social-card about-social--whatsapp">
              <div className="about-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </div>
              <span className="about-social-name">WhatsApp</span>
              <span className="about-social-handle">+92 318 937 0042</span>
            </a>

            <a href="https://www.linkedin.com/in/yaseen-ahmad-489967280" target="_blank" rel="noopener noreferrer" className="about-social-card about-social--linkedin">
              <div className="about-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </div>
              <span className="about-social-name">LinkedIn</span>
              <span className="about-social-handle">yaseen-ahmad</span>
            </a>

            <a href="https://github.com/MrYaseen0" target="_blank" rel="noopener noreferrer" className="about-social-card about-social--github">
              <div className="about-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
              </div>
              <span className="about-social-name">GitHub</span>
              <span className="about-social-handle">MrYaseen0</span>
            </a>

            <a href="https://www.instagram.com/yaseenahmadexe" target="_blank" rel="noopener noreferrer" className="about-social-card about-social--instagram">
              <div className="about-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
              </div>
              <span className="about-social-name">Instagram</span>
              <span className="about-social-handle">@yaseenahmadexe</span>
            </a>

            <a href="https://www.facebook.com/share/1BsjieEv7e/" target="_blank" rel="noopener noreferrer" className="about-social-card about-social--facebook">
              <div className="about-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <span className="about-social-name">Facebook</span>
              <span className="about-social-handle">Yaseen Ahmad</span>
            </a>

            <a href="https://x.com/yaseenahmadexe" target="_blank" rel="noopener noreferrer" className="about-social-card about-social--twitter">
              <div className="about-social-icon">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </div>
              <span className="about-social-name">X / Twitter</span>
              <span className="about-social-handle">@yaseenahmadexe</span>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="about-footer">
        <div className="about-container">
          <div className="about-footer-inner">
            <Logo size={20} />
            <span>Healtheon OS</span>
            <span className="about-footer-sep">·</span>
            <span>Built with passion by Yaseen Ahmad</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
