"use client";

import { useLayoutEffect, useRef } from "react";
import { motion } from "framer-motion";
import gsap from "gsap";
import WeaponIcon from "./WeaponIcon";
import { useCameraContext } from "./CameraProvider";

export default function Hero() {
  const scanlineRef = useRef<HTMLDivElement>(null);
  const { requestAllCameras } = useCameraContext();

  useLayoutEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !scanlineRef.current) return;
    const tl = gsap.timeline({ delay: 0.2 });
    tl.fromTo(scanlineRef.current, { y: 0, opacity: 0 }, { opacity: 1, duration: 0.05 })
      .to(scanlineRef.current, { y: window.innerHeight, duration: 1.1, ease: "power1.inOut" })
      .to(scanlineRef.current, { opacity: 0, duration: 0.2 }, "-=0.15");
    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section className="hero" id="hero">
      <div className="dot-grid" />
      <div className="scanline" ref={scanlineRef} />

      <motion.div
        className="hero-inner"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } },
        }}
      >
        <motion.p
          className="eyebrow"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        >
          Automated threat recognition — YOLOv8 inference engine
        </motion.p>
        <motion.h1
          className="hero-title"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        >
          Detect the
          <br />
          weapon before
          <br />
          the <em>threat</em>.
        </motion.h1>
        <motion.p
          className="hero-sub"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        >
          A computer-vision model trained to identify firearms, blades, and explosive
          devices in live video — flagged, boxed, and logged in under 45 milliseconds.
        </motion.p>
        <motion.div
          className="hero-actions"
          variants={{ hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0 } }}
        >
          <button className="btn-cta" onClick={requestAllCameras}>
            VIEW LIVE DEMO
          </button>
          <span className="hero-meta">mAP@0.5 96.8% ····· LATENCY 42ms ····· CLASSES 03</span>
        </motion.div>
      </motion.div>

      <div className="hero-exhibit">
        <WeaponIcon
          type="pistol"
          label="EXHIBIT A"
          sub="SEMI-AUTO PISTOL / 9×19MM"
          confidence="94.2% MATCH"
          autoPlay
        />
        <div className="coord-tag">[ X:0412 &nbsp; Y:0128 &nbsp; W:0240 &nbsp; H:0150 ]</div>
      </div>
    </section>
  );
}
