import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminTabs } from "./admin-tabs";
import type { PlatformStats } from "./overview-tab";
import type { AdminClaim } from "./claims-table";
import type { AdminUser } from "./users-table";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const admin = createAdminClient();

  // Fetch all data in parallel — admin client bypasses RLS for cross-company
  const [
    codesRes,
    carriersRes,
    teamRes,
    allUsersRes,
    allClaimsRes,
    allSupplementsRes,
    companiesCountRes,
    pendingInvitesRes,
  ] = await Promise.all([
    // Existing: reference data
    admin
      .from("xactimate_codes")
      .select("*")
      .order("category")
      .order("code"),
    admin.from("carriers").select("*").order("name"),
    // Existing: company team
    supabase
      .from("users")
      .select("id, full_name, email, role, created_at")
      .eq("company_id", profile.company_id)
      .order("created_at"),
    // NEW: all users with company info
    admin
      .from("users")
      .select("id, full_name, email, role, created_at, company_id, companies(name)")
      .order("created_at", { ascending: false }),
    // NEW: all claims with carrier + supplement data + user + company
    admin
      .from("claims")
      .select(
        `
        id, notes, claim_number, policy_number,
        property_address, property_city, property_state,
        date_of_loss, description, adjuster_scope_notes,
        items_believed_missing, prior_supplement_history,
        adjuster_name, adjuster_email, adjuster_phone,
        archived_at, created_at, created_by, company_id,
        carriers ( name ),
        companies ( name ),
        supplements ( id, status, supplement_total, approved_amount, created_at )
      `
      )
      .order("created_at", { ascending: false }),
    // NEW: all supplements for stats
    admin
      .from("supplements")
      .select(
        `
        id, status, supplement_total, approved_amount, created_at,
        claims ( notes, company_id, companies ( name ) ),
        users:created_by ( full_name )
      `
      )
      .order("created_at", { ascending: false }),
    // NEW: company count
    admin.from("companies").select("id", { count: "exact", head: true }),
    // Pending invites for this company
    supabase
      .from("invites")
      .select("id, email, role, expires_at, created_at")
      .eq("company_id", profile.company_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  // --- Build allUsers list with counts ---
  const usersRaw = (allUsersRes.data ?? []) as unknown as Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    created_at: string;
    company_id: string | null;
    companies: { name: string } | null;
  }>;

  // Count claims and supplements per user from claims data
  const claimsRaw = (allClaimsRes.data ?? []) as unknown as Array<{
    id: string;
    notes: string | null;
    claim_number: string | null;
    policy_number: string | null;
    property_address: string | null;
    property_city: string | null;
    property_state: string | null;
    date_of_loss: string | null;
    description: string | null;
    adjuster_scope_notes: string | null;
    items_believed_missing: string | null;
    prior_supplement_history: string | null;
    adjuster_name: string | null;
    adjuster_email: string | null;
    adjuster_phone: string | null;
    archived_at: string | null;
    created_at: string;
    created_by: string | null;
    company_id: string;
    carriers: { name: string } | null;
    companies: { name: string } | null;
    supplements: Array<{
      id: string;
      status: string;
      supplement_total: number | null;
      approved_amount: number | null;
      created_at: string;
    }>;
  }>;

  // Aggregate counts per user
  const userClaimsCount: Record<string, number> = {};
  const userSupplementsCount: Record<string, number> = {};
  for (const c of claimsRaw) {
    if (c.created_by) {
      userClaimsCount[c.created_by] = (userClaimsCount[c.created_by] || 0) + 1;
      userSupplementsCount[c.created_by] =
        (userSupplementsCount[c.created_by] || 0) +
        (c.supplements?.length || 0);
    }
  }

  const allUsers: AdminUser[] = usersRaw.map((u) => ({
    id: u.id,
    full_name: u.full_name,
    email: u.email,
    role: u.role,
    created_at: u.created_at,
    companyName: u.companies?.name ?? null,
    companyId: u.company_id,
    claimsCount: userClaimsCount[u.id] || 0,
    supplementsCount: userSupplementsCount[u.id] || 0,
  }));

  // --- Build user name lookup for claims ---
  const userNameMap: Record<string, string> = {};
  for (const u of usersRaw) {
    userNameMap[u.id] = u.full_name;
  }

  // --- Build allClaims list ---
  const allClaims: AdminClaim[] = claimsRaw.map((c) => {
    const latestSupplement = c.supplements?.[0] ?? null;
    return {
      id: c.id,
      notes: c.notes,
      claim_number: c.claim_number,
      property_address: c.property_address,
      property_city: c.property_city,
      property_state: c.property_state,
      date_of_loss: c.date_of_loss,
      description: c.description,
      adjuster_scope_notes: c.adjuster_scope_notes,
      items_believed_missing: c.items_believed_missing,
      prior_supplement_history: c.prior_supplement_history,
      adjuster_name: c.adjuster_name,
      adjuster_email: c.adjuster_email,
      adjuster_phone: c.adjuster_phone,
      policy_number: c.policy_number,
      archived_at: c.archived_at,
      created_at: c.created_at,
      companyName: c.companies?.name ?? null,
      userName: c.created_by ? userNameMap[c.created_by] ?? null : null,
      carrierName: c.carriers?.name ?? null,
      supplementStatus: latestSupplement?.status ?? null,
      supplementTotal: latestSupplement?.supplement_total ?? null,
    };
  });

  // --- Build platform stats ---
  const supplementsRaw = (allSupplementsRes.data ?? []) as unknown as Array<{
    id: string;
    status: string;
    supplement_total: number | null;
    approved_amount: number | null;
    created_at: string;
    claims: {
      notes: string | null;
      company_id: string;
      companies: { name: string } | null;
    } | null;
    users: { full_name: string } | null;
  }>;

  const statusCounts: Record<string, number> = {};
  let totalRecovery = 0;
  let totalApproved = 0;

  for (const s of supplementsRaw) {
    statusCounts[s.status] = (statusCounts[s.status] || 0) + 1;
    // Total Recovery: approved → full supplement_total, partially_approved → approved_amount
    if (s.status === "approved") {
      totalRecovery += Number(s.supplement_total) || 0;
    } else if (s.status === "partially_approved") {
      totalRecovery += Number(s.approved_amount) || 0;
    }
    totalApproved += Number(s.approved_amount) || 0;
  }

  const stats: PlatformStats = {
    totalSupplements: supplementsRaw.length,
    totalClaims: claimsRaw.length,
    totalUsers: usersRaw.length,
    totalCompanies: companiesCountRes.count ?? 0,
    totalRecovery,
    totalApproved,
    statusCounts,
    recentSupplements: supplementsRaw.slice(0, 10).map((s) => ({
      id: s.id,
      status: s.status,
      supplement_total: s.supplement_total,
      approved_amount: s.approved_amount,
      created_at: s.created_at,
      claimName: s.claims?.notes ?? null,
      companyName: s.claims?.companies?.name ?? null,
      userName: s.users?.full_name ?? null,
    })),
  };

  return (
    <div className="space-y-6">
      <AdminTabs
        codes={codesRes.data ?? []}
        carriers={carriersRes.data ?? []}
        team={teamRes.data ?? []}
        pendingInvites={pendingInvitesRes.data ?? []}
        stats={stats}
        allClaims={allClaims}
        allUsers={allUsers}
      />
    </div>
  );
}
