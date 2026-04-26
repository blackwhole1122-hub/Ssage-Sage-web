-- Run this once in Supabase SQL editor
create table if not exists public.analytics_events (
  id bigserial primary key,
  event_name text not null,
  session_id text,
  page_path text,
  page_type text,
  target_url text,
  source text,
  medium text,
  campaign text,
  referrer text,
  short_slug text,
  search_query text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_event_name_idx on public.analytics_events (event_name);
create index if not exists analytics_events_page_path_idx on public.analytics_events (page_path);
create index if not exists analytics_events_short_slug_idx on public.analytics_events (short_slug);

alter table public.analytics_events enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_insert_all'
  ) then
    create policy analytics_events_insert_all
      on public.analytics_events
      for insert
      to anon, authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
      and policyname = 'analytics_events_select_authenticated'
  ) then
    create policy analytics_events_select_authenticated
      on public.analytics_events
      for select
      to authenticated
      using (true);
  end if;
end $$;

