import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './RadialOrbitalTimeline.css';

const Icons = {
  FileText: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  Stethoscope: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/>
    </svg>
  ),
  Heart: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
    </svg>
  ),
  Brain: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/>
    </svg>
  ),
  Flask: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16.5h10"/>
    </svg>
  ),
  Microscope: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
    </svg>
  ),
  Clipboard: ({ size = 16 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>
    </svg>
  ),
  Zap: ({ size = 10 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Link: ({ size = 10 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  ArrowRight: ({ size = 8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  ),
  X: ({ size = 12 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  ),
};

export { Icons };

export default function RadialOrbitalTimeline({ timelineData = [] }) {
  const [expandedId, setExpandedId] = useState(null);
  const [angle, setAngle] = useState(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(null);

  const total = timelineData.length;

  const nodePositions = useMemo(() => {
    return timelineData.map((_, i) => {
      const a = ((i / total) * 360 + angle) % 360;
      const r = 160;
      const rad = (a * Math.PI) / 180;
      return {
        x: r * Math.cos(rad),
        y: r * Math.sin(rad),
        z: Math.round(100 + 50 * Math.cos(rad)),
        opacity: Math.max(0.5, Math.min(1, 0.5 + 0.5 * ((1 + Math.sin(rad)) / 2))),
      };
    });
  }, [total, angle]);

  useEffect(() => {
    if (expandedId) return;
    const tick = (time) => {
      if (lastTimeRef.current !== null) {
        const dt = time - lastTimeRef.current;
        setAngle(prev => (prev + dt * 0.005) % 360);
      }
      lastTimeRef.current = time;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = null;
    };
  }, [expandedId]);

  const handleNodeClick = useCallback((id) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const handleBgClick = useCallback((e) => {
    if (e.target.closest('.rot-node') || e.target.closest('.rot-detail-card')) return;
    setExpandedId(null);
  }, []);

  const getStatusClass = (s) => s === 'completed' ? 'rot-completed' : s === 'in-progress' ? 'rot-in-progress' : 'rot-pending';
  const getStatusLabel = (s) => s === 'completed' ? 'COMPLETE' : s === 'in-progress' ? 'IN PROGRESS' : 'PENDING';

  const expandedItem = expandedId ? timelineData.find(i => i.id === expandedId) : null;

  if (total === 0) return null;

  return (
    <div className="rot-timeline-container" onClick={handleBgClick}>
      <div className="rot-orbit-area">
        <div className="rot-center-hub">
          <div className="rot-center-glow" />
          <div className="rot-center-ping" />
          <div className="rot-center-ping rot-ping-2" />
          <div className="rot-center-ping rot-ping-3" />
          <div className="rot-center-core" />
        </div>

        <div className="rot-orbit-ring" />

        <svg className="rot-connections-svg" viewBox="-250 -250 500 500">
          <defs>
            <filter id="rotGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {timelineData.map((item, i) => {
            if (i === total - 1) return null;
            const p1 = nodePositions[i];
            const p2 = nodePositions[(i + 1) % total];
            const done = item.status === 'completed';
            const active = item.status === 'in-progress';
            const col = done ? '#059669' : active ? '#0891b2' : '#d1d5db';
            return (
              <g key={i}>
                <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={col} strokeWidth={done ? 1.5 : 1}
                  strokeDasharray={done ? 'none' : '4 4'} opacity={done ? 0.45 : 0.2} />
                {active && (
                  <line x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={col} strokeWidth="2" filter="url(#rotGlow)"
                    opacity="0.6" className="rot-active-connection" />
                )}
                {done && (
                  <circle r="2" fill={col} opacity="0.7">
                    <animateMotion dur="3s" repeatCount="indefinite"
                      path={`M${p1.x},${p1.y} L${p2.x},${p2.y}`} />
                  </circle>
                )}
              </g>
            );
          })}
        </svg>

        {timelineData.map((item, index) => {
          const pos = nodePositions[index];
          const isOpen = expandedId === item.id;
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              className={`rot-node ${isOpen ? 'rot-expanded' : ''}`}
              style={{
                transform: `translate(${pos.x}px, ${pos.y}px)`,
                zIndex: isOpen ? 200 : pos.z,
                opacity: isOpen ? 1 : pos.opacity,
              }}
              onClick={(e) => { e.stopPropagation(); handleNodeClick(item.id); }}
            >
              <div className={`rot-node-circle ${getStatusClass(item.status)} ${isOpen ? 'rot-expanded-circle' : ''}`}>
                {typeof Icon === 'function' ? <Icon size={16} /> : <span>{item.title?.[0]}</span>}
              </div>

              <div className={`rot-node-title ${isOpen ? 'rot-title-expanded' : ''}`}>
                {item.title}
              </div>
            </div>
          );
        })}

        {expandedItem && (
          <div className="rot-detail-card" onClick={e => e.stopPropagation()}>
            <button className="rot-detail-close" onClick={() => setExpandedId(null)}>
              <Icons.X size={12} />
            </button>
            <div className="rot-detail-header">
              <span className={`rot-detail-badge ${getStatusClass(expandedItem.status)}`}>
                {getStatusLabel(expandedItem.status)}
              </span>
              <span className="rot-detail-date">{expandedItem.date}</span>
            </div>
            <div className="rot-detail-title">{expandedItem.title}</div>
            <div className="rot-detail-content"><p>{expandedItem.content}</p></div>
            <div className="rot-detail-energy">
              <div className="rot-detail-energy-label">
                <Icons.Zap size={10} />
                <span>Energy Level</span>
                <span className="rot-detail-energy-val">{expandedItem.energy}%</span>
              </div>
              <div className="rot-detail-energy-track">
                <div className="rot-detail-energy-fill" style={{ width: `${expandedItem.energy}%` }} />
              </div>
            </div>
            {expandedItem.relatedIds?.length > 0 && (
              <div className="rot-detail-related">
                <div className="rot-detail-related-header">
                  <Icons.Link size={10} />
                  <span>Connected Nodes</span>
                </div>
                <div className="rot-detail-related-list">
                  {expandedItem.relatedIds.map(rid => {
                    const rel = timelineData.find(i => i.id === rid);
                    if (!rel) return null;
                    return (
                      <button key={rid} className="rot-detail-related-btn"
                        onClick={(e) => { e.stopPropagation(); handleNodeClick(rid); }}>
                        {rel.title}
                        <Icons.ArrowRight size={8} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
