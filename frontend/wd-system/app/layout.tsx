import type { Metadata } from "next";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";
import { CameraProvider } from "@/components/CameraProvider";

export const metadata: Metadata = {
  title: "WD-SYSTEM — Automated Weapon Detection",
  description:
    "Real-time weapon detection system built using YOLO.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="grain" aria-hidden="true" />
        <CameraProvider>
          <SmoothScroll>{children}</SmoothScroll>
        </CameraProvider>
      </body>
    </html>
  );
}