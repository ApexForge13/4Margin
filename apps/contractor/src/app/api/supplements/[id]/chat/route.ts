/**
 * POST /api/supplements/[id]/chat
 *
 * Supplement chatbot API — accepts a contractor message, builds a system prompt
 * with full supplement context, calls Claude with tool-use, executes any tool
 * calls against the DB, and returns the assistant response + mutation list.
 *
 * Auth: Uses the supabase server client (RLS) to verify the user owns the
 * supplement via company_id. All mutations run through the admin client.
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CHAT_TOOLS, executeTool, type ToolResult } from "@/lib/ai/chat-tools";
import { buildChatSystemPrompt, type ChatContext } from "@/lib/ai/chat-prompt";

/* ─── Anthropic client ─── */

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");
  return new Anthropic({ apiKey, timeout: 60_000 });
};

/* ─── Types ─── */

interface SupplementMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool_calls?: unknown;
  tool_results?: unknown;
  created_at: string;
}

/* ─── Route handler ─── */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: supplementId } = await params;

    /* ── 1. Auth ── */
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /* ── 2. Validate body ── */
    let body: { message?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const message = (body.message ?? "").trim();
    if (!message || message.length > 2000) {
      return NextResponse.json(
        { error: "Message is required and must be under 2000 characters" },
        { status: 400 }
      );
    }

    /* ── 3. Fetch supplement (RLS enforces company_id) ── */
    const { data: supplement, error: supError } = await supabase
      .from("supplements")
      .select("*, jobs(*)")
      .eq("id", supplementId)
      .single();

    if (supError || !supplement) {
      return NextResponse.json(
        { error: "Supplement not found" },
        { status: 404 }
      );
    }

    const claim = supplement.jobs as Record<string, unknown>;
    const claimId = claim.id as string;
    const companyId = supplement.company_id as string;

    /* ── 4. Fetch supplement items ── */
    const admin = createAdminClient();
    const { data: items } = await admin
      .from("supplement_items")
      .select("*")
      .eq("supplement_id", supplementId)
      .neq("status", "rejected")
      .order("category", { ascending: true })
      .order("xactimate_code", { ascending: true });

    /* ── 5. Fetch conversation history (last 20) ── */
    const { data: history } = await admin
      .from("supplement_messages")
      .select("*")
      .eq("supplement_id", supplementId)
      .order("created_at", { ascending: true })
      .limit(20);

    /* ── 6. Build system prompt ── */
    const parsedData = supplement.adjuster_estimate_parsed as Record<
      string,
      unknown
    > | null;
    const policyAnalysis = supplement.policy_analysis as Record<
      string,
      unknown
    > | null;

    // Extract county info from parsed data
    const countyInfo = parsedData?.county
      ? {
          county: parsedData.county as string,
          state: (parsedData.state as string) || "MD",
        }
      : null;

    // Calculate totals
    const supplementTotal =
      (items ?? []).reduce(
        (sum: number, item: Record<string, unknown>) =>
          sum + (Number(item.total_price) || 0),
        0
      ) || null;

    const context: ChatContext = {
      supplementId,
      claimId,
      companyId,
      items: (items ?? []).map((item: Record<string, unknown>) => ({
        id: item.id as string,
        xactimate_code: (item.xactimate_code as string) || "",
        description: (item.description as string) || "",
        quantity: Number(item.quantity) || 0,
        unit: (item.unit as string) || "",
        unit_price: Number(item.unit_price) || 0,
        total_price: Number(item.total_price) || 0,
        justification: (item.justification as string) || null,
        confidence_score: item.confidence_score != null ? Number(item.confidence_score) : null,
        confidence_tier: (item.confidence_tier as string) || null,
        confidence_details: (item.confidence_details as Record<string, unknown>) || null,
        status: (item.status as string) || "detected",
        category: (item.category as string) || null,
        irc_reference: (item.irc_reference as string) || null,
      })),
      claim: claim as ChatContext["claim"],
      policyAnalysis,
      countyInfo,
      supplementTotal,
      adjusterTotal: supplement.supplement_total != null
        ? Number(supplement.supplement_total)
        : null,
    };

    const systemPrompt = buildChatSystemPrompt(context);

    /* ── 7. Build messages array ── */
    const conversationMessages: Anthropic.MessageParam[] = [];

    // Add conversation history
    if (history && history.length > 0) {
      for (const msg of history as SupplementMessage[]) {
        conversationMessages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add new user message
    conversationMessages.push({
      role: "user",
      content: message,
    });

    /* ── 8. Save user message to DB ── */
    const { data: savedUserMsg } = await admin
      .from("supplement_messages")
      .insert({
        supplement_id: supplementId,
        role: "user",
        content: message,
      })
      .select("id")
      .single();

    /* ── 9. Call Claude with tool definitions ── */
    const anthropic = getClient();

    // Tool-use loop: Claude may call tools, we execute them, send results
    // back, and let Claude produce a final text response.
    let currentMessages = [...conversationMessages];
    const allToolCalls: Array<{
      name: string;
      input: Record<string, unknown>;
    }> = [];
    const allToolResults: ToolResult[] = [];
    const allMutations: Array<{
      type: string;
      itemId?: string;
      field?: string;
      newValue?: unknown;
    }> = [];

    let assistantText = "";
    let loopCount = 0;
    const MAX_LOOPS = 5; // Safety limit on tool-use rounds

    while (loopCount < MAX_LOOPS) {
      loopCount++;

      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: CHAT_TOOLS as Anthropic.Tool[],
        messages: currentMessages,
      });

      // Check for tool use in the response
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );
      const textBlocks = response.content.filter(
        (block): block is Anthropic.TextBlock => block.type === "text"
      );

      // Collect text from this round
      if (textBlocks.length > 0) {
        assistantText += textBlocks.map((b) => b.text).join("\n");
      }

      // If no tool calls, we're done
      if (toolUseBlocks.length === 0) {
        break;
      }

      // Execute each tool call
      const toolResultMessages: Anthropic.ToolResultBlockParam[] = [];

      for (const toolBlock of toolUseBlocks) {
        const toolInput = toolBlock.input as Record<string, unknown>;
        allToolCalls.push({ name: toolBlock.name, input: toolInput });

        let result: ToolResult;
        try {
          result = await executeTool(toolBlock.name, toolInput, {
            supplementId,
            claimId,
            companyId,
          });
        } catch (err) {
          result = {
            success: false,
            message: `Tool execution error: ${err instanceof Error ? err.message : "Unknown error"}`,
          };
        }

        allToolResults.push(result);
        if (result.mutation) {
          allMutations.push(result.mutation);
        }

        toolResultMessages.push({
          type: "tool_result",
          tool_use_id: toolBlock.id,
          content: JSON.stringify(result),
        });
      }

      // Add assistant message + tool results to conversation for next round
      currentMessages = [
        ...currentMessages,
        { role: "assistant" as const, content: response.content },
        { role: "user" as const, content: toolResultMessages },
      ];

      // If Claude indicated it's done (stop_reason !== "tool_use"), break
      if (response.stop_reason !== "tool_use") {
        break;
      }
    }

    /* ── 10. Save assistant message to DB ── */
    const { data: savedAssistantMsg } = await admin
      .from("supplement_messages")
      .insert({
        supplement_id: supplementId,
        role: "assistant",
        content: assistantText,
        tool_calls:
          allToolCalls.length > 0 ? JSON.stringify(allToolCalls) : null,
        tool_results:
          allToolResults.length > 0 ? JSON.stringify(allToolResults) : null,
      })
      .select("id")
      .single();

    /* ── 11. Return response ── */
    return NextResponse.json({
      response: assistantText,
      mutations: allMutations,
      messageId: (savedAssistantMsg as { id: string } | null)?.id ?? null,
    });
  } catch (err) {
    console.error("[chat] Error:", err);

    // Handle Anthropic-specific errors
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `AI service error: ${err.message}` },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "An unexpected error occurred",
      },
      { status: 500 }
    );
  }
}
