"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#FAFAF7",
          }}
        >
          <p style={{ fontFamily: "'DM Sans', sans-serif", color: "#5A5A5A" }}>
            Loading...
          </p>
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const leadId = searchParams.get("id");
  const email = searchParams.get("email");

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle"
  );

  async function handleUnsubscribe() {
    setStatus("loading");
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: leadId, email }),
      });
      if (!res.ok) throw new Error("Failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  // Auto-unsubscribe if token is present (one-click CAN-SPAM compliance)
  useEffect(() => {
    if (leadId || email) {
      handleUnsubscribe();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#FAFAF7",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#FFFFFF",
          borderRadius: 20,
          padding: "48px 32px",
          textAlign: "center",
          border: "1px solid #E5E5E0",
        }}
      >
        {status === "done" ? (
          <>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "#E8F5EE",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 24px",
                fontSize: 28,
              }}
            >
              &#10003;
            </div>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 24,
                color: "#1A1A1A",
                marginBottom: 12,
              }}
            >
              You&apos;ve been unsubscribed
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: "#5A5A5A",
                lineHeight: 1.6,
              }}
            >
              You won&apos;t receive any more emails from DecodeCoverage. Your
              policy report is still available if you ever want to revisit it.
            </p>
          </>
        ) : status === "error" ? (
          <>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 24,
                color: "#1A1A1A",
                marginBottom: 12,
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: "#5A5A5A",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              We couldn&apos;t process your unsubscribe request. Please try
              again or contact us at support@decodecoverage.com.
            </p>
            <button
              onClick={handleUnsubscribe}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                padding: "12px 28px",
                background: "#1B6B4A",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </>
        ) : status === "loading" ? (
          <>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 24,
                color: "#1A1A1A",
                marginBottom: 12,
              }}
            >
              Unsubscribing...
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: "#5A5A5A",
              }}
            >
              One moment.
            </p>
          </>
        ) : (
          <>
            <h1
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 24,
                color: "#1A1A1A",
                marginBottom: 12,
              }}
            >
              Unsubscribe from DecodeCoverage
            </h1>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: "#5A5A5A",
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              Click below to stop receiving emails from us.
            </p>
            <button
              onClick={handleUnsubscribe}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                padding: "12px 28px",
                background: "#1B6B4A",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                fontSize: 16,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Unsubscribe
            </button>
          </>
        )}

        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12,
            color: "#8A8A8A",
            marginTop: 32,
          }}
        >
          Powered by{" "}
          <a href="https://4margin.com" style={{ color: "#1B6B4A" }}>
            4Margin
          </a>
        </p>
      </div>
    </div>
  );
}
