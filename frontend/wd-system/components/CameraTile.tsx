"use client";
import { useEffect, useRef, useState } from "react";
import { detectFrame, Detection } from "@/lib/api";
import { useCameraContext } from "./CameraProvider";

interface CameraTileProps {
  id: string;
  label: string;
  deviceIndex: number;
}

type Status =
  | "idle"
  | "requesting"
  | "live"
  | "denied"
  | "no-device";

const VB_W = 1000;
const VB_H = 560;

const DETECTION_INTERVAL_MS = 1500;
const JPEG_QUALITY = 0.65;

export default function CameraTile({
  id,
  label,
  deviceIndex,
}: CameraTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] =
    useState<Status>("idle");

  const [detections, setDetections] =
    useState<Detection[]>([]);

  const [latency, setLatency] =
    useState<number | null>(null);

  const {
    devices,
    permission,
    requestAllCameras,
  } = useCameraContext();

  // ==========================================================
  // REFS
  // ==========================================================

  const pollRef =
    useRef<ReturnType<typeof setInterval> | null>(
      null
    );

  const streamRef =
    useRef<MediaStream | null>(null);

  const detectionInFlightRef =
    useRef(false);

  const abortControllerRef =
    useRef<AbortController | null>(null);

  const startedRef =
    useRef(false);

  // ==========================================================
  // STOP DETECTION LOOP
  // ==========================================================

  const stopDetectionLoop = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ==========================================================
  // STOP CAMERA STREAM
  // ==========================================================

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current
        .getTracks()
        .forEach((track) => {
          track.stop();
        });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // ==========================================================
  // REAL YOLO DETECTION LOOP
  // ==========================================================

  const startDetectionLoop = () => {
    stopDetectionLoop();

    pollRef.current = setInterval(async () => {
      // ------------------------------------------------------
      // Do not start another request if YOLO is still
      // processing the previous frame.
      // ------------------------------------------------------

      if (detectionInFlightRef.current) {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas) {
        return;
      }

      // ------------------------------------------------------
      // Video must have enough data available.
      // ------------------------------------------------------

      if (video.readyState < 2) {
        return;
      }

      if (
        video.videoWidth === 0 ||
        video.videoHeight === 0
      ) {
        return;
      }

      // ------------------------------------------------------
      // Match canvas dimensions to the real camera frame.
      // ------------------------------------------------------

      const MAX_FRAME_SIZE = 640;

      const scale = Math.min(
      1,
    MAX_FRAME_SIZE /
    Math.max(video.videoWidth, video.videoHeight)
    );

    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);

      const ctx =
        canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      // ------------------------------------------------------
      // Capture current video frame.
      // ------------------------------------------------------

      ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // ------------------------------------------------------
      // Convert frame to JPEG.
      // ------------------------------------------------------

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            return;
          }

          // --------------------------------------------------
          // Lock detection requests.
          // --------------------------------------------------

          if (
            detectionInFlightRef.current
          ) {
            return;
          }

          detectionInFlightRef.current =
            true;

          const controller =
            new AbortController();

          abortControllerRef.current =
            controller;

          try {
            // ----------------------------------------------
            // Send frame to FastAPI + YOLO.
            // ----------------------------------------------

            const response =
              await detectFrame(
                blob,
                controller.signal
              );

            // ----------------------------------------------
            // Ignore result if request was cancelled.
            // ----------------------------------------------

            if (controller.signal.aborted) {
              return;
            }

            // ----------------------------------------------
            // Update detections.
            // ----------------------------------------------

            setDetections(
              response.detections || []
            );

            // ----------------------------------------------
            // Update backend inference latency.
            // ----------------------------------------------

            if (
              response.latency_ms !==
              undefined
            ) {
              setLatency(
                response.latency_ms
              );
            }
          } catch (error) {
            // ----------------------------------------------
            // Abort is expected during cleanup.
            // ----------------------------------------------

            if (
              controller.signal.aborted
            ) {
              return;
            }

            console.error(
              `[WD-SYSTEM] ${id} detection failed`,
              error
            );

            // Never generate fake detections.
            setDetections([]);
            setLatency(null);
          } finally {
            // ----------------------------------------------
            // Always unlock the next request.
            // ----------------------------------------------

            detectionInFlightRef.current =
              false;

            if (
              abortControllerRef.current ===
              controller
            ) {
              abortControllerRef.current =
                null;
            }
          }
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    }, DETECTION_INTERVAL_MS);
  };

  // ==========================================================
  // START REAL CAMERA
  // ==========================================================

  const startStream = async (
    deviceId: string
  ) => {
    // --------------------------------------------------------
    // Avoid starting the same stream twice.
    // --------------------------------------------------------

    if (streamRef.current) {
      return;
    }

    setStatus("requesting");
    setDetections([]);
    setLatency(null);

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            video: {
              deviceId: {
                exact: deviceId,
              },
            },
            audio: false,
          }
        );

      // ------------------------------------------------------
      // Store stream.
      // ------------------------------------------------------

      streamRef.current = stream;

      // ------------------------------------------------------
      // Attach stream to video.
      // ------------------------------------------------------

      if (videoRef.current) {
        videoRef.current.srcObject =
          stream;

        await videoRef.current.play();
      }

      // ------------------------------------------------------
      // Camera is now live.
      // ------------------------------------------------------

      setStatus("live");

      // ------------------------------------------------------
      // Start YOLO detection loop.
      // ------------------------------------------------------

      startDetectionLoop();
    } catch (error) {
      console.error(
        `[WD-SYSTEM] ${id} camera start failed`,
        error
      );

      stopDetectionLoop();
      stopStream();

      setStatus("denied");
      setDetections([]);
      setLatency(null);
    }
  };

  // ==========================================================
  // CLAIM CAMERA
  // ==========================================================

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    if (permission !== "granted") {
      return;
    }

    startedRef.current = true;

    const device =
      devices[deviceIndex];

    if (device) {
      startStream(
        device.deviceId
      );
    } else {
      // ------------------------------------------------------
      // No physical camera available.
      // ------------------------------------------------------

      setStatus("no-device");
      setDetections([]);
      setLatency(null);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    permission,
    devices,
    deviceIndex,
  ]);

  // ==========================================================
  // CLEANUP
  // ==========================================================

  useEffect(() => {
    return () => {
      // ------------------------------------------------------
      // Stop polling.
      // ------------------------------------------------------

      stopDetectionLoop();

      // ------------------------------------------------------
      // Cancel current backend request.
      // ------------------------------------------------------

      abortControllerRef.current?.abort();

      abortControllerRef.current =
        null;

      detectionInFlightRef.current =
        false;

      // ------------------------------------------------------
      // Stop physical camera.
      // ------------------------------------------------------

      stopStream();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==========================================================
  // REQUEST CAMERA ACCESS
  // ==========================================================

  const handleRequestClick =
    async () => {
      // ------------------------------------------------------
      // First request browser permission.
      // ------------------------------------------------------

      if (permission === "idle") {
        await requestAllCameras();
        return;
      }

      // ------------------------------------------------------
      // Permission already granted.
      // ------------------------------------------------------

      const device =
        devices[deviceIndex];

      if (device) {
        await startStream(
          device.deviceId
        );
      } else {
        setStatus("no-device");
        setDetections([]);
        setLatency(null);
      }
    };

  // ==========================================================
  // STATUS TEXT
  // ==========================================================

  const statusText =
    status === "live"
      ? "LIVE"
      : status === "requesting"
      ? "REQUESTING"
      : status === "denied"
      ? "ACCESS DENIED"
      : status === "no-device"
      ? "NO-DEVICE"
      : "IDLE";

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="camera-frame">

      <div className="camera-noise" />

      {/* =====================================================
          CAMERA HEADER
      ====================================================== */}

      <div className="camera-hud">

        <span>
          <span className="rec">
            ● REC
          </span>

          &nbsp;

          {label}
        </span>

        <span>
          {id}

          &nbsp;|&nbsp;

          {statusText}
        </span>

      </div>

      {/* =====================================================
          REAL CAMERA VIDEO
      ====================================================== */}

      <video
        ref={videoRef}
        muted
        playsInline
        className="cam-video"
        style={{
          opacity:
            status === "live"
              ? 1
              : 0,
        }}
      />

      {/* =====================================================
          HIDDEN CANVAS
      ====================================================== */}

      <canvas
        ref={canvasRef}
        style={{
          display: "none",
        }}
      />

      {/* =====================================================
          REQUEST CAMERA ACCESS
      ====================================================== */}

      {(status === "idle" ||
        status === "requesting") && (
        <button
          className="cam-request-btn"
          onClick={
            handleRequestClick
          }
          disabled={
            status === "requesting"
          }
        >
          {status === "requesting"
            ? "AWAITING PERMISSION..."
            : "REQUEST ACCESS"}
        </button>
      )}

      {/* =====================================================
          NO CAMERA
      ====================================================== */}

      {status === "no-device" && (
        <div className="cam-badge">
          NO CAMERA DETECTED
        </div>
      )}

      {/* =====================================================
          CAMERA ACCESS DENIED
      ====================================================== */}

      {status === "denied" && (
        <div className="cam-badge">
          CAMERA ACCESS DENIED
        </div>
      )}

      {/* =====================================================
          YOLO BOUNDING BOXES
      ====================================================== */}

      <svg
        className="bbox-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
      >
        {detections.map(
          (
            detection,
            index
          ) => {
            const [
              x,
              y,
              w,
              h,
            ] = detection.box;

            return (
              <g
                key={`${detection.class_name}-${index}`}
              >

                <rect
                  className="bbox-rect"
                  x={
                    x * VB_W
                  }
                  y={
                    y * VB_H
                  }
                  width={
                    w * VB_W
                  }
                  height={
                    h * VB_H
                  }
                />

                <text
                  x={
                    x * VB_W
                  }
                  y={Math.max(
                    18,
                    y *
                      VB_H -
                      8
                  )}
                  className="bbox-text"
                >
                  {detection.class_name.toUpperCase()}{" "}
                  {(
                    detection.confidence *
                    100
                  ).toFixed(1)}
                  %
                </text>

              </g>
            );
          }
        )}
      </svg>

      {/* =====================================================
          DETECTION STATUS
      ====================================================== */}

      {status === "live" &&
        detections.length > 0 && (
          <div className="camera-detection-count">

            {detections.length} WEAPON
            {detections.length !== 1
              ? "S"
              : ""}{" "}
            DETECTED

            {latency !== null &&
              ` · ${Math.round(
                latency
              )}ms`}

          </div>
        )}

    </div>
  );
}