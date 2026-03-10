# Supplement Chatbot Co-Pilot Design

**Date:** 2026-03-09
**Status:** Approved
**Scope:** AI chatbot on supplement detail page for contractors to edit supplements via conversation

---

## Overview

Collapsible chat panel below the line items table on `/dashboard/supplements/[id]`. Contractors type natural language instructions, Claude executes mutations via tool-use, and the items table updates in real-time.

## Architecture

Tool-use Claude API. Contractor sends message -> POST /api/supplements/[id]/chat -> build system prompt with full supplement context -> Claude API call with 8 tools -> Claude responds with tool calls + natural language -> backend executes each tool call (DB mutations) -> stream response + mutation results back -> frontend refreshes item table.

### System Prompt Context (injected every call)

- All supplement_items (code, description, qty, unit, price, justification, confidence, status)
- Claim measurements (roof squares, waste %, pitch, valleys, ridges, eaves, etc.)
- Policy analysis summary (coverage type, O&L endorsement, landmines)
- Confidence scoring breakdown per item (5 dimensions)
- Claim details (carrier, adjuster, property address, date of loss)
- County jurisdiction info (codes, AHJ)
- Conversation history (last 20 messages for context window)

### Tools

| Tool | Params | Effect |
|------|--------|--------|
| `update_item` | itemId, field, value | Edit qty, unit_price, or description on existing item |
| `add_item` | xactimate_code, description, category, qty, unit, unit_price, justification | Insert new supplement_items row |
| `remove_item` | itemId | Set status = "rejected" |
| `update_measurement` | field, value | Update claims table measurement fields, trigger recalc of affected items |
| `rewrite_justification` | itemId, instructions | Regenerate justification using jurisdiction codes, manufacturer data, contractor instructions |
| `explain_confidence` | itemId | Return 5-dimension confidence breakdown with per-dimension reasoning |
| `lookup_xactimate` | code_or_keyword | Query xactimate_codes table for pricing, descriptions, units |
| `update_cover_letter` | section, content | Store cover letter customization notes in adjuster_estimate_parsed JSONB |

### Edit Model

Direct mutation. AI edits items immediately when contractor asks. No confirm/preview step. Undo via chat ("revert that" or "undo last change").

## Data Model

### New table: supplement_messages

```sql
CREATE TABLE supplement_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplement_id uuid NOT NULL REFERENCES supplements(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  tool_calls jsonb,
  tool_results jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_supplement_messages_supplement_id ON supplement_messages(supplement_id);
```

No RLS needed -- messages fetched server-side through supplement's company_id auth check.

### Chat history persistence

Messages stored in DB. Contractor can leave and return to see full conversation. Last 20 messages loaded as conversation context for Claude.

## UI Design

### Placement

Below the LineItemsReview component on the supplement detail page. Only visible when status = "complete" and no PDF generated yet (same edit mode as item selection).

### Layout

- Collapsible panel, starts collapsed with "Chat with 4Margin" button
- When expanded:
  - Message history area (scrollable, auto-scroll to bottom)
  - User messages right-aligned (blue), assistant messages left-aligned (gray)
  - Tool execution shown as inline action cards: "Updated waste quantity to 15 SQ"
  - Text input bar at bottom with send button (Enter to send, Shift+Enter for newline)
  - Loading indicator while Claude is responding

### Table Refresh

When a tool mutates supplement_items or claims data:
1. Tool executes DB mutation
2. Response includes `mutations: [{type, itemId, field, newValue}]`
3. Frontend calls `router.refresh()` to revalidate server component data
4. Items table re-renders with updated data

## API Route

### POST /api/supplements/[id]/chat

**Request:**
```json
{
  "message": "increase waste to 15%"
}
```

**Response (streamed or JSON):**
```json
{
  "response": "Done! I've updated the waste percentage to 15% and recalculated the shingle shortage. The new waste quantity is 4.35 SQ, bringing the supplement total to $12,850.22.",
  "mutations": [
    { "type": "update_measurement", "field": "waste_percent", "value": 15 },
    { "type": "update_item", "itemId": "abc-123", "field": "quantity", "value": 4.35 }
  ],
  "messageId": "msg-uuid"
}
```

**Auth:** Same company_id check as supplement detail page.

## Implementation Order

1. DB migration: supplement_messages table
2. API route: /api/supplements/[id]/chat with tool definitions
3. Tool executor functions (update_item, add_item, remove_item, etc.)
4. Chat UI component (message list + input bar)
5. Wire into supplement detail page (collapsible panel below items)
6. Table refresh mechanism on mutations
7. Streaming support (optional v2 -- start with JSON response)

## Out of Scope (v1)

- Real-time streaming (v1 uses simple request/response, v2 adds SSE streaming)
- Multi-user collaboration (only one user chats at a time)
- Undo/redo stack (contractor says "undo" in chat, Claude reverses last tool call)
- File attachments in chat
- Voice input
