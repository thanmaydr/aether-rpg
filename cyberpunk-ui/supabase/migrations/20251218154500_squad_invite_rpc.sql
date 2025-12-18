-- Function to accept a squad invite
create or replace function public.accept_squad_invite(invite_id uuid)
returns void
language plpgsql
security definer
as $$
declare
    v_squad_id uuid;
    v_user_id uuid;
begin
    -- Get invite details
    select squad_id, invited_user_id into v_squad_id, v_user_id
    from public.squad_invites
    where id = invite_id;

    if v_squad_id is null then
        raise exception 'Invite not found';
    end if;

    if v_user_id != auth.uid() then
        raise exception 'Not authorized to accept this invite';
    end if;

    -- Add to squad_members
    insert into public.squad_members (squad_id, user_id, role)
    values (v_squad_id, v_user_id, 'member');

    -- Update invite status
    update public.squad_invites
    set status = 'accepted'
    where id = invite_id;
    
    -- Optional: Delete other pending invites for this squad? 
    -- Or if they can only be in one squad, delete all other invites?
    -- keeping simple for now.
end;
$$;

-- Function to reject a squad invite
create or replace function public.reject_squad_invite(invite_id uuid)
returns void
language plpgsql
security definer
as $$
begin
    update public.squad_invites
    set status = 'rejected'
    where id = invite_id
    and invited_user_id = auth.uid();
end;
$$;
