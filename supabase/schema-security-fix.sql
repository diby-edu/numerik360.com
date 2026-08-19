-- =====================================================================
-- CORRECTIFS DE SÉCURITÉ — audit technique 2026-08-19
-- SEC-29, SEC-05, SEC-08, SEC-02, SEC-01
--
-- À exécuter dans Supabase > SQL Editor (une seule fois).
-- Idempotent : réexécutable sans risque.
-- Toutes les vérifications admin utilisent l'email admin déjà en place
-- dans le reste du schéma (public.is_admin()).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- SEC-29 — service_requests & contact_messages
-- Problème : tout compte connecté pouvait LIRE toute la base de prospects.
-- Correctif : lecture réservée à l'admin, insertion publique conservée
--             (les formulaires du site doivent pouvoir écrire).
-- ---------------------------------------------------------------------

-- Purge de toutes les policies existantes (noms inconnus car tables
-- créées hors dépôt) puis recréation propre.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname = 'public' and tablename = 'service_requests'
  loop execute format('drop policy if exists %I on public.service_requests', pol.policyname); end loop;

  for pol in select policyname from pg_policies
             where schemaname = 'public' and tablename = 'contact_messages'
  loop execute format('drop policy if exists %I on public.contact_messages', pol.policyname); end loop;
end $$;

alter table public.service_requests enable row level security;
alter table public.contact_messages  enable row level security;

-- service_requests
create policy "sr_insert_public" on public.service_requests
  for insert to anon, authenticated with check (true);
create policy "sr_select_admin" on public.service_requests
  for select to authenticated using (public.is_admin());
create policy "sr_update_admin" on public.service_requests
  for update to authenticated using (public.is_admin())
  with check (public.is_admin());
create policy "sr_delete_admin" on public.service_requests
  for delete to authenticated using (public.is_admin());

-- contact_messages
create policy "cm_insert_public" on public.contact_messages
  for insert to anon, authenticated with check (true);
create policy "cm_select_admin" on public.contact_messages
  for select to authenticated using (public.is_admin());
create policy "cm_delete_admin" on public.contact_messages
  for delete to authenticated using (public.is_admin());


-- ---------------------------------------------------------------------
-- SEC-08 — attributes
-- Problème : "authenticated can manage attributes" laissait TOUT compte
--            connecté écrire/supprimer les attributs.
-- Correctif : lecture publique, écriture admin uniquement.
-- ---------------------------------------------------------------------

do $$
declare pol record;
begin
  for pol in select policyname from pg_policies
             where schemaname = 'public' and tablename = 'attributes'
  loop execute format('drop policy if exists %I on public.attributes', pol.policyname); end loop;
end $$;

alter table public.attributes enable row level security;

create policy "attr_select_public" on public.attributes
  for select using (true);
create policy "attr_write_admin" on public.attributes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());


-- ---------------------------------------------------------------------
-- SEC-05 — profiles.is_admin
-- Problème : la policy "profiles_own" (FOR ALL sur sa propre ligne)
--            laissait un client passer son is_admin à true.
-- Correctif : un trigger annule toute modification de is_admin qui ne
--             vient pas de l'admin. La policy "profiles_own" reste
--             (le client garde la main sur nom/téléphone/adresse).
-- ---------------------------------------------------------------------

create or replace function public.prevent_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_admin is distinct from old.is_admin
     and not public.is_admin() then
    new.is_admin := old.is_admin;  -- on ignore silencieusement l'escalade
  end if;
  return new;
end $$;

drop trigger if exists trg_prevent_privilege_escalation on public.profiles;
create trigger trg_prevent_privilege_escalation
  before update on public.profiles
  for each row execute function public.prevent_privilege_escalation();


-- ---------------------------------------------------------------------
-- SEC-02 — prix et total d'une commande fixés par le client
-- Problème : le navigateur écrit items[].price et total ; l'API "revérifie"
--            en relisant ces mêmes valeurs -> aucun contrôle réel.
-- Correctif : un trigger BEFORE INSERT recalcule chaque prix et le total
--             depuis products / product_variants. Le client ne peut plus
--             imposer son prix, sans aucune modification du front.
-- ---------------------------------------------------------------------

create or replace function public.enforce_order_pricing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  item        jsonb;
  new_items   jsonb := '[]'::jsonb;
  total_calc  numeric := 0;
  real_price  numeric;
  qty         int;
  pid         uuid;
  vid         uuid;
begin
  if new.items is null or jsonb_typeof(new.items) <> 'array'
     or jsonb_array_length(new.items) = 0 then
    raise exception 'Commande invalide : items manquants';
  end if;

  for item in select * from jsonb_array_elements(new.items)
  loop
    pid := nullif(item->>'id', '')::uuid;
    vid := nullif(item->>'variant_id', '')::uuid;
    qty := greatest(coalesce((item->>'quantity')::int, 1), 1);

    real_price := null;

    -- Prix de la variante si fournie
    if vid is not null then
      select price into real_price
        from public.product_variants
       where id = vid and product_id = pid and is_active = true;
    end if;

    -- Sinon prix du produit (promo prioritaire)
    if real_price is null then
      select case
               when promo_price is not null and promo_price < price then promo_price
               else price
             end
        into real_price
        from public.products
       where id = pid and is_active = true;
    end if;

    if real_price is null then
      raise exception 'Produit introuvable ou inactif (%).', coalesce(pid::text, 'null');
    end if;

    total_calc := total_calc + real_price * qty;

    new_items := new_items || jsonb_build_object(
      'id',           pid,
      'variant_id',   vid,
      'name',         item->>'name',
      'variant_name', item->>'variant_name',
      'price',        real_price,
      'quantity',     qty
    );
  end loop;

  new.items := new_items;
  new.total := total_calc;
  return new;
end $$;

drop trigger if exists trg_enforce_order_pricing on public.orders;
create trigger trg_enforce_order_pricing
  before insert on public.orders
  for each row execute function public.enforce_order_pricing();


-- ---------------------------------------------------------------------
-- SEC-01 — fichiers numériques dans un bucket privé
-- Problème : les fichiers vendus étaient uploadés dans le bucket public
--            "products". Correctif : bucket privé "digital" dédié, servi
--            uniquement via URL signée (le serveur le fait déjà).
--            (Le code front/serveur pointe désormais vers ce bucket.)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('digital', 'digital', false)
on conflict (id) do nothing;

drop policy if exists "digital_admin_all"  on storage.objects;
drop policy if exists "digital_read_admin" on storage.objects;

create policy "digital_admin_all" on storage.objects
  for all to authenticated
  using      (bucket_id = 'digital' and public.is_admin())
  with check (bucket_id = 'digital' and public.is_admin());

commit;

-- =====================================================================
-- VÉRIFICATION (à lancer après, en lecture seule) :
--   select tablename, policyname, cmd
--   from pg_policies
--   where schemaname='public'
--     and tablename in ('service_requests','contact_messages','attributes')
--   order by tablename, policyname;
-- =====================================================================
