import { NextRequest, NextResponse } from "next/server";
import { getResendClient, FROM_EMAIL } from "@/lib/email/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, state, county } = body;

    if (!name || !email || !state) {
      return NextResponse.json(
        { error: "Name, email, and state are required." },
        { status: 400 }
      );
    }

    // Simple email validation
    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 }
      );
    }

    // Send notification email to team
    const resend = getResendClient();
    await resend.emails.send({
      from: FROM_EMAIL,
      to: ["team@4margin.com"],
      subject: `Coverage Request: ${state}${county ? ` — ${county}` : ""}`,
      html: `
        <h2>New Coverage Area Request</h2>
        <table style="border-collapse:collapse; font-family:sans-serif;">
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Name:</td><td>${escapeHtml(name)}</td></tr>
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Email:</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
          ${company ? `<tr><td style="padding:4px 12px 4px 0; font-weight:bold;">Company:</td><td>${escapeHtml(company)}</td></tr>` : ""}
          <tr><td style="padding:4px 12px 4px 0; font-weight:bold;">State:</td><td>${escapeHtml(state)}</td></tr>
          ${county ? `<tr><td style="padding:4px 12px 4px 0; font-weight:bold;">County:</td><td>${escapeHtml(county)}</td></tr>` : ""}
        </table>
        <p style="margin-top:16px; color:#666; font-size:13px;">
          Submitted from the 4Margin landing page coverage map.
        </p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[coverage-request] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit request. Please try again." },
      { status: 500 }
    );
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
