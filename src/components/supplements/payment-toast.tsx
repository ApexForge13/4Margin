"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

export function PaymentToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const payment = searchParams.get("payment");
    const isFree = searchParams.get("free") === "true";
    if (payment === "success") {
      if (isFree) {
        toast.success("Your first supplement is free! Your report is being generated now.");
      } else {
        toast.success("Payment successful! You can now download your supplement report.");
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
  }, [searchParams, router]);

  return null;
}
