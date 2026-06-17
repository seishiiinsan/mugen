-- ---------------------------------------------------------------------------
-- 0023 — offrir un cosmétique à un ami.
--
-- Un joueur peut acheter un cosmétique pour un ami : il paie, l'article tombe
-- dans l'inventaire de l'ami, et une notification « cadeau » prévient le
-- destinataire. On en profite pour rendre les notifications extensibles :
--   • le type 'gift' rejoint la contrainte CHECK ;
--   • une colonne `ref` porte une référence libre (ici la clé de l'article),
--     que `my_notifications` renvoie avec son libellé pour l'affichage.
-- ---------------------------------------------------------------------------

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('friend_request', 'friend_accept', 'gift'));

alter table public.notifications add column if not exists ref text;

-- my_notifications : on ajoute `ref` + son libellé (nom de l'article offert).
-- Le type de retour change → drop puis recreate.
drop function if exists public.my_notifications();
create or replace function public.my_notifications()
returns table (
  id             uuid,
  type           text,
  actor_id       uuid,
  actor_username text,
  actor_avatar   text,
  created_at     timestamptz,
  read_at        timestamptz,
  pending        boolean,
  ref            text,
  ref_label      text
)
language sql security definer set search_path = public stable
as $$
  select
    n.id, n.type, n.actor_id, a.username, a.avatar_url, n.created_at, n.read_at,
    case when n.type = 'friend_request' then exists (
      select 1 from public.friendships
      where status = 'pending' and requester_id = n.actor_id and addressee_id = n.user_id
    ) else false end as pending,
    n.ref,
    s.name
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  left join public.shop_items s on s.key = n.ref
  where n.user_id = auth.uid()
    and case when n.actionable then n.resolved_at is null else n.read_at is null end
  order by n.created_at desc
  limit 50;
$$;
grant execute on function public.my_notifications() to authenticated;

-- ---------------------------------------------------------------------------
-- gift_item : offrir un cosmétique (non-badge) à un ami accepté.
-- ---------------------------------------------------------------------------
create or replace function public.gift_item(p_target uuid, p_key text)
returns table (ok boolean, error text, balance int)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_price   int;
  v_active  boolean;
  v_kind    text;
  v_balance int;
  v_charged boolean;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select coins into v_balance from public.profiles where id = v_uid;

  if p_target = v_uid then
    return query select false, 'Choisis un ami', v_balance; return;
  end if;

  -- Réservé aux amis acceptés.
  if not exists (
    select 1 from public.friendships
    where status = 'accepted'
      and ((requester_id = v_uid and addressee_id = p_target)
        or (requester_id = p_target and addressee_id = v_uid))
  ) then
    return query select false, 'Ce joueur n''est pas ton ami', v_balance; return;
  end if;

  select price, active, kind into v_price, v_active, v_kind
    from public.shop_items where key = p_key;

  if v_price is null or not v_active then
    return query select false, 'Article indisponible', v_balance; return;
  end if;
  if v_kind = 'badge' then
    return query select false, 'Les badges ne s''offrent pas', v_balance; return;
  end if;
  if exists (select 1 from public.user_items where user_id = p_target and item_key = p_key) then
    return query select false, 'Ton ami possède déjà cet article', v_balance; return;
  end if;
  if v_balance < v_price then
    return query select false, 'Solde insuffisant', v_balance; return;
  end if;

  -- Débit idempotent : la clé inclut la cible pour autoriser le même article
  -- offert à plusieurs amis. Si le débit n'a pas eu lieu, on s'arrête.
  v_charged := public.grant_coins(v_uid, -v_price, 'gift', p_target::text || ':' || p_key);
  if not v_charged then
    return query select false, 'Cadeau déjà effectué', v_balance; return;
  end if;

  insert into public.user_items (user_id, item_key) values (p_target, p_key)
    on conflict do nothing;
  insert into public.notifications (user_id, type, actor_id, ref)
    values (p_target, 'gift', v_uid, p_key);

  return query select true, null::text, (select coins from public.profiles where id = v_uid);
end;
$$;
grant execute on function public.gift_item(uuid, text) to authenticated;
