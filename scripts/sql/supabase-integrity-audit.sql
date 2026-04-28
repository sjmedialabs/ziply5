-- Supabase integrity audit (read-only)
-- Finds common causes of "parent saved but children failed":
-- - `id` columns that are NOT NULL but have no default
-- - tables without a primary key
-- - foreign keys without ON DELETE rules (informational)
-- - timestamp columns that are NOT NULL without defaults (created_at/updated_at variants)

-- 1) Tables whose `id` is NOT NULL but has no default.
select
  n.nspname as schema_name,
  c.relname as table_name,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as column_type,
  a.attnotnull as not_null,
  pg_get_expr(ad.adbin, ad.adrelid) as column_default
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog', 'information_schema')
  and a.attnum > 0
  and not a.attisdropped
  and a.attname = 'id'
  and a.attnotnull = true
  and ad.adbin is null
order by 1, 2;

-- 2) Tables with no primary key.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_index i on i.indrelid = c.oid and i.indisprimary
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog', 'information_schema')
group by n.nspname, c.relname
having bool_or(i.indisprimary) is not true
order by 1, 2;

-- 3) NOT NULL timestamp-ish columns with no default.
select
  n.nspname as schema_name,
  c.relname as table_name,
  a.attname as column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod) as column_type,
  a.attnotnull as not_null,
  pg_get_expr(ad.adbin, ad.adrelid) as column_default
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef ad on ad.adrelid = a.attrelid and ad.adnum = a.attnum
where c.relkind = 'r'
  and n.nspname not in ('pg_catalog', 'information_schema')
  and a.attnum > 0
  and not a.attisdropped
  and a.attnotnull = true
  and ad.adbin is null
  and a.attname in ('createdAt', 'updatedAt', 'created_at', 'updated_at')
order by 1, 2, 3;

-- 4) Foreign keys overview (informational).
select
  n.nspname as schema_name,
  c.relname as table_name,
  con.conname as fk_name,
  pg_get_constraintdef(con.oid) as fk_definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where con.contype = 'f'
  and n.nspname not in ('pg_catalog', 'information_schema')
order by 1, 2, 3;

