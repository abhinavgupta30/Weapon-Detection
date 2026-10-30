"use client";

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

export type WeaponType = "pistol" | "knife" | "bomb";

export interface WeaponIconHandle {
  play: () => void;
}

interface WeaponIconProps {
  type: WeaponType;
  label: string;
  sub: string;
  confidence: string;
  size?: "sm" | "lg";
  autoPlay?: boolean;
}

function Art({ type }: { type: WeaponType }) {
  if (type === "pistol") {
    return (
      <svg viewBox="0 0 240 150">
        <path className="w-stroke" d="M36,92 H186 V64 H108 V50 H62 V64 H36 Z" />
        <path className="w-stroke" d="M62,92 L78,128 H100 L100,92" />
        <path className="w-stroke" d="M100,92 C112,100 112,112 100,118" />
        <path className="w-detail" d="M120,78 V64 M136,78 V64 M152,78 V64" />
        <path className="w-detail" d="M40,64 L28,52 L32,44 L44,50 Z" />
      </svg>
    );
  }
  if (type === "knife") {
    return (
      <svg viewBox="0 0 240 140">
        <path className="w-stroke" d="M18,88 L20,68 L170,44 L182,52 L176,60 L28,84 Z" />
        <path className="w-stroke" d="M18,88 L-6,70 L-8,96 L18,102 Z" />
        <circle className="w-detail" cx="0" cy="83" r="3" />
        <circle className="w-detail" cx="-2" cy="90" r="3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 240 150">
      <circle className="w-stroke" cx="110" cy="92" r="42" />
      <path className="w-stroke" d="M124,58 Q140,40 128,26 Q118,16 132,6" />
      <path className="w-detail" d="M132,6 L142,2 M132,6 L138,16 M132,6 L124,-2" />
      <rect className="w-detail" x="92" y="76" width="36" height="16" rx="1" />
      <path className="w-detail" d="M98,84 H122" />
    </svg>
  );
}

const WeaponIcon = forwardRef<WeaponIconHandle, WeaponIconProps>(function WeaponIcon(
  { type, label, sub, confidence, size = "sm", autoPlay = false },
  ref
) {
  const stageRef = useRef<HTMLDivElement>(null);
  const svgWrapRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const confRef = useRef<HTMLDivElement>(null);
  const playFnRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const svgWrap = svgWrapRef.current;
    if (!stage || !svgWrap) return;
    const svg = svgWrap.querySelector("svg");
    if (!svg) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const shapes = Array.from(svg.querySelectorAll<SVGGeometryElement>("path, circle, rect, line"));

    shapes.forEach((p) => {
      let len = 140;
      try {
        len = p.getTotalLength();
      } catch {
        // ignore — fall back to default
      }
      p.style.strokeDasharray = `${len}`;
      p.style.strokeDashoffset = reduced ? "0" : `${len}`;
    });

    const sizeLock = () => {
      const svgEl = svg as unknown as SVGSVGElement;
      let bbox;
      try {
        bbox = svgEl.getBBox();
      } catch {
        return;
      }
      const vb = svgEl.viewBox.baseVal;
      if (!vb.width || !vb.height) return;
      const scaleX = svgEl.clientWidth / vb.width;
      const scaleY = svgEl.clientHeight / vb.height;
      const pad = 10;
      const svgRect = svgEl.getBoundingClientRect();
      const stageRect = stage.getBoundingClientRect();
      const left = (bbox.x - pad) * scaleX + (svgRect.left - stageRect.left);
      const top = (bbox.y - pad) * scaleY + (svgRect.top - stageRect.top);
      const w = (bbox.width + pad * 2) * scaleX;
      const h = (bbox.height + pad * 2) * scaleY;
      if (lockRef.current) {
        lockRef.current.style.left = `${left}px`;
        lockRef.current.style.top = `${top}px`;
        lockRef.current.style.width = `${w}px`;
        lockRef.current.style.height = `${h}px`;
      }
      if (confRef.current) {
        confRef.current.style.left = `${left + w - 4}px`;
        confRef.current.style.top = `${top + h + 8}px`;
      }
    };
    sizeLock();
    window.addEventListener("resize", sizeLock);

    const playTimeline = () => {
      if (reduced) {
        gsap.set(lockRef.current, { opacity: 1 });
        gsap.set(confRef.current, { opacity: 1 });
        return;
      }
      const tl = gsap.timeline();
      tl.to(shapes, { strokeDashoffset: 0, duration: 1.1, ease: "power2.inOut", stagger: 0.05 })
        .set(lockRef.current, { opacity: 1, scale: 1.18 })
        .to(lockRef.current, { scale: 1, duration: 0.28, ease: "back.out(3)" })
        .to(confRef.current, { opacity: 1, duration: 0.15 }, "-=0.1");
    };
    playFnRef.current = playTimeline;

    let jitter: gsap.core.Tween | null = null;
    const onMove = (e: MouseEvent) => {
      if (reduced) return;
      const r = stage.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      gsap.to(svgWrap, { x: dx * 10, y: dy * 8, duration: 0.5, ease: "power2.out" });
    };
    const onEnter = () => {
      if (reduced) return;
      jitter = gsap.to(svgWrap, {
        x: "+=1.2",
        y: "-=1",
        duration: 0.09,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    };
    const onLeave = () => {
      jitter?.kill();
      gsap.to(svgWrap, { x: 0, y: 0, duration: 0.4, ease: "power2.out" });
    };
    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseenter", onEnter);
    stage.addEventListener("mouseleave", onLeave);

    let raf = 0;
    if (autoPlay) {
      raf = requestAnimationFrame(() => playTimeline());
    }

    return () => {
      window.removeEventListener("resize", sizeLock);
      stage.removeEventListener("mousemove", onMove);
      stage.removeEventListener("mouseenter", onEnter);
      stage.removeEventListener("mouseleave", onLeave);
      jitter?.kill();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [type, autoPlay]);

  useImperativeHandle(ref, () => ({
    play: () => playFnRef.current(),
  }));

  return (
    <div>
      <div className="exhibit-label">
        <span>{label}</span>
        <span className="opacity-50">{sub}</span>
      </div>
      <div ref={stageRef} className={`icon-stage ${size === "lg" ? "icon-stage-lg" : ""}`}>
        <span className="corner tl" />
        <span className="corner tr" />
        <span className="corner bl" />
        <span className="corner br" />
        <div ref={svgWrapRef} className="svg-wrap">
          <Art type={type} />
        </div>
        <div ref={lockRef} className="lock-box" />
        <div ref={confRef} className="confidence-tag">
          {confidence}
        </div>
      </div>
    </div>
  );
});

export default WeaponIcon;
