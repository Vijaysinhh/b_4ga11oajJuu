begin;

alter table public.items
  add column if not exists archived_at timestamptz;

alter table public.items
  drop constraint if exists items_archived_requires_zero_stock;
alter table public.items
  add constraint items_archived_requires_zero_stock
  check (archived_at is null or quantity = 0);

create index if not exists items_shop_active_idx
  on public.items (shop_id, id)
  where archived_at is null;

-- Standardize existing rows on gross margin (profit divided by selling price).
update public.items
   set margin_amount = sell_price - buy_price,
       margin_percent = case
         when sell_price > 0 then ((sell_price - buy_price) / sell_price) * 100
         else 0
       end;

create or replace function public.create_inventory_item(
  p_shop_id bigint,
  p_name text,
  p_name_marathi text,
  p_brand text,
  p_brand_marathi text,
  p_category_id bigint,
  p_unit_id bigint,
  p_quantity numeric,
  p_expiry_date timestamptz,
  p_buy_price numeric,
  p_sell_price numeric,
  p_margin_amount numeric,
  p_margin_percent numeric,
  p_low_stock_limit numeric
)
returns public.items
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_item public.items;
begin
  if p_quantity < 0 then
    raise exception 'Opening stock cannot be negative';
  end if;

  insert into public.items (
    shop_id, name, name_marathi, brand, brand_marathi, category_id, unit_id,
    quantity, expiry_date, buy_price, sell_price, margin_amount,
    margin_percent, low_stock_limit
  ) values (
    p_shop_id, nullif(trim(p_name), ''), nullif(trim(p_name_marathi), ''),
    nullif(trim(p_brand), ''), nullif(trim(p_brand_marathi), ''),
    p_category_id, p_unit_id, p_quantity, p_expiry_date, p_buy_price,
    p_sell_price, p_margin_amount, p_margin_percent, p_low_stock_limit
  )
  returning * into v_item;

  if p_quantity > 0 then
    insert into public.stock_history (
      shop_id, item_id, item_name, type, quantity_changed, quantity_before,
      quantity_after, reason, cost_per_unit, reference
    ) values (
      p_shop_id, v_item.id, coalesce(v_item.name, v_item.name_marathi, 'Item'),
      'purchase', p_quantity, 0, p_quantity, 'Opening stock', p_buy_price,
      'item-created'
    );
  end if;

  return v_item;
end;
$$;

create or replace function public.adjust_item_stock(
  p_item_id bigint,
  p_quantity_change numeric,
  p_movement_type text,
  p_reason text default null
)
returns public.items
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_before numeric;
  v_item public.items;
begin
  if p_quantity_change = 0 then
    raise exception 'Stock change must not be zero';
  end if;

  if p_movement_type not in ('purchase', 'adjustment', 'damage', 'expiry') then
    raise exception 'Unsupported stock movement type: %', p_movement_type;
  end if;

  select quantity
    into v_before
    from public.items
   where id = p_item_id
     and archived_at is null
   for update;

  if not found then
    raise exception 'Active item % not found', p_item_id;
  end if;

  if v_before + p_quantity_change < 0 then
    raise exception 'Stock cannot become negative';
  end if;

  update public.items
     set quantity = v_before + p_quantity_change,
         updated_at = now()
   where id = p_item_id
   returning * into v_item;

  insert into public.stock_history (
    shop_id, item_id, item_name, type, quantity_changed, quantity_before,
    quantity_after, reason, cost_per_unit, reference
  ) values (
    v_item.shop_id, v_item.id,
    coalesce(v_item.name, v_item.name_marathi, 'Item'),
    p_movement_type, p_quantity_change, v_before, v_item.quantity,
    nullif(trim(p_reason), ''), v_item.buy_price, 'manual-stock-adjustment'
  );

  return v_item;
end;
$$;

create or replace function public.archive_inventory_item(p_item_id bigint)
returns public.items
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_item public.items;
begin
  select * into v_item
    from public.items
   where id = p_item_id
     and archived_at is null
   for update;

  if not found then
    raise exception 'Active item % not found', p_item_id;
  end if;
  if v_item.quantity <> 0 then
    raise exception 'Set stock to zero before archiving this product';
  end if;

  update public.items
     set archived_at = now(), updated_at = now()
   where id = p_item_id
   returning * into v_item;
  return v_item;
end;
$$;

create or replace function public.restore_inventory_item(p_item_id bigint)
returns public.items
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_item public.items;
begin
  update public.items
     set archived_at = null, updated_at = now()
   where id = p_item_id
     and archived_at is not null
   returning * into v_item;

  if not found then
    raise exception 'Archived item % not found', p_item_id;
  end if;
  return v_item;
end;
$$;

revoke all on function public.create_inventory_item(
  bigint, text, text, text, text, bigint, bigint, numeric, timestamptz,
  numeric, numeric, numeric, numeric, numeric
) from public, anon;
revoke all on function public.adjust_item_stock(bigint, numeric, text, text)
  from public, anon;
revoke all on function public.archive_inventory_item(bigint) from public, anon;
revoke all on function public.restore_inventory_item(bigint) from public, anon;

grant execute on function public.create_inventory_item(
  bigint, text, text, text, text, bigint, bigint, numeric, timestamptz,
  numeric, numeric, numeric, numeric, numeric
) to authenticated;
grant execute on function public.adjust_item_stock(bigint, numeric, text, text)
  to authenticated;
grant execute on function public.archive_inventory_item(bigint) to authenticated;
grant execute on function public.restore_inventory_item(bigint) to authenticated;

commit;
