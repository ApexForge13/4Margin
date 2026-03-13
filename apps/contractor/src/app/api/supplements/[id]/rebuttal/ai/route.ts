import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages/messages";
import {
  generateRebuttalLetter,
  type RebuttalLetterData,
} from "@/lib/pdf/generate-rebuttal";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const denialFile = formData.get("denialLetter") as File | null;

    if (!denialFile) {
      return NextResponse.json({ error: "No denial letter uploaded" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Fetch supplement + claim + company + items
    const { data: supplement, error } = await supabase
      .from("supplements")
      .select("*, jobs(*, carriers(*))")
      .eq("id", supplementId)
      .single();

    if (error || !supplement) {
      return NextResponse.json({ error: "Supplement not found" }, { status: 404 });
    }

    const claim = supplement.jobs as Record<string, unknown>;
    const carrier = (claim?.carriers as Record<string, unknown>) || null;

    const { data: allItems } = await admin
      .from("supplement_items")
      .select("*")
      .eq("supplement_id", supplementId)
      .in("status", ["accepted", "detected"]);

    if (!allItems || allItems.length === 0) {
      return NextResponse.json({ error: "No supplement items found" }, { status: 404 });
    }

    // Convert file to base64 for Claude Vision
    const fileBuffer = await denialFile.arrayBuffer();
    const base64 = Buffer.from(fileBuffer).toString("base64");
    const mediaType = denialFile.type === "application/pdf" ? "application/pdf" as const : "image/jpeg" as const;

    // Use Claude to extract denied items + reasons from denial letter
    const anthropic = new Anthropic();
    const itemList = allItems.map((i) => `${i.xactimate_code}: ${i.description}`).join("\n");

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `Analyze this insurance carrier denial/response letter. Extract which supplement line items were denied and the stated reason for each denial.

Here are the supplement items that were submitted:
${itemList}

Return a JSON array with objects matching this format:
[
  {
    "xactimate_code": "RFG STRP",
    "denial_reason": "the stated reason for denial from the letter"
  }
]

Only include items that were explicitly denied or disputed. If the letter denies all items, include all of them. Return ONLY the JSON array, no markdown.`,
            },
          ] as ContentBlockParam[],
        },
      ],
    });

    // Parse Claude's response
    const responseText = response.content[0].type === "text" ? response.content[0].text : "";
    let deniedCodes: Array<{ xactimate_code: string; denial_reason: string }> = [];
    try {
      deniedCodes = JSON.parse(responseText.replace(/```json?\n?/g, "").replace(/```/g, "").trim());
    } catch {
      console.error("[rebuttal/ai] Failed to parse Claude response:", responseText);
      return NextResponse.json({ error: "Could not parse denial letter" }, { status: 422 });
    }

    if (deniedCodes.length === 0) {
      return NextResponse.json({ error: "No denied items found in the letter" }, { status: 422 });
    }

    // Match denied codes to actual items
    const deniedCodeSet = new Set(deniedCodes.map((d) => d.xactimate_code));
    const denialReasons = new Map(deniedCodes.map((d) => [d.xactimate_code, d.denial_reason]));
    const matchedItems = allItems.filter((i) => deniedCodeSet.has(i.xactimate_code));

    if (matchedItems.length === 0) {
      return NextResponse.json({ error: "No denied items matched supplement items" }, { status: 422 });
    }

    // Fetch company
    const { data: company } = await admin
      .from("companies")
      .select("name, phone, address, city, state, zip, license_number")
      .eq("id", supplement.company_id)
      .single();

    const companyAddress = company
      ? [company.address, company.city, company.state, company.zip].filter(Boolean).join(", ")
      : "";

    const letterData: RebuttalLetterData = {
      companyName: company?.name || "",
      companyPhone: company?.phone || "",
      companyAddress,
      companyLicense: company?.license_number || "",
      claimNumber: (claim.claim_number as string) || "",
      policyNumber: (claim.policy_number as string) || "",
      carrierName: (carrier?.name as string) || "",
      propertyAddress: [claim.property_address, claim.property_city, claim.property_state, claim.property_zip]
        .filter(Boolean).join(", "),
      propertyState: (claim.property_state as string) || "",
      dateOfLoss: claim.date_of_loss
        ? new Date(claim.date_of_loss as string).toLocaleDateString("en-US")
        : "",
      adjusterName: (claim.adjuster_name as string) || "",
      deniedItems: matchedItems.map((item) => ({
        xactimate_code: item.xactimate_code,
        description: item.description,
        quantity: Number(item.quantity),
        unit: item.unit,
        total_price: Number(item.total_price),
        justification: item.justification || "",
        irc_reference: item.irc_reference || "",
        denial_reason: denialReasons.get(item.xactimate_code),
      })),
      generatedDate: new Date().toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }),
    };

    // Generate + upload
    const pdfBuffer = generateRebuttalLetter(letterData);
    const timestamp = Date.now();
    const pdfPath = `${supplement.company_id}/${supplementId}/rebuttal-${timestamp}.pdf`;
    const pdfBlob = new Blob([pdfBuffer], { type: "application/pdf" });

    const { error: uploadErr } = await admin.storage
      .from("supplements")
      .upload(pdfPath, pdfBlob, { contentType: "application/pdf", upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: "Failed to upload rebuttal PDF" }, { status: 500 });
    }

    await admin.from("supplements").update({ rebuttal_pdf_url: pdfPath }).eq("id", supplementId);

    const { data: signedData } = await admin.storage
      .from("supplements")
      .createSignedUrl(pdfPath, 3600);

    return NextResponse.json({
      success: true,
      pdfPath,
      downloadUrl: signedData?.signedUrl || null,
      itemCount: matchedItems.length,
      deniedItems: deniedCodes,
    });
  } catch (err) {
    console.error("[rebuttal/ai] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process denial letter" },
      { status: 500 }
    );
  }
}
