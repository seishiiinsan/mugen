-- ---------------------------------------------------------------------------
-- 0025 — outils admin : badge "Bug hunter" en un clic + onglet Joueurs.
--
-- Toutes les fonctions sont réservées aux admins (auth.uid() null = SQL editor,
-- autorisé ; sinon profiles.is_admin requis), en SECURITY DEFINER.
-- ---------------------------------------------------------------------------

-- admin_grant_badge : octroie un item à un joueur s'il ne l'a pas déjà.
-- Renvoie true si nouvellement attribué, false s'il le possédait déjà.
create or replace function public.admin_grant_badge(p_user uuid, p_key text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare v_caller uuid := auth.uid();
begin
  if v_caller is not null
     and not coalesce((select is_admin from public.profiles where id = v_caller), false) then
    raise exception 'Réservé aux admins';
  end if;
  if not exists (select 1 from public.shop_items where key = p_key) then
    raise exception 'Objet inconnu : %', p_key;
  end if;
  if exists (select 1 from public.user_items where user_id = p_user and item_key = p_key) then
    return false;
  end if;
  insert into public.user_items (user_id, item_key) values (p_user, p_key)
    on conflict do nothing;
  return true;
end;
$$;
grant execute on function public.admin_grant_badge(uuid, text) to authenticated;

-- admin_list_players : tous les joueurs, avec un résumé léger.
create or replace function public.admin_list_players()
returns table (
  id              uuid,
  username        text,
  avatar_url      text,
  coins           int,
  is_admin        boolean,
  created_at      timestamptz,
  lifetime_points bigint
)
language plpgsql security definer set search_path = public stable
as $$
begin
  if auth.uid() is not null
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Réservé aux admins';
  end if;
  return query
    select
      p.id, p.username, p.avatar_url, p.coins, p.is_admin, p.created_at,
      coalesce((select sum(pr.points) from public.predictions pr
                where pr.user_id = p.id and pr.points is not null), 0)::bigint
    from public.profiles p
    order by p.username;
end;
$$;
grant execute on function public.admin_list_players() to authenticated;

-- admin_player_detail : tout le compte d'un joueur, packé en JSON.
create or replace function public.admin_player_detail(p_user uuid)
returns jsonb language plpgsql security definer set search_path = public stable
as $$
declare v_json jsonb;
begin
  if auth.uid() is not null
     and not coalesce((select is_admin from public.profiles where id = auth.uid()), false) then
    raise exception 'Réservé aux admins';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'username', p.username,
    'avatar_url', p.avatar_url,
    'created_at', p.created_at,
    'is_admin', p.is_admin,
    'coins', p.coins,
    'predictions_visibility', p.predictions_visibility,
    'equipped', jsonb_build_object(
      'frame', p.equipped_frame,
      'title', p.equipped_title,
      'color', p.equipped_color,
      'badge', p.equipped_badge
    ),
    'lifetime_points', coalesce((
      select sum(pr.points) from public.predictions pr
      where pr.user_id = p.id and pr.points is not null), 0),
    'predictions_total', (select count(*) from public.predictions where user_id = p.id),
    'predictions_settled', (select count(*) from public.predictions where user_id = p.id and points is not null),
    'exact_scores', (select count(*) from public.predictions where user_id = p.id and base_points = 10),
    'friends_count', (select count(*) from public.friendships
      where status = 'accepted' and (requester_id = p.id or addressee_id = p.id)),
    'achievements', coalesce((
      select array_agg(key order by unlocked_at)
      from public.user_achievements where user_id = p.id), '{}'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'key', ui.item_key, 'kind', si.kind, 'name', si.name, 'count', ui.count
      ) order by si.kind, si.sort)
      from public.user_items ui
      join public.shop_items si on si.key = ui.item_key
      where ui.user_id = p.id), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'category', r.category, 'title', r.title,
        'status', r.status, 'created_at', r.created_at
      ) order by r.created_at desc)
      from public.reports r where r.user_id = p.id), '[]'::jsonb),
    'ledger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'amount', cl.amount, 'reason', cl.reason, 'ref', cl.ref, 'created_at', cl.created_at
      ) order by cl.created_at desc)
      from (
        select * from public.coin_ledger
        where user_id = p.id order by created_at desc limit 50
      ) cl), '[]'::jsonb)
  )
  into v_json
  from public.profiles p
  where p.id = p_user;

  return v_json;
end;
$$;
grant execute on function public.admin_player_detail(uuid) to authenticated;
