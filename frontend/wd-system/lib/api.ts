// Backend contract for the WD-SYSTEM frontend.
//
// The FastAPI + YOLOv8 backend runs on a separate machine on your network.
// Point NEXT_PUBLIC_API_URL (see .env.local.example) at that machine's
// address, e.g. http://192.168.1.42:8000
//
// Expected endpoints (adjust these functions if your backend differs):
//
//   GET  /health
//       -> 200 OK when the backend is reachable
//
//   POST /detect                 (multipart/form-data, field name "frame")
//       -> { detections: Detection[], frame_id?: string, latency_ms?: number }
//       Used for the primary camera (local webcam frames captured client-side).
//
//   GET  /cameras/:id/stream
//       -> an MJPEG stream (multipart/x-mixed-replace), rendered directly in
//          an <img> tag. Used for CAM_02–CAM_04.
//
//   GET  /cameras/:id/detections
//       -> { detections: Detection[] }
//       Polled every ~1.5s to draw bounding boxes over the MJPEG stream.

export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
).replace(/\/+$/, "");

export interface Detection {
/** Detected class name returned by the YOLO model, e.g. "weapon". */
  class_name: string;
  /** 0–1 */
  confidence: number;
  /** normalized [x, y, w, h] in 0–1 relative to frame size */
  box: [number, number, number, number];
}

export interface DetectResponse {
  detections: Detection[];
  frame_id?: string;
  latency_ms?: number;
}

export async function detectFrame(
  blob: Blob,
  signal?: AbortSignal
): Promise<DetectResponse> {
  const form = new FormData();
  form.append("frame", blob, "frame.jpg");
  const res = await fetch(`${API_BASE}/detect`, {
    method: "POST",
    body: form,
    signal,
  });
  if (!res.ok) throw new Error(`Detection request failed: ${res.status}`);
  return res.json();
}

export async function fetchCameraDetections(
  camId: string,
  signal?: AbortSignal
): Promise<DetectResponse> {
  const res = await fetch(`${API_BASE}/cameras/${camId}/detections`, {
    signal,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Camera ${camId} detections failed: ${res.status}`);
  return res.json();
}

export function cameraStreamUrl(camId: string): string {
  return `${API_BASE}/cameras/${camId}/stream`;
}

export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}
