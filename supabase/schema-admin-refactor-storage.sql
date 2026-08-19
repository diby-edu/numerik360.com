-- =====================================================================
-- REFONTE ADMIN — 2e partie (2026-08-19)
-- Migre vers public.is_admin() : les policies de STOCKAGE (storage.objects)
-- et le trigger anti-escalade SEC-05. Après ceci, l'email admin ne subsiste
-- plus qu'à UN seul endroit : la fonction public.is_admin().
-- =====================================================================

begin;

-- ── storage.objects : bucket "digital" (fichiers numériques privés) ──
drop policy if exists "digital_admin_all" on storage.objects;
create policy "digital_admin_all" on storage.objects
  for all to authenticated
  using      (bucket_id = 'digital' and public.is_admin())
  with check (bucket_id = 'digital' and public.is_admin());

-- ── storage.objects : bucket "hero" (images du slider) ──
drop policy if exists "hero_upload_admin" on storage.objects;
create policy "hero_upload_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'hero' and public.is_admin());
drop policy if exists "hero_delete_admin" on storage.objects;
create policy "hero_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'hero' and public.is_admin());

-- ── storage.objects : bucket "products" (images produit) ──
drop policy if exists "storage_upload_admin" on storage.objects;
create policy "storage_upload_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'products' and public.is_admin());
drop policy if exists "storage_delete_admin" on storage.objects;
create policy "storage_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'products' and public.is_admin());

-- ── SEC-05 : trigger anti-escalade utilise désormais is_admin() ──
create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin and not public.is_admin() then
    new.is_admin := old.is_admin;  -- on ignore silencieusement l'escalade
  end if;
  return new;
end $$;

commit;
