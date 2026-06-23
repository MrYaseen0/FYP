import { useEffect, useRef, useMemo } from 'react';
import './LiveWallpaper.css';

/**
 * LiveWallpaper — Premium animated background with floating orbs,
 * morphing blobs, and depth layers. Looks like a living wallpaper.
 */
export default function LiveWallpaper({ variant = 'default' }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  // Orb configurations — each has position, size, color, speed
  const orbs = useMemo(() => {
    const palettes = {
      default: [
        { color: 'rgba(6,120,87,0.12)',  size: 280, speed: 0.0003, offset: 0 },
        { color: 'rgba(6,182,212,0.10)', size: 220, speed: 0.0004, offset: 1.2 },
        { color: 'rgba(16,185,129,0.08)', size: 350, speed: 0.0002, offset: 2.5 },
        { color: 'rgba(59,130,246,0.07)', size: 200, speed: 0.0005, offset: 3.8 },
        { color: 'rgba(139,92,246,0.06)', size: 180, speed: 0.00035, offset: 5.1 },
        { color: 'rgba(245,158,11,0.05)', size: 160, speed: 0.00045, offset: 0.7 },
      ],
      warm: [
        { color: 'rgba(239,68,68,0.08)',  size: 300, speed: 0.0003, offset: 0 },
        { color: 'rgba(249,115,22,0.10)', size: 250, speed: 0.0004, offset: 1.5 },
        { color: 'rgba(245,158,11,0.07)', size: 320, speed: 0.00025, offset: 3.0 },
        { color: 'rgba(234,179,8,0.06)',  size: 200, speed: 0.0005, offset: 4.2 },
      ],
      cool: [
        { color: 'rgba(59,130,246,0.10)', size: 300, speed: 0.0003, offset: 0 },
        { color: 'rgba(6,182,212,0.08)',  size: 260, speed: 0.0004, offset: 1.8 },
        { color: 'rgba(139,92,246,0.09)', size: 220, speed: 0.00035, offset: 3.2 },
        { color: 'rgba(99,102,241,0.06)', size: 180, speed: 0.0005, offset: 4.5 },
      ],
    };
    return palettes[variant] || palettes.default;
  }, [variant]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let w, h;

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // Orb state: position, velocity
    const state = orbs.map(orb => ({
      ...orb,
      x: Math.random() * w,
      y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      phase: orb.offset * 1000,
    }));

    function draw(time) {
      ctx.clearRect(0, 0, w, h);

      state.forEach(orb => {
        // Smooth sinusoidal movement
        const t = time * orb.speed + orb.phase;
        orb.x += Math.sin(t) * 0.8 + orb.vx;
        orb.y += Math.cos(t * 0.7) * 0.6 + orb.vy;

        // Bounce off edges softly
        if (orb.x < -orb.size) orb.x = w + orb.size;
        if (orb.x > w + orb.size) orb.x = -orb.size;
        if (orb.y < -orb.size) orb.y = h + orb.size;
        if (orb.y > h + orb.size) orb.y = -orb.size;

        // Pulsing size
        const pulse = 1 + Math.sin(t * 1.5) * 0.08;
        const r = orb.size * pulse;

        // Draw radial gradient orb
        const grad = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r);
        grad.addColorStop(0, orb.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(orb.x - r, orb.y - r, r * 2, r * 2);
      });

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [orbs]);

  return (
    <div className="live-wallpaper">
      <canvas ref={canvasRef} className="live-wallpaper-canvas" />
      <div className="live-wallpaper-overlay" />
      {/* Static mesh gradient layer */}
      <div className="live-wallpaper-mesh" />
    </div>
  );
}
