-- Function to get the global leaderboard
-- Only returns public profiles
drop function if exists get_leaderboard();

create or replace function get_leaderboard()
returns table (
  id uuid,
  username text,
  xp_total integer,
  level integer,
  character_class text,
  avatar_url text,
  is_public boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    p.id,
    p.username,
    p.xp_total,
    p.level,
    p.character_class,
    p.avatar_url,
    p.is_public
  from profiles p
  where p.is_public = true
  order by p.xp_total desc
  limit 100;
end;
$$;
