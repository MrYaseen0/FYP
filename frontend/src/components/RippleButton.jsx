/**
 * RippleButton — Material ripple effect button
 */
import { useState, useRef } from 'react';

export default function RippleButton({ children, onClick, className = '', style = {}, variant = 'primary' }) {
  const [ripples, setRipples] = useState([]);
  const btnRef = useRef(null);

  const addRipple = (e) => {
    const rect = btnRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;
    const id = Date.now();
    setRipples(prev => [...prev, { x, y, size, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    onClick?.(e);
  };

  const variants = {
    primary: {
      background: 'linear-gradient(135deg, #067857, #06b6d4)',
      color: '#fff',
      border: 'none',
    },
    ghost: {
      background: 'transparent',
      color: '#64748b',
      border: '1px solid transparent',
    },
    outline: {
      background: 'rgba(255,255,255,0.7)',
      color: '#0f172a',
      border: '1px solid rgba(229,231,235,0.8)',
    },
    glow: {
      background: 'linear-gradient(135deg, #067857, #06b6d4)',
      color: '#fff',
      border: 'none',
      boxShadow: '0 0 20px rgba(6,120,87,0.3)',
    },
  };

  return (
    <button
      ref={btnRef}
      className={`ripple-btn ${className}`}
      onClick={addRipple}
      style={{
        ...variants[variant],
        ...style,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 12,
        padding: '10px 20px',
        fontSize: '0.85rem',
        fontWeight: 600,
        fontFamily: "'Inter', sans-serif",
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        letterSpacing: '0.02em',
      }}
    >
      {ripples.map(r => (
        <span
          key={r.id}
          style={{
            position: 'absolute',
            left: r.x - r.size / 2,
            top: r.y - r.size / 2,
            width: r.size,
            height: r.size,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.35)',
            animation: 'rippleEffect 0.6s ease-out forwards',
            pointerEvents: 'none',
          }}
        />
      ))}
      <span style={{ position: 'relative', zIndex: 1 }}>{children}</span>
      <style>{`
        @keyframes rippleEffect {
          from { transform: scale(0); opacity: 1; }
          to { transform: scale(1); opacity: 0; }
        }
        .ripple-btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
        .ripple-btn:active { transform: translateY(0); filter: brightness(0.98); }
      `}</style>
    </button>
  );
}
