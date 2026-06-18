-- =============================================
-- SCHÉMA E-COMMERCE
-- À exécuter dans Supabase SQL Editor
-- =============================================

-- Activer l'extension UUID
create extension if not exists "pgcrypto";

-- =============================================
-- TABLES
-- =============================================

-- Catégories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  created_at timestamptz default now()
);

-- Produits
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  price numeric(10,2) not null,
  stock integer default 0,
  category_id uuid references categories(id) on delete set null,
  images text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Commandes
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  items jsonb not null,
  total numeric(10,2) not null,
  payment_method text check (payment_method in ('delivery', 'wave', 'orange_money')),
  status text default 'pending' check (status in ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table categories enable row level security;
alter table products enable row level security;
alter table orders enable row level security;

-- ---- CATEGORIES ----

-- Lecture publique
create policy "categories_lecture_publique"
  on categories for select
  to anon, authenticated
  using (true);

-- Écriture admin uniquement (konointer@gmail.com)
create policy "categories_ecriture_admin"
  on categories for all
  to authenticated
  using (auth.email() = 'konointer@gmail.com')
  with check (auth.email() = 'konointer@gmail.com');

-- ---- PRODUCTS ----

-- Lecture publique (produits actifs uniquement pour les anonymes)
create policy "products_lecture_publique"
  on products for select
  to anon
  using (is_active = true);

-- Lecture complète pour l'admin
create policy "products_lecture_admin"
  on products for select
  to authenticated
  using (auth.email() = 'konointer@gmail.com');

-- Écriture admin uniquement
create policy "products_ecriture_admin"
  on products for all
  to authenticated
  using (auth.email() = 'konointer@gmail.com')
  with check (auth.email() = 'konointer@gmail.com');

-- ---- ORDERS ----

-- Insertion publique (création de commande sans compte)
create policy "orders_insertion_publique"
  on orders for insert
  to anon, authenticated
  with check (true);

-- Lecture admin
create policy "orders_lecture_admin"
  on orders for select
  to authenticated
  using (auth.email() = 'konointer@gmail.com');

-- Modification admin
create policy "orders_update_admin"
  on orders for update
  to authenticated
  using (auth.email() = 'konointer@gmail.com');

-- Suppression admin
create policy "orders_delete_admin"
  on orders for delete
  to authenticated
  using (auth.email() = 'konointer@gmail.com');

-- =============================================
-- STORAGE — Bucket images produits
-- =============================================

-- À exécuter manuellement dans Supabase Dashboard > Storage :
-- 1. Créer un bucket nommé "products"
-- 2. Le rendre PUBLIC
-- Ou via SQL :
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

-- Politique storage : upload admin uniquement
create policy "storage_upload_admin"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'products'
    and auth.email() = 'konointer@gmail.com'
  );

-- Politique storage : lecture publique
create policy "storage_lecture_publique"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'products');

-- Politique storage : suppression admin
create policy "storage_delete_admin"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'products'
    and auth.email() = 'konointer@gmail.com'
  );
