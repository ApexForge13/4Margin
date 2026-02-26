-- Migration 010: Add claim overview columns for capturing full claim narrative
ALTER TABLE claims ADD COLUMN IF NOT EXISTS adjuster_scope_notes text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS items_believed_missing text;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS prior_supplement_history text;
