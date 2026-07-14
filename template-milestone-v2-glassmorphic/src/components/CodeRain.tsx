'use client';

import { useEffect, useRef } from 'react';

export default function CodeRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize);

    const chars = 'アイウエオカキクケコサシスセソタチツテト0123456789ABCDEF';
    const fontSize = 16;
    const columns = Math.floor(window.innerWidth / fontSize);

    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    let frameCount = 0;

    const draw = () => {
      frameCount++;
      if (frameCount % 2 !== 0) {
        animationId = requestAnimationFrame(draw);
        return;
      }

      ctx.fillStyle = 'rgba(8, 9, 10, 0.05)';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      ctx.font = `${fontSize}px JetBrains Mono`;

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head - bright cyan with glow
        if (Math.random() > 0.95) {
          ctx.shadowBlur = 12;
          ctx.shadowColor = '#22d3ee';
          ctx.fillStyle = '#22d3ee';
        } else {
          // Tail - green with subtle glow
          ctx.shadowBlur = 4;
          ctx.shadowColor = '#4ade80';
          ctx.fillStyle = `rgba(74, 222, 128, ${0.3 + Math.random() * 0.4})`;
        }

        ctx.fillText(char, x, y);

        drops[i]++;
        if (y > canvas.height / dpr && Math.random() > 0.975) {
          drops[i] = 0;
        }
      }

      ctx.shadowBlur = 0;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10"
      style={{ background: '#08090a' }}
    />
  );
}
