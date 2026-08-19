-- =====================================================================
-- BAISSE DE STOCK APRÈS PAIEMENT CONFIRMÉ
-- 2026-08-19
--
-- Règle : le stock baisse UNIQUEMENT après confirmation du paiement.
--   - PayDunya (en ligne) : au webhook, quand payment_status = 'paid'
--   - À la livraison (COD) : quand la commande passe à 'delivered'
-- Idempotent : ne décrémente qu'une fois par commande (colonne stock_decremented).
-- Les services (product_type='service') sont illimités -> ignorés.
-- Jamais de stock négatif.
--
-- À exécuter dans Supabase > SQL Editor (ou psql).
-- =====================================================================

begin;

-- Marqueur d'idempotence
alter table public.orders
  add column if not exists stock_decremented boolean not null default false;

create or replace function public.decrement_order_stock(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  item  jsonb;
  pid   uuid;
  vid   uuid;
  qty   int;
  ptype text;
  ord   record;
begin
  select id, items, stock_decremented into ord from orders where id = p_order_id;
  if ord.id is null then return; end if;
  if ord.stock_decremented then return; end if;             -- déjà fait
  if ord.items is null or jsonb_typeof(ord.items) <> 'array' then return; end if;

  for item in select * from jsonb_array_elements(ord.items)
  loop
    pid := nullif(item->>'id', '')::uuid;
    vid := nullif(item->>'variant_id', '')::uuid;
    qty := greatest(coalesce((item->>'quantity')::int, 1), 1);

    select product_type into ptype from products where id = pid;
    if ptype = 'service' then continue; end if;             -- services illimités

    if vid is not null then
      update product_variants
         set stock = greatest(coalesce(stock, 0) - qty, 0)
       where id = vid and stock is not null;
    else
      update products
         set stock = greatest(coalesce(stock, 0) - qty, 0)
       where id = pid and stock is not null;
    end if;
  end loop;

  update orders set stock_decremented = true where id = p_order_id;
end $$;

-- La fonction n'est appelable QUE par le serveur (service_role), jamais par
-- un visiteur (sinon on pourrait décrémenter le stock d'autrui).
revoke execute on function public.decrement_order_stock(uuid) from anon, authenticated;

commit;
