-- =============================================
-- AJOUTS POUR L'ESPACE CLIENT
-- À exécuter dans Supabase SQL Editor
-- =============================================

-- Table profils clients
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  address text,
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

-- Chaque client gère uniquement son propre profil
create policy "profiles_own"
  on profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Ajouter user_id dans orders (lien commande → client)
alter table orders add column if not exists user_id uuid references auth.users(id) on delete set null;

-- Les clients peuvent voir leurs propres commandes
create policy "orders_client_own"
  on orders for select
  to authenticated
  using (user_id = auth.uid());

-- Trigger : créer automatiquement un profil à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- PANIER SYNCHRONISÉ (multi-appareils)
-- =============================================

create table if not exists cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  product_id uuid references products(id) on delete cascade not null,
  quantity integer not null default 1,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table cart_items enable row level security;

create policy "cart_own"
  on cart_items for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- =============================================
-- PARAMÈTRES DE LA BOUTIQUE
-- =============================================

create table if not exists settings (
  key text primary key,
  value text not null
);

alter table settings enable row level security;

-- Lecture publique (le checkout doit pouvoir lire le paramètre sans être connecté)
create policy "settings_lecture_publique"
  on settings for select
  to anon, authenticated
  using (true);

-- Écriture admin uniquement
create policy "settings_ecriture_admin"
  on settings for all
  to authenticated
  using (auth.email() = 'konointer@gmail.com')
  with check (auth.email() = 'konointer@gmail.com');

-- Valeur par défaut : achat invité activé
insert into settings (key, value) values ('guest_checkout', 'true') on conflict (key) do nothing;
