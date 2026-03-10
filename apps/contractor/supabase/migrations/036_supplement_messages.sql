-- 036: Supplement chat messages for AI co-pilot
-- Stores conversation history between contractor and the supplement engine chatbot.
-- No RLS: messages are fetched server-side through the supplement's company_id auth check.

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
