/**
 * Aurora — Animated mesh gradient background
 * Beautiful flowing colors that react subtly to mouse.
 */
import { useEffect, useRef } from 'react';

export default function Aurora({ colors = ['#067857', '#06b6d4', '#34d399', '#8b5cf6'] }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h, t = 0, mouseX = 0.5, mouseY = 0.5;
    let frame;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const onMove = e => {
      mouseX = e.clientX / w;
      mouseY = e.clientY / h;
    };
    window.addEventListener('mousemove', onMove);

    const blobs = colors.map((color, i) => ({
      x: 0.3 + i * 0.15,
      y: 0.4 + (i % 2) * 0.2,
      r: 0.25 + Math.random() * 0.1,
      color,
      speedX: (0.3 + Math.random() * 0.4) * (i % 2 === 0 ? 1 : -1),
      speedY: (0.2 + Math.random() * 0.3) * (i % 2 === 0 ? -1 : 1),
    }));

    function draw() {
      t += 0.003;
      ctx.clearRect(0, 0, w, h);

      // Very subtle white base
      ctx.fillStyle = 'rgba(255,255,255,0.02)';
      ctx.fillRect(0, 0, w, h);

      blobs.forEach((blob, i) => {
        const ox = Math.sin(t * blob.speedX + i) * 0.15 + (mouseX - 0.5) * 0.05;
        const oy = Math.cos(t * blob.speedY + i) * 0.15 + (mouseY - 0.5) * 0.05;
        const x = (blob.x + ox) * w;
        const y = (blob.y + oy) * h;
        const r = blob.r * Math.min(w, h);

        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, blob.color + '18');
        grad.addColorStop(0.5, blob.color + '08');
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      });

      frame = requestAnimationFrame(draw);
    }
    draw();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMove);
    };
  }, [colors]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        opacity: 0.8,
      }}
    />
  );
}
