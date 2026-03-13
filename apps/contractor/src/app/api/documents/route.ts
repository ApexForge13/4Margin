import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const STORAGE_BUCKET = "company-documents";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

const VALID_CATEGORIES = new Set([
  "authorization",
  "contracts",
  "licenses",
  "financial",
  "lien_waivers",
  "other",
]);

// ── Helpers ───────────────────────────────────────────────────

async function getAuthCompany(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) return null;
  return { userId: user.id, companyId: profile.company_id as string };
}

// ── POST — Upload document ────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await getAuthCompany(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || null;
    const category = (formData.get("category") as string)?.trim();

    if (!file || !name) {
      return NextResponse.json(
        { error: "File and name are required." },
        { status: 400 }
      );
    }

    if (!VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: "Invalid category." },
        { status: 400 }
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed. Accepted: PDF, DOC, DOCX, JPG, PNG, XLS, XLSX." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File must be under 20 MB." },
        { status: 400 }
      );
    }

    // Generate a unique storage path
    const uuid = crypto.randomUUID();
    const storagePath = `${auth.companyId}/${uuid}-${file.name}`;

    // Read file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (storageError) {
      console.error("[documents] Storage upload error:", storageError);
      return NextResponse.json(
        { error: "Failed to upload file." },
        { status: 500 }
      );
    }

    // Insert DB record
    const { data: doc, error: dbError } = await supabase
      .from("company_documents")
      .insert({
        company_id: auth.companyId,
        name,
        description,
        category,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: auth.userId,
      })
      .select("id, storage_path")
      .single();

    if (dbError) {
      console.error("[documents] DB insert error:", dbError);
      // Attempt to clean up the uploaded file
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: "Failed to save document record." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: doc.id,
      storage_path: doc.storage_path,
    });
  } catch (err) {
    console.error("[documents] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ── GET — Download (signed URL) ───────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await getAuthCompany(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("id");

    if (!docId) {
      return NextResponse.json(
        { error: "Document id is required." },
        { status: 400 }
      );
    }

    // Fetch document, verify company_id
    const { data: doc, error: fetchError } = await supabase
      .from("company_documents")
      .select("storage_path, company_id, file_name")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    if (doc.company_id !== auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Generate signed URL (1 hour)
    const { data: signedData, error: signError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(doc.storage_path, 3600);

    if (signError || !signedData) {
      console.error("[documents] Signed URL error:", signError);
      return NextResponse.json(
        { error: "Failed to generate download link." },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: signedData.signedUrl });
  } catch (err) {
    console.error("[documents] GET error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}

// ── DELETE — Remove document ──────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const auth = await getAuthCompany(supabase);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const docId = searchParams.get("id");

    if (!docId) {
      return NextResponse.json(
        { error: "Document id is required." },
        { status: 400 }
      );
    }

    // Fetch document, verify company_id
    const { data: doc, error: fetchError } = await supabase
      .from("company_documents")
      .select("id, storage_path, company_id")
      .eq("id", docId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: "Document not found." },
        { status: 404 }
      );
    }

    if (doc.company_id !== auth.companyId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storage_path]);

    if (storageError) {
      console.error("[documents] Storage delete error:", storageError);
      // Continue to delete DB record even if storage fails
    }

    // Delete DB record
    const { error: dbError } = await supabase
      .from("company_documents")
      .delete()
      .eq("id", docId)
      .eq("company_id", auth.companyId);

    if (dbError) {
      console.error("[documents] DB delete error:", dbError);
      return NextResponse.json(
        { error: "Failed to delete document." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[documents] DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 }
    );
  }
}
