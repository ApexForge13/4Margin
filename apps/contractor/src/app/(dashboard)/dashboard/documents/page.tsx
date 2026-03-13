import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DocumentLibrary } from "./document-library";

export default async function DocumentsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) redirect("/login");

  const { data: documents } = await supabase
    .from("company_documents")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("category")
    .order("created_at", { ascending: false });

  return (
    <DocumentLibrary
      documents={documents ?? []}
      companyId={profile.company_id}
    />
  );
}
