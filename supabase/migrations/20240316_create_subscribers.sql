-- Enable the auth schema
create schema if not exists auth;
grant usage on schema auth to postgres, anon, authenticated;

-- Create the subscribers table
create table public.subscribers (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  subscribed_at timestamp with time zone default timezone('utc'::text, now()) not null,
  status text default 'active'::text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  last_ip text,
  user_agent text
);

-- Enable Row Level Security (RLS)
alter table public.subscribers enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow rate-limited public insert" on public.subscribers;
drop policy if exists "Allow service_role select" on public.subscribers;
drop policy if exists "Allow users to view own subscription" on public.subscribers;
drop policy if exists "Allow service_role all" on public.subscribers;
drop policy if exists "Allow users to update own subscription" on public.subscribers;
drop policy if exists "Allow users to delete own subscription" on public.subscribers;

-- Create a more secure rate limiting policy
create policy "Allow rate-limited public insert" on public.subscribers
  for insert
  with check (
    (
      -- Check both IP and user agent to prevent spoofing
      select count(*)
      from public.subscribers
      where created_at > now() - interval '1 hour'
        and (
          last_ip = current_setting('request.headers')::jsonb->>'x-forwarded-for'
          or user_agent = current_setting('request.headers')::jsonb->>'user-agent'
        )
    ) < 5
    -- Ensure email format is valid
    and email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
  );

-- Create a policy that allows only service_role full access
create policy "Allow service_role all" on public.subscribers
  for all
  using (auth.role() = 'service_role');

-- Create a policy that allows users to view their own subscription
create policy "Allow users to view own subscription" on public.subscribers
  for select
  using (
    (user_id = auth.uid() or email = (select email from auth.users where id = auth.uid()))
    and status != 'deleted'
  );

-- Create a policy that allows users to update their own subscription
create policy "Allow users to update own subscription" on public.subscribers
  for update
  using (user_id = auth.uid())
  with check (
    -- Prevent updating critical fields
    (NEW.id = OLD.id)
    and (NEW.email = OLD.email)
    and (NEW.created_at = OLD.created_at)
    and NEW.status in ('active', 'unsubscribed')
  );

-- Create a policy that allows users to soft delete their own subscription
create policy "Allow users to delete own subscription" on public.subscribers
  for update
  using (
    user_id = auth.uid()
    and new.status = 'deleted'
  );

-- Create indexes for performance
create index if not exists idx_subscribers_email_lower on public.subscribers (lower(email));
create index if not exists idx_subscribers_created_at on public.subscribers (created_at);
create index if not exists idx_subscribers_status on public.subscribers (status);
create index if not exists idx_subscribers_last_ip on public.subscribers (last_ip);
create index if not exists idx_subscribers_user_id on public.subscribers (user_id);

-- Add updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on public.subscribers
  for each row
  execute function update_updated_at_column();

-- Add trigger for cleaning old rate limit records
create or replace function clean_old_rate_limits() returns trigger as $$
begin
  -- Only clean rate limit checks older than 24 hours
  delete from public.subscribers
  where created_at < now() - interval '24 hours'
    and status = 'rate_limit_check';
  return new;
end;
$$ language plpgsql;

create trigger clean_old_rate_limits_trigger
  after insert on public.subscribers
  execute function clean_old_rate_limits(); 