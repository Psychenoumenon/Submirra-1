import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  z: number;
  size: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
}

export default function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let stars: Star[] = [];
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let targetMouseX = mouseX;
    let targetMouseY = mouseY;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
    };

    const initStars = () => {
      stars = [];
      const numStars = Math.floor((canvas.width * canvas.height) / 3000);
      for (let i = 0; i < numStars; i++) {
        const baseVx = (Math.random() - 0.5) * 0.3;
        const baseVy = (Math.random() - 0.5) * 0.3;
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 3,
          size: Math.random() * 1.5 + 0.5,
          vx: baseVx,
          vy: baseVy,
          baseVx,
          baseVy,
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    const updateStars = () => {
      // Smooth mouse tracking
      mouseX += (targetMouseX - mouseX) * 0.02;
      mouseY += (targetMouseY - mouseY) * 0.02;

      // Calculate mouse influence direction
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const mouseInfluenceX = (mouseX - centerX) / centerX;
      const mouseInfluenceY = (mouseY - centerY) / centerY;

      stars.forEach((star) => {
        // Add subtle mouse-based movement (slower for distant stars)
        const mouseEffect = 0.15 * (star.z / 3);
        star.vx = star.baseVx + mouseInfluenceX * mouseEffect;
        star.vy = star.baseVy + mouseInfluenceY * mouseEffect;

        star.x += star.vx;
        star.y += star.vy;

        if (star.x < 0) star.x = canvas.width;
        if (star.x > canvas.width) star.x = 0;
        if (star.y < 0) star.y = canvas.height;
        if (star.y > canvas.height) star.y = 0;
      });
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      stars.forEach((star) => {
        const opacity = 0.3 + (star.z / 3) * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() > 0.998) {
          ctx.shadowBlur = 10;
          ctx.shadowColor = star.z > 2 ? '#ec4899' : star.z > 1 ? '#a855f7' : '#06b6d4';
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });
    };

    const animate = () => {
      updateStars();
      drawStars();
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    animate();

    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.4 }}
    />
  );
}
