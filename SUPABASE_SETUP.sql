-- Run this script in the Supabase SQL Editor for the La Tiendita project.
-- To authorize a driver, create their Auth user in Authentication, then add
-- that user's id and verified vehicle details to public.drivers:
-- insert into public.drivers (user_id, full_name, phone, plate_number, vehicle_make, vehicle_model, vehicle_year)
-- values ('AUTH_USER_UUID', 'Nombre del conductor', '0412-000-0000', 'ABC123', 'Toyota', 'Corolla', 2022);

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.drivers (
	user_id uuid primary key references auth.users(id) on delete cascade,
	full_name text not null check (length(trim(full_name)) between 2 and 100),
	phone text not null check (length(trim(phone)) between 7 and 30),
	plate_number text not null check (length(trim(plate_number)) between 2 and 20),
	vehicle_make text not null check (length(trim(vehicle_make)) between 1 and 50),
	vehicle_model text not null check (length(trim(vehicle_model)) between 1 and 50),
	vehicle_year integer not null check (vehicle_year between 1980 and 2100),
	active boolean not null default true,
	created_at timestamptz not null default now()
);

create table if not exists public.delivery_orders (
	id uuid primary key default gen_random_uuid(),
	tracking_code uuid not null unique,
	customer_name text not null check (length(trim(customer_name)) between 2 and 100),
	customer_phone text not null check (length(trim(customer_phone)) between 7 and 30),
	items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 80),
	subtotal numeric(12, 2) not null check (subtotal >= 0),
	delivery_fee numeric(12, 2) not null check (delivery_fee >= 0),
	total numeric(12, 2) not null check (total = subtotal + delivery_fee),
	delivery_address text not null check (length(trim(delivery_address)) between 3 and 1000),
	delivery_latitude double precision not null check (delivery_latitude between -90 and 90),
	delivery_longitude double precision not null check (delivery_longitude between -180 and 180),
	payment_method text not null check (payment_method in ('Efectivo', 'Pago móvil', 'Transferencia')),
	status text not null default 'pending' check (status in ('pending', 'accepted', 'picked_up', 'on_the_way', 'delivered', 'cancelled')),
	driver_id uuid references public.drivers(user_id) on delete set null,
	created_at timestamptz not null default now(),
	accepted_at timestamptz,
	updated_at timestamptz not null default now()
);

create index if not exists delivery_orders_pending_created_idx
	on public.delivery_orders (created_at)
	where status = 'pending';
create index if not exists delivery_orders_driver_created_idx
	on public.delivery_orders (driver_id, created_at desc)
	where driver_id is not null;

create or replace function public.get_my_driver_profile()
returns jsonb
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
	select jsonb_build_object(
		'full_name', full_name,
		'phone', phone,
		'plate_number', plate_number,
		'vehicle_make', vehicle_make,
		'vehicle_model', vehicle_model,
		'vehicle_year', vehicle_year
	)
	from public.drivers
	where user_id = auth.uid() and active;
$$;

alter table public.drivers enable row level security;
alter table public.delivery_orders enable row level security;

revoke all on public.drivers from anon, authenticated;
revoke all on public.delivery_orders from anon, authenticated;

create or replace function public.create_delivery_order(
	p_tracking_code uuid,
	p_customer_name text,
	p_customer_phone text,
	p_items jsonb,
	p_subtotal numeric,
	p_delivery_fee numeric,
	p_delivery_address text,
	p_delivery_latitude double precision,
	p_delivery_longitude double precision,
	p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
	new_order_id uuid;
	items_subtotal numeric(12, 2);
	delivery_distance_km double precision;
	haversine_value double precision;
begin
	if p_tracking_code is null
		or length(trim(coalesce(p_customer_name, ''))) not between 2 and 100
		or length(trim(coalesce(p_customer_phone, ''))) not between 7 and 30
		or p_items is null
		or jsonb_typeof(p_items) <> 'array'
		or jsonb_array_length(p_items) not between 1 and 80
		or p_subtotal is null
		or p_subtotal < 0
		or p_delivery_fee is null
		or p_delivery_fee < 0
		or length(trim(coalesce(p_delivery_address, ''))) not between 3 and 1000
		or p_delivery_latitude is null
		or p_delivery_latitude not between -90 and 90
		or p_delivery_longitude is null
		or p_delivery_longitude not between -180 and 180
		or p_payment_method is null
		or p_payment_method not in ('Efectivo', 'Pago móvil', 'Transferencia') then
		raise exception 'Los datos del pedido no son válidos.';
	end if;

	if exists (
		select 1
		from jsonb_to_recordset(p_items) as item(name text, quantity numeric, unit text, price_per_unit numeric, line_total numeric)
		where length(trim(coalesce(item.name, ''))) not between 1 and 100
			or item.quantity is null or item.quantity <= 0
			or item.unit is null or item.unit not in ('kg', 'unidad')
			or item.price_per_unit is null or item.price_per_unit <= 0
			or item.line_total is null or item.line_total < 0
			or abs(item.line_total - item.quantity * item.price_per_unit *
				case when item.price_per_unit > 50 then 0.9 else 1 end) > 0.000001
	) then
		raise exception 'Los productos incluidos en el pedido no son válidos.';
	end if;

	select round(coalesce(sum(item.line_total), 0), 2)
	into items_subtotal
	from jsonb_to_recordset(p_items) as item(line_total numeric);

	if items_subtotal <> p_subtotal then
		raise exception 'El subtotal no coincide con el detalle del pedido.';
	end if;

	haversine_value := sin(radians(p_delivery_latitude - 10.4806) / 2) ^ 2
		+ cos(radians(10.4806)) * cos(radians(p_delivery_latitude))
		* sin(radians(p_delivery_longitude + 66.9036) / 2) ^ 2;
	haversine_value := least(1, greatest(0, haversine_value));
	delivery_distance_km := 6371 * 2 * atan2(sqrt(haversine_value), sqrt(1 - haversine_value));
	if p_delivery_fee <> greatest(1::numeric, ceil(delivery_distance_km / 5)::numeric) then
		raise exception 'El costo de entrega no coincide con la ubicación seleccionada.';
	end if;

	insert into public.delivery_orders (
		tracking_code, customer_name, customer_phone, items, subtotal, delivery_fee, total,
		delivery_address, delivery_latitude, delivery_longitude, payment_method
	) values (
		p_tracking_code, trim(p_customer_name), trim(p_customer_phone), p_items,
		p_subtotal, p_delivery_fee, p_subtotal + p_delivery_fee,
		trim(p_delivery_address), p_delivery_latitude, p_delivery_longitude, p_payment_method
	)
	returning id into new_order_id;

	return new_order_id;
end;
$$;

create or replace function public.list_available_delivery_orders()
returns setof jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
	if not exists (
		select 1 from public.drivers
		where user_id = auth.uid() and active
	) then
		raise exception 'Se requiere una cuenta de conductor activa.';
	end if;

	return query
	select jsonb_build_object(
		'id', o.id,
		'customer_name', o.customer_name,
		'items', o.items,
		'subtotal', o.subtotal,
		'delivery_fee', o.delivery_fee,
		'total', o.total,
		'delivery_address', o.delivery_address,
		'delivery_latitude', o.delivery_latitude,
		'delivery_longitude', o.delivery_longitude,
		'payment_method', o.payment_method,
		'created_at', o.created_at
	)
	from public.delivery_orders o
	where o.status = 'pending'
	order by o.created_at asc;
end;
$$;

create or replace function public.list_my_delivery_orders()
returns setof jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
	if not exists (
		select 1 from public.drivers
		where user_id = auth.uid() and active
	) then
		raise exception 'Se requiere una cuenta de conductor activa.';
	end if;

	return query
	select jsonb_build_object(
		'id', o.id,
		'customer_name', o.customer_name,
		'customer_phone', o.customer_phone,
		'items', o.items,
		'subtotal', o.subtotal,
		'delivery_fee', o.delivery_fee,
		'total', o.total,
		'delivery_address', o.delivery_address,
		'delivery_latitude', o.delivery_latitude,
		'delivery_longitude', o.delivery_longitude,
		'payment_method', o.payment_method,
		'status', o.status,
		'created_at', o.created_at
	)
	from public.delivery_orders o
	where o.driver_id = auth.uid()
		and o.status in ('accepted', 'picked_up', 'on_the_way')
	order by o.accepted_at desc;
end;
$$;

create or replace function public.accept_delivery_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
	claimed_order public.delivery_orders%rowtype;
	driver_profile public.drivers%rowtype;
begin
	select * into driver_profile
	from public.drivers
	where user_id = auth.uid() and active;

	if not found then
		raise exception 'Se requiere una cuenta de conductor activa.';
	end if;

	update public.delivery_orders
	set driver_id = auth.uid(),
		status = 'accepted',
		accepted_at = now(),
		updated_at = now()
	where id = p_order_id and status = 'pending'
	returning * into claimed_order;

	if not found then
		raise exception 'Este pedido ya fue aceptado por otro conductor o ya no está disponible.';
	end if;

	return jsonb_build_object(
		'id', claimed_order.id,
		'customer_name', claimed_order.customer_name,
		'customer_phone', claimed_order.customer_phone,
		'items', claimed_order.items,
		'total', claimed_order.total,
		'delivery_address', claimed_order.delivery_address,
		'delivery_latitude', claimed_order.delivery_latitude,
		'delivery_longitude', claimed_order.delivery_longitude,
		'payment_method', claimed_order.payment_method,
		'status', claimed_order.status,
		'driver', jsonb_build_object(
			'full_name', driver_profile.full_name,
			'phone', driver_profile.phone,
			'plate_number', driver_profile.plate_number,
			'vehicle_make', driver_profile.vehicle_make,
			'vehicle_model', driver_profile.vehicle_model,
			'vehicle_year', driver_profile.vehicle_year
		)
	);
end;
$$;

create or replace function public.update_delivery_order_status(p_order_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
	current_status text;
begin
	if p_status not in ('picked_up', 'on_the_way', 'delivered') then
		raise exception 'Estado de pedido no válido.';
	end if;

	select status into current_status
	from public.delivery_orders
	where id = p_order_id and driver_id = auth.uid() and status <> 'cancelled'
	for update;

	if not found then
		raise exception 'El pedido no está asignado a este conductor.';
	end if;

	if (current_status = 'accepted' and p_status <> 'picked_up')
		or (current_status = 'picked_up' and p_status <> 'on_the_way')
		or (current_status = 'on_the_way' and p_status <> 'delivered') then
		raise exception 'El pedido debe avanzar al siguiente estado.';
	end if;

	update public.delivery_orders
	set status = p_status, updated_at = now()
	where id = p_order_id;

	return true;
end;
$$;

create or replace function public.get_delivery_tracking(p_tracking_code uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
	select jsonb_build_object(
		'status', o.status,
		'created_at', o.created_at,
		'driver', case when o.driver_id is null then null else jsonb_build_object(
			'full_name', d.full_name,
			'phone', d.phone,
			'plate_number', d.plate_number,
			'vehicle_make', d.vehicle_make,
			'vehicle_model', d.vehicle_model,
			'vehicle_year', d.vehicle_year
		) end
	)
	from public.delivery_orders o
	left join public.drivers d on d.user_id = o.driver_id
	where o.tracking_code = p_tracking_code;
$$;

revoke all on function public.create_delivery_order(uuid, text, text, jsonb, numeric, numeric, text, double precision, double precision, text) from public;
revoke all on function public.list_available_delivery_orders() from public;
revoke all on function public.list_my_delivery_orders() from public;
revoke all on function public.accept_delivery_order(uuid) from public;
revoke all on function public.update_delivery_order_status(uuid, text) from public;
revoke all on function public.get_delivery_tracking(uuid) from public;
revoke all on function public.get_my_driver_profile() from public;

grant execute on function public.create_delivery_order(uuid, text, text, jsonb, numeric, numeric, text, double precision, double precision, text) to anon, authenticated;
grant execute on function public.list_available_delivery_orders() to authenticated;
grant execute on function public.list_my_delivery_orders() to authenticated;
grant execute on function public.accept_delivery_order(uuid) to authenticated;
grant execute on function public.update_delivery_order_status(uuid, text) to authenticated;
grant execute on function public.get_delivery_tracking(uuid) to anon, authenticated;
grant execute on function public.get_my_driver_profile() to authenticated;
