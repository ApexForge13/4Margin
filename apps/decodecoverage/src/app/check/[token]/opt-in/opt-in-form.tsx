"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OptInForm({ token }: { token: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleResponse(optIn: boolean) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/check/${token}/opt-in`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn }),
      });

      if (!res.ok) {
        console.error("Opt-in failed:", await res.text());
      }

      router.refresh();
    } catch (err) {
      console.error("Opt-in error:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <button
        onClick={() => handleResponse(true)}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "14px 24px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius)",
          fontSize: 16,
          fontWeight: 600,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        {submitting ? "Submitting..." : "Yes, Connect Me With an Expert"}
      </button>
      <button
        onClick={() => handleResponse(false)}
        disabled={submitting}
        style={{
          width: "100%",
          padding: "14px 24px",
          background: "transparent",
          color: "var(--text-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          fontSize: 15,
          cursor: submitting ? "not-allowed" : "pointer",
          opacity: submitting ? 0.7 : 1,
        }}
      >
        No Thanks
      </button>
    </div>
  );
}
