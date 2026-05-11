-- ═══════════════════════════════════════════════
--  WAYNE SHOP — Mise à jour Supabase
--  Colle ce code dans : Supabase > SQL Editor
--  et clique RUN ▶️
-- ═══════════════════════════════════════════════

-- 1. Créer la table des catégories
CREATE TABLE IF NOT EXISTS categories (
  id         BIGSERIAL PRIMARY KEY,
  nom        TEXT NOT NULL UNIQUE,
  icone      TEXT DEFAULT '🏷️',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Sécurité : lecture publique + écriture libre
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lecture publique categories"
  ON categories FOR SELECT USING (true);

CREATE POLICY "Ecriture admin categories"
  ON categories FOR ALL USING (true) WITH CHECK (true);

-- 3. Modifier la table articles :
--    remplacer la contrainte fixe par du texte libre
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_categorie_check;

-- 4. Insérer les catégories de base
INSERT INTO categories (nom, icone) VALUES
  ('Complets',          '👕'),
  ('Chaussures Femme',  '👠'),
  ('Chaussures Homme',  '👟'),
  ('Montres',           '⌚')
ON CONFLICT (nom) DO NOTHING;
