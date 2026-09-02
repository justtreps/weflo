create table if not exists workspaces (
  id text primary key,
  name text not null,
  slug text not null unique,
  owner_user_id text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  user_id text not null,
  workspace_id text not null references workspaces(id) on delete cascade,
  role text not null,
  primary key (user_id, workspace_id)
);

create table if not exists pages (
  id text primary key,
  workspace_id text not null references workspaces(id) on delete cascade,
  name text not null,
  slug text not null,
  type text not null,
  status text not null,
  document jsonb not null,
  document_version int not null default 1,
  updated_at timestamptz not null default now(),
  unique (workspace_id, slug)
);

alter table pages add column if not exists document_version int not null default 1;

create table if not exists credit_ledgers (
  workspace_id text primary key references workspaces(id) on delete cascade,
  monthly_remaining int not null,
  monthly_reset_at timestamptz not null,
  purchased_remaining int not null
);

create table if not exists shopify_connections (
  workspace_id text primary key references workspaces(id) on delete cascade,
  shop_domain text not null,
  token_encrypted text not null,
  status text not null
);

create table if not exists whop_links (
  workspace_id text primary key references workspaces(id) on delete cascade,
  membership_id text,
  plan_id text,
  status text not null,
  manage_url text,
  affiliate_id text,
  last_affiliate_stats jsonb
);

alter table whop_links add column if not exists last_affiliate_stats jsonb;

create table if not exists referral_attributions (
  referee_workspace_id text primary key references workspaces(id) on delete cascade,
  referrer_workspace_id text not null references workspaces(id),
  promo_applied boolean not null,
  created_at timestamptz not null default now()
);
create table if not exists onboarding_drafts (
  id text primary key,
  claim_token_hash text not null,
  status text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists onboarding_drafts_status_idx on onboarding_drafts(status);
