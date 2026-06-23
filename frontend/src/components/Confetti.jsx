/**
 * Confetti — Celebration particle effect
 */
import { useEffect, useRef } from 'react';

export default function Confetti({ active = false, onComplete }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;

    const colors = ['#067857', '#06b6d4', '#34d399', '#8b5cf6', '#f59e0b', '#ef4444', '#fcd34d'];
    const particles = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: w / 2 + (Math.random() - 0.5) * 200,
        y: h / 2,
        vx: (Math.random() - 0.5) * 20,
        vy: -Math.random() * 15 - 5,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 10,
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
        life: 1,
      });
    }

    let frame;
    function draw() {
      ctx.clearRect(0, 0, w, h);

      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.vy += 0.3;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.life -= 0.008;

        if (p.life <= 0) return;
        alive = true;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;

        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });

      if (alive) {
        frame = requestAnimationFrame(draw);
      } else {
        onComplete?.();
      }
    }
    draw();

    return () => cancelAnimationFrame(frame);
  }, [active, onComplete]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        pointerEvents: 'none',
      }}
    />
  );
}
