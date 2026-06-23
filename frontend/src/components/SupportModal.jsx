import { useState } from 'react';
import './SupportModal.css';

const WHATSAPP_SVG = (
  <svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
);
const LINKEDIN_SVG = (
  <svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
);
const GITHUB_SVG = (
  <svg viewBox="0 0 24 24" fill="#333"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
);
const FACEBOOK_SVG = (
  <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
);
const INSTAGRAM_SVG = (
  <svg viewBox="0 0 24 24" fill="url(#ig-gradient)"><defs><linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stopColor="#feda75"/><stop offset="25%" stopColor="#fa7e1e"/><stop offset="50%" stopColor="#d62976"/><stop offset="75%" stopColor="#962fbf"/><stop offset="100%" stopColor="#4f5bd5"/></linearGradient></defs><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.882 0 1.441 1.441 0 012.882 0z"/></svg>
);
const PHONE_SVG = (
  <svg viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
);

const SOCIAL_ICONS = [
  { id: 'whatsapp', svg: WHATSAPP_SVG, href: 'https://wa.me/923189370042', label: 'WhatsApp', color: '#25D366' },
  { id: 'linkedin', svg: LINKEDIN_SVG, href: 'https://www.linkedin.com/in/yaseen-ahmad-489967280', label: 'LinkedIn', color: '#0A66C2' },
  { id: 'github', svg: GITHUB_SVG, href: 'https://github.com/MrYaseen0', label: 'GitHub', color: '#333' },
  { id: 'facebook', svg: FACEBOOK_SVG, href: 'https://www.facebook.com/share/1BsjieEv7e/', label: 'Facebook', color: '#1877F2' },
  { id: 'instagram', svg: INSTAGRAM_SVG, href: 'https://www.instagram.com/yaseenahmadexe', label: 'Instagram', color: '#E4405F' },
];

export default function SupportModal() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('contact');
  const [form, setForm] = useState({ name: '', email: '', type: 'complaint', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => { setSubmitted(false); setForm({ name: '', email: '', type: 'complaint', subject: '', message: '' }); }, 3000);
  };

  return (
    <>
      <button className="sm-trigger" onClick={() => setOpen(!open)} title="Support & Contact">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Support</span>
      </button>

      {open && (
        <div className="sm-overlay" onClick={() => setOpen(false)}>
          <div className="sm-modal" onClick={e => e.stopPropagation()}>
            <div className="sm-header">
              <div className="sm-header-left">
                <div className="sm-header-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                </div>
                <div>
                  <div className="sm-header-title">Support & Contact</div>
                  <div className="sm-header-sub">Healtheon OS</div>
                </div>
              </div>
              <button className="sm-close" onClick={() => setOpen(false)}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>

            <div className="sm-tabs">
              <button className={`sm-tab ${tab === 'contact' ? 'active' : ''}`} onClick={() => setTab('contact')}>Contact Us</button>
              <button className={`sm-tab ${tab === 'complaint' ? 'active' : ''}`} onClick={() => setTab('complaint')}>Complaint</button>
              <button className={`sm-tab ${tab === 'about' ? 'active' : ''}`} onClick={() => setTab('about')}>Developer</button>
            </div>

            <div className="sm-body">
              {tab === 'contact' && (
                <div className="sm-contact">
                  <div className="sm-floating-icons">
                    {SOCIAL_ICONS.map((s, i) => (
                      <a key={s.id} className="sm-float-icon" href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
                        style={{ animationDelay: `${i * 0.6}s` }}>
                        <div className="sm-float-icon-inner" style={{ boxShadow: `0 4px 14px ${s.color}30` }}>
                          {s.svg}
                        </div>
                        <span className="sm-float-label">{s.label}</span>
                      </a>
                    ))}
                  </div>
                  <div className="sm-contact-card">
                    <div className="sm-contact-card-icon">{PHONE_SVG}</div>
                    <div>
                      <div className="sm-contact-card-label">Call us directly</div>
                      <a className="sm-contact-card-link" href="tel:+923189370042">+92 318 937 0042</a>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'complaint' && (
                <form className="sm-form" onSubmit={handleSubmit}>
                  {submitted ? (
                    <div className="sm-success">
                      <div className="sm-success-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                      </div>
                      <div className="sm-success-title">Submitted Successfully</div>
                      <div className="sm-success-text">We'll review your message and get back to you.</div>
                    </div>
                  ) : (
                    <>
                      <div className="sm-form-row">
                        <div className="sm-field">
                          <label className="sm-label">Full Name *</label>
                          <input className="sm-input" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
                        </div>
                        <div className="sm-field">
                          <label className="sm-label">Email *</label>
                          <input className="sm-input" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
                        </div>
                      </div>
                      <div className="sm-field">
                        <label className="sm-label">Type</label>
                        <div className="sm-type-group">
                          {['complaint', 'advice', 'feedback', 'other'].map(t => (
                            <button key={t} type="button" className={`sm-type-btn ${form.type === t ? 'active' : ''}`} onClick={() => setForm({...form, type: t})}>
                              {t.charAt(0).toUpperCase() + t.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="sm-field">
                        <label className="sm-label">Subject *</label>
                        <input className="sm-input" type="text" required value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Brief subject" />
                      </div>
                      <div className="sm-field">
                        <label className="sm-label">Message *</label>
                        <textarea className="sm-textarea" required rows={4} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Describe your issue or feedback..." />
                      </div>
                      <button type="submit" className="sm-submit">Submit</button>
                    </>
                  )}
                </form>
              )}

              {tab === 'about' && (
                <div className="sm-about">
                  <div className="sm-about-profile">
                    <div className="sm-about-photo-wrap">
                      <img src="/yaseen-1.jpeg" alt="Yaseen Ahmad" className="sm-about-photo" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      <div className="sm-about-photo-fallback" style={{ display: 'none' }}>YA</div>
                      <div className="sm-about-photo-ring" />
                    </div>
                    <div className="sm-about-info">
                      <div className="sm-about-name">Yaseen Ahmad</div>
                      <div className="sm-about-tagline">Software Engineer · MERN Stack · Python</div>
                      <div className="sm-about-handle">@yaseenahmadexe · he/him</div>
                    </div>
                  </div>

                  <div className="sm-about-divider" />

                  <div className="sm-about-bio">
                    Building scalable web applications & AI solutions. Passionate about full-stack development, cloud architecture, and creating tools that make a real difference in healthcare and beyond.
                  </div>

                  <div className="sm-about-location">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    <span>Peshawar, Khyber Pakhtunkhwa, Pakistan</span>
                  </div>

                  <div className="sm-about-edu">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#067857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 10 3 12 0v-5"/></svg>
                    <span>CECOS University, Peshawar</span>
                  </div>

                  <div className="sm-about-skills">
                    <span className="sm-skill">React</span>
                    <span className="sm-skill">Node.js</span>
                    <span className="sm-skill">Python</span>
                    <span className="sm-skill">FastAPI</span>
                    <span className="sm-skill">PostgreSQL</span>
                    <span className="sm-skill">MongoDB</span>
                    <span className="sm-skill">AWS</span>
                    <span className="sm-skill">Docker</span>
                    <span className="sm-skill">AI/ML</span>
                  </div>

                  <div className="sm-about-socials">
                    {SOCIAL_ICONS.map(s => (
                      <a key={s.id} className="sm-about-social" href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}>
                        <div className="sm-about-social-icon">{s.svg}</div>
                      </a>
                    ))}
                  </div>

                  <div className="sm-about-footer">
                    <span className="sm-about-footer-dot" />
                    Open to opportunities
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
