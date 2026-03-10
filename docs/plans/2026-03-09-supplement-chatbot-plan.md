# Supplement Chatbot Co-Pilot Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an AI chatbot on the supplement detail page that lets contractors edit supplements via natural language conversation with Claude tool-use.

**Architecture:** Collapsible chat panel below the line items table. POST /api/supplements/[id]/chat sends contractor message + full supplement context to Claude with 8 tool definitions. Claude calls tools to mutate DB directly. Frontend refreshes on mutations.

**Tech Stack:** Next.js 16 App Router, Claude API (tool-use), Supabase PostgreSQL, shadcn/ui, Zod validation, sonner toasts

---

### Task 1: DB Migration — supplement_messages table

**Files:**
- Create: `apps/contractor/supabase/migrations/036_supplement_messages.sql`

**Step 1: Write the migration**

```sql
-- 036: Supplement chat messages for AI co-pilot
-- Stores conversation history between contractor and the supplement engine chatbot.

CREATE TABLE IF NOT EXISTS supplement_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id UUID NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  tool_results JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_supplement_messages_supplement_id
  ON supplement_messages(supplement_id);

-- No RLS: messages are fetched server-side through the supplement's company_id auth check.
```

**Step 2: Commit**

```bash
git add apps/contractor/supabase/migrations/036_supplement_messages.sql
git commit -m "feat: add supplement_messages migration for chatbot"
```

Note: Migration will be applied to Supabase manually before testing.

---

### Task 2: Chat Tool Definitions & Executor

**Files:**
- Create: `apps/contractor/src/lib/ai/chat-tools.ts`

**Step 1: Write the tool definitions and executor functions**

This file exports:
1. `CHAT_TOOLS` — Claude tool-use definitions (JSON schema for each tool)
2. `executeTool()` — function that receives a tool call and executes the DB mutation

**Tools to implement:**

| Tool | DB Operation |
|------|-------------|
| `update_item` | `admin.from("supplement_items").update({[field]: value}).eq("id", itemId)` |
| `add_item` | `admin.from("supplement_items").insert({...})` returns new item |
| `remove_item` | `admin.from("supplement_items").update({status: "rejected"}).eq("id", itemId)` |
| `update_measurement` | `admin.from("claims").update({[field]: value}).eq("id", claimId)` |
| `rewrite_justification` | `admin.from("supplement_items").update({justification}).eq("id", itemId)` |
| `explain_confidence` | Read-only: fetch item's confidence_details and return formatted explanation |
| `lookup_xactimate` | Read-only: `admin.from("xactimate_codes").select("*").ilike("code", pattern)` |
| `update_cover_letter` | `admin.from("supplements").update({adjuster_estimate_parsed: merged}).eq("id", supplementId)` |

Each executor returns a `ToolResult` with `{success, message, mutation?}`.

**Key patterns:**
- Import `createAdminClient` from `@/lib/supabase/admin`
- Each tool function takes `(params, context: {supplementId, claimId, companyId})`
- `update_item` validates field is one of: quantity, unit_price, description, unit
- `add_item` auto-sets supplement_id, status="detected", detection_source="chat_added"
- `update_measurement` only allows known claim measurement fields
- `rewrite_justification` is a mini Claude call — uses the item's current data + jurisdiction/manufacturer context + contractor instructions to generate a new justification paragraph

**Step 2: Commit**

```bash
git add apps/contractor/src/lib/ai/chat-tools.ts
git commit -m "feat: chat tool definitions and executors for 8 tools"
```

---

### Task 3: System Prompt Builder

**Files:**
- Create: `apps/contractor/src/lib/ai/chat-prompt.ts`

**Step 1: Write the context builder**

This file exports `buildChatSystemPrompt(context)` which constructs a system prompt containing:

1. Role definition: "You are the 4Margin supplement co-pilot..."
2. All current supplement_items as a formatted table (code, description, qty, unit, price, justification summary, confidence score/tier)
3. Claim measurements summary (roof squares, waste %, pitch breakdown, valleys LF, ridges LF, eaves LF, etc.)
4. Policy analysis summary (coverage type, O&L endorsement, key provisions)
5. Claim details (carrier, adjuster, property address, date of loss)
6. County/jurisdiction info
7. Instructions on how to use tools, when to use which tool
8. Rules: always confirm what was changed, be concise, use professional roofing terminology

**Interface:**

```typescript
export interface ChatContext {
  supplementId: string;
  claimId: string;
  companyId: string;
  items: Array<{
    id: string;
    xactimate_code: string;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
    justification: string | null;
    confidence_score: number | null;
    confidence_tier: string | null;
    confidence_details: Record<string, unknown> | null;
    status: string;
  }>;
  claim: Record<string, unknown>;
  policyAnalysis: Record<string, unknown> | null;
  countyInfo: { county: string; state: string } | null;
}
```

**Step 2: Commit**

```bash
git add apps/contractor/src/lib/ai/chat-prompt.ts
git commit -m "feat: chat system prompt builder with full supplement context"
```

---

### Task 4: Chat API Route

**Files:**
- Create: `apps/contractor/src/app/api/supplements/[id]/chat/route.ts`

**Step 1: Write the API route**

POST handler flow:
1. Auth check (same pattern as finalize route)
2. Validate body with Zod: `{ message: z.string().min(1).max(2000) }`
3. Fetch supplement with claims relation
4. Fetch all supplement_items for this supplement
5. Fetch last 20 messages from supplement_messages (for conversation history)
6. Build system prompt with `buildChatSystemPrompt()`
7. Build messages array: system prompt + conversation history + new user message
8. Save user message to supplement_messages table
9. Call Claude API with tool definitions from `CHAT_TOOLS`
10. Process tool_use response blocks — for each tool call, execute via `executeTool()`
11. Collect all mutations and assistant text response
12. Save assistant message to supplement_messages (with tool_calls and tool_results JSONB)
13. Return JSON: `{ response, mutations, messageId }`

**Key details:**
- Model: `claude-sonnet-4-20250514` (same as analyze.ts)
- Max tokens: 4096 (chat responses shorter than analysis)
- Tool-use loop: Claude may call multiple tools in one response. Process all tool_use blocks, send tool_result messages back, get final text response.
- Timeout: 60s (chat should be fast)

**Step 2: Commit**

```bash
git add apps/contractor/src/app/api/supplements/[id]/chat/route.ts
git commit -m "feat: POST /api/supplements/[id]/chat route with Claude tool-use"
```

---

### Task 5: Chat UI Component

**Files:**
- Create: `apps/contractor/src/components/supplements/supplement-chat.tsx`

**Step 1: Write the client component**

`"use client"` component with props:

```typescript
interface SupplementChatProps {
  supplementId: string;
  initialMessages: Array<{
    id: string;
    role: "user" | "assistant";
    content: string;
    tool_calls?: unknown;
    tool_results?: unknown;
    created_at: string;
  }>;
}
```

**State:**
- `messages` — array of chat messages (initialized from `initialMessages`)
- `input` — current input text
- `isLoading` — whether waiting for AI response
- `isExpanded` — whether chat panel is open

**UI Structure:**
```
<Card> (collapsible)
  <CardHeader> "Chat with 4Margin" + expand/collapse button
  <CardContent> (only when expanded)
    <div className="message-list"> (max-height 400px, overflow-y scroll)
      {messages.map(msg => <ChatMessage />)}
      {isLoading && <LoadingIndicator />}
    </div>
    <form onSubmit={handleSend}>
      <Textarea /> + <Button>Send</Button>
    </form>
  </CardContent>
</Card>
```

**ChatMessage sub-component:**
- User messages: right-aligned, dark blue bg, white text
- Assistant messages: left-aligned, gray bg, dark text
- Tool execution cards: small inline badges showing what was mutated (icon + "Updated waste to 15 SQ")

**handleSend flow:**
1. Add user message to local state optimistically
2. Clear input, set isLoading
3. POST to `/api/supplements/${supplementId}/chat` with `{ message }`
4. On success: add assistant message to state, call `router.refresh()` if mutations exist
5. On error: toast.error, remove optimistic message
6. Auto-scroll to bottom after new messages

**Key interactions:**
- Enter = send, Shift+Enter = newline (via onKeyDown handler)
- Auto-scroll ref on message list div
- Disabled when isLoading

**Step 2: Commit**

```bash
git add apps/contractor/src/components/supplements/supplement-chat.tsx
git commit -m "feat: supplement chat UI component with message list and input"
```

---

### Task 6: Wire Chat Into Supplement Detail Page

**Files:**
- Modify: `apps/contractor/src/app/(dashboard)/dashboard/supplements/[id]/page.tsx`

**Step 1: Add data fetching for chat messages**

After fetching lineItems, add:
```typescript
const { data: chatMessages } = await supabase
  .from("supplement_messages")
  .select("*")
  .eq("supplement_id", id)
  .order("created_at", { ascending: true });
```

**Step 2: Render SupplementChat below LineItemsReview**

After the LineItemsReview component, add:
```typescript
{status === "complete" && !hasPdf && (
  <SupplementChat
    supplementId={id}
    initialMessages={chatMessages || []}
  />
)}
```

Import: `import { SupplementChat } from "@/components/supplements/supplement-chat";`

**Step 3: Commit**

```bash
git add apps/contractor/src/app/\(dashboard\)/dashboard/supplements/\[id\]/page.tsx
git commit -m "feat: wire supplement chat into detail page below items table"
```

---

### Task 7: Build & Verify

**Step 1: Run build**

```bash
npx turbo build --filter=@4margin/contractor
```

Expected: Compiled successfully, 0 errors.

**Step 2: Commit any fixes**

If build reveals issues, fix and commit.

**Step 3: Push to deploy**

```bash
git push
```

---

## Dependency Graph

```
Task 1 (migration) ─────────────────────────────┐
Task 2 (tool definitions) ──────┐               │
Task 3 (system prompt) ─────────┤               │
                                ├─→ Task 4 (API route) ──→ Task 6 (wire in) ──→ Task 7 (build)
Task 5 (chat UI component) ─────┘
```

Tasks 1, 2, 3, 5 are independent and can run in parallel.
Task 4 depends on 2 + 3.
Task 6 depends on 4 + 5.
Task 7 depends on 6.
