"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PermissionState = "idle" | "granted" | "denied";

interface CameraCtxValue {
  devices: MediaDeviceInfo[];
  permission: PermissionState;
  requestAllCameras: () => Promise<void>;
}

const CameraContext = createContext<CameraCtxValue | null>(null);

export function CameraProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [permission, setPermission] =
    useState<PermissionState>("idle");

  const inFlight = useRef(false);

  const requestAllCameras = async () => {
    const demo = document.getElementById("demo");

    demo?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });

    if (inFlight.current) return;

    inFlight.current = true;

    try {
      const probe =
        await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

      probe.getTracks().forEach((track) => {
        track.stop();
      });

      const all =
        await navigator.mediaDevices.enumerateDevices();

      const cameras = all.filter(
        (device) => device.kind === "videoinput"
      );

      setDevices(cameras);
      setPermission("granted");

      console.log(
        `[WD-SYSTEM] ${cameras.length} camera(s) detected`
      );
    } catch (error) {
      console.error(
        "[WD-SYSTEM] Camera permission failed:",
        error
      );

      setPermission("denied");
    } finally {
      inFlight.current = false;
    }
  };

  return (
    <CameraContext.Provider
      value={{
        devices,
        permission,
        requestAllCameras,
      }}
    >
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraContext() {
  const context = useContext(CameraContext);

  if (!context) {
    throw new Error(
      "useCameraContext must be used within CameraProvider"
    );
  }

  return context;
}