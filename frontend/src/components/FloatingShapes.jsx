/**
 * FloatingShapes — Decorative animated floating elements
 */
export default function FloatingShapes() {
  const shapes = [
    { type: 'circle', x: '8%', y: '15%', size: 80, color: '#067857', delay: 0, dur: 7 },
    { type: 'circle', x: '85%', y: '20%', size: 60, color: '#06b6d4', delay: 1, dur: 9 },
    { type: 'circle', x: '15%', y: '75%', size: 50, color: '#34d399', delay: 2, dur: 8 },
    { type: 'circle', x: '90%', y: '70%', size: 70, color: '#8b5cf6', delay: 0.5, dur: 10 },
    { type: 'circle', x: '50%', y: '10%', size: 40, color: '#06b6d4', delay: 1.5, dur: 6 },
    { type: 'square', x: '5%', y: '45%', size: 30, color: '#067857', delay: 3, dur: 11 },
    { type: 'square', x: '95%', y: '45%', size: 25, color: '#34d399', delay: 2.5, dur: 8 },
    { type: 'diamond', x: '25%', y: '5%', size: 20, color: '#06b6d4', delay: 1, dur: 7 },
    { type: 'diamond', x: '75%', y: '85%', size: 24, color: '#8b5cf6', delay: 0.5, dur: 9 },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      {shapes.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            borderRadius: s.type === 'circle' ? '50%' : s.type === 'diamond' ? '4px' : '8px',
            background: s.color + '08',
            border: `1px solid ${s.color}15`,
            animation: `floatShape ${s.dur}s ease-in-out ${s.delay}s infinite alternate`,
            transform: s.type === 'diamond' ? 'rotate(45deg)' : undefined,
          }}
        />
      ))}
      <style>{`
        @keyframes floatShape {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-30px) rotate(10deg); }
        }
      `}</style>
    </div>
  );
}
