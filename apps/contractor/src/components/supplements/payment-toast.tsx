"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";

/**
 * PaymentToast — handles payment success/cancelled URL params.
 *
 * On `?payment=success`:
 * 1. Shows a toast + inline "Analyzing" card (hides DraftPaymentCard immediately)
 * 2. Triggers the AI pipeline via /api/supplements/[id]/generate
 * 3. Refreshes the page so the server component picks up "generating" status
 * 4. Cleans URL params after refresh
 */
export function PaymentToast() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const triggeredRef = useRef(false);
  const [showGenerating, setShowGenerating] = useState(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).get("payment") === "success"
  );

  useEffect(() => {
    const payment = searchParams.get("payment");
    const isFree = searchParams.get("free") === "true";

    if (payment === "success" && !triggeredRef.current) {
      triggeredRef.current = true;
      setShowGenerating(true);

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
            // Refresh page — generate sets status to "generating"
            // so the server component will show the progress card
            router.refresh();
            setTimeout(() => {
              setShowGenerating(false);
              router.replace(pathname, { scroll: false });
            }, 500);
          })
          .catch((err) => {
            console.error("[payment-toast] Pipeline trigger error:", err);
            router.refresh();
            setTimeout(() => {
              setShowGenerating(false);
              router.replace(pathname, { scroll: false });
            }, 500);
          });
      } else {
        router.replace(pathname, { scroll: false });
        setShowGenerating(false);
      }
    } else if (payment === "cancelled") {
      toast.info("Payment cancelled. You can try again anytime.");
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      router.replace(url.pathname, { scroll: false });
    }
  }, [searchParams, router, pathname]);

  // Show an inline "analyzing" card immediately on payment success
  // This covers the gap before the server component re-renders with status="generating"
  if (!showGenerating) return null;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="flex items-center gap-3 py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <div>
          <p className="font-medium text-blue-900">Analyzing your estimate...</p>
          <p className="text-sm text-blue-700">Payment confirmed. Our AI is reviewing the adjuster&apos;s scope and identifying missing items. This usually takes 1-2 minutes.</p>
        </div>
      </CardContent>
    </Card>
  );
}
