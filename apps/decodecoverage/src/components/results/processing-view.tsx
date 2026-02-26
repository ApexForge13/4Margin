"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function ProcessingView({ id }: { id: string }) {
  const router = useRouter();

  useEffect(() => {
    // Poll every 3 seconds until the analysis is done
    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="logo">
            Decode<span>Coverage</span>
          </a>
        </div>
      </nav>
      <div className="processing-page">
        <div className="processing-content">
          <div className="processing-spinner" />
          <h2>Analyzing your policy...</h2>
          <p>
            Our AI is reading through your policy and identifying your coverages,
            exclusions, and potential risks. This usually takes about 30-60
            seconds.
          </p>
        </div>
      </div>
    </>
  );
}
