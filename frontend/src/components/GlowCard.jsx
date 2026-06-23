/**
 * GlowCard — Card with dynamic glow effect that follows mouse
 */
import { useRef, useState } from 'react';

export default function GlowCard({ children, className = '', style = {}, color = '#06b6d4' }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0, show: false });

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      show: true,
    });
  };

  return (
    <div
      ref={ref}
      className={`glow-card ${className}`}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos(p => ({ ...p, show: false }))}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(229,231,235,0.6)',
        ...style,
      }}
    >
      {/* Dynamic glow spotlight */}
      <div
        style={{
          position: 'absolute',
          left: pos.x - 100,
          top: pos.y - 100,
          width: 200,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}15, transparent 70%)`,
          opacity: pos.show ? 1 : 0,
          transition: 'opacity 0.3s',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
