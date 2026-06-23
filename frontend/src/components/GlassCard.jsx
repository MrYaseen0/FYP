/**
 * GlassCard — 3D tilt hover effect glassmorphism card
 */
import { useRef, useState } from 'react';

export default function GlassCard({ children, className = '', style = {}, glowColor = '#06b6d4' }) {
  const ref = useRef(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, glow: false });

  const handleMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - y) * 12,
      y: (x - 0.5) * 12,
      glow: true,
    });
  };

  const handleLeave = () => setTilt({ x: 0, y: 0, glow: false });

  return (
    <div
      ref={ref}
      className={`glass-card-component ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        ...style,
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s ease-out, box-shadow 0.3s ease',
        boxShadow: tilt.glow
          ? `0 8px 32px rgba(0,0,0,0.08), 0 0 20px ${glowColor}15`
          : '0 4px 16px rgba(0,0,0,0.06)',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255,255,255,0.6)',
        borderRadius: 20,
        cursor: 'default',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}
