import { useState } from 'react';
import './AboutUsModal.css';

const LINKEDIN_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);
const GITHUB_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
);
const INSTAGRAM_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
);
const FACEBOOK_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const WHATSAPP_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const TWITTER_SVG = (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
);
const MAIL_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);
const PHONE_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);
const MAP_PIN_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
);
const CALENDAR_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
);

const SKILLS = [
  { name: 'React / Next.js', level: 92, color: '#61dafb' },
  { name: 'Node.js / Express', level: 88, color: '#68a063' },
  { name: 'Python / FastAPI', level: 85, color: '#3776ab' },
  { name: 'MongoDB / PostgreSQL', level: 82, color: '#47a248' },
  { name: 'TypeScript', level: 87, color: '#3178c6' },
  { name: 'Docker / AWS', level: 78, color: '#2496ed' },
  { name: 'AI / ML Integration', level: 80, color: '#ff6f61' },
  { name: 'UI/UX Design', level: 75, color: '#ff61a6' },
];

const STATS = [
  { label: 'Projects', value: '15+' },
  { label: 'Commits', value: '500+' },
  { label: 'Technologies', value: '20+' },
  { label: 'Years Coding', value: '4+' },
];

export default function AboutUsModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="au-trigger" onClick={() => setOpen(true)} title="About Developer">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4"/>
          <path d="M12 8h.01"/>
        </svg>
        <span>About Us</span>
      </button>

      {open && (
        <div className="au-overlay" onClick={() => setOpen(false)}>
          <div className="au-modal" onClick={e => e.stopPropagation()}>

            {/* Hero */}
            <div className="au-hero">
              <div className="au-hero-particles">
                {[...Array(6)].map((_, i) => <div key={i} className="au-particle" style={{ '--i': i }} />)}
              </div>
              <button className="au-close" onClick={() => setOpen(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
              <div className="au-hero-content">
                <div className="au-photo-wrap">
                  <img src="/yaseen-1.jpeg" alt="Yaseen Ahmad" className="au-photo" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  <div className="au-photo-fallback" style={{ display: 'none' }}>YA</div>
                  <div className="au-photo-ring" />
                  <div className="au-photo-dots">
                    <span /><span /><span />
                  </div>
                </div>
                <h2 className="au-name">Yaseen Ahmad</h2>
                <p className="au-handle">@yaseenahmadexe · he/him</p>
                <p className="au-tagline">Software Engineer · MERN Stack · Python</p>
              </div>
            </div>

            <div className="au-body">

              {/* Bio */}
              <div className="au-section">
                <h3 className="au-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  About
                </h3>
                <p className="au-bio">
                  I don't just write code — I build solutions. As a Software Engineering student at CECOS University, I'm passionate about creating responsive, user-friendly applications that solve real-world problems. My focus is on full-stack development with the MERN stack and Python, building scalable web applications and AI-powered solutions.
                </p>
                <p className="au-bio-highlight">
                  Software Engineer · MERN Stack · Building Scalable Web Applications & AI Solutions · Python
                </p>
              </div>

              {/* Stats */}
              <div className="au-stats">
                {STATS.map(s => (
                  <div key={s.label} className="au-stat">
                    <div className="au-stat-value">{s.value}</div>
                    <div className="au-stat-label">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="au-section">
                <h3 className="au-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
                  Skills & Expertise
                </h3>
                <div className="au-skills">
                  {SKILLS.map(s => (
                    <div key={s.name} className="au-skill">
                      <div className="au-skill-header">
                        <span className="au-skill-name">{s.name}</span>
                        <span className="au-skill-pct">{s.level}%</span>
                      </div>
                      <div className="au-skill-bar">
                        <div className="au-skill-fill" style={{ width: `${s.level}%`, background: s.color }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Info Cards */}
              <div className="au-section">
                <h3 className="au-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Details
                </h3>
                <div className="au-info-cards">
                  <div className="au-info-card">
                    <div className="au-info-icon au-info-icon--location">{MAP_PIN_SVG}</div>
                    <div>
                      <div className="au-info-label">Location</div>
                      <div className="au-info-value">Peshawar, Khyber Pakhtunkhwa, Pakistan</div>
                    </div>
                  </div>
                  <div className="au-info-card">
                    <div className="au-info-icon au-info-icon--edu">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 10 3 12 0v-5"/></svg>
                    </div>
                    <div>
                      <div className="au-info-label">Education</div>
                      <div className="au-info-value">CECOS University, Peshawar</div>
                    </div>
                  </div>
                  <div className="au-info-card">
                    <div className="au-info-icon au-info-icon--role">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    </div>
                    <div>
                      <div className="au-info-label">Role</div>
                      <div className="au-info-value">Full-Stack Developer & AI Engineer</div>
                    </div>
                  </div>
                  <div className="au-info-card">
                    <div className="au-info-icon au-info-icon--status">
                      <span className="au-status-dot" />
                    </div>
                    <div>
                      <div className="au-info-label">Status</div>
                      <div className="au-info-value">Open to opportunities</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="au-section">
                <h3 className="au-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  Contact
                </h3>
                <div className="au-contact-row">
                  <a href="tel:+923189370042" className="au-contact-item">
                    <div className="au-contact-icon">{PHONE_SVG}</div>
                    <span>+92 318 937 0042</span>
                  </a>
                  <a href="mailto:yaseenahmad.exe@outlook.com" className="au-contact-item">
                    <div className="au-contact-icon">{MAIL_SVG}</div>
                    <span>yaseenahmad.exe@outlook.com</span>
                  </a>
                </div>
              </div>

              {/* Social Links */}
              <div className="au-section">
                <h3 className="au-section-title">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                  Social
                </h3>
                <div className="au-social-grid">
                  <a href="https://wa.me/923189370042" target="_blank" rel="noopener noreferrer" className="au-social-card au-social--whatsapp">
                    <div className="au-social-icon">{WHATSAPP_SVG}</div>
                    <span>WhatsApp</span>
                  </a>
                  <a href="https://www.linkedin.com/in/yaseen-ahmad-489967280" target="_blank" rel="noopener noreferrer" className="au-social-card au-social--linkedin">
                    <div className="au-social-icon">{LINKEDIN_SVG}</div>
                    <span>LinkedIn</span>
                  </a>
                  <a href="https://github.com/MrYaseen0" target="_blank" rel="noopener noreferrer" className="au-social-card au-social--github">
                    <div className="au-social-icon">{GITHUB_SVG}</div>
                    <span>GitHub</span>
                  </a>
                  <a href="https://www.facebook.com/share/1BsjieEv7e/" target="_blank" rel="noopener noreferrer" className="au-social-card au-social--facebook">
                    <div className="au-social-icon">{FACEBOOK_SVG}</div>
                    <span>Facebook</span>
                  </a>
                  <a href="https://www.instagram.com/yaseenahmadexe" target="_blank" rel="noopener noreferrer" className="au-social-card au-social--instagram">
                    <div className="au-social-icon">{INSTAGRAM_SVG}</div>
                    <span>Instagram</span>
                  </a>
                  <a href="https://x.com/yaseenahmadexe" target="_blank" rel="noopener noreferrer" className="au-social-card au-social--twitter">
                    <div className="au-social-icon">{TWITTER_SVG}</div>
                    <span>X / Twitter</span>
                  </a>
                </div>
              </div>

              {/* Footer */}
              <div className="au-footer">
                <span className="au-footer-dot" />
                Built with ❤ by Yaseen Ahmad
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
