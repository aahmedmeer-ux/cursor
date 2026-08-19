-- LeadUnlock initial schema
-- Run in Supabase SQL Editor or via CLI: supabase db push

-- Extensions
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- users (app profile; mirrors auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- user_credits
-- ---------------------------------------------------------------------------
create table if not exists public.user_credits (
  user_id uuid primary key references public.users (id) on delete cascade,
  balance integer not null default 10 check (balance >= 0),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- unlocked_contacts
-- ---------------------------------------------------------------------------
create table if not exists public.unlocked_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  person_name text not null,
  job_title text,
  company text,
  email text not null,
  phone text,
  linkedin_url text,
  location text,
  unlocked_at timestamptz not null default now()
);

create index if not exists unlocked_contacts_user_id_idx
  on public.unlocked_contacts (user_id);

create index if not exists unlocked_contacts_unlocked_at_idx
  on public.unlocked_contacts (user_id, unlocked_at desc);

-- ---------------------------------------------------------------------------
-- Auto-provision profile + credits when a user signs up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.user_credits (user_id, balance)
  values (new.id, 10)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Atomic credit spend + contact unlock
-- ---------------------------------------------------------------------------
create or replace function public.unlock_contact_transaction(
  p_person_name text,
  p_job_title text,
  p_company text,
  p_email text,
  p_linkedin_url text,
  p_phone text default null,
  p_location text default null
)
returns public.unlocked_contacts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_contact public.unlocked_contacts;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select balance into v_balance
  from public.user_credits
  where user_id = v_user_id
  for update;

  if v_balance is null then
    raise exception 'Credit wallet not found';
  end if;

  if v_balance < 1 then
    raise exception 'Insufficient credits';
  end if;

  update public.user_credits
  set balance = balance - 1,
      updated_at = now()
  where user_id = v_user_id;

  insert into public.unlocked_contacts (
    user_id, person_name, job_title, company, email, phone, linkedin_url, location
  )
  values (
    v_user_id, p_person_name, p_job_title, p_company, p_email, p_phone, p_linkedin_url, p_location
  )
  returning * into v_contact;

  return v_contact;
end;
$$;

grant execute on function public.unlock_contact_transaction(text, text, text, text, text, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.user_credits enable row level security;
alter table public.unlocked_contacts enable row level security;

-- users
drop policy if exists "Users can view own profile" on public.users;
create policy "Users can view own profile"
  on public.users for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- user_credits
drop policy if exists "Users can view own credits" on public.user_credits;
create policy "Users can view own credits"
  on public.user_credits for select
  using (auth.uid() = user_id);

-- unlocked_contacts
drop policy if exists "Users can view own contacts" on public.unlocked_contacts;
create policy "Users can view own contacts"
  on public.unlocked_contacts for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own contacts" on public.unlocked_contacts;
create policy "Users can insert own contacts"
  on public.unlocked_contacts for insert
  with check (auth.uid() = user_id);
