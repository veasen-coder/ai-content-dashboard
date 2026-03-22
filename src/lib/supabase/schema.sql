-- ============================================================
-- Flogen AI — Content OS  |  Supabase Schema
-- Run this in your Supabase SQL Editor to bootstrap the DB.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── posts ───────────────────────────────────────────────────
create table if not exists posts (
  id               uuid primary key default gen_random_uuid(),
  platform         text not null check (platform in ('instagram','xiaohongshu','youtube','tiktok','linkedin','twitter','facebook')),
  status           text not null default 'draft' check (status in ('published','scheduled','draft','backlog','archived')),
  type             text not null default 'single' check (type in ('single','carousel','reel','story','video','article')),
  pillar           text check (pillar in ('education','inspiration','promotion','behind-the-scenes','engagement','case-study')),
  caption          text not null default '',
  hashtags         text[] not null default '{}',
  scheduled_at     timestamptz,
  published_at     timestamptz,
  media_url        text,
  thumbnail_url    text,
  parent_post_id   uuid references posts(id) on delete set null,
  caption_variants text[],
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger posts_updated_at
  before update on posts
  for each row execute procedure set_updated_at();

-- ─── competitors ─────────────────────────────────────────────
create table if not exists competitors (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  handle               text not null,
  platform             text not null check (platform in ('instagram','xiaohongshu','youtube','tiktok','linkedin','twitter','facebook')),
  profile_url          text,
  avatar_url           text,
  followers            integer not null default 0,
  following            integer not null default 0,
  posts_count          integer not null default 0,
  avg_engagement_rate  numeric(5,2) not null default 0,
  posting_frequency    numeric(4,1) not null default 0,
  growth_7d            numeric(5,2) not null default 0,
  growth_30d           numeric(5,2) not null default 0,
  last_refreshed_at    timestamptz,
  created_at           timestamptz not null default now()
);

create table if not exists competitor_posts (
  id              uuid primary key default gen_random_uuid(),
  competitor_id   uuid not null references competitors(id) on delete cascade,
  caption         text not null default '',
  media_url       text,
  likes           integer not null default 0,
  comments        integer not null default 0,
  engagement_rate numeric(5,2) not null default 0,
  published_at    timestamptz
);

-- ─── news_feeds ──────────────────────────────────────────────
create table if not exists news_feeds (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  url             text not null unique,
  category        text not null default 'general',
  is_active       boolean not null default true,
  last_fetched_at timestamptz,
  created_at      timestamptz not null default now()
);

-- Default Flogen AI feeds
insert into news_feeds (name, url, category) values
  ('TechCrunch AI',          'https://techcrunch.com/category/artificial-intelligence/feed/', 'technology'),
  ('Marketing In Asia',      'https://www.marketinginasia.com/feed/',                          'marketing'),
  ('The Rakyat Post Business','https://www.therakyatpost.com/category/business/feed/',          'business')
on conflict (url) do nothing;

-- ─── news_articles ───────────────────────────────────────────
create table if not exists news_articles (
  id           uuid primary key default gen_random_uuid(),
  feed_id      uuid not null references news_feeds(id) on delete cascade,
  title        text not null,
  summary      text,
  url          text not null unique,
  image_url    text,
  published_at timestamptz,
  is_saved     boolean not null default false,
  is_read      boolean not null default false,
  post_idea    jsonb,
  created_at   timestamptz not null default now()
);

-- Indexes for common queries
create index if not exists idx_posts_status        on posts(status);
create index if not exists idx_posts_scheduled_at  on posts(scheduled_at);
create index if not exists idx_posts_platform      on posts(platform);
create index if not exists idx_news_articles_feed  on news_articles(feed_id);
create index if not exists idx_news_articles_read  on news_articles(is_read);

-- Row Level Security (enable after adding auth)
-- alter table posts enable row level security;
-- alter table competitors enable row level security;
-- alter table news_feeds enable row level security;
-- alter table news_articles enable row level security;
