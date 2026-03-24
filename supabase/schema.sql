-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Analyses (all AI-powered analyses)
create table analyses (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  type text not null check (type in ('idea', 'market', 'distribution', 'gaps', 'patent', 'acquire', 'buildguide')),
  input jsonb not null,
  result jsonb not null,
  created_at timestamptz not null default now()
);
create index on analyses (user_id, type, created_at desc);

-- Build requests marketplace
create table build_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  title text not null,
  description text not null,
  budget text not null,
  category text not null,
  deadline_days integer not null default 30,
  anonymous boolean not null default true,
  demo_required boolean not null default true,
  notify_on_submission boolean not null default true,
  company_name text,
  status text not null default 'open' check (status in ('open', 'closed', 'filled')),
  featured boolean not null default false,
  tags text[] default '{}',
  created_at timestamptz not null default now(),
  expires_at timestamptz generated always as (created_at + make_interval(days => deadline_days)) stored
);
create index on build_requests (status, created_at desc);

-- Submissions
create table submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references build_requests(id) on delete cascade,
  user_id text not null,
  demo_url text not null,
  source_url text,
  description text not null,
  status text not null default 'pending' check (status in ('pending', 'viewed', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);
create index on submissions (request_id, created_at desc);

-- User profiles (skill level etc)
create table user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  skill_level text not null check (skill_level in ('beginner', 'intermediate', 'developer')),
  created_at timestamptz not null default now()
);
alter table user_profiles enable row level security;
create policy "users_own_profiles" on user_profiles for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- User integrations (GitHub, Vercel, etc.)
create table if not exists user_integrations (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  provider text not null,
  access_token text not null,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique(user_id, provider)
);
alter table user_integrations enable row level security;
create policy "users_own_integrations" on user_integrations for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

-- Projects (saved ideas)
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  idea text not null,
  track text not null default 'software',
  created_at timestamptz not null default now()
);
create index on projects (user_id, created_at desc);

-- RLS
alter table projects enable row level security;

create policy "users_own_projects" on projects for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

alter table analyses enable row level security;
alter table build_requests enable row level security;
alter table submissions enable row level security;

create policy "users_own_analyses" on analyses for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "read_open_requests" on build_requests for select
  using (status = 'open');

create policy "users_manage_own_requests" on build_requests for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "users_create_submissions" on submissions for insert
  with check ((auth.jwt() ->> 'sub') = user_id);

create policy "see_own_submissions" on submissions for select
  using (
    (auth.jwt() ->> 'sub') = user_id
    or request_id in (
      select id from build_requests where user_id = (auth.jwt() ->> 'sub')
    )
  );

-- Project stage (manually set by user)
alter table projects add column if not exists stage text not null default 'idea' check (stage in ('idea', 'building', 'built'));

-- Project app URL (for already-built apps)
alter table projects add column if not exists app_url text;

-- User role (builder vs org)
alter table user_profiles add column if not exists role text not null default 'builder' check (role in ('builder', 'org'));

-- Marketplace listings
create table if not exists marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  name text not null,
  tagline text,
  description text,
  url text,
  logo_url text,
  arr text,
  mrr text,
  customers text,
  team_size text,
  founded_year text,
  tech_stack text[] default '{}',
  key_features text[] default '{}',
  pricing_model text,
  target_market text,
  traction text,
  asking_price text,
  listing_type text not null default 'showcase' check (listing_type in ('acquisition', 'investment', 'partnership', 'showcase')),
  status text not null default 'draft' check (status in ('draft', 'active', 'closed')),
  contact_email text,
  ai_summary jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists marketplace_listings_status_idx on marketplace_listings (status, created_at desc);
alter table marketplace_listings enable row level security;
create policy "users_own_listings" on marketplace_listings for all
  using ((auth.jwt() ->> 'sub') = user_id)
  with check ((auth.jwt() ->> 'sub') = user_id);
create policy "public_read_active_listings" on marketplace_listings for select
  using (status = 'active');

-- Billing fields for user profiles
alter table user_profiles add column if not exists stripe_customer_id text;
alter table user_profiles add column if not exists subscription_tier text not null default 'free';
alter table user_profiles add column if not exists subscription_status text not null default 'free' check (subscription_status in ('free', 'active', 'cancelled', 'past_due'));
alter table user_profiles add column if not exists subscription_id text;
