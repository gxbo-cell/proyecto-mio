create extension if not exists pgcrypto;

create table if not exists public.admin_users (
	user_id uuid primary key references auth.users (id) on delete cascade,
	created_at timestamptz not null default now()
);

create table if not exists public.products (
	id uuid primary key default gen_random_uuid(),
	name text not null check (char_length(trim(name)) between 1 and 60),
	price numeric(12, 2) not null check (price > 0),
	category text not null check (category in ('Carnes', 'Charcutería', 'Víveres', 'Bebidas', 'Lácteos', 'Otros')),
	sale_mode text not null check (sale_mode in ('unit', 'weight')),
	stock integer not null check (stock >= 0),
	created_at timestamptz not null default now()
);

create table if not exists public.orders (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references auth.users (id) on delete restrict,
	created_at timestamptz not null default now(),
	status text not null default 'pending' check (status in ('pending', 'accepted', 'completed', 'rejected')),
	payment_method text not null check (payment_method in ('Efectivo', 'Pago móvil', 'Transferencia')),
	total numeric(12, 2) not null check (total >= 0),
	delivery jsonb,
	items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
	received_confirmed boolean not null default false,
	review_rating integer check (review_rating between 1 and 5),
	review_reason text check (char_length(coalesce(review_reason, '')) <= 500),
	reviewed_at timestamptz,
	check (review_rating is null or review_rating > 2 or char_length(trim(coalesce(review_reason, ''))) > 0)
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_review_rating_idx on public.orders (review_rating) where review_rating is not null;

create or replace function public.is_store_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
	select exists (
		select 1 from public.admin_users
		where user_id = (select auth.uid())
	);
$$;

create or replace function public.get_store_review_summary()
returns table (average_rating numeric, review_count bigint)
language sql
stable
security definer
set search_path = ''
as $$
	select coalesce(round(avg(review_rating)::numeric, 1), 0),
		count(review_rating)
	from public.orders;
$$;

create or replace function public.place_store_order(
	p_items jsonb,
	p_payment_method text,
	p_delivery jsonb default null
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_user_id uuid := auth.uid();
	v_item jsonb;
	v_product public.products%rowtype;
	v_items jsonb := '[]'::jsonb;
	v_quantity integer;
	v_unit_price numeric(12, 2);
	v_line_total numeric(12, 2);
	v_total numeric(12, 2) := 0;
	v_delivery jsonb;
	v_distance_km numeric;
	v_zone integer;
	v_order public.orders%rowtype;
	v_latitude numeric;
	v_longitude numeric;
begin
	if v_user_id is null then
		raise exception 'Inicia sesión para confirmar tu pedido.';
	end if;
	if p_payment_method not in ('Efectivo', 'Pago móvil', 'Transferencia') then
		raise exception 'El método de pago no es válido.';
	end if;
	if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
		raise exception 'El carrito está vacío.';
	end if;

	for v_item in select value from jsonb_array_elements(p_items)
	loop
		if (v_item->>'productId') is null
			or (v_item->>'quantity') !~ '^[0-9]+$' then
			raise exception 'Un producto del carrito no es válido.';
		end if;
		v_quantity := (v_item->>'quantity')::integer;
		if v_quantity < 1 then
			raise exception 'La cantidad del pedido debe ser positiva.';
		end if;

		select * into v_product
		from public.products
		where id = (v_item->>'productId')::uuid
		for update;
		if not found or v_product.stock < v_quantity then
			raise exception 'No hay existencias suficientes para uno de los productos.';
		end if;

		v_unit_price := case when v_product.price > 50
			then round(v_product.price * 0.9, 2)
			else v_product.price
		end;
		v_line_total := case when v_product.sale_mode = 'weight'
			then round(v_unit_price * v_quantity / 1000, 2)
			else round(v_unit_price * v_quantity, 2)
		end;
		v_total := v_total + v_line_total;
		v_items := v_items || jsonb_build_array(jsonb_build_object(
			'productId', v_product.id,
			'name', v_product.name,
			'saleMode', v_product.sale_mode,
			'quantity', v_quantity,
			'price', v_unit_price,
			'lineTotal', v_line_total
		));
	end loop;

	if p_delivery is not null then
		if nullif(trim(p_delivery->>'location'), '') is null
			or (p_delivery->>'latitude') is null
			or (p_delivery->>'longitude') is null
			or (p_delivery->>'latitude') !~ '^-?[0-9]+(\.[0-9]+)?$'
			or (p_delivery->>'longitude') !~ '^-?[0-9]+(\.[0-9]+)?$' then
			raise exception 'La ubicación de delivery no es válida.';
		end if;
		v_latitude := (p_delivery->>'latitude')::numeric;
		v_longitude := (p_delivery->>'longitude')::numeric;
		if v_latitude not between -90 and 90 or v_longitude not between -180 and 180 then
			raise exception 'Las coordenadas de delivery no son válidas.';
		end if;
		v_distance_km := 6371 * 2 * asin(sqrt(least(1, greatest(0,
			power(sin(radians(v_latitude - 10.4806) / 2), 2) +
			cos(radians(10.4806)) * cos(radians(v_latitude)) *
			power(sin(radians(v_longitude - (-66.9036)) / 2), 2)
		))));
		v_zone := greatest(1, ceil(v_distance_km / 5)::integer);
		v_delivery := jsonb_build_object(
			'location', trim(p_delivery->>'location'),
			'fee', v_zone,
			'latitude', v_latitude,
			'longitude', v_longitude
		);
		v_total := v_total + v_zone;
	end if;

	insert into public.orders (user_id, payment_method, total, delivery, items)
	values (v_user_id, p_payment_method, v_total, v_delivery, v_items)
	returning * into v_order;
	return v_order;
end;
$$;

create or replace function public.confirm_store_order_received(p_order_id uuid)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_order public.orders%rowtype;
begin
	update public.orders
	set received_confirmed = true
	where id = p_order_id
		and user_id = auth.uid()
		and status <> 'rejected'
	returning * into v_order;
	if not found then
		raise exception 'No se encontró el pedido.';
	end if;
	return v_order;
end;
$$;

create or replace function public.submit_store_order_review(
	p_order_id uuid,
	p_rating integer,
	p_reason text default ''
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_order public.orders%rowtype;
	v_reason text := trim(coalesce(p_reason, ''));
begin
	if p_rating is null or p_rating not between 1 and 5 or (p_rating <= 2 and v_reason = '') or char_length(v_reason) > 500 then
		raise exception 'La calificación o el motivo no son válidos.';
	end if;
	update public.orders
	set review_rating = p_rating,
		review_reason = case when p_rating <= 2 then v_reason else null end,
		reviewed_at = now()
	where id = p_order_id
		and user_id = auth.uid()
		and status <> 'rejected'
		and received_confirmed
		and review_rating is null
	returning * into v_order;
	if not found then
		raise exception 'Confirma la recepción del pedido. Cada compra permite una sola reseña.';
	end if;
	return v_order;
end;
$$;

create or replace function public.admin_update_store_order_status(
	p_order_id uuid,
	p_next_status text
)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
	v_order public.orders%rowtype;
	v_item jsonb;
	v_product_id uuid;
	v_quantity integer;
begin
	if not public.is_store_admin() then
		raise exception 'Se requieren permisos de administrador.';
	end if;
	select * into v_order from public.orders where id = p_order_id for update;
	if not found then
		raise exception 'No se encontró el pedido.';
	end if;
	if not ((v_order.status = 'pending' and p_next_status in ('accepted', 'rejected'))
		or (v_order.status = 'accepted' and p_next_status = 'completed')) then
		raise exception 'El cambio de estado no está permitido.';
	end if;
	if p_next_status = 'accepted' then
		for v_item in select value from jsonb_array_elements(v_order.items)
		loop
			v_product_id := (v_item->>'productId')::uuid;
			v_quantity := (v_item->>'quantity')::integer;
			update public.products set stock = stock - v_quantity
			where id = v_product_id and stock >= v_quantity;
			if not found then
				raise exception 'No hay existencias suficientes para aceptar este pedido.';
			end if;
		end loop;
	end if;
	update public.orders set status = p_next_status
	where id = p_order_id
	returning * into v_order;
	return v_order;
end;
$$;

alter table public.admin_users enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

revoke all on public.admin_users, public.products, public.orders from anon, authenticated;

drop policy if exists "Anyone can read products" on public.products;
create policy "Anyone can read products" on public.products
	for select to anon, authenticated using (true);
drop policy if exists "Admins manage products" on public.products;
create policy "Admins manage products" on public.products
	for all to authenticated using ((select public.is_store_admin()))
	with check ((select public.is_store_admin()));

drop policy if exists "Customers and admins read orders" on public.orders;
create policy "Customers and admins read orders" on public.orders
	for select to authenticated
	using (user_id = (select auth.uid()) or (select public.is_store_admin()));
revoke all on public.admin_users from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant select on public.orders to authenticated;
revoke all on function public.is_store_admin() from public;
revoke all on function public.get_store_review_summary() from public;
revoke all on function public.place_store_order(jsonb, text, jsonb) from public;
revoke all on function public.confirm_store_order_received(uuid) from public;
revoke all on function public.submit_store_order_review(uuid, integer, text) from public;
revoke all on function public.admin_update_store_order_status(uuid, text) from public;
grant execute on function public.is_store_admin() to authenticated;
grant execute on function public.get_store_review_summary() to anon, authenticated;
grant execute on function public.place_store_order(jsonb, text, jsonb) to authenticated;
grant execute on function public.confirm_store_order_received(uuid) to authenticated;
grant execute on function public.submit_store_order_review(uuid, integer, text) to authenticated;
grant execute on function public.admin_update_store_order_status(uuid, text) to authenticated;

do $$
begin
	if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
		and not exists (
			select 1 from pg_publication_tables
			where pubname = 'supabase_realtime'
				and schemaname = 'public'
				and tablename = 'orders'
		) then
		alter publication supabase_realtime add table public.orders;
	end if;
end;
$$;
