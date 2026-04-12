-- Flogen AI — Supabase Schema
-- Run this in your Supabase SQL Editor

-- Clients
create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  business text,
  email text,
  phone text,
  stage text default 'lead',
  notes text,
  onboarding_checklist jsonb default '{"contract_sent":false,"contract_signed":false,"onboarding_call":false,"access_granted":false,"first_deliverable":false}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Finance entries
create table if not exists finance_entries (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  category text,
  description text,
  amount numeric(10,2) not null,
  currency text default 'MYR',
  account text,
  date date not null,
  created_at timestamptz default now()
);

-- Account balances
create table if not exists account_balances (
  id uuid primary key default gen_random_uuid(),
  account text unique not null,
  balance numeric(10,2) default 0,
  updated_at timestamptz default now()
);

-- Seed default account balances
insert into account_balances (account, balance) values
  ('ocbc', 0),
  ('paypal', 0),
  ('stripe', 0)
on conflict (account) do nothing;

-- AI Conversations
create table if not exists ai_conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  messages jsonb default '[]'::jsonb,
  summary text,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Resources
create table if not exists resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text,
  type text,
  url text,
  description text,
  html_content text,
  is_pinned boolean default false,
  created_at timestamptz default now()
);

-- Social Media Cache
create table if not exists social_metrics_cache (
  id uuid primary key default gen_random_uuid(),
  platform text,
  metric_type text,
  value numeric,
  metadata jsonb,
  fetched_at timestamptz default now()
);

-- Enable RLS on all tables
alter table clients enable row level security;
alter table finance_entries enable row level security;
alter table account_balances enable row level security;
alter table ai_conversations enable row level security;
alter table resources enable row level security;
alter table social_metrics_cache enable row level security;

-- RLS policies (allow authenticated users full access — single-user setup)
create policy "Authenticated users can do everything on clients"
  on clients for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on finance_entries"
  on finance_entries for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on account_balances"
  on account_balances for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on ai_conversations"
  on ai_conversations for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on resources"
  on resources for all using (auth.role() = 'authenticated');

create policy "Authenticated users can do everything on social_metrics_cache"
  on social_metrics_cache for all using (auth.role() = 'authenticated');

-- Updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply updated_at triggers
create trigger update_clients_updated_at
  before update on clients
  for each row execute function update_updated_at_column();

create trigger update_ai_conversations_updated_at
  before update on ai_conversations
  for each row execute function update_updated_at_column();

create trigger update_account_balances_updated_at
  before update on account_balances
  for each row execute function update_updated_at_column();
