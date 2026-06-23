/**
 * Healtheon — Stunning Animated Logo
 * Elegant medical AI logo with organic animations and beautiful gradients.
 */
import { useEffect, useRef, useState } from 'react';

export default function Logo({ size = 40, className = '', showText = false, animate = false }) {
  const svgRef = useRef(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!animate || !svgRef.current) return;
    const svg = svgRef.current;
    let frame;
    let t = 0;

    function tick() {
      t += 0.015;

      // Breathing glow
      const glow = svg.querySelector('.logo-glow');
      if (glow) {
        const s = 1 + Math.sin(t * 1.5) * 0.15;
        glow.setAttribute('r', 42);
        glow.setAttribute('opacity', 0.08 + Math.sin(t * 1.5) * 0.04);
        glow.setAttribute('cx', 60 + Math.sin(t * 0.7) * 2);
        glow.setAttribute('cy', 60 + Math.cos(t * 0.9) * 2);
      }

      // Heart pulse
      const heart = svg.querySelector('.logo-heart');
      if (heart) {
        const scale = 1 + Math.sin(t * 2.5) * 0.04;
        heart.setAttribute('transform', `translate(60,60) scale(${scale}) translate(-60,-60)`);
      }

      // Orbiting petals
      const petals = svg.querySelectorAll('.logo-petal');
      petals.forEach((p, i) => {
        const angle = t * 0.8 + (i * Math.PI * 2) / petals.length;
        const x = 60 + Math.cos(angle) * 38;
        const y = 60 + Math.sin(angle) * 38;
        p.setAttribute('cx', x);
        p.setAttribute('cy', y);
        const op = 0.4 + Math.sin(t * 2 + i) * 0.25;
        p.setAttribute('opacity', op);
      });

      // Neural sparkles
      const sparkles = svg.querySelectorAll('.logo-sparkle');
      sparkles.forEach((s, i) => {
        const phase = i * 1.2;
        const flicker = Math.sin(t * 4 + phase);
        s.setAttribute('opacity', 0.2 + flicker * 0.5);
        s.setAttribute('r', 1.2 + flicker * 0.5);
      });

      // Inner ring rotation
      const ring1 = svg.querySelector('.logo-ring-1');
      const ring2 = svg.querySelector('.logo-ring-2');
      if (ring1) ring1.setAttribute('transform', `rotate(${t * 8}, 60, 60)`);
      if (ring2) ring2.setAttribute('transform', `rotate(${-t * 5}, 60, 60)`);

      frame = requestAnimationFrame(tick);
    }
    tick();
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  const gradId = `lg-${size}`;
  const bgId = `bg-${size}`;
  const glowId = `gw-${size}`;
  const heartId = `ht-${size}`;

  return (
    <div
      className={`healtheon-logo ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: size > 30 ? 10 : 6 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: animate
            ? `drop-shadow(0 0 ${hovered ? 16 : 10}px rgba(6,182,121,0.35))`
            : undefined,
          transition: 'filter 0.4s ease',
        }}
      >
        <defs>
          {/* Main gradient — soft emerald to aqua */}
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="35%" stopColor="#06b6d4" />
            <stop offset="65%" stopColor="#0891b2" />
            <stop offset="100%" stopColor="#067857" />
          </linearGradient>

          {/* Soft background */}
          <radialGradient id={bgId} cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#ecfdf5" />
            <stop offset="60%" stopColor="#f0fdfa" />
            <stop offset="100%" stopColor="#ffffff" />
          </radialGradient>

          {/* Glow gradient */}
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
          </radialGradient>

          {/* Heart gradient */}
          <linearGradient id={heartId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        {/* Outer glow */}
        <circle className="logo-glow" cx="60" cy="60" r="50" fill={`url(#${glowId})`} opacity="0.1" />

        {/* Soft background circle */}
        <circle cx="60" cy="60" r="54" fill={`url(#${bgId})`} />

        {/* Outer decorative ring — dashed, rotating */}
        <circle
          className="logo-ring-1"
          cx="60" cy="60" r="52"
          stroke={`url(#${gradId})`}
          strokeWidth="0.8"
          fill="none"
          strokeDasharray="3 6"
          opacity="0.4"
        />

        {/* Inner decorative ring — opposite rotation */}
        <circle
          className="logo-ring-2"
          cx="60" cy="60" r="46"
          stroke="#06b6d4"
          strokeWidth="0.5"
          fill="none"
          strokeDasharray="2 8"
          opacity="0.25"
        />

        {/* Outer circle border */}
        <circle
          cx="60" cy="60" r="54"
          stroke={`url(#${gradId})`}
          strokeWidth="2.5"
          fill="none"
          opacity="0.9"
        />

        {/* Medical cross — elegant rounded */}
        <g className="logo-heart" opacity="0.92">
          {/* Vertical bar */}
          <rect x="52" y="32" width="16" height="56" rx="8" fill={`url(#${gradId})`} />
          {/* Horizontal bar */}
          <rect x="32" y="52" width="56" height="16" rx="8" fill={`url(#${gradId})`} />
          {/* Center highlight */}
          <circle cx="60" cy="60" r="9" fill="white" opacity="0.95" />
          <circle cx="60" cy="60" r="5" fill={`url(#${gradId})`} opacity="0.85" />
        </g>

        {/* Heart in center */}
        <path
          d="M57 57 C57 55, 59 53, 61 55 C63 53, 65 55, 65 57 C65 60, 61 63, 61 63 C61 63, 57 60, 57 57Z"
          fill="white"
          opacity="0.9"
        >
          {animate && (
            <animate
              attributeName="d"
              values="M57 57 C57 55, 59 53, 61 55 C63 53, 65 55, 65 57 C65 60, 61 63, 61 63 C61 63, 57 60, 57 57Z;M56 57 C56 54, 59 52, 61 54.5 C63 52, 66 54, 66 57 C66 61, 61 64, 61 64 C61 64, 56 61, 56 57Z;M57 57 C57 55, 59 53, 61 55 C63 53, 65 55, 65 57 C65 60, 61 63, 61 63 C61 63, 57 60, 57 57Z"
              dur="1.5s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Floating petals / neural nodes */}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <circle
            key={i}
            className="logo-petal"
            cx={60}
            cy={60}
            r={2}
            fill={i % 2 === 0 ? '#34d399' : '#06b6d4'}
            opacity="0.4"
          />
        ))}

        {/* Sparkle stars */}
        {[
          { cx: 38, cy: 30 },
          { cx: 82, cy: 30 },
          { cx: 30, cy: 78 },
          { cx: 90, cy: 78 },
          { cx: 60, cy: 18 },
          { cx: 60, cy: 102 },
          { cx: 18, cy: 60 },
          { cx: 102, cy: 60 },
        ].map((pos, i) => (
          <g key={i} className="logo-sparkle" opacity="0.3">
            <line x1={pos.cx - 3} y1={pos.cy} x2={pos.cx + 3} y2={pos.cy} stroke="#06b6d4" strokeWidth="0.6" strokeLinecap="round" />
            <line x1={pos.cx} y1={pos.cy - 3} x2={pos.cx} y2={pos.cy + 3} stroke="#06b6d4" strokeWidth="0.6" strokeLinecap="round" />
          </g>
        ))}

        {/* Connection lines to center */}
        <g stroke="#06b6d4" strokeWidth="0.5" opacity="0.15" strokeLinecap="round">
          <line x1="38" y1="30" x2="52" y2="52" />
          <line x1="82" y1="30" x2="68" y2="52" />
          <line x1="30" y1="78" x2="52" y2="68" />
          <line x1="90" y1="78" x2="68" y2="68" />
          <line x1="60" y1="18" x2="60" y2="32" />
          <line x1="60" y1="102" x2="60" y2="88" />
          <line x1="18" y1="60" x2="32" y2="60" />
          <line x1="102" y1="60" x2="88" y2="60" />
        </g>

        {/* Orbiting dots */}
        {animate && [0, 1, 2].map(i => (
          <circle key={`orb-${i}`} r="1.5" fill="#34d399" opacity="0.5">
            <animateMotion
              dur={`${5 + i * 2}s`}
              repeatCount="indefinite"
              path="M60,6 A54,54 0 1,1 59.99,6"
              begin={`${i * 1.2}s`}
            />
          </circle>
        ))}
      </svg>

      {showText && (
        <div style={{ lineHeight: 1, userSelect: 'none' }}>
          <div style={{
            fontSize: size > 30 ? '1.15rem' : '0.85rem',
            fontWeight: 800,
            letterSpacing: '0.1em',
            background: 'linear-gradient(135deg, #34d399 0%, #06b6d4 40%, #0891b2 70%, #067857 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontFamily: "'Space Grotesk', 'Inter', sans-serif",
            filter: animate ? 'drop-shadow(0 1px 2px rgba(6,120,87,0.1))' : undefined,
          }}>HEALTHEON</div>
          {size > 30 && (
            <div style={{
              fontSize: '0.52rem',
              color: '#94a3b8',
              letterSpacing: '0.2em',
              fontWeight: 500,
              marginTop: 2,
            }}>CLINICAL AI PLATFORM</div>
          )}
        </div>
      )}

      <style>{`
        @keyframes logoSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .healtheon-logo { transition: transform 0.3s ease; }
        .healtheon-logo:hover { transform: scale(1.05); }
      `}</style>
    </div>
  );
}
