-- =============================================
-- HERO & THÈMES — À exécuter dans Supabase SQL Editor
-- =============================================

-- Bucket pour les images du slider hero
insert into storage.buckets (id, name, public)
values ('hero', 'hero', true)
on conflict (id) do nothing;

-- Upload admin uniquement
create policy "hero_upload_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'hero'
    and auth.email() = 'konointer@gmail.com'
  );

-- Lecture publique
create policy "hero_lecture_publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'hero');

-- Suppression admin
create policy "hero_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'hero'
    and auth.email() = 'konointer@gmail.com'
  );

-- Valeurs par défaut pour les nouveaux paramètres
insert into settings (key, value) values
  ('active_theme',  'ocean'),
  ('hero_mode',     'default'),
  ('hero_title',    'Bienvenue sur notre boutique'),
  ('hero_subtitle', 'Découvrez notre sélection de produits de qualité, livrés directement chez vous.'),
  ('hero_video_url',''),
  ('hero_slides',   '[]')
on conflict (key) do nothing;
