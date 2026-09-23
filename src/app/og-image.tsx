import { ImageResponse } from "next/og";

export async function createOgImageResponse() {
  const logoData = await fetch(
    new URL("../../public/chaos-clan-logo.jpg", import.meta.url)
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0A0A0A",
          padding: "72px",
          color: "#F5F1EA",
          fontFamily: "Arial, Helvetica, sans-serif",
          border: "1px solid #3A1414",
        }}
      >
        <div
          style={{
            width: 250,
            height: 250,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 10,
            border: "2px solid #7F1D1D",
            borderRadius: 30,
            background: "#000000",
          }}
        >
          <img
            src={logoData}
            width="230"
            height="230"
            style={{ objectFit: "cover", borderRadius: 20 }}
          />
        </div>

        <div
          style={{
            width: 730,
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 4,
              color: "#F97316",
              marginBottom: 26,
            }}
          >
            <span style={{ width: 12, height: 12, borderRadius: 999, background: "#FF4500" }} />
            CHAOS
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 58,
              lineHeight: 1,
              fontWeight: 700,
              letterSpacing: -1,
            }}
          >
            Attendance Tracker
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              fontSize: 24,
              lineHeight: 1.35,
              color: "#C2B7AE",
              maxWidth: 660,
            }}
          >
            Report your IGN, attendance and pilot status for Chaos clan squadron ops.
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
