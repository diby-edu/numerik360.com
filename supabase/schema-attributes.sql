-- Table des attributs produit (bibliothèque réutilisable)
CREATE TABLE IF NOT EXISTS attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  values text[] NOT NULL DEFAULT '{}',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can manage attributes" ON attributes
  USING (auth.role() = 'authenticated');

CREATE POLICY "public can read attributes" ON attributes
  FOR SELECT USING (true);
