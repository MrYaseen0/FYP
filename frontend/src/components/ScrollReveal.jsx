/**
 * useScrollReveal — Hook for scroll-triggered animations
 */
import { useState, useEffect, useRef } from 'react';

export function useScrollReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return [ref, visible];
}

/**
 * ScrollReveal — Wrapper component with animation
 */
export function ScrollReveal({ children, animation = 'fadeInUp', delay = 0, className = '', style = {} }) {
  const [ref, visible] = useScrollReveal();

  const animations = {
    fadeInUp: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(40px)',
    },
    fadeInLeft: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(-40px)',
    },
    fadeInRight: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(40px)',
    },
    scaleIn: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'scale(1)' : 'scale(0.85)',
    },
    flipIn: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'perspective(600px) rotateX(0)' : 'perspective(600px) rotateX(15deg)',
    },
  };

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...animations[animation],
        transition: `all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
