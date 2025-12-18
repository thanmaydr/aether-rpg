-- Create squads table
create table if not exists public.squads (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    description text,
    squad_xp integer default 0,
    is_open boolean default true,
    created_by uuid references auth.users(id),
    created_at timestamptz default now()
);

-- Enable RLS for squads
alter table public.squads enable row level security;

-- Create squad_members table
create table if not exists public.squad_members (
    squad_id uuid references public.squads(id) on delete cascade,
    user_id uuid references auth.users(id) on delete cascade,
    role text check (role in ('leader', 'member')) default 'member',
    joined_at timestamptz default now(),
    primary key (squad_id, user_id)
);

-- Enable RLS for squad_members
alter table public.squad_members enable row level security;

-- Create squad_invites table
create table if not exists public.squad_invites (
    id uuid default gen_random_uuid() primary key,
    squad_id uuid references public.squads(id) on delete cascade not null,
    invited_user_id uuid references auth.users(id) on delete cascade not null,
    invited_by uuid references auth.users(id) on delete cascade not null,
    status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
    created_at timestamptz default now(),
    unique(squad_id, invited_user_id)
);

-- RLS for squad_invites
alter table public.squad_invites enable row level security;

-- Policies for squads
create policy "Squads are viewable by everyone"
    on public.squads for select
    using (true);

create policy "Authenticated users can create squads"
    on public.squads for insert
    with check (auth.uid() = created_by);

-- Policies for squad_members
create policy "Squad members are viewable by everyone"
    on public.squad_members for select
    using (true);

create policy "Members can join open squads"
    on public.squad_members for insert
    with check (auth.uid() = user_id);

-- Policies for squad_invites
create policy "Invites are viewable by invited user"
    on public.squad_invites for select
    using (auth.uid() = invited_user_id);

create policy "Invites are viewable by squad members"
    on public.squad_invites for select
    using (
        exists (
            select 1 from public.squad_members
            where squad_members.squad_id = squad_invites.squad_id
            and squad_members.user_id = auth.uid()
        )
    );

create policy "Users can create invites for squads they belong to"
    on public.squad_invites for insert
    with check (
        auth.uid() = invited_by
        AND exists (
            select 1 from public.squad_members
            where squad_members.squad_id = squad_invites.squad_id
            and squad_members.user_id = auth.uid()
        )
    );

create policy "Invited users can accept/reject"
    on public.squad_invites for update
    using (auth.uid() = invited_user_id);

-- RPC to create squad and add creator as leader automatically
create or replace function public.create_squad(name text, description text)
returns uuid
language plpgsql
security definer
as $$
declare
    new_squad_id uuid;
begin
    insert into public.squads (name, description, created_by)
    values (name, description, auth.uid())
    returning id into new_squad_id;

    insert into public.squad_members (squad_id, user_id, role)
    values (new_squad_id, auth.uid(), 'leader');

    return new_squad_id;
end;
$$;
