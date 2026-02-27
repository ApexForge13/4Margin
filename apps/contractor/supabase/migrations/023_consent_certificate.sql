-- Add consent_certificate JSONB column for aggregator-auditable proof of consent.
-- Stores: exact checkbox text, timestamp, IP address, user agent, page URL.
ALTER TABLE consumer_leads
  ADD COLUMN IF NOT EXISTS consent_certificate JSONB DEFAULT NULL;

COMMENT ON COLUMN consumer_leads.consent_certificate IS
  'Full consent certificate for lead selling compliance. Contains: terms.granted, terms.text, terms.timestamp, contact.granted, contact.text, contact.timestamp, ip_address, user_agent, page_url, collected_at';
