from pathlib import Path
import time
import uuid

import cv2
import numpy as np
import torch

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO


# ============================================================
# PATHS
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_PATH = BASE_DIR / "models" / "best.pt"


# ============================================================
# MODEL CONFIG
# ============================================================

CONFIDENCE = 0.25
IOU = 0.50
IMAGE_SIZE = 640

# Automatically use GPU locally and CPU on cloud servers.
DEVICE = 0 if torch.cuda.is_available() else "cpu"

print(f"[WD-SYSTEM] Model path: {MODEL_PATH}")
print(f"[WD-SYSTEM] Device: {DEVICE}")

if not MODEL_PATH.exists():
    raise FileNotFoundError(
        f"Trained model not found: {MODEL_PATH}"
    )

model = YOLO(str(MODEL_PATH))

print("[WD-SYSTEM] Model loaded successfully.")
print(f"[WD-SYSTEM] Classes: {model.names}")


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="WD-SYSTEM Weapon Detection API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CAMERA DETECTION STORAGE
# ============================================================

latest_detections = {
    "CAM_01": [],
    "CAM_02": [],
    "CAM_03": [],
    "CAM_04": [],
}


# ============================================================
# CAMERA CONFIGURATION
# ============================================================

CAMERA_INDICES = {
    "CAM_01": 0,
    "CAM_02": 1,
    "CAM_03": 2,
    "CAM_04": 3,
}

JPEG_QUALITY = 80


# ============================================================
# CAMERA FRAME GENERATOR
# ============================================================

def generate_camera_frames(camera_id: str, camera_index: int):
    """
    Continuously capture frames from a physical camera
    and return them as an MJPEG stream.
    """

    camera = cv2.VideoCapture(camera_index)

    try:

        if not camera.isOpened():
            print(
                f"[WD-SYSTEM] {camera_id} could not be opened."
            )
            return

        camera.set(
            cv2.CAP_PROP_FRAME_WIDTH,
            1280,
        )

        camera.set(
            cv2.CAP_PROP_FRAME_HEIGHT,
            720,
        )

        print(
            f"[WD-SYSTEM] {camera_id} stream started."
        )

        while True:

            success, frame = camera.read()

            if not success:
                print(
                    f"[WD-SYSTEM] {camera_id} frame read failed."
                )
                break

            success, encoded = cv2.imencode(
                ".jpg",
                frame,
                [
                    int(cv2.IMWRITE_JPEG_QUALITY),
                    JPEG_QUALITY,
                ],
            )

            if not success:
                continue

            frame_bytes = encoded.tobytes()

            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n"
                b"Content-Length: "
                + str(len(frame_bytes)).encode()
                + b"\r\n\r\n"
                + frame_bytes
                + b"\r\n"
            )

    finally:

        camera.release()

        print(
            f"[WD-SYSTEM] {camera_id} stream stopped."
        )


# ============================================================
# HEALTH CHECK
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "service": "WD-SYSTEM",
        "model": MODEL_PATH.name,
        "device": str(DEVICE),
        "classes": model.names,
    }


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "service": "WD-SYSTEM Weapon Detection API",
        "status": "running",
        "model": MODEL_PATH.name,
        "device": str(DEVICE),
        "endpoints": [
            "GET /",
            "GET /health",
            "POST /detect",
            "GET /cameras/{camera_id}/detections",
            "GET /cameras/{camera_id}/stream",
        ],
    }


# ============================================================
# IMAGE DETECTION
# ============================================================

@app.post("/detect")
async def detect(frame: UploadFile = File(...)):

    start_time = time.perf_counter()

    # --------------------------------------------------------
    # Validate uploaded file
    # --------------------------------------------------------

    if (
        not frame.content_type
        or not frame.content_type.startswith("image/")
    ):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file must be an image.",
        )

    try:

        image_bytes = await frame.read()

        if not image_bytes:
            raise HTTPException(
                status_code=400,
                detail="Empty image received.",
            )

        # ----------------------------------------------------
        # Decode image
        # ----------------------------------------------------

        np_buffer = np.frombuffer(
            image_bytes,
            dtype=np.uint8,
        )

        image = cv2.imdecode(
            np_buffer,
            cv2.IMREAD_COLOR,
        )

        if image is None:
            raise HTTPException(
                status_code=400,
                detail="Could not decode the uploaded image.",
            )
                # ----------------------------------------------------
        # YOLO inference timing
        # ----------------------------------------------------

        inference_start_time = time.perf_counter()

        results = model.predict(
            source=image,
            conf=CONFIDENCE,
            iou=IOU,
            imgsz=IMAGE_SIZE,
            device=DEVICE,
            verbose=False,
        )

        inference_ms = (
            time.perf_counter() - inference_start_time
        ) * 1000

        print(
            f"[WD-SYSTEM] YOLO inference time: "
            f"{inference_ms:.2f} ms"
        )

        print(
            f"[WD-SYSTEM] Image size: "
            f"{image.shape[1]}x{image.shape[0]}, "
            f"confidence threshold: {CONFIDENCE}, "
            f"inference size: {IMAGE_SIZE}"
        )

        if results and results[0].boxes is not None:
            print(
                f"[WD-SYSTEM] Detections returned: "
                f"{len(results[0].boxes)}"
            )

            print(
                f"[WD-SYSTEM] Confidence scores: "
                f"{results[0].boxes.conf.detach().cpu().tolist()}"
            )


        detections = []

        # ----------------------------------------------------
        # Extract detections
        # ----------------------------------------------------

        if results:

            result = results[0]

            if result.boxes is not None:

                boxes = result.boxes

                image_height, image_width = image.shape[:2]

                for i in range(len(boxes)):

                    xyxy = (
                        boxes.xyxy[i]
                        .detach()
                        .cpu()
                        .numpy()
                    )

                    confidence = float(
                        boxes.conf[i]
                        .detach()
                        .cpu()
                        .item()
                    )

                    class_id = int(
                        boxes.cls[i]
                        .detach()
                        .cpu()
                        .item()
                    )

                    x1, y1, x2, y2 = xyxy.tolist()

                    # ----------------------------------------
                    # Convert to normalized coordinates
                    # ----------------------------------------

                    x = x1 / image_width
                    y = y1 / image_height

                    width = (x2 - x1) / image_width
                    height = (y2 - y1) / image_height

                    # ----------------------------------------
                    # Clamp values
                    # ----------------------------------------

                    x = max(0.0, min(1.0, x))
                    y = max(0.0, min(1.0, y))
                    width = max(0.0, min(1.0, width))
                    height = max(0.0, min(1.0, height))

                    # ----------------------------------------
                    # Class name
                    # ----------------------------------------

                    class_name = model.names.get(
                        class_id,
                        str(class_id),
                    )

                    detections.append(
                        {
                            "class_name": str(class_name),
                            "confidence": confidence,
                            "box": [
                                x,
                                y,
                                width,
                                height,
                            ],
                        }
                    )

        # ----------------------------------------------------
        # Response information
        # ----------------------------------------------------

        latency_ms = (
            time.perf_counter() - start_time
        ) * 1000

        # ----------------------------------------------------
        # Store latest CAM_01 detections
        #
        # CAM_01 represents the browser webcam.
        # ----------------------------------------------------

        latest_detections["CAM_01"] = detections

        return {
            "detections": detections,
            "frame_id": str(uuid.uuid4()),
            "latency_ms": round(latency_ms, 2),
        }

    except HTTPException:
        raise

    except Exception as exc:

        print(
            f"[WD-SYSTEM] Detection error: {exc}"
        )

        raise HTTPException(
            status_code=500,
            detail=f"Detection failed: {str(exc)}",
        )


# ============================================================
# CAMERA DETECTIONS
# ============================================================

@app.get("/cameras/{camera_id}/detections")
def camera_detections(camera_id: str):

    # Reject unknown camera IDs.
    if camera_id not in latest_detections:

        raise HTTPException(
            status_code=404,
            detail=f"Unknown camera: {camera_id}",
        )

    return {
        "camera_id": camera_id,
        "detections": latest_detections[camera_id],
    }


# ============================================================
# CAMERA MJPEG STREAM
# ============================================================

@app.get("/cameras/{camera_id}/stream")
def camera_stream(camera_id: str):

    # Reject unknown camera IDs.
    if camera_id not in CAMERA_INDICES:

        raise HTTPException(
            status_code=404,
            detail=f"Unknown camera: {camera_id}",
        )

    camera_index = CAMERA_INDICES[camera_id]

    # Test whether the physical camera is available.
    test_camera = cv2.VideoCapture(camera_index)

    if not test_camera.isOpened():

        test_camera.release()

        raise HTTPException(
            status_code=503,
            detail=f"{camera_id} is not available.",
        )

    test_camera.release()

    return StreamingResponse(
        generate_camera_frames(
            camera_id,
            camera_index,
        ),
        media_type=(
            "multipart/x-mixed-replace; boundary=frame"
        ),
        headers={
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
        },
    )