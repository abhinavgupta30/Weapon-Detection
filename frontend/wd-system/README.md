# WD-SYSTEM — Automated Weapon Detection Frontend

Next.js 14 (App Router) + TypeScript + Tailwind CSS. Forensic-evidence-report
themed landing/dashboard for a YOLOv8 weapon detection system, with a
4-camera live detection grid.

Stack: **Next.js**, **React**, **Tailwind CSS**, **GSAP + ScrollTrigger**
(weapon trace-in / lock-on animations, pinned horizontal scroll), **Framer
Motion** (hero micro-interactions), **Lenis** (smooth inertia scroll).

## Getting started

```bash
npm install
cp .env.local.example .env.local
# edit .env.local — point NEXT_PUBLIC_API_URL at your backend laptop, e.g.
# NEXT_PUBLIC_API_URL=http://192.168.1.42:8000
npm run dev
```

Open http://localhost:3000.

## Connecting your backend (the other laptop)

Your FastAPI + YOLOv8 backend runs on a separate machine on the same
network. Set `NEXT_PUBLIC_API_URL` in `.env.local` to that machine's LAN
address and port (find it with `ipconfig` / `ifconfig`). Make sure your
FastAPI app has CORS enabled for the origin this frontend runs on.

The frontend expects these endpoints — see `lib/api.ts` for the exact
TypeScript contract, and adjust that file if your backend's shape differs:

| Endpoint | Method | Used for |
|---|---|---|
| `/health` | GET | backend reachability check |
| `/detect` | POST (multipart, field `frame`) | CAM_01 — frames captured from the visitor's own webcam are posted here roughly once per second |
| `/cameras/:id/stream` | GET | CAM_02–04 — an MJPEG stream (`multipart/x-mixed-replace`), rendered directly in an `<img>` tag |
| `/cameras/:id/detections` | GET | CAM_02–04 — polled every ~1.5s to draw bounding boxes over that camera's stream |

All detection responses use this shape:

```json
{
  "detections": [
    { "class_name": "pistol", "confidence": 0.942, "box": [0.56, 0.22, 0.2, 0.56] }
  ]
}
```

`box` is `[x, y, w, h]` normalized to 0–1 relative to the frame.

**If the backend is unreachable** (wrong IP, different network, laptop
asleep, etc.), every camera tile automatically falls back to a simulated
detection loop so the UI still looks and behaves correctly for demos —
you'll see a small "BACKEND UNREACHABLE — SIMULATED FEED" badge on the tile
when that happens.

## "Request Access"

The **Request Access** button (nav bar and hero, or on any individual tile)
scrolls to the live demo section and calls
`navigator.mediaDevices.getUserMedia()` once to trigger the browser's real
camera-permission prompt. Once granted, the app enumerates every connected
camera and assigns them to CAM_01–04 in order — so if you have 4 webcams/USB
cameras plugged in, each tile gets its own distinct live feed.

If you have fewer than 4 cameras connected, the remaining tiles automatically
show a **"NO CAMERA DETECTED — SIMULATED FEED"** badge with a simulated
detection loop instead of failing.

Each live tile independently captures frames and posts them to your
backend's `POST /detect` endpoint roughly once per second. If the backend
can't be reached, the real camera feed keeps playing — only the bounding
boxes drawn over it fall back to simulated ones.

This requires HTTPS or `localhost` — browsers block camera access on plain
HTTP for any other host. If you deploy this (e.g. to Vercel), it'll work
automatically over HTTPS.

Note: `cameraStreamUrl()` / `fetchCameraDetections()` in `lib/api.ts` are
unused for now — they're the hooks you'd wire back in if you later want a
tile to show a *remote* IP camera stream from the backend laptop instead of
a locally plugged-in device.

## Project structure

```
app/
  layout.tsx        fonts (Newsreader + JetBrains Mono), providers
  page.tsx           assembles all sections
  globals.css        forensic-report design system
components/
  Nav.tsx
  Hero.tsx           headline, auto-playing pistol trace-in, scanline sweep
  HowItWorks.tsx      pinned horizontal scroll: knife → pistol → IED
  LiveDemo.tsx        4-camera grid
  CameraTile.tsx       single camera: webcam / backend stream / simulated
  Stats.tsx           animated mAP / precision / recall / latency counters
  Footer.tsx
  WeaponIcon.tsx      shared SVG trace + lock-on + magnetic hover component
  SmoothScroll.tsx     Lenis + GSAP ScrollTrigger wiring
  CameraProvider.tsx   context so Nav/Hero can trigger CAM_01's request()
lib/
  api.ts              backend contract — edit this if your FastAPI differs
```

## Build

```bash
npm run build
npm start
```

---
Built by **Abhinav Gupta**, **Sameer Patwa** & **Sanidhya Singh Sisodiya**.
