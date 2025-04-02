-- Create the service role users table
create table public.service_role_users (
  user_id uuid references auth.users(id) on delete cascade primary key,
  role text not null check (role = 'service_role'),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.service_role_users enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Allow service_role all" on public.service_role_users;
drop policy if exists "Allow users to view own role" on public.service_role_users;

-- Create a policy that allows only service_role full access
create policy "Allow service_role all" on public.service_role_users
  for all
  using (auth.role() = 'service_role');

-- Create a policy that allows users to view their own role
create policy "Allow users to view own role" on public.service_role_users
  for select
  using (user_id = auth.uid());

-- Create index for user lookups
create index if not exists idx_service_role_users_user_id on public.service_role_users (user_id);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on public.service_role_users to anon, authenticated;
grant all on public.subscribers to anon, authenticated; 