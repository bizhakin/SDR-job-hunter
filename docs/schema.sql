-- Closer/Setter Job Hunter — Supabase/Postgres schema
-- Run in Supabase SQL editor, or hand to OpenCode as a migration.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- profiles: extends auth.users with job-search-specific data
-- ---------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  headline text,
  resume_text text,
  skills text[] default '{}',
  comp_min integer,
  comp_max integer,
  remote_pref boolean default true,
  role_pref text[] default '{}', -- e.g. {'closer','setter','sdr'}
  embedding vector(768),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users manage own profile"
  on profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------------------
-- job_posts: shared pool, populated by the aggregator worker + manual adds
-- ---------------------------------------------------------------------
create table job_posts (
  id uuid primary key default gen_random_uuid(),
  source text not null,               -- 'greenhouse' | 'lever' | 'workable' | 'remoteok' | 'wwr' | 'manual'
  source_url text unique,
  company text,
  title text,
  role_type text,                     -- 'closer' | 'setter' | 'sdr' | 'bdr' | 'other'
  comp_structure text,                -- free text: '100% commission', '$4k base + comm', etc.
  remote boolean default true,
  raw_text text,
  tags text[] default '{}',
  posted_at timestamptz,
  embedding vector(768),
  created_at timestamptz default now()
);

create index job_posts_embedding_idx on job_posts
  using ivfflat (embedding vector_cosine_ops);

create index job_posts_role_type_idx on job_posts (role_type);
create index job_posts_posted_at_idx on job_posts (posted_at desc);

alter table job_posts enable row level security;

create policy "Anyone authenticated can read job posts"
  on job_posts for select
  using (auth.role() = 'authenticated');

-- inserts happen via service role (aggregator worker), not directly from clients

-- ---------------------------------------------------------------------
-- job_matches: per-user ranked feed
-- ---------------------------------------------------------------------
create table job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  job_id uuid references job_posts(id) on delete cascade,
  match_score float,
  status text default 'new',          -- 'new' | 'saved' | 'dismissed'
  created_at timestamptz default now(),
  unique (user_id, job_id)
);

alter table job_matches enable row level security;

create policy "Users manage own matches"
  on job_matches for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- applications: the tracker / lightweight CRM
-- ---------------------------------------------------------------------
create table applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  job_id uuid references job_posts(id) on delete cascade,
  pitch_text text,
  channel text,                       -- 'email' | 'dm' | 'form' | 'other'
  status text default 'drafted',      -- 'drafted' | 'applied' | 'replied' | 'interview' | 'offer' | 'rejected'
  applied_at timestamptz,
  next_follow_up_at timestamptz,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table applications enable row level security;

create policy "Users manage own applications"
  on applications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- leads_manual: user-submitted leads from IG/X/Discord/etc. the scraper can't reach
-- ---------------------------------------------------------------------
create table leads_manual (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  source_platform text,               -- 'instagram' | 'x' | 'discord' | 'other'
  raw_text text not null,
  parsed_job_id uuid references job_posts(id),
  created_at timestamptz default now()
);

alter table leads_manual enable row level security;

create policy "Users manage own manual leads"
  on leads_manual for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- user_tokens: OAuth tokens for connected services (Gmail, etc.)
-- ---------------------------------------------------------------------
create table user_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  provider text not null,               -- 'gmail'
  access_token text,
  refresh_token text not null,
  expires_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, provider)
);

alter table user_tokens enable row level security;

create policy "Users manage own tokens"
  on user_tokens for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- interview_sessions: roleplay practice logs (Phase 4)
-- ---------------------------------------------------------------------
create table interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  job_id uuid references job_posts(id),
  transcript jsonb,
  score integer,
  objections_drilled text[] default '{}',
  created_at timestamptz default now()
);

alter table interview_sessions enable row level security;

create policy "Users manage own interview sessions"
  on interview_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
