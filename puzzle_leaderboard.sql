-- Create table for puzzle scores
create table if not exists puzzle_scores (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    puzzle_type text not null, -- 'zip', 'sudoku'
    level_id text not null, -- 'level-1', 'daily-2025-12-25'
    score numeric not null, -- time in ms for zip/sudoku
    completed_at timestamptz default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table puzzle_scores enable row level security;

-- Policies
create policy "Users can insert their own scores"
    on puzzle_scores for insert
    with check (auth.uid() = user_id);

create policy "Everyone can view scores"
    on puzzle_scores for select
    using (true);

-- Indexes for leaderboard queries
create index if not exists idx_puzzle_scores_type_level_score 
    on puzzle_scores(puzzle_type, level_id, score asc);

-- RPC to get global leaderboard for a specific level
create or replace function get_puzzle_leaderboard(
    p_puzzle_type text,
    p_level_id text,
    p_limit int default 10
)
returns table (
    username text,
    avatar_url text,
    score numeric,
    rank bigint
)
language sql
security definer
as $$
    select 
        p.username,
        p.avatar_url,
        ps.score,
        rank() over (order by ps.score asc) as rank
    from puzzle_scores ps
    join profiles p on p.id = ps.user_id
    where ps.puzzle_type = p_puzzle_type
      and ps.level_id = p_level_id
    order by ps.score asc
    limit p_limit;
$$;
