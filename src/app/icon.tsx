import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0A0A0A",
      }}>
        <span style={{ color: "#F97316", fontSize: 24, fontWeight: 700, lineHeight: 1 }}>C</span>
      </div>
    ),
    size
  );
}
