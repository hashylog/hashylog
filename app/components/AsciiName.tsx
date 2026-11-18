"use client";

import { useEffect, useRef } from "react";
import { motion } from "../lib/motion";

const NAME = "hashylog";
const RAMP = " .:-=+*#%@";
const GLITCH = "!<>-_/\\[]{}=+*^?#%@$&01";
const RAIN = "|:.'";
const NAME_FONT = '"Instrument Serif", serif';
const GLYPH_FONT = '"JetBrains Mono", monospace';

interface Cell {
  x: number;
  y: number;
  glyph: string;
  density: number;
  seed: number;
  reveal: number;
  fallStart: number;
  fallSpan: number;
  fallDist: number;
  drift: number;
  glitchUntil: number;
  glitchChar: string;
}

function pick(set: string) {
  return set[(Math.random() * set.length) | 0];
}

export default function AsciiName() {
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

    let cells: Cell[] = [];
    let fontSize = 9;
    let gridW = 0;
    let gridH = 0;
    let origin = { x: 0, y: 0 };
    let ready = false;
    let introDone = reduceMotion;
    let start = performance.now();
    let raf = 0;
    let resizeTimer = 0;
    const mouse = { x: -9999, y: -9999 };

    function build() {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      canvas!.width = Math.round(vw * dpr);
      canvas!.height = Math.round(vh * dpr);
      canvas!.style.width = `${vw}px`;
      canvas!.style.height = `${vh}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      fontSize = vw < 520 ? 5 : vw < 900 ? 7 : 9;
      const lineHeight = fontSize * 1.05;
      ctx!.font = `${fontSize}px ${GLYPH_FONT}`;
      const charWidth = ctx!.measureText("M").width;

      const targetW = Math.min(vw * (vw < 520 ? 0.94 : 0.88), 1100);

      // Rasterize the name once, then sample its coverage per character cell.
      const off = document.createElement("canvas");
      const octx = off.getContext("2d", { willReadFrequently: true })!;
      octx.font = `italic 400 100px ${NAME_FONT}`;
      const probe = octx.measureText(NAME);
      const probeW = probe.actualBoundingBoxLeft + probe.actualBoundingBoxRight;
      const size = (100 * targetW * 0.96) / probeW;

      octx.font = `italic 400 ${size}px ${NAME_FONT}`;
      const m = octx.measureText(NAME);
      const textW = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
      const textH = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;

      const cols = Math.floor(targetW / charWidth);
      const rows = Math.ceil((textH + size * 0.1) / lineHeight);
      gridW = cols * charWidth;
      gridH = rows * lineHeight;

      off.width = Math.ceil(gridW);
      off.height = Math.ceil(gridH);
      octx.font = `italic 400 ${size}px ${NAME_FONT}`;
      octx.fillStyle = "#fff";
      octx.fillText(
        NAME,
        (off.width - textW) / 2 + m.actualBoundingBoxLeft,
        (off.height - textH) / 2 + m.actualBoundingBoxAscent,
      );
      const data = octx.getImageData(0, 0, off.width, off.height).data;

      const next: Cell[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let sy = 0; sy < 3; sy++) {
            for (let sx = 0; sx < 3; sx++) {
              const px = Math.min(off.width - 1, Math.floor((c + (sx + 0.5) / 3) * charWidth));
              const py = Math.min(off.height - 1, Math.floor((r + (sy + 0.5) / 3) * lineHeight));
              sum += data[(py * off.width + px) * 4 + 3];
            }
          }
          const density = Math.min(1, (sum / 9 / 255) * 1.15);
          if (density < 0.06) continue;

          const x = c * charWidth;
          const y = r * lineHeight;
          next.push({
            x,
            y,
            density,
            glyph: RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(density * (RAMP.length - 1))))],
            seed: Math.random(),
            reveal: 0.2 + (x / gridW) * 1.1 + Math.random() * 0.4,
            fallStart: 0.01 + Math.random() * 0.14,
            fallSpan: 0.16 + Math.random() * 0.16,
            fallDist: vh * (0.45 + Math.random() * 0.75),
            drift: (Math.random() - 0.5) * 30,
            glitchUntil: 0,
            glitchChar: "",
          });
        }
      }
      cells = next;

      slot!.style.width = `${gridW}px`;
      slot!.style.height = `${gridH}px`;
      const rect = slot!.getBoundingClientRect();
      origin = { x: rect.left, y: rect.top };
    }

    function frame(now: number) {
      const t = (now - start) / 1000;
      const p = motion.progress;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      ctx!.clearRect(0, 0, vw, vh);
      ctx!.font = `${fontSize}px ${GLYPH_FONT}`;
      ctx!.textBaseline = "top";
      ctx!.fillStyle = "#e6e6e6";

      if (!introDone && t > 2.4) introDone = true;

      // A slow band of light sweeping across the name.
      const sweep = ((t * 0.09) % 1.8) - 0.4;
      const mouseRadius = 70;

      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        let ch = cell.glyph;
        let alpha = 0.3 + 0.7 * Math.pow(cell.density, 0.8);

        // Intro: decode from noise.
        if (!introDone) {
          const rv = t - cell.reveal;
          if (rv < -0.45) continue;
          if (rv < 0) {
            ch = pick(GLITCH);
            alpha *= 0.55;
          }
        }

        // Idle glitches.
        if (!reduceMotion) {
          if (t < cell.glitchUntil) {
            ch = cell.glitchChar;
          } else if (Math.random() < 0.0006) {
            cell.glitchUntil = t + 0.06 + Math.random() * 0.2;
            cell.glitchChar = pick(GLITCH);
          }
        }

        const pos = cell.x / gridW + (cell.y / gridH) * 0.25;
        const band = Math.exp(-((pos - sweep) ** 2) * 50);
        alpha += band * 0.35 + Math.sin(t * 0.7 + cell.seed * 20) * 0.06;

        let dx = 0;
        let dy = 0;

        // Cursor disturbs the letters.
        if (finePointer) {
          const mx = origin.x + cell.x - mouse.x;
          const my = origin.y + cell.y - mouse.y;
          const dist = Math.sqrt(mx * mx + my * my);
          if (dist < mouseRadius) {
            const k = 1 - dist / mouseRadius;
            alpha += k * 0.4;
            if (Math.random() < k * 0.35) ch = pick(GLITCH);
          }
        }

        // Scroll: the name dissolves into falling rain.
        const f = Math.min(1, Math.max(0, (p - cell.fallStart) / cell.fallSpan));
        if (f > 0) {
          dy = f * f * cell.fallDist;
          dx = cell.drift * f;
          alpha *= Math.pow(1 - f, 1.3);
          if (f > 0.12 + cell.seed * 0.3) ch = RAIN[(cell.seed * RAIN.length) | 0];
          if (alpha < 0.01) continue;
        }

        ctx!.globalAlpha = Math.min(1, Math.max(0, alpha));
        ctx!.fillText(ch, origin.x + cell.x + dx, origin.y + cell.y + dy);
      }
      ctx!.globalAlpha = 1;

      raf = requestAnimationFrame(frame);
    }

    function onResize() {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (ready) build();
      }, 120);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }

    function onMouseLeave() {
      mouse.x = -9999;
      mouse.y = -9999;
    }

    let cancelled = false;
    const fontsReady = Promise.all([
      document.fonts.load(`italic 100px ${NAME_FONT}`),
      document.fonts.load(`10px ${GLYPH_FONT}`),
    ]).catch(() => undefined);
    const timeout = new Promise((resolve) => setTimeout(resolve, 2500));

    Promise.race([fontsReady, timeout]).then(() => {
      if (cancelled) return;
      build();
      ready = true;
      start = performance.now();
      raf = requestAnimationFrame(frame);
    });

    window.addEventListener("resize", onResize);
    if (finePointer) {
      window.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseleave", onMouseLeave);
    }

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="ascii-layer" aria-hidden="true" />
      <div ref={slotRef} className="name-slot" aria-hidden="true" />
    </>
  );
}
