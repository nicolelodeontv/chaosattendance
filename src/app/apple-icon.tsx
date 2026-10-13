import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const logoSrc = "https://chaosattendance.vercel.app/chaos-clan-logo.jpg";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0A",
        borderRadius: 36,
        overflow: "hidden",
      }}>
        <img src={logoSrc} width="180" height="180" style={{ objectFit: "cover" }} />
      </div>
    ),
    size
  );
}
