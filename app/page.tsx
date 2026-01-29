"use client";

import { useEffect, useState } from "react";
import DotGrid from "./components/DotGrid";

const socials = [
  { label: "github", href: "https://github.com/hashylog" },
  { label: "x", href: "https://x.com/hashylog" },
  { label: "linkedin", href: "https://linkedin.com/in/hashylog" },
  { label: "discord", href: "https://discord.com/users/hashylog" },
];

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = prefersDark ? "dark" : "light";
      setTheme(initial);
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("theme", next);
  }

  return (
    <div className="grain relative flex min-h-screen items-center justify-center">
      <DotGrid />
      <button
        onClick={toggleTheme}
        className="theme-toggle animate-in-delay-3"
        style={{ position: "fixed", top: 24, right: 24 }}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>

      <main className="flex flex-col items-center gap-10 px-6">
        {/* Name */}
        <div className="animate-in flex flex-col items-center gap-3">
          <h1
            style={{
              fontFamily: "'Instrument Serif', serif",
              fontSize: "clamp(3rem, 8vw, 6.5rem)",
              fontWeight: 400,
              fontStyle: "italic",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            hashylog
          </h1>
        </div>

        {/* Description */}
        <p
          className="animate-in-delay-1"
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "13px",
            color: "var(--muted)",
            letterSpacing: "0.04em",
          }}
        >
          game <span style={{ color: "var(--accent)" }}>&</span> software developer
        </p>

        {/* Divider */}
        <div
          className="animate-in-delay-1"
          style={{
            width: 40,
            height: 1,
            background: "var(--border)",
          }}
        />

        {/* Social links */}
        <nav className="animate-in-delay-2 flex items-center gap-5 flex-wrap justify-center">
          {socials.map((s, i) => (
            <span key={s.label} className="flex items-center gap-5">
              <a
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="social-link"
              >
                {s.label}
              </a>
              {i < socials.length - 1 && <span className="dot-separator" />}
            </span>
          ))}
        </nav>
      </main>
    </div>
  );
}
