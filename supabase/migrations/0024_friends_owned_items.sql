-- ---------------------------------------------------------------------------
-- 0024 — inventaire des amis (pour la boutique cadeau).
--
-- Permet à l'acheteur de voir, dans le sélecteur d'ami, qui possède déjà
-- l'article avant de l'offrir. `user_items` est RLS « own only », donc on
-- expose les items des amis acceptés via une fonction SECURITY DEFINER.
-- ---------------------------------------------------------------------------

create or replace function public.friends_owned_items()
returns table (friend_id uuid, item_key text)
language sql security definer set search_path = public stable
as $$
  with friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from public.friendships
    where status = 'accepted'
      and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select ui.user_id, ui.item_key
  from public.user_items ui
  join friends f on f.fid = ui.user_id;
$$;

grant execute on function public.friends_owned_items() to authenticated;
