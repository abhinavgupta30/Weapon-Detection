import CameraTile from "./CameraTile";

export default function LiveDemo() {
  return (
    <section className="demo" id="demo">
      <div className="demo-head">
        <p className="eyebrow">Live inference</p>

        <h2>4-camera perimeter feed</h2>

        <p className="demo-sub">
          Connect one or more cameras and request access to begin live
          weapon detection. Each camera feed is analyzed by the YOLO model
          through the FastAPI backend. Cameras that are not connected remain
          inactive.
        </p>
      </div>

      <div className="camera-grid">
        <CameraTile
          id="CAM_01"
          label="Camera 1"
          deviceIndex={0}
        />

        <CameraTile
          id="CAM_02"
          label="Camera 2"
          deviceIndex={1}
        />

        <CameraTile
          id="CAM_03"
          label="Camera 3"
          deviceIndex={2}
        />

        <CameraTile
          id="CAM_04"
          label="Camera 4"
          deviceIndex={3}
        />
      </div>

      <div className="demo-footer-note">
        <span>[ 4 CAMERA SLOTS ]</span>
        <span>LIVE YOLO INFERENCE</span>
      </div>
    </section>
  );
}