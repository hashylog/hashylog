"use client";

import { useEffect, useRef } from "react";
import { motion } from "../lib/motion";

// Scroll range in which the lily assembles from the rain.
const ASSEMBLE_START = 0.74;
const ASSEMBLE_END = 0.94;

interface Dot {
  // 3D position in flower space (units: petal length = 1)
  x: number;
  y: number;
  z: number;
  size: number;
  tint: number; // 0 = white, 1 = cold blue-white
  light: number; // base brightness
  delay: number;
  seed: number;
  fromX: number; // scatter offset in viewport fractions
  fromY: number;
}

interface Pollen {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

function rand(a = 0, b = 1) {
  return a + Math.random() * (b - a);
}

function makeDot(x: number, y: number, z: number, light: number, size = 1): Dot {
  return {
    x,
    y,
    z,
    size: size * rand(0.8, 1.25),
    tint: Math.random() < 0.18 ? 1 : 0,
    light,
    delay: Math.random(),
    seed: Math.random(),
    fromX: rand(-0.25, 0.25),
    fromY: -rand(0.6, 1.4),
  };
}

// Builds an original, stippled lily: six recurved tepals, stamens, pistil and stem.
function buildLily(density: number): Dot[] {
  const dots: Dot[] = [];
  const tepals = 6;

  for (let i = 0; i < tepals; i++) {
    const inner = i % 2 === 1;
    const angle = (i / tepals) * Math.PI * 2 + rand(-0.12, 0.12);
    const length = rand(0.88, 1.04);
    const maxW = inner ? 0.36 : 0.29;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const count = Math.round((inner ? 1250 : 1050) * density);

    for (let k = 0; k < count; k++) {
      const u = Math.pow(Math.random(), 0.85);
      const width = maxW * Math.pow(Math.sin(Math.PI * Math.min(1, u * 1.02)), 0.8) * (1 - 0.25 * u);

      // Bias towards the edges and the midrib, the way light catches a petal.
      const roll = Math.random();
      let s: number;
      if (roll < 0.3) s = 1 - Math.random() * Math.random() * 0.25;
      else if (roll < 0.38) s = Math.random() * 0.06;
      else s = Math.sqrt(Math.random());
      s *= Math.random() < 0.5 ? -1 : 1;
      const lateral = s * width;

      const r = u * length;
      // Cup upwards, then recurve the tip backwards.
      const lift = 0.62 * u - 1.6 * Math.max(0, u - 0.5) ** 2 + 0.1 * s * s;
      const twist = 0.18 * u * u * (inner ? 1 : -1);

      const px = dirX * r - dirY * lateral + -dirY * twist * 0.3;
      const py = dirY * r + dirX * lateral + dirX * twist * 0.3;
      const edge = Math.abs(s);
      const light = 0.32 + 0.45 * edge ** 4 + 0.4 * (1 - u) ** 2;
      dots.push(makeDot(px, py, lift, light, edge > 0.9 ? 1.15 : 1));
    }
  }

  // Dense, bright throat.
  const throat = Math.round(520 * density);
  for (let k = 0; k < throat; k++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.pow(Math.random(), 1.6) * 0.22;
    dots.push(makeDot(Math.cos(a) * r, Math.sin(a) * r, 0.05 + r * 0.6 + rand(0, 0.04), 0.95, 0.9));
  }

  // Stamens with anthers.
  for (let j = 0; j < 6; j++) {
    const a = (j / 6) * Math.PI * 2 + rand(-0.3, 0.3) + 0.4;
    const reach = rand(0.6, 0.8);
    const steps = Math.round(46 * density);
    let tipX = 0;
    let tipY = 0;
    let tipZ = 0;
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      tipX = Math.cos(a) * reach * t * 0.75;
      tipY = Math.sin(a) * reach * t * 0.75;
      tipZ = 0.1 + 0.62 * t - 0.22 * t * t;
      dots.push(makeDot(tipX + rand(-0.006, 0.006), tipY + rand(-0.006, 0.006), tipZ, 0.8, 0.85));
    }
    const anther = Math.round(40 * density);
    for (let k = 0; k < anther; k++) {
      const t = rand(-1, 1);
      dots.push(
        makeDot(
          tipX + -Math.sin(a) * t * 0.045 + rand(-0.012, 0.012),
          tipY + Math.cos(a) * t * 0.045 + rand(-0.012, 0.012),
          tipZ + rand(-0.015, 0.015),
          1,
          1.2,
        ),
      );
    }
  }

  // Pistil.
  const pistil = Math.round(60 * density);
  for (let k = 0; k < pistil; k++) {
    const t = k / pistil;
    dots.push(makeDot(0.04 * t + rand(-0.006, 0.006), -0.03 * t, 0.1 + 0.82 * t, 0.85, 0.9));
  }
  for (let k = 0; k < Math.round(30 * density); k++) {
    const a = rand(0, Math.PI * 2);
    const r = Math.sqrt(Math.random()) * 0.035;
    dots.push(makeDot(0.04 + Math.cos(a) * r, -0.03 + Math.sin(a) * r, 0.93, 1, 1.1));
  }

  // Stem: sparse, thinning out as it falls away.
  const stem = Math.round(360 * density);
  for (let k = 0; k < stem; k++) {
    const t = Math.pow(Math.random(), 0.7);
    const sx = 0.08 * Math.sin(t * 2.2);
    const sz = -0.15 - t * 1.6;
    const spread = 0.025 + t * 0.03;
    const keep = 1 - t * 0.7;
    if (Math.random() > keep) continue;
    dots.push(makeDot(sx + rand(-spread, spread), rand(-spread, spread), sz, 0.95 * (1 - t * 0.55), 0.95));
  }

  return dots;
}

export default function Lily() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const slot = slotRef.current;
    if (!canvas || !slot) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const dots = buildLily(window.innerWidth < 640 ? 0.6 : 1);
    const pollen: Pollen[] = [];
    const mouse = { x: -9999, y: -9999 };
    // Projected positions from the last frame, used to spawn pollen.
    const screen = new Float32Array(dots.length * 2);

    let raf = 0;
    let cleared = false;
    let last = performance.now();
    let time = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = Math.round(window.innerWidth * dpr);
      canvas!.height = Math.round(window.innerHeight * dpr);
      canvas!.style.width = `${window.innerWidth}px`;
      canvas!.style.height = `${window.innerHeight}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function frame(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt * (reduceMotion ? 0.2 : 1);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const p = motion.progress;
      const phase = (p - ASSEMBLE_START) / (ASSEMBLE_END - ASSEMBLE_START);

      if (phase <= 0) {
        if (!cleared) {
          ctx!.clearRect(0, 0, vw, vh);
          pollen.length = 0;
          cleared = true;
        }
        raf = requestAnimationFrame(frame);
        return;
      }
      cleared = false;
      ctx!.clearRect(0, 0, vw, vh);

      const rect = slot!.getBoundingClientRect();
      const dotSize = rect.width < 360 ? 1.4 : 1.8;
      const scale = rect.width * 0.44;
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.4;

      // View: tilted towards the viewer, slowly swaying.
      const tilt = 0.95 + Math.sin(time * 0.31) * 0.05;
      const roll = -0.45 + Math.sin(time * 0.23) * 0.05;
      const yaw = Math.sin(time * 0.17) * 0.22;
      const ct = Math.cos(tilt);
      const st = Math.sin(tilt);
      const cr = Math.cos(roll);
      const sr = Math.sin(roll);
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);

      const settled = Math.min(1, Math.max(0, phase));

      for (let i = 0; i < dots.length; i++) {
        const d = dots[i];

        // Each dot lands at its own moment, like drops settling.
        const k = Math.min(1, Math.max(0, (phase - d.delay * 0.55) / 0.45));
        if (k <= 0) continue;
        const e = 1 - (1 - k) ** 3;

        // Rotate: yaw (around flower axis), tilt (around x), roll (in screen plane).
        const x1 = d.x * cyw - d.y * syw;
        const y1 = d.x * syw + d.y * cyw;
        // Flower axis (+z) points up the screen and towards the viewer.
        const y2 = y1 * ct + d.z * st;
        const z2 = -y1 * st + d.z * ct;
        const x3 = x1 * cr - y2 * sr;
        const y3 = x1 * sr + y2 * cr;

        let sx = cx + x3 * scale;
        let sy = cy - y3 * scale;

        // Scatter offset while assembling.
        sx += d.fromX * vw * (1 - e);
        sy += d.fromY * vh * (1 - e);

        if (finePointer) {
          const mx = sx - mouse.x;
          const my = sy - mouse.y;
          const dist = Math.sqrt(mx * mx + my * my);
          if (dist < 80 && dist > 0.01) {
            const push = (1 - dist / 80) ** 2 * 16;
            sx += (mx / dist) * push;
            sy += (my / dist) * push;
          }
        }

        screen[i * 2] = sx;
        screen[i * 2 + 1] = sy;

        const depth = 0.65 + 0.35 * Math.max(-1, Math.min(1, z2 * 1.2));
        const twinkle = reduceMotion ? 1 : 0.82 + 0.18 * Math.sin(time * 1.6 + d.seed * 40);
        const alpha = Math.min(1, d.light * depth * twinkle * e);
        if (alpha < 0.02) continue;

        ctx!.globalAlpha = alpha;
        ctx!.fillStyle = d.tint ? "#c9dbe8" : "#eef0f2";
        const size = dotSize * d.size;
        ctx!.fillRect(sx - size / 2, sy - size / 2, size, size);
      }

      // Pollen slowly falling from the flower once it has formed.
      if (settled > 0.95 && !reduceMotion && pollen.length < 36 && Math.random() < 0.25) {
        const i = (Math.random() * dots.length) | 0;
        pollen.push({
          x: screen[i * 2],
          y: screen[i * 2 + 1],
          vx: rand(-4, 4),
          vy: rand(6, 18),
          life: 0,
          max: rand(3, 6),
        });
      }
      ctx!.fillStyle = "#eef0f2";
      for (let i = pollen.length - 1; i >= 0; i--) {
        const q = pollen[i];
        q.life += dt;
        if (q.life > q.max) {
          pollen.splice(i, 1);
          continue;
        }
        q.x += (q.vx + Math.sin(time * 1.3 + i) * 6) * dt;
        q.y += q.vy * dt;
        const f = q.life / q.max;
        ctx!.globalAlpha = Math.sin(Math.PI * f) * 0.7 * settled;
        ctx!.fillRect(q.x - 0.7, q.y - 0.7, 1.4, 1.4);
      }

      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    resize();
    window.addEventListener("resize", resize);
    if (finePointer) {
      window.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseleave", onMouseLeave);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="lily-layer" aria-hidden="true" />
      <div ref={slotRef} className="lily-slot" aria-hidden="true" />
    </>
  );
}
