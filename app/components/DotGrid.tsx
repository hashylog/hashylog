"use client";

import { useEffect, useRef } from "react";

const GAP = 28;
const BASE_RADIUS = 1;
const MAX_RADIUS = 3.2;
const INFLUENCE = 140;

export default function DotGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: -9999, y: -9999 });
  const raf = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cols = 0;
    let rows = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(window.innerWidth / GAP) + 1;
      rows = Math.ceil(window.innerHeight / GAP) + 1;
    }

    function getColor() {
      return getComputedStyle(document.documentElement)
        .getPropertyValue("--border")
        .trim();
    }

    function getAccent() {
      return getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
    }

    function draw() {
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const dotColor = getColor();
      const accentColor = getAccent();
      const mx = mouse.current.x;
      const my = mouse.current.y;

      const offsetX = ((window.innerWidth % GAP) / 2);
      const offsetY = ((window.innerHeight % GAP) / 2);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = offsetX + col * GAP;
          const y = offsetY + row * GAP;

          const dx = x - mx;
          const dy = y - my;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const t = Math.max(0, 1 - dist / INFLUENCE);
          const eased = t * t;

          const radius = BASE_RADIUS + (MAX_RADIUS - BASE_RADIUS) * eased;
          const alpha = 0.25 + 0.75 * eased;

          ctx!.beginPath();
          ctx!.arc(x, y, radius, 0, Math.PI * 2);
          ctx!.fillStyle =
            eased > 0.01
              ? hexWithAlpha(accentColor, alpha)
              : hexWithAlpha(dotColor, 0.25);
          ctx!.fill();
        }
      }

      raf.current = requestAnimationFrame(draw);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.current.x = -9999;
      mouse.current.y = -9999;
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    return () => {
      cancelAnimationFrame(raf.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    />
  );
}

function hexWithAlpha(hex: string, alpha: number): string {
  if (hex.startsWith("#")) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}
