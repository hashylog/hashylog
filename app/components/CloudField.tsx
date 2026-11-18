"use client";

import { useEffect, useRef } from "react";
import { motion } from "../lib/motion";

// Size of one dithered "pixel" in CSS pixels.
const PIXEL = 3;

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_time;
uniform float u_scroll;
uniform vec3 u_mouse; // xy: low-res pixel position, z: strength

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Well-distributed 1D hash (no visible periodicity on integer inputs).
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// 2x2 Bayer: [[0,2],[3,1]]
float bayer2(vec2 p) {
  return mod(2.0 * p.x + 3.0 * p.y, 4.0);
}

float bayer4(vec2 p) {
  vec2 a = mod(p, 2.0);
  vec2 b = mod(floor(p / 2.0), 2.0);
  return (4.0 * bayer2(a) + bayer2(b) + 0.5) / 16.0;
}

void main() {
  vec2 px = floor(gl_FragCoord.xy);
  // Scale by the short side so portrait screens get the same cloud size.
  float base = min(u_res.x, u_res.y);
  vec2 uv = px / base;
  float t = u_time;
  float dusk = smoothstep(0.0, 1.0, u_scroll);

  // Descend through the clouds as the page scrolls.
  uv.y -= u_scroll * 1.4;
  vec2 p = uv * 1.7;

  // Domain-warped fbm: slow, heavy, smoke-like clouds.
  vec2 q = vec2(
    fbm(p + vec2(0.0, t * 0.035)),
    fbm(p + vec2(5.2, 1.3) - t * 0.03)
  );
  vec2 r = vec2(
    fbm(p + 3.0 * q + vec2(1.7, 9.2) + t * 0.05),
    fbm(p + 3.0 * q + vec2(8.3, 2.8) - t * 0.04)
  );
  float n = fbm(p + 2.6 * r + vec2(t * 0.02, 0.0));

  float v = smoothstep(0.36, 0.84, n);
  v = pow(v, 1.35);
  // Light catching the folds of the clouds.
  v += 0.18 * smoothstep(0.55, 0.9, length(r)) * smoothstep(0.3, 0.7, n);

  // Keep the center calm so the text stays legible, edges brighter.
  vec2 c = (gl_FragCoord.xy - 0.5 * u_res) / base;
  // While the fragments are on screen, the calm area follows them to the left.
  float fragPhase = smoothstep(0.14, 0.24, u_scroll) * (1.0 - smoothstep(0.66, 0.78, u_scroll));
  c.x += fragPhase * max(0.0, 0.5 * u_res.x / base - 0.35);
  float center = smoothstep(0.05, 0.75, length(c * vec2(0.75, 1.25)));
  v *= mix(0.35, 1.0, center);

  // Night falls as you scroll.
  v *= mix(1.0, 0.32, dusk);

  // Soft light following the cursor.
  float md = distance(px, u_mouse.xy) / base;
  v += u_mouse.z * 0.22 * exp(-md * md * 45.0) * (0.35 + n);

  // Rain appears once the name has dissolved.
  float rain = smoothstep(0.22, 0.75, u_scroll);
  float cx = px.x;
  if (hash11(cx * 1.37 + 11.0) < 0.075 * rain) {
    // Each column gets its own depth: far drops are slower, shorter, dimmer.
    float depth = hash11(cx * 0.73 + 101.7);
    float speed = mix(60.0, 210.0, depth) * (0.85 + 0.3 * hash11(cx + 7.9));
    float period = 120.0 + hash11(cx * 2.11 + 57.3) * 320.0;
    float pos = px.y + t * speed + hash11(cx + 313.1) * 2000.0;
    float cycle = floor(pos / period);
    float y = pos - cycle * period;
    // Every pass of a column is rolled independently, so drops never line up.
    float roll = hash11(cycle * 7.13 + cx * 0.618 + 3.0);
    if (roll < 0.6) {
      float len = mix(4.0, 14.0, depth) * (0.6 + 0.8 * hash11(cycle * 1.7 + cx * 3.1));
      float offset = hash11(cycle * 4.3 + cx) * (period - len);
      float yy = y - offset;
      if (yy >= 0.0 && yy < len) {
        float bright = mix(0.28, 0.66, depth) * (0.8 + 0.2 * roll / 0.6);
        v = max(v, bright * (1.0 - yy / len) * rain + 0.06);
      }
    }
  }

  float floorLevel = mix(0.12, 0.06, dusk);
  v = clamp(floorLevel + v * (1.0 - floorLevel), 0.0, 1.0);

  // Ordered dithering into 4 tones.
  float level = clamp(floor(v * 3.0 + bayer4(px)), 0.0, 3.0);
  vec3 col = vec3(0.03);
  if (level > 2.5) col = vec3(0.84);
  else if (level > 1.5) col = vec3(0.46);
  else if (level > 0.5) col = vec3(0.19);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export default function CloudField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      antialias: false,
      depth: false,
      alpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "a_pos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, "u_res");
    const uTime = gl.getUniformLocation(program, "u_time");
    const uScroll = gl.getUniformLocation(program, "u_scroll");
    const uMouse = gl.getUniformLocation(program, "u_mouse");

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;

    let w = 0;
    let h = 0;
    const mouse = { x: -1000, y: -1000, on: false, strength: 0 };

    function resize() {
      w = Math.ceil(window.innerWidth / PIXEL);
      h = Math.ceil(window.innerHeight / PIXEL);
      canvas!.width = w;
      canvas!.height = h;
      canvas!.style.width = `${w * PIXEL}px`;
      canvas!.style.height = `${h * PIXEL}px`;
      gl!.viewport(0, 0, w, h);
    }

    function onMouseMove(e: MouseEvent) {
      mouse.x = e.clientX / PIXEL;
      mouse.y = h - e.clientY / PIXEL;
      mouse.on = true;
    }

    function onMouseLeave() {
      mouse.on = false;
    }

    // Random start so every visit shows a different sky.
    let time = Math.random() * 200;
    let last = performance.now();
    let raf = 0;

    function frame(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      time += dt * (reduceMotion ? 0.15 : 1);
      if (time > 10000) time -= 10000;

      mouse.strength += ((mouse.on ? 1 : 0) - mouse.strength) * 0.04;

      gl!.uniform2f(uRes, w, h);
      gl!.uniform1f(uTime, time);
      gl!.uniform1f(uScroll, motion.progress);
      gl!.uniform3f(uMouse, mouse.x, mouse.y, mouse.strength);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);

      raf = requestAnimationFrame(frame);
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

  return <canvas ref={canvasRef} className="cloud-field" aria-hidden="true" />;
}
