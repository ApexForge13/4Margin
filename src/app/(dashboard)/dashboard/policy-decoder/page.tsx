import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPolicyDecodings, getPaidDecodingCount } from "./actions";
import { NewDecodeButton } from "@/components/policy-decoder/new-decode-button";
import { DecodingsList } from "@/components/policy-decoder/decodings-list";

export default async function PolicyDecoderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ decodings, error }, paidCount] = await Promise.all([
    getPolicyDecodings(),
    getPaidDecodingCount(),
  ]);

  const isFirstDecode = paidCount === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Policy Decoder</h2>
          <p className="text-muted-foreground">
            Decode insurance policies to uncover coverages, deductibles,
            endorsements, and exclusions.
          </p>
        </div>
        <NewDecodeButton isFirstDecode={isFirstDecode} />
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <DecodingsList decodings={decodings} />
    </div>
  );
}
