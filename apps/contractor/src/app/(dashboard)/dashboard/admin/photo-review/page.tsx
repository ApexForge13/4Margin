import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { PhotoReviewClient } from "@/components/admin/photo-review-client";

interface SearchParams {
  category?: string;
  minConfidence?: string;
  maxConfidence?: string;
  reviewed?: string;
  showNonRoofing?: string;
  page?: string;
}

export default async function PhotoReviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Auth — get current user (admin layout already blocks non-admins)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();

  // ── Parse filters ──────────────────────────────────────────
  const category = params.category || null;
  const minConfidence = params.minConfidence
    ? Number(params.minConfidence)
    : null;
  const maxConfidence = params.maxConfidence
    ? Number(params.maxConfidence)
    : null;
  const reviewed = params.reviewed ?? null; // "true" | "false" | null (all)
  const showNonRoofing = params.showNonRoofing === "true";
  const page = Math.max(1, Number(params.page) || 1);
  const limit = 24;
  const offset = (page - 1) * limit;

  // ── Build query ────────────────────────────────────────────
  let query = admin
    .from("training_photos")
    .select("*")
    .order("confidence", { ascending: true })
    .range(offset, offset + limit - 1);

  // Default: hide non_roofing unless toggled
  if (!showNonRoofing) {
    query = query.neq("category", "non_roofing");
  }

  // Default: show unreviewed unless explicitly set
  if (reviewed === "true") {
    query = query.eq("reviewed", true);
  } else if (reviewed === "false" || reviewed === null) {
    query = query.eq("reviewed", false);
  }

  if (category) {
    query = query.eq("category", category);
  }
  if (minConfidence !== null) {
    query = query.gte("confidence", minConfidence);
  }
  if (maxConfidence !== null) {
    query = query.lte("confidence", maxConfidence);
  }

  const { data: photos, error: photosError } = await query;

  if (photosError) {
    console.error("[photo-review] Query error:", photosError);
  }

  // ── Aggregate stats (parallel count queries per category) ──
  const categories = [
    "elevation", "roof_overview", "damage", "component",
    "repair_install", "interior_damage", "estimate_photo", "other",
  ];

  const stats: { category: string; count: number; reviewed_count: number }[] = [];
  const statPromises = categories.map(async (cat) => {
    const [totalRes, reviewedRes] = await Promise.all([
      admin
        .from("training_photos")
        .select("*", { count: "exact", head: true })
        .eq("category", cat),
      admin
        .from("training_photos")
        .select("*", { count: "exact", head: true })
        .eq("category", cat)
        .eq("reviewed", true),
    ]);
    return {
      category: cat,
      count: totalRes.count || 0,
      reviewed_count: reviewedRes.count || 0,
    };
  });

  const statResults = await Promise.all(statPromises);
  for (const s of statResults) {
    if (s.count > 0) stats.push(s);
  }

  // ── Generate signed URLs ───────────────────────────────────
  const photoList = photos ?? [];
  const storagePaths = photoList
    .map((p) => p.storage_path)
    .filter(Boolean) as string[];

  let signedUrlMap: Record<string, string> = {};
  if (storagePaths.length > 0) {
    const { data: signedUrls } = await admin.storage
      .from("training-photos")
      .createSignedUrls(storagePaths, 3600);

    if (signedUrls) {
      for (const item of signedUrls) {
        if (item.signedUrl && item.path) {
          signedUrlMap[item.path] = item.signedUrl;
        }
      }
    }
  }

  // Attach signed URLs to photo objects
  const photosWithUrls = photoList.map((p) => ({
    ...p,
    signedUrl: signedUrlMap[p.storage_path] || null,
  }));

  return (
    <PhotoReviewClient
      photos={photosWithUrls}
      stats={stats}
      userId={user.id}
      filters={{
        category: category,
        minConfidence: minConfidence,
        maxConfidence: maxConfidence,
        reviewed: reviewed,
        showNonRoofing: showNonRoofing,
        page: page,
      }}
      hasMore={photoList.length === limit}
    />
  );
}
