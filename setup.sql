-- ═══════════════════════════════════════════
--  WAYNE SHOP — Configuration Supabase
--  Colle ce code dans : Supabase > SQL Editor
-- ═══════════════════════════════════════════

-- 1. Créer la table des articles
CREATE TABLE IF NOT EXISTS articles (
  id          BIGSERIAL PRIMARY KEY,
  nom         TEXT NOT NULL,
  categorie   TEXT NOT NULL CHECK (categorie IN ('complets','chaussures-femme','chaussures-homme','montres')),
  prix        INTEGER NOT NULL,
  ancien_prix INTEGER DEFAULT NULL,
  badge       TEXT DEFAULT NULL CHECK (badge IN ('promo','new') OR badge IS NULL),
  image_url   TEXT NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Autoriser la lecture publique (pour le site)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique"
  ON articles FOR SELECT
  USING (true);

CREATE POLICY "Ecriture admin"
  ON articles FOR ALL
  USING (true)
  WITH CHECK (true);

-- 3. Insérer les articles de départ
INSERT INTO articles (nom, categorie, prix, ancien_prix, badge, image_url) VALUES
  ('Ensemble RHUDE Los Angeles',    'complets',          7500,  9000,  'promo', 'rhude'),
  ('Ensemble Adventure Noir/Blanc', 'complets',          6000,  NULL,  'new',   'adventure'),
  ('Ensemble BoxHead Beige Graphic','complets',          7000,  8500,  'promo', 'boxhead'),
  ('Ensemble ERFBHI Noir/Camel',    'complets',          6500,  NULL,  'new',   'erfbhi'),
  ('Ensemble B NO.069 Blanc',       'complets',          5500,  7000,  'promo', 'b069'),
  ('Ensemble AMIRI Débardeur',      'complets',          6000,  NULL,  'new',   'amiri'),
  ('Sandales Ruché Beige',          'chaussures-femme',  3500,  5000,  'promo', 'sandales_beige'),
  ('Sandales Talon Élégant Noir',   'chaussures-femme',  4000,  NULL,  'new',   'sandales_talon'),
  ('Loafers Mary Jane Noir',        'chaussures-femme',  4500,  6000,  'promo', 'loafers'),
  ('Sandales Cuir Double Bride',    'chaussures-homme',  4000,  5500,  'promo', 'birkenstock'),
  ('Slides Sport Adidas',           'chaussures-homme',  3000,  NULL,  'new',   'adidas'),
  ('Sneakers Urban Noir',           'chaussures-homme',  5000,  6500,  'promo', 'sneakers'),
  ('Montre Arabic Aura Noir',       'montres',           8000,  10000, 'promo', 'montre_noire'),
  ('Chronographe Arabic Luxe',      'montres',           10000, NULL,  'new',   'montre_chrono');
