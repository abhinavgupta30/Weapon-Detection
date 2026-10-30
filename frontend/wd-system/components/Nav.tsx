"use client";

import { useCameraContext } from "./CameraProvider";

export default function Nav() {
  const { requestAllCameras } = useCameraContext();

  return (
    <header className="topbar">
      <div className="case-id">
        CASE NO. <b>WD—2026.0847</b>
      </div>
      <nav>
        <a href="#how">SYS / PROCESS</a>
        <a href="#demo">SYS / DEMO</a>
        <a href="#stats">SYS / METRICS</a>
      </nav>
      <button className="btn-cta" onClick={requestAllCameras}>
        REQUEST ACCESS
      </button>
    </header>
  );
}
