-- =============================================
-- CONFIGURATION BOUTIQUE : nom, témoignages, newsletter
-- À exécuter dans Supabase SQL Editor
-- =============================================

-- Nom de la boutique
insert into settings (key, value) values ('shop_name', 'Boutique') on conflict (key) do nothing;

-- ── Table témoignages ──
create table if not exists testimonials (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  text       text not null,
  rating     int  not null default 5 check (rating between 1 and 5),
  avatar     text not null default 'A',
  is_active  boolean not null default true,
  created_at timestamptz default now()
);

alter table testimonials enable row level security;

create policy "testimonials_select_public" on testimonials for select using (true);
create policy "testimonials_insert_admin"  on testimonials for insert with check (auth.email() = 'konointer@gmail.com');
create policy "testimonials_update_admin"  on testimonials for update using (auth.email() = 'konointer@gmail.com');
create policy "testimonials_delete_admin"  on testimonials for delete using (auth.email() = 'konointer@gmail.com');

-- Exemples de témoignages (optionnel, à supprimer si vous voulez partir de zéro)
insert into testimonials (name, text, rating, avatar) values
  ('Aminata D.', 'Excellente boutique ! La livraison était rapide et les produits correspondent parfaitement à la description. Je recommande vivement.', 5, 'A'),
  ('Ousmane K.', 'Service client très réactif. J''ai eu un souci avec ma commande et ils l''ont résolu en moins de 2 heures. Vraiment impressionnant.', 5, 'O'),
  ('Fatou B.', 'Qualité des produits au top. Je suis cliente depuis 6 mois et je n''ai jamais été déçue. Prix compétitifs et livraison soignée.', 5, 'F')
on conflict do nothing;

-- ── Table abonnés newsletter ──
create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz default now()
);

alter table newsletter_subscribers enable row level security;

create policy "newsletter_select_admin"  on newsletter_subscribers for select using (auth.email() = 'konointer@gmail.com');
create policy "newsletter_insert_public" on newsletter_subscribers for insert with check (true);
create policy "newsletter_delete_admin"  on newsletter_subscribers for delete using (auth.email() = 'konointer@gmail.com');
