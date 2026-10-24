create table if not exists public.link_vitrines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  handle text not null,
  display_name text not null,
  bio text,
  theme text not null default 'dark-premium',
  avatar_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_vitrines_handle_format_check check (
    handle = lower(handle)
    and handle ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$'
  ),
  constraint link_vitrines_display_name_not_blank_check check (btrim(display_name) <> ''),
  constraint link_vitrines_bio_length_check check (bio is null or char_length(bio) <= 140),
  constraint link_vitrines_theme_check check (
    theme in ('dark-premium', 'minimal-light', 'green-glow', 'glass-effect', 'plain-black')
  )
);

create unique index if not exists link_vitrines_handle_key
on public.link_vitrines (lower(handle));

create index if not exists link_vitrines_user_id_created_at_idx
on public.link_vitrines (user_id, created_at desc);

create index if not exists link_vitrines_published_handle_idx
on public.link_vitrines (handle)
where is_published = true;

create table if not exists public.link_vitrine_items (
  id uuid primary key default gen_random_uuid(),
  vitrine_id uuid not null references public.link_vitrines(id) on delete cascade,
  platform text not null,
  label text not null,
  url text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_vitrine_items_platform_check check (
    platform in (
      'instagram',
      'facebook',
      'x',
      'linkedin',
      'youtube',
      'tiktok',
      'twitch',
      'kick',
      'discord',
      'telegram',
      'whatsapp',
      'website'
    )
  ),
  constraint link_vitrine_items_label_not_blank_check check (btrim(label) <> ''),
  constraint link_vitrine_items_active_requires_url_check check (
    is_active = false or nullif(btrim(coalesce(url, '')), '') is not null
  ),
  constraint link_vitrine_items_url_protocol_check check (
    url is null or url ~* '^https?://'
  )
);

create unique index if not exists link_vitrine_items_vitrine_platform_key
on public.link_vitrine_items (vitrine_id, platform);

create index if not exists link_vitrine_items_vitrine_sort_idx
on public.link_vitrine_items (vitrine_id, sort_order);

create index if not exists link_vitrine_items_active_vitrine_idx
on public.link_vitrine_items (vitrine_id, sort_order)
where is_active = true;

create or replace function public.set_link_vitrines_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_link_vitrines_updated_at on public.link_vitrines;

create trigger set_link_vitrines_updated_at
before update on public.link_vitrines
for each row
execute function public.set_link_vitrines_updated_at();

create or replace function public.set_link_vitrine_items_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_link_vitrine_items_updated_at on public.link_vitrine_items;

create trigger set_link_vitrine_items_updated_at
before update on public.link_vitrine_items
for each row
execute function public.set_link_vitrine_items_updated_at();

alter table public.link_vitrines enable row level security;
alter table public.link_vitrine_items enable row level security;

drop policy if exists link_vitrines_select_own_or_public on public.link_vitrines;

create policy link_vitrines_select_own_or_public
on public.link_vitrines
for select
to authenticated
using (
  user_id = (select auth.uid())
  or is_published = true
);

drop policy if exists link_vitrines_select_published_public on public.link_vitrines;

create policy link_vitrines_select_published_public
on public.link_vitrines
for select
to anon
using (is_published = true);

drop policy if exists link_vitrines_insert_own on public.link_vitrines;

create policy link_vitrines_insert_own
on public.link_vitrines
for insert
to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists link_vitrines_update_own on public.link_vitrines;

create policy link_vitrines_update_own
on public.link_vitrines
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists link_vitrines_delete_own on public.link_vitrines;

create policy link_vitrines_delete_own
on public.link_vitrines
for delete
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists link_vitrine_items_select_own_or_public_active on public.link_vitrine_items;

create policy link_vitrine_items_select_own_or_public_active
on public.link_vitrine_items
for select
to authenticated
using (
  exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id = link_vitrine_items.vitrine_id
      and (
        link_vitrines.user_id = (select auth.uid())
        or (
          link_vitrines.is_published = true
          and link_vitrine_items.is_active = true
        )
      )
  )
);

drop policy if exists link_vitrine_items_select_public_active on public.link_vitrine_items;

create policy link_vitrine_items_select_public_active
on public.link_vitrine_items
for select
to anon
using (
  is_active = true
  and exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id = link_vitrine_items.vitrine_id
      and link_vitrines.is_published = true
  )
);

drop policy if exists link_vitrine_items_insert_own_parent on public.link_vitrine_items;

create policy link_vitrine_items_insert_own_parent
on public.link_vitrine_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id = link_vitrine_items.vitrine_id
      and link_vitrines.user_id = (select auth.uid())
  )
);

drop policy if exists link_vitrine_items_update_own_parent on public.link_vitrine_items;

create policy link_vitrine_items_update_own_parent
on public.link_vitrine_items
for update
to authenticated
using (
  exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id = link_vitrine_items.vitrine_id
      and link_vitrines.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id = link_vitrine_items.vitrine_id
      and link_vitrines.user_id = (select auth.uid())
  )
);

drop policy if exists link_vitrine_items_delete_own_parent on public.link_vitrine_items;

create policy link_vitrine_items_delete_own_parent
on public.link_vitrine_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.link_vitrines
    where link_vitrines.id = link_vitrine_items.vitrine_id
      and link_vitrines.user_id = (select auth.uid())
  )
);

revoke all on table public.link_vitrines from anon, authenticated;
grant select (
  id,
  handle,
  display_name,
  bio,
  theme,
  avatar_url,
  is_published,
  created_at,
  updated_at
)
on table public.link_vitrines to anon;
grant select, insert, update, delete on table public.link_vitrines to authenticated;

revoke all on table public.link_vitrine_items from anon, authenticated;
grant select (
  id,
  vitrine_id,
  platform,
  label,
  url,
  is_active,
  sort_order,
  created_at,
  updated_at
)
on table public.link_vitrine_items to anon;
grant select, insert, update, delete on table public.link_vitrine_items to authenticated;

revoke all on function public.set_link_vitrines_updated_at() from public;
revoke all on function public.set_link_vitrine_items_updated_at() from public;
