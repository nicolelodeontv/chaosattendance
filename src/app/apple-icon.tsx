import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

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
        <span style={{ color: "#F97316", fontSize: 124, fontWeight: 700, lineHeight: 1 }}>C</span>
      </div>
    ),
    size
  );
}
