/**
 * AnimatedBorder — Card with animated gradient border
 */
export default function AnimatedBorder({ children, className = '', style = {} }) {
  return (
    <div
      className={`animated-border ${className}`}
      style={{
        position: 'relative',
        borderRadius: 20,
        padding: 2,
        background: 'linear-gradient(var(--angle, 0deg), #34d399, #06b6d4, #8b5cf6, #067857, #34d399)',
        animation: 'borderRotate 4s linear infinite',
        ...style,
      }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.95)',
        borderRadius: 18,
        padding: 'inherit',
        width: '100%',
        height: '100%',
      }}>
        {children}
      </div>
      <style>{`
        @keyframes borderRotate {
          to { --angle: 360deg; }
        }
        @property --angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
      `}</style>
    </div>
  );
}
