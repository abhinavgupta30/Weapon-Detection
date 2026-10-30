"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import WeaponIcon, { WeaponIconHandle, WeaponType } from "./WeaponIcon";

gsap.registerPlugin(ScrollTrigger);

const PANELS: {
  type: WeaponType;
  label: string;
  sub: string;
  confidence: string;
  desc: string;
  meta: string[];
}[] = [
  {
    type: "knife",
    label: "EXHIBIT B",
    sub: "FIXED-BLADE KNIFE",
    confidence: "88.6% MATCH",
    desc: "Trained on 14,200+ annotated blade instances across occlusion, low-light, and partial-concealment conditions.",
    meta: ["CLASS_ID 01", "RECALL 91.4%", "SAMPLES 14.2K"],
  },
  {
    type: "pistol",
    label: "EXHIBIT A",
    sub: "SEMI-AUTO PISTOL",
    confidence: "94.2% MATCH",
    desc: "Detects concealed and drawn handguns from partial silhouettes, including low-angle CCTV perspectives.",
    meta: ["CLASS_ID 02", "RECALL 96.1%", "SAMPLES 21.8K"],
  },
  {
    type: "bomb",
    label: "EXHIBIT C",
    sub: "UNATTENDED IED / DEVICE",
    confidence: "97.5% MATCH",
    desc: "Flags stationary objects left in restricted zones beyond a configurable dwell-time threshold.",
    meta: ["CLASS_ID 03", "RECALL 93.8%", "SAMPLES 6.4K"],
  },
];

export default function HowItWorks() {
  const rootRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const iconRefs = useRef<(WeaponIconHandle | null)[]>([]);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fired = [false, false, false];

    const ctx = gsap.context(() => {
      const track = trackRef.current;
      const root = rootRef.current;
      if (!track || !root) return;

      const panels = gsap.utils.toArray<HTMLElement>(".how-panel", root);

      if (reduced) {
        iconRefs.current.forEach((h) => h?.play());
        return;
      }

      gsap.to(track, {
        xPercent: -100 * (panels.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: root,
          pin: true,
          scrub: 0.5,
          start: "top top",
          end: () => "+=" + (window.innerWidth * (panels.length - 1) + window.innerHeight * 0.4),
          onUpdate: (self) => {
            if (fillRef.current) fillRef.current.style.width = `${self.progress * 100}%`;
            const idx = Math.min(panels.length - 1, Math.floor(self.progress * panels.length));
            if (labelRef.current) {
              labelRef.current.textContent = `${String(idx + 1).padStart(2, "0")} / 03 — ${PANELS[idx].sub}`;
            }
            if (self.progress > idx / panels.length + 0.06 && !fired[idx]) {
              fired[idx] = true;
              iconRefs.current[idx]?.play();
            }
          },
        },
      });
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section className="how" id="how" ref={rootRef}>
      <div className="how-pin">
        <div className="how-head">
          <p className="eyebrow">Detection classes</p>
          <h2>
            Three threat categories.
            <br />
            One model, run three ways.
          </h2>
        </div>

        <div className="how-track" ref={trackRef}>
          {PANELS.map((p, i) => (
            <div className="how-panel" key={p.type}>
              <div className="how-panel-inner">
                <WeaponIcon
                  ref={(el) => {
                    iconRefs.current[i] = el;
                  }}
                  type={p.type}
                  label={p.label}
                  sub={p.sub}
                  confidence={p.confidence}
                  size="lg"
                />
                <p className="panel-desc">{p.desc}</p>
                <div className="panel-meta">
                  {p.meta.map((m) => (
                    <span key={m}>{m}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="progress-rail">
        <span className="progress-rail-label" ref={labelRef}>
          01 / 03 — {PANELS[0].sub}
        </span>
        <div className="progress-fill" ref={fillRef} />
      </div>
    </section>
  );
}
