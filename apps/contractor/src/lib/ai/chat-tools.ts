/**
 * Chat Tool Definitions and Executor
 *
 * Defines the 8 Anthropic tool-use tools available to the supplement chatbot
 * and implements the DB mutation handlers that back each tool.
 *
 * All tools operate through the admin Supabase client (bypasses RLS) because
 * mutations are validated at the API route layer before this module is reached.
 *
 * Tool taxonomy:
 *   Mutating  — update_item, add_item, remove_item, update_measurement,
 *               rewrite_justification, update_cover_letter
 *   Read-only — explain_confidence, lookup_xactimate
 */

import { createAdminClient } from "@/lib/supabase/admin";

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Shared types                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Passed to every tool executor so handlers can scope their queries correctly. */
export interface ToolContext {
  supplementId: string;
  claimId: string;
  companyId: string;
}

/**
 * Returned by every tool executor.
 *
 * `mutation` is populated only by tools that write to the DB; read-only tools
 * (explain_confidence, lookup_xactimate) omit it entirely.
 */
export interface ToolResult {
  success: boolean;
  message: string;
  mutation?: {
    type: string;
    itemId?: string;
    field?: string;
    newValue?: unknown;
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Anthropic tool definitions (JSON Schema)                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Single Anthropic tool definition.  The `input_schema` field uses JSON Schema
 * draft-07 as required by the Anthropic messages API.
 */
export interface AnthropicTool {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<
      string,
      {
        type?: string | string[];
        description?: string;
        enum?: string[];
        items?: { type: string };
        minimum?: number;
      }
    >;
    required: string[];
  };
}

export const CHAT_TOOLS: AnthropicTool[] = [
  /* ── 1. update_item ────────────────────────────────────────────────────── */
  {
    name: "update_item",
    description:
      "Update a field on an existing supplement line item. Use for changing quantities, prices, descriptions, or units.",
    input_schema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          description: "UUID of the supplement_items row to update.",
        },
        field: {
          type: "string",
          enum: ["quantity", "unit_price", "description", "unit"],
          description: "The field to update on the supplement item.",
        },
        value: {
          type: ["string", "number"],
          description:
            "New value for the field. Must be a number for quantity and unit_price.",
        },
      },
      required: ["itemId", "field", "value"],
    },
  },

  /* ── 2. add_item ────────────────────────────────────────────────────────── */
  {
    name: "add_item",
    description: "Add a new supplement line item to the claim.",
    input_schema: {
      type: "object",
      properties: {
        xactimate_code: {
          type: "string",
          description:
            "Xactimate line item code (e.g. RFG STRSA, RFG FELT30).",
        },
        description: {
          type: "string",
          description: "Human-readable description of the line item.",
        },
        category: {
          type: "string",
          description:
            "Category for grouping (e.g. Roofing, Gutters, Flashing).",
        },
        quantity: {
          type: "number",
          description: "Quantity of the item.",
          minimum: 0,
        },
        unit: {
          type: "string",
          description: "Unit of measure (e.g. SQ, LF, EA).",
        },
        unit_price: {
          type: "number",
          description: "Price per unit in USD.",
          minimum: 0,
        },
        justification: {
          type: "string",
          description:
            "Evidence-based justification citing policy, code, and/or manufacturer requirements.",
        },
      },
      required: [
        "xactimate_code",
        "description",
        "category",
        "quantity",
        "unit",
        "unit_price",
        "justification",
      ],
    },
  },

  /* ── 3. remove_item ─────────────────────────────────────────────────────── */
  {
    name: "remove_item",
    description: "Remove a supplement line item by marking it as rejected.",
    input_schema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          description: "UUID of the supplement_items row to remove.",
        },
      },
      required: ["itemId"],
    },
  },

  /* ── 4. update_measurement ──────────────────────────────────────────────── */
  {
    name: "update_measurement",
    description:
      "Update a measurement field on the claim. This may affect calculated supplement items.",
    input_schema: {
      type: "object",
      properties: {
        field: {
          type: "string",
          enum: [
            "waste_percent",
            "roof_squares",
            "total_roof_area",
            "ft_valleys",
            "ft_ridges",
            "ft_hips",
            "ft_eaves",
            "ft_rakes",
            "ft_drip_edge",
            "ft_step_flashing",
            "roof_pitch",
          ],
          description: "The measurement field to update on the claims row.",
        },
        value: {
          type: ["number", "string"],
          description:
            "New value. Numeric for all fields except roof_pitch which accepts a string like '6/12'.",
        },
      },
      required: ["field", "value"],
    },
  },

  /* ── 5. rewrite_justification ───────────────────────────────────────────── */
  {
    name: "rewrite_justification",
    description:
      "Rewrite the justification text for a supplement item based on contractor instructions. Include relevant building codes, manufacturer requirements, and measurement data.",
    input_schema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          description: "UUID of the supplement_items row to update.",
        },
        instructions: {
          type: "string",
          description:
            "What the contractor wants to change or emphasize in the justification text.",
        },
      },
      required: ["itemId", "instructions"],
    },
  },

  /* ── 6. explain_confidence ──────────────────────────────────────────────── */
  {
    name: "explain_confidence",
    description:
      "Explain the confidence score breakdown for a supplement item, showing all 5 scoring dimensions.",
    input_schema: {
      type: "object",
      properties: {
        itemId: {
          type: "string",
          description:
            "UUID of the supplement_items row whose confidence score to explain.",
        },
      },
      required: ["itemId"],
    },
  },

  /* ── 7. lookup_xactimate ────────────────────────────────────────────────── */
  {
    name: "lookup_xactimate",
    description:
      "Look up Xactimate codes, descriptions, and pricing from the database.",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Xactimate code (e.g. RFG STRSA) or keyword (e.g. 'starter strip', 'ice barrier').",
        },
      },
      required: ["query"],
    },
  },

  /* ── 8. update_cover_letter ─────────────────────────────────────────────── */
  {
    name: "update_cover_letter",
    description:
      "Add or update custom notes that will be included in the cover letter when the supplement is finalized.",
    input_schema: {
      type: "object",
      properties: {
        section: {
          type: "string",
          enum: ["notes", "custom_paragraph"],
          description: "Which section of the cover letter to update.",
        },
        content: {
          type: "string",
          description: "Text content to write into the selected section.",
        },
      },
      required: ["section", "content"],
    },
  },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Individual tool handler implementations                                   */
/* ─────────────────────────────────────────────────────────────────────────── */

/** Narrow helper — coerce an unknown input value to the runtime type we need. */
function toUnknownRecord(
  input: Record<string, unknown>
): Record<string, unknown> {
  return input;
}

/* ── update_item ──────────────────────────────────────────────────────────── */

async function handleUpdateItem(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const admin = createAdminClient();
  const field = input.field as string;
  const allowedFields = ["quantity", "unit_price", "description", "unit"] as const;

  if (!(allowedFields as readonly string[]).includes(field)) {
    return { success: false, message: `Cannot update field: ${field}` };
  }

  let updateValue: unknown = input.value;

  if (field === "quantity" || field === "unit_price") {
    const numeric = Number(updateValue);
    if (isNaN(numeric)) {
      return { success: false, message: `Invalid number for ${field}` };
    }
    updateValue = numeric;
  }

  const updateData: Record<string, unknown> = { [field]: updateValue };

  // When quantity or unit_price changes we must keep total_price in sync.
  if (field === "quantity" || field === "unit_price") {
    const { data: current } = await admin
      .from("supplement_items")
      .select("quantity, unit_price")
      .eq("id", input.itemId)
      .single();

    if (current) {
      const qty =
        field === "quantity" ? Number(updateValue) : Number(current.quantity);
      const price =
        field === "unit_price"
          ? Number(updateValue)
          : Number(current.unit_price);
      updateData.total_price = Math.round(qty * price * 100) / 100;
    }
  }

  const { error } = await admin
    .from("supplement_items")
    .update(updateData)
    .eq("id", input.itemId);

  if (error) {
    return { success: false, message: `Failed to update item: ${error.message}` };
  }

  return {
    success: true,
    message: `Updated ${field} to ${updateValue}`,
    mutation: {
      type: "update_item",
      itemId: input.itemId as string,
      field,
      newValue: updateValue,
    },
  };
}

/* ── add_item ─────────────────────────────────────────────────────────────── */

async function handleAddItem(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const admin = createAdminClient();

  const newItem = {
    supplement_id: context.supplementId,
    xactimate_code: input.xactimate_code as string,
    description: input.description as string,
    category: input.category as string,
    quantity: Number(input.quantity),
    unit: input.unit as string,
    unit_price: Number(input.unit_price),
    total_price:
      Math.round(Number(input.quantity) * Number(input.unit_price) * 100) / 100,
    justification: (input.justification as string | undefined) ?? null,
    status: "detected",
    detection_source: "chat_added",
    confidence: 0.5,
  };

  const { data, error } = await admin
    .from("supplement_items")
    .insert(newItem)
    .select("id")
    .single();

  if (error) {
    return { success: false, message: `Failed to add item: ${error.message}` };
  }

  return {
    success: true,
    message: `Added ${input.xactimate_code}: ${input.description}`,
    mutation: {
      type: "add_item",
      itemId: (data as { id: string }).id,
    },
  };
}

/* ── remove_item ──────────────────────────────────────────────────────────── */

async function handleRemoveItem(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const admin = createAdminClient();

  // Fetch before deleting so we can include the code/description in the message.
  const { data: item } = await admin
    .from("supplement_items")
    .select("xactimate_code, description")
    .eq("id", input.itemId)
    .single();

  const { error } = await admin
    .from("supplement_items")
    .update({ status: "rejected" })
    .eq("id", input.itemId);

  if (error) {
    return { success: false, message: `Failed to remove item: ${error.message}` };
  }

  const code = (item as { xactimate_code?: string } | null)?.xactimate_code ?? "item";
  const desc = (item as { description?: string } | null)?.description ?? "";

  return {
    success: true,
    message: `Removed ${code}: ${desc}`,
    mutation: {
      type: "remove_item",
      itemId: input.itemId as string,
    },
  };
}

/* ── update_measurement ───────────────────────────────────────────────────── */

async function handleUpdateMeasurement(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const admin = createAdminClient();
  const field = input.field as string;

  const allowedFields = [
    "waste_percent",
    "roof_squares",
    "total_roof_area",
    "ft_valleys",
    "ft_ridges",
    "ft_hips",
    "ft_eaves",
    "ft_rakes",
    "ft_drip_edge",
    "ft_step_flashing",
    "roof_pitch",
  ] as const;

  if (!(allowedFields as readonly string[]).includes(field)) {
    return { success: false, message: `Cannot update measurement: ${field}` };
  }

  // roof_pitch is stored as text (e.g. "6/12"), all other fields are numeric.
  const value =
    field === "roof_pitch" ? String(input.value) : Number(input.value);

  const { error } = await admin
    .from("claims")
    .update({ [field]: value })
    .eq("id", context.claimId);

  if (error) {
    return {
      success: false,
      message: `Failed to update measurement: ${error.message}`,
    };
  }

  return {
    success: true,
    message: `Updated ${field} to ${value}`,
    mutation: {
      type: "update_measurement",
      field,
      newValue: value,
    },
  };
}

/* ── rewrite_justification ────────────────────────────────────────────────── */
/**
 * v1 implementation: stores the contractor's instructions directly as the new
 * justification. The chatbot's main response text provides a polished version
 * that the contractor can review. A future version will call Claude to generate
 * a professional justification inline before writing to the DB.
 */
async function handleRewriteJustification(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const admin = createAdminClient();

  const { data: item } = await admin
    .from("supplement_items")
    .select("*")
    .eq("id", input.itemId)
    .single();

  if (!item) {
    return { success: false, message: "Item not found" };
  }

  const typedItem = item as {
    xactimate_code?: string;
    justification?: string | null;
  };

  const existingJustification = typedItem.justification ?? "N/A";
  const newJustification = `${input.instructions as string}\n\nOriginal basis: ${existingJustification}`;

  const { error } = await admin
    .from("supplement_items")
    .update({ justification: newJustification })
    .eq("id", input.itemId);

  if (error) {
    return {
      success: false,
      message: `Failed to update justification: ${error.message}`,
    };
  }

  return {
    success: true,
    message: `Rewrote justification for ${typedItem.xactimate_code ?? "item"}`,
    mutation: {
      type: "update_item",
      itemId: input.itemId as string,
      field: "justification",
    },
  };
}

/* ── explain_confidence ───────────────────────────────────────────────────── */

async function handleExplainConfidence(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const admin = createAdminClient();

  const { data: item } = await admin
    .from("supplement_items")
    .select(
      "xactimate_code, description, confidence_score, confidence_tier, confidence_details"
    )
    .eq("id", input.itemId)
    .single();

  if (!item) {
    return { success: false, message: "Item not found" };
  }

  const typedItem = item as {
    xactimate_code?: string;
    description?: string;
    confidence_score?: number | null;
    confidence_tier?: string | null;
    confidence_details?: Record<
      string,
      { score?: number; maxScore?: number; reasoning?: string }
    > | null;
  };

  const details = typedItem.confidence_details ?? null;

  let explanation =
    `${typedItem.xactimate_code ?? "Unknown"} — ${typedItem.description ?? ""}\n` +
    `Overall: ${typedItem.confidence_score ?? "N/A"}/100 (${typedItem.confidence_tier ?? "unknown"})\n\n`;

  if (details) {
    for (const [dim, info] of Object.entries(details)) {
      if (dim === "summary") continue;
      if (info && typeof info === "object" && "score" in info) {
        explanation += `${dim}: ${info.score ?? 0}/${info.maxScore ?? 0} — ${info.reasoning ?? ""}\n`;
      }
    }
  }

  // Read-only — no mutation returned.
  return { success: true, message: explanation };
}

/* ── lookup_xactimate ─────────────────────────────────────────────────────── */

async function handleLookupXactimate(
  input: Record<string, unknown>
): Promise<ToolResult> {
  const admin = createAdminClient();
  const query = String(input.query).trim();

  const { data: codes } = await admin
    .from("xactimate_codes")
    .select("code, category, description, unit, commonly_missed")
    .or(
      `code.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`
    )
    .limit(10);

  if (!codes || codes.length === 0) {
    return {
      success: true,
      message: `No Xactimate codes found matching "${query}"`,
    };
  }

  let result = `Found ${codes.length} Xactimate code${codes.length === 1 ? "" : "s"}:\n`;

  for (const c of codes as Array<{
    code: string;
    category: string;
    description: string;
    unit: string;
    commonly_missed?: boolean | null;
  }>) {
    result +=
      `${c.code} | ${c.category} | ${c.description} | ${c.unit}` +
      `${c.commonly_missed ? " (commonly missed)" : ""}\n`;
  }

  // Read-only — no mutation returned.
  return { success: true, message: result };
}

/* ── update_cover_letter ──────────────────────────────────────────────────── */

async function handleUpdateCoverLetter(
  input: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  const admin = createAdminClient();

  const { data: supplement } = await admin
    .from("supplements")
    .select("adjuster_estimate_parsed")
    .eq("id", context.supplementId)
    .single();

  // Preserve existing parsed JSONB; default to empty object if absent.
  const parsed: Record<string, unknown> =
    (supplement?.adjuster_estimate_parsed as Record<string, unknown> | null) ??
    {};

  if (!parsed.cover_letter_notes) {
    parsed.cover_letter_notes = {};
  }

  (parsed.cover_letter_notes as Record<string, unknown>)[
    input.section as string
  ] = input.content;

  const { error } = await admin
    .from("supplements")
    .update({ adjuster_estimate_parsed: parsed })
    .eq("id", context.supplementId);

  if (error) {
    return {
      success: false,
      message: `Failed to update cover letter: ${error.message}`,
    };
  }

  return {
    success: true,
    message: `Updated cover letter ${input.section as string}`,
    mutation: {
      type: "update_cover_letter",
      field: input.section as string,
    },
  };
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Central dispatcher                                                         */
/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * Execute a tool returned by Claude's tool-use response.
 *
 * @param toolName  - Matches one of the `name` fields in CHAT_TOOLS.
 * @param toolInput - The parsed `input` object from the Claude tool_use block.
 * @param context   - Supplement/claim/company IDs for scoping DB queries.
 * @returns         - ToolResult indicating success/failure and any DB mutation.
 */
export async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  context: ToolContext
): Promise<ToolResult> {
  // Ensure the input reference is typed correctly for all downstream handlers.
  const input = toUnknownRecord(toolInput);

  switch (toolName) {
    case "update_item":
      return handleUpdateItem(input);

    case "add_item":
      return handleAddItem(input, context);

    case "remove_item":
      return handleRemoveItem(input);

    case "update_measurement":
      return handleUpdateMeasurement(input, context);

    case "rewrite_justification":
      return handleRewriteJustification(input);

    case "explain_confidence":
      return handleExplainConfidence(input);

    case "lookup_xactimate":
      return handleLookupXactimate(input);

    case "update_cover_letter":
      return handleUpdateCoverLetter(input, context);

    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
      };
  }
}
