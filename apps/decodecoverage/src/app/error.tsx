"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "DM Sans, sans-serif",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div>
        <h2 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
          Something went wrong
        </h2>
        <p style={{ color: "#666", marginBottom: "1.5rem", maxWidth: 400 }}>
          We hit an unexpected error. Please try again, or contact us at{" "}
          <a href="mailto:support@decodecoverage.com" style={{ color: "#2d6a4f" }}>
            support@decodecoverage.com
          </a>{" "}
          if it keeps happening.
        </p>
        <button
          onClick={reset}
          style={{
            background: "#2d6a4f",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.75rem 1.5rem",
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
