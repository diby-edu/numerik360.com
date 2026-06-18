-- =============================================
-- ENRICHISSEMENT FRONTEND
-- À exécuter dans Supabase SQL Editor
-- =============================================

-- Prix promotionnel sur les produits
alter table products add column if not exists promo_price numeric(10,2);

-- Nouveaux paramètres boutique
insert into settings (key, value) values
  ('announcement_enabled', 'false'),
  ('announcement_text',    'Livraison gratuite dès 50 000 FCFA ✦ Paiement sécurisé'),
  ('announcement_bg',      '#2563EB'),
  ('whatsapp_number',      ''),
  ('social_facebook',      ''),
  ('social_instagram',     ''),
  ('social_twitter',       ''),
  ('contact_email',        ''),
  ('contact_phone',        ''),
  ('contact_address',      '')
on conflict (key) do nothing;
