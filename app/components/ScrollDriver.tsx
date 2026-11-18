"use client";

import { useEffect } from "react";
import { motion } from "../lib/motion";

const HERO_END = 0.14;
const ENDING_START = 0.86;

// Tracks scroll, smooths it, and exposes it as the CSS variable --p
// plus a data-stage attribute used to toggle link interactivity.
export default function ScrollDriver() {
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    let lastStage = "";

    function readTarget() {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      motion.target = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    }

    function frame() {
      const diff = motion.target - motion.progress;
      motion.progress = Math.abs(diff) < 0.0001 ? motion.target : motion.progress + diff * 0.08;

      root.style.setProperty("--p", motion.progress.toFixed(4));

      const stage =
        motion.progress < HERO_END ? "hero" : motion.progress > ENDING_START ? "end" : "mid";
      if (stage !== lastStage) {
        root.dataset.stage = stage;
        lastStage = stage;
      }

      raf = requestAnimationFrame(frame);
    }

    readTarget();
    window.addEventListener("scroll", readTarget, { passive: true });
    window.addEventListener("resize", readTarget);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", readTarget);
      window.removeEventListener("resize", readTarget);
    };
  }, []);

  return null;
}
