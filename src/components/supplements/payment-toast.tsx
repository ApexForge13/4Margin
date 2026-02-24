"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

/**
 * PaymentToast — handles payment success/cancelled URL params.
 *
 * On `?payment=success`:
 * 1. Shows a toast
 * 2. Triggers the AI pipeline via /api/supplements/[id]/generate
 *    (supplement was created as "draft" — pipeline only runs after payment)
 * 3. Cleans URL params
 */
export function PaymentToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const triggeredRef = useRef(false);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const isFree = searchParams.get("free") === "true";

    if (payment === "success" && !triggeredRef.current) {
      triggeredRef.current = true;

      if (isFree) {
        toast.success("Your first supplement is free! Your report is being generated now.");
      } else {
        toast.success("Payment successful! Your supplement is being generated now.");
      }

      // Extract supplement ID from pathname: /dashboard/supplements/[id]
      const segments = pathname.split("/");
      const supplementId = segments[segments.length - 1];

      if (supplementId && supplementId !== "supplements") {
        // Trigger the AI pipeline now that payment is confirmed
        console.log(`[payment-toast] Triggering pipeline for supplement ${supplementId}`);
        fetch(`/api/supplements/${supplementId}/generate`, {
          method: "POST",
        })
          .then((res) => {
            if (!res.ok) {
              console.error("[payment-toast] Pipeline trigger failed:", res.status);
            } else {
              console.log("[payment-toast] Pipeline triggered successfully");
            }
          })
          .catch((err) => {
            console.error("[payment-toast] Pipeline trigger error:", err);
          });
      }

      // Clean URL params
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("free");
      router.replace(url.pathname, { scroll: false });
    } else if (payment === "cancelled") {
      toast.info("Payment cancelled. You can try again anytime.");
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  return null;
}
