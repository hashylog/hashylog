import type { CSSProperties } from "react";
import AsciiName from "./components/AsciiName";
import CloudField from "./components/CloudField";
import Lily from "./components/Lily";
import ScrollDriver from "./components/ScrollDriver";

const socials = [
  { label: "github", href: "https://github.com/hashylog" },
  { label: "x", href: "https://x.com/hashylog" },
  { label: "linkedin", href: "https://linkedin.com/in/hashylog" },
  { label: "discord", href: "https://discord.com/users/hashylog" },
];

// Lines that surface while scrolling, each visible between `from` and `to`.
const fragments = [
  { index: "i can't let your memory die.", text: "i hope you find what you're fighting for", from: 0.2, to: 0.42 },
  { index: "you are my endless.", text: "you are my endless.", from: 0.46, to: 0.68 },
];

function Links() {
  return (
    <nav className="links" aria-label="Social links">
      {socials.map((s, i) => (
        <span key={s.label} className="links-item">
          <a href={s.href} target="_blank" rel="noopener noreferrer">
            {s.label}
          </a>
          {i < socials.length - 1 && (
            <span className="sep" aria-hidden="true">
              /
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

export default function Home() {
  return (
    <>
      <ScrollDriver />
      <CloudField />

      <section className="stage stage-hero">
        <h1 className="sr-only">hashylog</h1>
        <AsciiName />
        <p className="tagline hero-fade">
          game <span className="amp">&amp;</span> software developer
        </p>
        <div className="hero-fade">
          <Links />
        </div>
      </section>

      <div className="scroll-hint hero-fade" aria-hidden="true">
        <span>scroll</span>
        <span className="scroll-line" />
      </div>

      {fragments.map((f) => (
        <div
          key={f.index}
          className="stage fragment"
          style={{ "--a": f.from, "--b": f.to } as CSSProperties}
        >
          <span className="fragment-index">{f.index}</span>
          <p className="fragment-text">{f.text}</p>
        </div>
      ))}

      <section className="stage stage-end">
        <Lily />
        <p className="end-name">hashylog</p>
        <Links />
        <p className="end-note">&copy; {new Date().getFullYear()} &middot; still drifting</p>
      </section>

      <div className="scroll-track" aria-hidden="true" />
    </>
  );
}
