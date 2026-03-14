-- Manufacturer product lines reference table (platform-wide, no RLS)
CREATE TABLE manufacturer_product_lines (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  manufacturer    TEXT        NOT NULL,
  product_line    TEXT        NOT NULL,
  tier_level      TEXT,
  warranty_years  INTEGER,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(manufacturer, product_line)
);

-- Seed with known product lines from KB
INSERT INTO manufacturer_product_lines (manufacturer, product_line, tier_level, warranty_years) VALUES
  -- GAF
  ('GAF', 'Royal Sovereign', 'good', 25),
  ('GAF', 'Timberline HDZ', 'better', 50),
  ('GAF', 'Timberline AS II', 'best', 50),
  ('GAF', 'Timberline Ultra HDZ', 'premium', 50),
  ('GAF', 'Grand Sequoia', 'premium', 50),
  ('GAF', 'Camelot II', 'premium', 50),
  -- CertainTeed
  ('CertainTeed', 'XT 25', 'good', 25),
  ('CertainTeed', 'XT 30', 'good', 30),
  ('CertainTeed', 'Landmark', 'better', 50),
  ('CertainTeed', 'Landmark Pro', 'better', 50),
  ('CertainTeed', 'Landmark Premium', 'best', 50),
  ('CertainTeed', 'NorthGate', 'best', 50),
  ('CertainTeed', 'Grand Manor', 'premium', 50),
  ('CertainTeed', 'Presidential Shake', 'premium', 50),
  -- Owens Corning
  ('Owens Corning', 'Supreme', 'good', 25),
  ('Owens Corning', 'Oakridge', 'good', 50),
  ('Owens Corning', 'Duration', 'better', 50),
  ('Owens Corning', 'Duration FLEX', 'better', 50),
  ('Owens Corning', 'Duration STORM', 'best', 50),
  ('Owens Corning', 'Berkshire', 'premium', 50),
  ('Owens Corning', 'Woodcrest', 'premium', 50),
  ('Owens Corning', 'Woodmoor', 'premium', 50),
  -- IKO
  ('IKO', 'Marathon', 'good', 25),
  ('IKO', 'Cambridge', 'better', 50),
  ('IKO', 'Dynasty', 'best', 50),
  ('IKO', 'Nordic', 'best', 50),
  ('IKO', 'Crowne Slate', 'premium', 50),
  -- Atlas
  ('Atlas', 'GlassMaster', 'good', 30),
  ('Atlas', 'StormMaster Shake', 'better', 50),
  ('Atlas', 'StormMaster Slate', 'best', 50),
  ('Atlas', 'Pinnacle Pristine', 'better', 50),
  -- Tamko
  ('Tamko', 'Elite Glass-Seal', 'good', 25),
  ('Tamko', 'Heritage', 'better', 30),
  ('Tamko', 'Heritage Vintage', 'better', 30),
  ('Tamko', 'Titan XT', 'best', 50),
  ('Tamko', 'Lamarite', 'premium', 50)
ON CONFLICT (manufacturer, product_line) DO NOTHING;
