-- =====================================================================
-- REFONTE ADMIN (ARC-09) — 2026-08-19
--
-- Remplace l'email admin codé en dur dans 20 policies par une fonction
-- centralisée public.is_admin(), qui ne s'appuie QUE sur le drapeau
-- profiles.is_admin (protégé par le trigger anti-escalade SEC-05).
-- Aucune donnée personnelle (email) codée en dur.
--
-- Pour nommer/retirer un admin : passer profiles.is_admin à true/false
-- dans Supabase (SQL Editor). Aucune modification de code nécessaire.
-- =====================================================================

begin;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- Admin = drapeau profiles.is_admin (protégé par le trigger anti-escalade
  -- SEC-05). Aucune donnée personnelle en dur. Nommer un admin = passer ce
  -- drapeau à true dans Supabase.
  select coalesce((select p.is_admin from public.profiles p where p.id = auth.uid()), false);
$$;

-- ── attributes ──
drop policy if exists "attr_write_admin" on public.attributes;
create policy "attr_write_admin" on public.attributes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── categories ──
drop policy if exists "categories_ecriture_admin" on public.categories;
create policy "categories_ecriture_admin" on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── contact_messages ──
drop policy if exists "cm_select_admin" on public.contact_messages;
create policy "cm_select_admin" on public.contact_messages
  for select to authenticated using (public.is_admin());
drop policy if exists "cm_delete_admin" on public.contact_messages;
create policy "cm_delete_admin" on public.contact_messages
  for delete to authenticated using (public.is_admin());

-- ── newsletter_subscribers ──
drop policy if exists "newsletter_select_admin" on public.newsletter_subscribers;
create policy "newsletter_select_admin" on public.newsletter_subscribers
  for select to public using (public.is_admin());
drop policy if exists "newsletter_delete_admin" on public.newsletter_subscribers;
create policy "newsletter_delete_admin" on public.newsletter_subscribers
  for delete to public using (public.is_admin());

-- ── orders ──
drop policy if exists "orders_lecture_admin" on public.orders;
create policy "orders_lecture_admin" on public.orders
  for select to authenticated using (public.is_admin());
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update to authenticated using (public.is_admin());
drop policy if exists "orders_delete_admin" on public.orders;
create policy "orders_delete_admin" on public.orders
  for delete to authenticated using (public.is_admin());

-- ── product_codes ──
drop policy if exists "admin manage product_codes" on public.product_codes;
create policy "admin manage product_codes" on public.product_codes
  for all to public using (public.is_admin());

-- ── product_variants ──
drop policy if exists "admin manage product_variants" on public.product_variants;
create policy "admin manage product_variants" on public.product_variants
  for all to public using (public.is_admin());

-- ── products ──
drop policy if exists "products_lecture_admin" on public.products;
create policy "products_lecture_admin" on public.products
  for select to authenticated using (public.is_admin());
drop policy if exists "products_ecriture_admin" on public.products;
create policy "products_ecriture_admin" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── service_requests ──
drop policy if exists "sr_select_admin" on public.service_requests;
create policy "sr_select_admin" on public.service_requests
  for select to authenticated using (public.is_admin());
drop policy if exists "sr_update_admin" on public.service_requests;
create policy "sr_update_admin" on public.service_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "sr_delete_admin" on public.service_requests;
create policy "sr_delete_admin" on public.service_requests
  for delete to authenticated using (public.is_admin());

-- ── settings ──
drop policy if exists "settings_ecriture_admin" on public.settings;
create policy "settings_ecriture_admin" on public.settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── testimonials ──
drop policy if exists "testimonials_insert_admin" on public.testimonials;
create policy "testimonials_insert_admin" on public.testimonials
  for insert to public with check (public.is_admin());
drop policy if exists "testimonials_update_admin" on public.testimonials;
create policy "testimonials_update_admin" on public.testimonials
  for update to public using (public.is_admin());
drop policy if exists "testimonials_delete_admin" on public.testimonials;
create policy "testimonials_delete_admin" on public.testimonials
  for delete to public using (public.is_admin());

commit;
