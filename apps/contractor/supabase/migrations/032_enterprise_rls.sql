-- Enterprise RLS Scoping
-- Adds role-based data visibility for enterprise accounts:
--   - Individual accounts / owner / admin: see all company data (unchanged)
--   - Office manager: see data from users in their office
--   - Rep (user): see only own data

-- ── Helper functions ────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_office_id()
RETURNS UUID AS $$
  SELECT office_id FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_enterprise_company()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM companies
    WHERE id = get_user_company_id()
      AND account_type = 'enterprise'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ── POLICY_DECODINGS ─────────────────────────────────────────
-- Has: company_id, created_by

DROP POLICY IF EXISTS "Users can view own company decodings" ON policy_decodings;
CREATE POLICY "scoped_select_policy_decodings" ON policy_decodings FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    NOT is_enterprise_company()
    OR get_user_role() IN ('owner', 'admin')
    OR (get_user_role() = 'office_manager' AND created_by IN (
      SELECT id FROM users
      WHERE office_id = get_user_office_id()
        AND company_id = get_user_company_id()
    ))
    OR created_by = auth.uid()
  )
);

-- INSERT / UPDATE stay at company level (unchanged)


-- ── CLAIMS ───────────────────────────────────────────────────
-- Has: company_id, created_by

DROP POLICY IF EXISTS "Users can view company claims" ON claims;
CREATE POLICY "scoped_select_claims" ON claims FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    NOT is_enterprise_company()
    OR get_user_role() IN ('owner', 'admin')
    OR (get_user_role() = 'office_manager' AND created_by IN (
      SELECT id FROM users
      WHERE office_id = get_user_office_id()
        AND company_id = get_user_company_id()
    ))
    OR created_by = auth.uid()
  )
);


-- ── SUPPLEMENTS ──────────────────────────────────────────────
-- Has: company_id, created_by

DROP POLICY IF EXISTS "Users can view company supplements" ON supplements;
CREATE POLICY "scoped_select_supplements" ON supplements FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    NOT is_enterprise_company()
    OR get_user_role() IN ('owner', 'admin')
    OR (get_user_role() = 'office_manager' AND created_by IN (
      SELECT id FROM users
      WHERE office_id = get_user_office_id()
        AND company_id = get_user_company_id()
    ))
    OR created_by = auth.uid()
  )
);


-- ── POLICY_CHECKS ────────────────────────────────────────────
-- Has: company_id, created_by

DROP POLICY IF EXISTS "Company members can view policy checks" ON policy_checks;
CREATE POLICY "scoped_select_policy_checks" ON policy_checks FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    NOT is_enterprise_company()
    OR get_user_role() IN ('owner', 'admin')
    OR (get_user_role() = 'office_manager' AND created_by IN (
      SELECT id FROM users
      WHERE office_id = get_user_office_id()
        AND company_id = get_user_company_id()
    ))
    OR created_by = auth.uid()
  )
);


-- ── PHOTOS ───────────────────────────────────────────────────
-- Has: company_id, claim_id (NO created_by — scope via claim.created_by)

DROP POLICY IF EXISTS "Users can view company photos" ON photos;
CREATE POLICY "scoped_select_photos" ON photos FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    NOT is_enterprise_company()
    OR get_user_role() IN ('owner', 'admin')
    OR (get_user_role() = 'office_manager' AND claim_id IN (
      SELECT c.id FROM claims c
      WHERE c.created_by IN (
        SELECT u.id FROM users u
        WHERE u.office_id = get_user_office_id()
          AND u.company_id = get_user_company_id()
      )
    ))
    OR claim_id IN (
      SELECT id FROM claims WHERE created_by = auth.uid()
    )
  )
);


-- ── USAGE_RECORDS ────────────────────────────────────────────
-- Update existing SELECT policy to also scope by role for enterprise

DROP POLICY IF EXISTS "Users can view company usage" ON usage_records;
CREATE POLICY "scoped_select_usage_records" ON usage_records FOR SELECT USING (
  company_id = get_user_company_id()
  AND (
    NOT is_enterprise_company()
    OR get_user_role() IN ('owner', 'admin')
    OR (get_user_role() = 'office_manager' AND user_id IN (
      SELECT id FROM users
      WHERE office_id = get_user_office_id()
        AND company_id = get_user_company_id()
    ))
    OR user_id = auth.uid()
  )
);
