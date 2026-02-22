import { createClient } from "./client";

export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ path: string; error: string | null }> {
  const supabase = createClient();

  // Simulate progress since supabase-js doesn't support upload progress natively
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  if (onProgress) {
    let progress = 0;
    progressInterval = setInterval(() => {
      progress = Math.min(progress + Math.random() * 15, 90);
      onProgress(Math.round(progress));
    }, 200);
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (progressInterval) {
    clearInterval(progressInterval);
  }

  if (error) {
    return { path: "", error: error.message };
  }

  if (onProgress) {
    onProgress(100);
  }

  return { path: data.path, error: null };
}

export function getPublicUrl(bucket: string, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}
