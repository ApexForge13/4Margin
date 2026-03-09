import { createClient } from "@/lib/supabase/server";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { Period } from "@/components/dashboard/dashboard-client";
import type { DashboardStatsProps } from "@/components/dashboard/dashboard-stats";
import type { ActivityItem } from "@/components/dashboard/activity-feed";

// ─── Types ──────────────────────────────────────────────────────────────────

interface SupplementRow {
  id: string;
  status: string;
  supplement_total: number | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  generated_pdf_url: string | null;
  claims: {
    claim_number: string | null;
    property_address: string | null;
  } | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function periodStart(period: Period): Date {
  const now = new Date();
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1);
  }
  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1);
  }
  return new Date(0);
}

function prevPeriodStart(period: Period): Date {
  const now = new Date();
  if (period === "month") {
    return new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3 - 3, 1);
  }
  if (period === "year") {
    return new Date(now.getFullYear() - 1, 0, 1);
  }
  return new Date(0);
}

function trendPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function supplementsInRange(
  supplements: SupplementRow[],
  start: Date,
  end: Date
): SupplementRow[] {
  return supplements.filter((s) => {
    const d = new Date(s.created_at);
    return d >= start && d < end;
  });
}

function computeStats(
  current: SupplementRow[],
  previous: SupplementRow[],
  currentDecodes: number,
  previousDecodes: number
): DashboardStatsProps {
  const totalSupplements = current.length;
  const prevTotal = previous.length;

  const totalRecovery = current.reduce(
    (sum, s) => sum + (s.supplement_total ?? 0),
    0
  );
  const prevRecovery = previous.reduce(
    (sum, s) => sum + (s.supplement_total ?? 0),
    0
  );

  const approved = current.filter((s) =>
    ["approved", "partially_approved"].includes(s.status)
  ).length;
  const decided = current.filter((s) =>
    ["approved", "partially_approved", "denied"].includes(s.status)
  ).length;
  const approvalRate = decided > 0 ? (approved / decided) * 100 : 0;

  const prevApproved = previous.filter((s) =>
    ["approved", "partially_approved"].includes(s.status)
  ).length;
  const prevDecided = previous.filter((s) =>
    ["approved", "partially_approved", "denied"].includes(s.status)
  ).length;
  const prevApprovalRate = prevDecided > 0 ? (prevApproved / prevDecided) * 100 : 0;

  return {
    totalSupplements,
    supplementsTrend: trendPct(totalSupplements, prevTotal),
    totalRecovery,
    recoveryTrend: trendPct(totalRecovery, prevRecovery),
    approvalRate,
    approvalTrend: trendPct(approvalRate, prevApprovalRate),
    totalDecodes: currentDecodes,
    decodesTrend: trendPct(currentDecodes, previousDecodes),
  };
}

function buildPipelineData(
  supplements: SupplementRow[]
): { status: string; count: number; color: string }[] {
  const STATUS_COLORS: Record<string, string> = {
    draft: "#94a3b8",
    generating: "#00BFFF",
    complete: "#3b82f6",
    approved: "#10b981",
    partially_approved: "#f59e0b",
    denied: "#ef4444",
  };

  const counts: Record<string, number> = {};
  for (const s of supplements) {
    counts[s.status] = (counts[s.status] ?? 0) + 1;
  }

  const ORDER = [
    "draft",
    "generating",
    "complete",
    "approved",
    "partially_approved",
    "denied",
  ];

  return ORDER.map((status) => ({
    status,
    count: counts[status] ?? 0,
    color: STATUS_COLORS[status] ?? "#94a3b8",
  }));
}

function buildRecoveryData(
  supplements: SupplementRow[]
): { month: string; amount: number; count: number }[] {
  const now = new Date();
  // Build last 6 months
  const months: { month: string; amount: number; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleDateString("en-US", { month: "short" }),
      amount: 0,
      count: 0,
    });
  }

  for (const s of supplements) {
    const d = new Date(s.created_at);
    const monthLabel = d.toLocaleDateString("en-US", { month: "short" });
    const bucket = months.find((m) => m.month === monthLabel);
    if (bucket) {
      bucket.amount += s.supplement_total ?? 0;
      bucket.count += 1;
    }
  }

  return months;
}

function claimName(s: SupplementRow): string {
  if (s.claims?.claim_number) return `Claim #${s.claims.claim_number}`;
  if (s.claims?.property_address) return s.claims.property_address;
  return `Supplement ${s.id.slice(0, 6)}`;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Fetch profile + company
  const { data: profile } = await supabase
    .from("users")
    .select("company_id, companies(name, phone, address)")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const companyId: string = profile.company_id;
  const company = profile.companies as unknown as {
    name: string;
    phone: string | null;
    address: string | null;
  } | null;

  const hasCompany = !!(company?.name && (company?.phone || company?.address));

  // Fetch all supplements for this company
  const { data: supplementsRaw } = await supabase
    .from("supplements")
    .select(
      `
      id,
      status,
      supplement_total,
      created_at,
      updated_at,
      paid_at,
      generated_pdf_url,
      claims (
        claim_number,
        property_address
      )
    `
    )
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  const supplements = (supplementsRaw ?? []) as unknown as SupplementRow[];

  // Fetch supplement item counts for "ready to review" detection
  const { data: itemCountsRaw } = await supabase
    .from("supplement_items")
    .select("supplement_id")
    .in(
      "supplement_id",
      supplements.map((s) => s.id)
    )
    .eq("status", "detected");

  const itemsPerSupplement: Record<string, number> = {};
  for (const row of itemCountsRaw ?? []) {
    const r = row as { supplement_id: string };
    itemsPerSupplement[r.supplement_id] =
      (itemsPerSupplement[r.supplement_id] ?? 0) + 1;
  }

  // Fetch policy decodings count (all time + period-aware)
  const { data: decodingsRaw } = await supabase
    .from("policy_decodings")
    .select("id, created_at")
    .eq("company_id", companyId);

  const decodings = (decodingsRaw ?? []) as { id: string; created_at: string }[];

  // ── Build action items ────────────────────────────────────────────────────

  const THREE_MIN_AGO = new Date(Date.now() - 3 * 60 * 1000).toISOString();

  const stuckGenerating = supplements
    .filter((s) => s.status === "generating" && s.created_at < THREE_MIN_AGO)
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      claimName: claimName(s),
      createdAt: s.created_at,
    }));

  const needsReview = supplements
    .filter(
      (s) =>
        s.status === "complete" &&
        !s.generated_pdf_url &&
        (itemsPerSupplement[s.id] ?? 0) > 0
    )
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      claimName: claimName(s),
      itemCount: itemsPerSupplement[s.id] ?? 0,
    }));

  const pendingPayment = supplements
    .filter((s) => s.status === "draft" && s.paid_at === null)
    .slice(0, 5)
    .map((s) => ({
      id: s.id,
      claimName: claimName(s),
      total: s.supplement_total ?? 0,
    }));

  // ── Build activity feed ───────────────────────────────────────────────────

  const activity: ActivityItem[] = supplements.slice(0, 15).map((s) => {
    let type: ActivityItem["type"] = "created";
    if (s.status === "approved" || s.status === "partially_approved") {
      type = "approved";
    } else if (s.status === "denied") {
      type = "denied";
    } else if (s.status === "complete" || s.status === "generating") {
      type = "finalized";
    }
    return {
      id: s.id,
      type,
      claimName: claimName(s),
      timestamp: s.updated_at,
      amount: s.supplement_total ?? undefined,
    };
  });

  // ── Build pipeline chart (all time) ──────────────────────────────────────

  const allPipeline = buildPipelineData(supplements);

  // ── Build recovery chart (last 6 months) ─────────────────────────────────

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const recentSupplements = supplements.filter(
    (s) => new Date(s.created_at) >= sixMonthsAgo
  );
  const allRecovery = buildRecoveryData(recentSupplements);

  // ── Compute per-period stats ──────────────────────────────────────────────

  const now = new Date();

  const periodStats: Record<Period, DashboardStatsProps> = {} as Record<
    Period,
    DashboardStatsProps
  >;

  for (const period of ["month", "quarter", "year", "all"] as Period[]) {
    const start = periodStart(period);
    const prevStart = prevPeriodStart(period);

    const current = period === "all"
      ? supplements
      : supplementsInRange(supplements, start, now);

    const previous = period === "all"
      ? []
      : supplementsInRange(supplements, prevStart, start);

    const currentDecodes =
      period === "all"
        ? decodings.length
        : decodings.filter((d) => new Date(d.created_at) >= start).length;

    const previousDecodes =
      period === "all"
        ? 0
        : decodings.filter((d) => {
            const d2 = new Date(d.created_at);
            return d2 >= prevStart && d2 < start;
          }).length;

    periodStats[period] = computeStats(
      current,
      previous,
      currentDecodes,
      previousDecodes
    );
  }

  // ── Onboarding check ─────────────────────────────────────────────────────

  const hasSupplements = supplements.length > 0;
  const hasDecodes = decodings.length > 0;
  const showChecklist = !hasCompany || !hasSupplements || !hasDecodes;

  return (
    <div className="space-y-6">
      {showChecklist && (
        <OnboardingChecklist
          hasCompany={hasCompany}
          hasSupplements={hasSupplements}
          hasDecodes={hasDecodes}
        />
      )}

      <DashboardClient
        allStats={periodStats.all}
        allPipeline={allPipeline}
        allRecovery={allRecovery}
        allActionItems={{ stuckGenerating, needsReview, pendingPayment }}
        allActivity={activity}
        periodStats={periodStats}
      />
    </div>
  );
}
