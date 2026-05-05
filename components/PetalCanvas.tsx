"use client";

import { useEffect, useRef } from "react";

const PETAL_COLORS = [
  "oklch(84% 0.14 310)", "oklch(90% 0.10 320)", "oklch(80% 0.18 295)",
  "oklch(78% 0.20 355)", "oklch(86% 0.14 5)",   "oklch(70% 0.24 10)",
  "oklch(88% 0.18 80)",  "oklch(85% 0.14 70)",  "oklch(82% 0.16 65)",
];

class Petal {
  x = 0; y = 0; size = 0; speed = 0; drift = 0;
  rot = 0; rotV = 0; alpha = 0;
  colorA = ""; colorB = "";
  shape = 0; swing = 0; swingSpeed = 0;
  w = 0; h = 0;

  constructor(w: number, h: number, init: boolean) {
    this.w = w; this.h = h;
    this.reset(init);
  }
  reset(init: boolean) {
    this.x = Math.random() * this.w;
    this.y = init ? Math.random() * this.h : -20;
    this.size = 5 + Math.random() * 9;
    this.speed = 0.4 + Math.random() * 0.9;
    this.drift = (Math.random() - 0.5) * 0.7;
    this.rot = Math.random() * Math.PI * 2;
    this.rotV = (Math.random() - 0.5) * 0.03;
    this.alpha = 0.35 + Math.random() * 0.55;
    this.colorA = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    this.colorB = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
    this.shape = Math.floor(Math.random() * 3);
    this.swing = Math.random() * Math.PI * 2;
    this.swingSpeed = 0.01 + Math.random() * 0.02;
  }
  update() {
    this.swing += this.swingSpeed;
    this.x += this.drift + Math.sin(this.swing) * 0.6;
    this.y += this.speed;
    this.rot += this.rotV;
    if (this.y > this.h + 30) this.reset(false);
  }
  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.beginPath();
    if (this.shape === 0) {
      ctx.moveTo(0, -this.size * 0.5);
      ctx.bezierCurveTo( this.size * 0.9, -this.size * 0.9, this.size * 1.1,  this.size * 0.3, 0, this.size * 0.9);
      ctx.bezierCurveTo(-this.size * 1.1,  this.size * 0.3, -this.size * 0.9, -this.size * 0.9, 0, -this.size * 0.5);
      ctx.fillStyle = this.colorA;
    } else if (this.shape === 1) {
      ctx.ellipse(0, 0, this.size * 0.55, this.size, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.colorA;
    } else {
      ctx.ellipse(0, 0, this.size * 0.35, this.size * 0.9, 0, 0, Math.PI * 2);
      ctx.fillStyle = this.colorB;
    }
    ctx.fill();
    ctx.restore();
  }
}

export default function PetalCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let petals: Petal[] = [];
    let animId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      petals = Array.from({ length: 55 }, () => new Petal(canvas.width, canvas.height, true));
    };
    resize();
    window.addEventListener("resize", resize);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      petals.forEach((p) => { p.update(); p.draw(ctx); });
      animId = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed", inset: 0,
        pointerEvents: "none", zIndex: 1, opacity: 0.55,
      }}
    />
  );
}
