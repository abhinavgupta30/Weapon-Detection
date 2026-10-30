"use client";

import { useEffect, useState } from "react";
import { detectFrame, Detection } from "@/lib/api";

export default function ImageDetection() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [latency, setLatency] = useState<number | null>(null);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    setError(null);
    setDetections([]);
    setFileName(file.name);
    setLatency(null);

    const url = URL.createObjectURL(file);

    setImageUrl((previousUrl) => {
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      return url;
    });

    setLoading(true);

    try {
      const response = await detectFrame(file);

      setDetections(response.detections || []);
      setLatency(response.latency_ms ?? null);
    } catch (err) {
      console.error("Image detection error:", err);

      setError(
        "Detection failed. Make sure the FastAPI backend is running on port 8000."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  const highestConfidence =
    detections.length > 0
      ? Math.max(...detections.map((d) => d.confidence))
      : 0;

  return (
    <section className="image-detection" id="image-detection">

      <div className="image-detection-head">
        <p className="eyebrow">Image inference</p>

        <h2>Upload an image for detection</h2>

        <p className="demo-sub">
          Submit an image to the WD-SYSTEM inference engine. The trained YOLO11
          model analyzes the frame and returns detected weapons with confidence
          scores and bounding-box coordinates.
        </p>
      </div>

      {/* Upload */}
      <div className="image-upload-area">
        <label className="image-upload-button">
          {loading ? "ANALYZING..." : "CHOOSE IMAGE"}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            hidden
          />
        </label>

        {fileName && (
          <span className="image-file-name">
            {fileName}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="image-error">
          {error}
        </div>
      )}

      {/* Results */}
      {imageUrl && (
        <div className="image-result">

          {/* IMAGE */}
          <div className="image-preview">

            <img
              src={imageUrl}
              alt="Uploaded image for weapon detection"
            />

            <div className="image-bbox-layer">
            {detections.map((detection, index) => {
             const [x, y, width, height] = detection.box;

            return (
             <div
            key={index}
            className="image-bbox-html"
            style={{
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: `${width * 100}%`,
            height: `${height * 100}%`,
          }}
      >
          <span className="image-bbox-html-label">
          {detection.class_name.toUpperCase()}{" "}
          {(detection.confidence * 100).toFixed(1)}%
          </span>
        </div>
      );
   })}
  </div>

            {/* Status */}
            {!loading && detections.length > 0 && (
              <div className="image-status">
                DETECTION COMPLETE
              </div>
            )}

          </div>

          {/* RESULT PANEL */}
          <div className="image-results-panel">

            <div className="results-panel-header">
              <div>
                <span className="results-kicker">
                  ANALYSIS OUTPUT
                </span>

                <h3>Detection Results</h3>
              </div>

              <span
                className={
                  detections.length > 0
                    ? "results-status detected"
                    : "results-status"
                }
              >
                {loading
                  ? "RUNNING"
                  : detections.length > 0
                  ? "DETECTED"
                  : "CLEAR"}
              </span>
            </div>

            {loading && (
              <div className="results-loading">
                <span className="loading-dot" />
                Running YOLO inference...
              </div>
            )}

            {!loading && detections.length === 0 && (
              <div className="results-clear">
                No weapon detected above the configured confidence threshold.
              </div>
            )}

            {!loading && detections.length > 0 && (
              <>
                <div className="detection-list">

                  {detections.map((detection, index) => (
                    <div
                      className="detection-result"
                      key={index}
                    >
                      <div className="detection-index">
                        {String(index + 1).padStart(2, "0")}
                      </div>

                      <div className="detection-name">
                        <span>
                          {detection.class_name.toUpperCase()}
                        </span>

                        <small>
                          OBJECT DETECTED
                        </small>
                      </div>

                      <strong>
                        {(detection.confidence * 100).toFixed(1)}%
                      </strong>
                    </div>
                  ))}

                </div>

                {/* SUMMARY */}
                <div className="detection-summary">

                  <div className="summary-item">
                    <span>TOTAL</span>
                    <strong>{detections.length}</strong>
                  </div>

                  <div className="summary-item">
                    <span>MAX CONF.</span>
                    <strong>
                      {(highestConfidence * 100).toFixed(1)}%
                    </strong>
                  </div>

                  {latency !== null && (
                    <div className="summary-item">
                      <span>LATENCY</span>
                      <strong>{latency.toFixed(0)}ms</strong>
                    </div>
                  )}

                </div>
              </>
            )}

            {/* SYSTEM INFO */}
            <div className="inference-meta">

              <div>
                <span>MODEL</span>
                <strong>YOLO11n</strong>
              </div>

              <div>
                <span>CLASS</span>
                <strong>WEAPON</strong>
              </div>

              <div>
                <span>ENGINE</span>
                <strong>GPU / CUDA</strong>
              </div>

            </div>

          </div>
        </div>
      )}
    </section>
  );
}