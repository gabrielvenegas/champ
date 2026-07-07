-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- Drop existing objects if they exist (clean setup)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop function if exists public.is_admin();
drop table if exists public.matches cascade;
drop table if exists public.championship_players cascade;
drop table if exists public.championships cascade;
drop table if exists public.players cascade;
drop table if exists public.profiles cascade;

-- Create Profiles table (tied to Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  role text default 'player' check (role in ('admin', 'player')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Players table (can represent registered users or guest/placeholder players)
create table public.players (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text unique,
  user_id uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Championships table
create table public.championships (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  status text default 'active' check (status in ('active', 'completed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create Championship Players join table (many-to-many relationship)
create table public.championship_players (
  championship_id uuid references public.championships(id) on delete cascade not null,
  player_id uuid references public.players(id) on delete cascade not null,
  primary key (championship_id, player_id)
);

-- Create Matches table
create table public.matches (
  id uuid default gen_random_uuid() primary key,
  championship_id uuid references public.championships(id) on delete cascade not null,
  round integer not null,
  home_player_id uuid references public.players(id) on delete cascade not null,
  away_player_id uuid references public.players(id) on delete cascade not null,
  scheduled_at timestamp with time zone,
  home_score integer,
  away_score integer,
  status text default 'pending' check (status in ('pending', 'played')),
  played_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS) on all public tables
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.championships enable row level security;
alter table public.championship_players enable row level security;
alter table public.matches enable row level security;

-- Admin utility function to check if the current user is an admin
create or replace function public.is_admin()
returns boolean as $$
begin
  return (
    -- Directly check email from JWT to avoid recursive query overhead
    (auth.jwt() ->> 'email' = 'ged.venegas@gmail.com')
    or
    -- Check role in profiles
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );
end;
$$ language plpgsql security definer;

-- --- PROFILES POLICIES ---
create policy "Allow public read access to profiles" 
  on public.profiles for select using (true);

create policy "Allow users to update their own profile" 
  on public.profiles for update using (auth.uid() = id);

create policy "Allow admin to manage all profiles" 
  on public.profiles for all using (is_admin());

-- --- PLAYERS POLICIES ---
create policy "Allow public read access to players" 
  on public.players for select using (true);

create policy "Allow admin to manage all players" 
  on public.players for all using (is_admin());

-- --- CHAMPIONSHIPS POLICIES ---
create policy "Allow public read access to championships" 
  on public.championships for select using (true);

create policy "Allow admin to manage all championships" 
  on public.championships for all using (is_admin());

-- --- CHAMPIONSHIP PLAYERS POLICIES ---
create policy "Allow public read access to championship players" 
  on public.championship_players for select using (true);

create policy "Allow admin to manage all championship players" 
  on public.championship_players for all using (is_admin());

-- --- MATCHES POLICIES ---
create policy "Allow public read access to matches" 
  on public.matches for select using (true);

create policy "Allow admin to manage all matches" 
  on public.matches for all using (is_admin());

create policy "Allow players to update their own match scores" 
  on public.matches for update 
  using (
    exists (
      select 1 from public.players
      where public.players.user_id = auth.uid()
      and (
        public.players.id = home_player_id 
        or public.players.id = away_player_id
      )
    )
  )
  with check (
    exists (
      select 1 from public.players
      where public.players.user_id = auth.uid()
      and (
        public.players.id = home_player_id 
        or public.players.id = away_player_id
      )
    )
  );

-- Automatically create profile on new user signup & link to player with matching email
create or replace function public.handle_new_user()
returns trigger as $$
declare
  player_id uuid;
begin
  insert into public.profiles (id, email, display_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    case when new.email = 'ged.venegas@gmail.com' then 'admin' else 'player' end
  );
  
  -- Check if a player with this email was already invited/registered
  update public.players
  set user_id = new.id
  where email = new.email;
  
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
