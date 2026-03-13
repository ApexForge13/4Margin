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
  const limit = 100;
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

  // ── Aggregate stats ────────────────────────────────────────
  const { data: statsRaw, error: statsError } = await admin.rpc(
    "training_photo_stats" as never
  ).then(
    // If the RPC doesn't exist, fall back to a manual query
    (res: { data: unknown; error: unknown }) => {
      if (res.error) return { data: null, error: res.error };
      return res;
    }
  );

  // Fallback: manual stats query if RPC doesn't exist
  let stats: { category: string; count: number; reviewed_count: number }[] = [];
  if (statsError || !statsRaw) {
    // Get all categories with counts
    const { data: allPhotos } = await admin
      .from("training_photos")
      .select("category, reviewed");

    if (allPhotos) {
      const grouped = new Map<
        string,
        { count: number; reviewed_count: number }
      >();
      for (const p of allPhotos) {
        const cat = p.category || "uncategorized";
        const entry = grouped.get(cat) || { count: 0, reviewed_count: 0 };
        entry.count++;
        if (p.reviewed) entry.reviewed_count++;
        grouped.set(cat, entry);
      }
      stats = Array.from(grouped.entries()).map(([category, data]) => ({
        category,
        ...data,
      }));
    }
  } else {
    stats = statsRaw as typeof stats;
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
