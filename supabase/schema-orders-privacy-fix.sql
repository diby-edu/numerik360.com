-- =====================================================================
-- FUITE PII COMMANDES — 2026-08-19
-- Problème : la policy "Anon can count paid orders" (SELECT anon using
--   payment_status='paid') exposait les LIGNES entières des commandes
--   payées (nom, email, téléphone, adresse) à n'importe quel visiteur.
-- Correctif : une fonction qui ne renvoie QUE le nombre de ventes, et
--   suppression de l'accès anonyme aux lignes de orders.
-- =====================================================================

begin;

-- Compte des ventes pour la statistique de l'accueil (aucune PII exposée)
create or replace function public.paid_orders_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::int from orders where payment_status = 'paid';
$$;

grant execute on function public.paid_orders_count() to anon, authenticated;

-- Retire l'accès anonyme aux lignes des commandes
drop policy if exists "Anon can count paid orders" on public.orders;

commit;
