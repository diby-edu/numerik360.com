-- =====================================================
-- VARIANTES PRODUIT, CODES NUMÉRIQUES
-- À exécuter dans Supabase > SQL Editor
-- =====================================================

-- === TABLE VARIANTES ===
-- Unifiée pour service (options) ET physique (taille/couleur/...)
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  stock int NOT NULL DEFAULT 999,
  attributes jsonb NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public read product_variants" ON product_variants;
CREATE POLICY "public read product_variants" ON product_variants FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "admin manage product_variants" ON product_variants;
CREATE POLICY "admin manage product_variants" ON product_variants FOR ALL USING (auth.email() = 'konointer@gmail.com');

-- === TABLE CODES / LICENCES ===
CREATE TABLE IF NOT EXISTS product_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  code text NOT NULL,
  order_id uuid REFERENCES orders(id) ON DELETE SET NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE product_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin manage product_codes" ON product_codes;
CREATE POLICY "admin manage product_codes" ON product_codes FOR ALL USING (auth.email() = 'konointer@gmail.com');

-- === COLONNES PRODUIT ===
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_delivery_type text DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS digital_file_path text DEFAULT NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variants boolean NOT NULL DEFAULT false;

-- === SETTINGS : lecture publique ===
DROP POLICY IF EXISTS "public can read settings" ON settings;
CREATE POLICY "public can read settings" ON settings FOR SELECT USING (true);

-- === INDEX PERFORMANCE ===
CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_product_codes_product ON product_codes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_codes_unused ON product_codes(product_id) WHERE order_id IS NULL;
