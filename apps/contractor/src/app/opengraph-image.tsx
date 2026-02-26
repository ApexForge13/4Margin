import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "4Margin — AI-Powered Insurance Supplements for Roofing Contractors";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #060A13 0%, #0A1628 50%, #060A13 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Gradient orb top */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            transform: "translateX(-50%)",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,191,255,0.15) 0%, transparent 70%)",
          }}
        />
        {/* Gradient orb bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: -50,
            right: 100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(57,255,158,0.1) 0%, transparent 70%)",
          }}
        />

        {/* Logo */}
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            textTransform: "uppercase" as const,
            marginBottom: 24,
          }}
        >
          <span style={{ color: "#00BFFF" }}>4</span>
          <span style={{ color: "#FFFFFF" }}>M</span>
          <span style={{ color: "#39FF9E" }}>A</span>
          <span style={{ color: "#FFFFFF" }}>RG</span>
          <span style={{ color: "#39FF9E" }}>I</span>
          <span style={{ color: "#FFFFFF" }}>N</span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: 800,
            lineHeight: 1.3,
          }}
        >
          Stop leaving{" "}
          <span style={{ color: "#00BFFF" }}>$3,000–$8,000</span>
          {" "}on every insurance job.
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 20,
            color: "#94A3B8",
            marginTop: 16,
            textAlign: "center",
            maxWidth: 700,
          }}
        >
          AI-powered supplement generation for roofing contractors.
          Upload the adjuster&apos;s scope. Get the supplement in 10 minutes.
        </div>

        {/* Stats row */}
        <div
          style={{
            display: "flex",
            gap: 60,
            marginTop: 48,
          }}
        >
          {[
            { value: "$4,200", label: "Avg. Recovery", color: "#39FF9E" },
            { value: "< 10 min", label: "Generation Time", color: "#00BFFF" },
            { value: "$149", label: "Per Supplement", color: "#FFFFFF" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, color: stat.color }}>
                {stat.value}
              </span>
              <span style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
