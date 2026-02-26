"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { acceptInvite } from "./actions";

interface AcceptInviteButtonProps {
  token: string;
}

export function AcceptInviteButton({ token }: AcceptInviteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAccept = async () => {
    setLoading(true);

    const result = await acceptInvite(token);

    if (result.error) {
      toast.error(result.error);
      setLoading(false);
      return;
    }

    toast.success("Welcome to the team!");
    router.push("/dashboard");
  };

  return (
    <Button onClick={handleAccept} disabled={loading} size="lg" className="w-full">
      {loading ? "Joining..." : "Accept & Join Team"}
    </Button>
  );
}
