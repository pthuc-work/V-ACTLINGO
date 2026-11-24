import React, { useEffect, useRef } from 'react';

interface ConfettiPiece {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  color: string;
  opacity: number;
}

const COLORS = [
  '#58cc02', // green
  '#1cb0f6', // blue
  '#ffc800', // yellow
  '#ff4b4b', // red
  '#ff9600', // orange
  '#ce82ff', // purple
  '#2b70c9', // bách khoa navy/blue
  '#00cd9c', // teal
];

export const Confetti: React.FC<{ durationMs?: number }> = ({ durationMs = 3500 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const pieceCount = Math.min(100, Math.floor(width / 12));
    const pieces: ConfettiPiece[] = [];

    for (let i = 0; i < pieceCount; i++) {
      pieces.push({
        x: width * 0.5 + (Math.random() - 0.5) * 200,
        y: height * 0.4 + (Math.random() - 0.5) * 100,
        w: Math.random() * 8 + 6,
        h: Math.random() * 6 + 4,
        vx: (Math.random() - 0.5) * 14,
        vy: -Math.random() * 12 - 4,
        rotation: Math.random() * 360,
        vRot: (Math.random() - 0.5) * 12,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        opacity: 1,
      });
    }

    const startTime = performance.now();

    const render = (now: number) => {
      const elapsed = now - startTime;
      const progress = elapsed / durationMs;

      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      for (const p of pieces) {
        // Physics
        p.vy += 0.35; // gravity
        p.vx *= 0.98; // air resistance
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vRot;

        if (progress > 0.6) {
          p.opacity = Math.max(0, 1 - (progress - 0.6) / 0.4);
        }

        if (p.opacity > 0 && p.y < height + 50) {
          aliveCount++;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
        }
      }

      if (progress < 1 && aliveCount > 0) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [durationMs]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
