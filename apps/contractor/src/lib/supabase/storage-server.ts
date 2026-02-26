import { createClient } from "./server";

/**
 * Generate a signed URL for a file in Supabase Storage.
 * Use this in Server Components / Server Actions to create
 * temporary download links for private bucket files.
 */
export async function getSignedUrl(
  bucket: string,
  path: string,
  expiresIn = 3600
): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);
  if (error) return null;
  return data.signedUrl;
}

/**
 * Generate signed URLs for multiple files in the same bucket.
 */
export async function getSignedUrls(
  bucket: string,
  paths: string[],
  expiresIn = 3600
): Promise<Record<string, string | null>> {
  const supabase = await createClient();
  const result: Record<string, string | null> = {};

  // Use batch API if available, otherwise one at a time
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrls(paths, expiresIn);

  if (error || !data) {
    paths.forEach((p) => (result[p] = null));
    return result;
  }

  data.forEach((item) => {
    if (item.path) {
      result[item.path] = item.signedUrl || null;
    }
  });

  return result;
}
