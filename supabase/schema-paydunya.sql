-- =============================================
-- PAYDUNYA + EMAILS : colonnes supplémentaires sur orders
-- À exécuter dans Supabase SQL Editor
-- =============================================

alter table orders add column if not exists customer_email  text;
alter table orders add column if not exists payment_status  text not null default 'unpaid';
alter table orders add column if not exists paydunya_token  text;

-- Index pour retrouver rapidement une commande par token PayDunya (webhook IPN)
create index if not exists orders_paydunya_token_idx on orders (paydunya_token);
