import { ImageResponse } from "next/og";
import { CHAOS_LOGO_SRC } from "./og-logo";

export const runtime = "edge";
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0A",
        }}
      >
        <img
          src={CHAOS_LOGO_SRC}
          width="32"
          height="32"
          style={{ objectFit: "cover" }}
        />
      </div>
    ),
    size
  );
}
