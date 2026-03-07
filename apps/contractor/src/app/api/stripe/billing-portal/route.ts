import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role, company_id, companies(account_type, stripe_customer_id)")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }

  const company = profile.companies as unknown as {
    account_type: string;
    stripe_customer_id: string | null;
  } | null;

  if (
    profile.role !== "owner" ||
    company?.account_type !== "enterprise" ||
    !company?.stripe_customer_id
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.4margin.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: company.stripe_customer_id,
    return_url: `${appUrl}/dashboard/settings`,
  });

  return NextResponse.json({ url: session.url });
}
