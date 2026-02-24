-- ============================================================
-- 012 — Roles refinement
-- Rename 'member' → 'user' in user_role enum
-- Admin = platform-only (hidden); Owner/User = company roles
-- ============================================================

-- Rename the enum value (PostgreSQL 10+)
ALTER TYPE user_role RENAME VALUE 'member' TO 'user';
