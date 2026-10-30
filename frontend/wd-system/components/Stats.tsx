"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const STATS = [
  { target: 96.8, decimals: 1, unit: "%", label: "mAP @ 0.5", sub: "across all 3 classes" },
  { target: 94.1, decimals: 1, unit: "%", label: "Precision", sub: "at conf. threshold 0.5" },
  { target: 93.4, decimals: 1, unit: "%", label: "Recall", sub: "across stratified subsets" },
  { target: 42, decimals: 0, unit: "ms", label: "Inference latency", sub: "yolov8m, 1080p, RTX 4070" },
];

export default function Stats() {
  const gridRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const nums = gsap.utils.toArray<HTMLElement>(".js-count", gridRef.current!);
      nums.forEach((el) => {
        const target = parseFloat(el.dataset.target || "0");
        const decimals = parseInt(el.dataset.decimals || "0", 10);
        const obj = { val: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: "top 88%",
          once: true,
          onEnter: () => {
            gsap.to(obj, {
              val: target,
              duration: reduced ? 0 : 1.4,
              ease: "power2.out",
              onUpdate: () => {
                el.textContent = obj.val.toFixed(decimals);
              },
            });
          },
        });
      });
    }, gridRef);
    return () => ctx.revert();
  }, []);

  return (
    <section className="stats" id="stats">
      <div className="stats-inner">
        <div className="stats-head">
          <p className="eyebrow">Model performance</p>
          <h2>Benchmarked on the held-out test split.</h2>
        </div>
        <div className="stats-grid" ref={gridRef}>
          {STATS.map((s) => (
            <div className="stat" key={s.label}>
              <div className="stat-num">
                <span className="js-count" data-target={s.target} data-decimals={s.decimals}>
                  0
                </span>
                <span className="u">{s.unit}</span>
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
