import { ImageResponse } from "@vercel/og"

export const config = { runtime: "edge" }

export default async function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "100px",
          background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "24px", marginBottom: "32px" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "12px",
              background: "#3b82f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "48px",
              fontWeight: 800,
              color: "#ffffff",
            }}
          >
            D
          </div>
          <span style={{ fontSize: "64px", fontWeight: 800, color: "#ffffff", letterSpacing: "-0.02em" }}>
            DogBone CNC
          </span>
        </div>

        <span style={{ fontSize: "32px", color: "#94a3b8", marginBottom: "12px" }}>
          DXF Dogbone Corner Fillet Tool
        </span>

        <span style={{ fontSize: "24px", color: "#64748b", marginBottom: "40px" }}>
          Import DXF · Apply corner relief · Export
        </span>

        <div
          style={{
            display: "flex",
            padding: "12px 32px",
            borderRadius: "100px",
            background: "#3b82f6",
            fontSize: "20px",
            fontWeight: 600,
            color: "#ffffff",
          }}
        >
          Try it free
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  )
}
