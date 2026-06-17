-- ---------------------------------------------------------------------------
-- 0017 — notifications : dédoublonnage + cycle de vie « lu / résolu ».
--
-- Deux corrections liées :
--
-- 1. Anti-doublon. Une demande d'ami envoyée, annulée puis renvoyée pouvait
--    laisser deux notifications « friend_request » du même expéditeur (l'annulation
--    ne supprimait que la copie *non lue*). On garantit désormais au plus une
--    notification actionnable ouverte par (destinataire, expéditeur, type), via
--    un index unique partiel + `on conflict do nothing`.
--
-- 2. Cycle de vie. On distingue deux familles :
--      - informative (ex. « X a accepté votre demande ») → masquée une fois LUE ;
--      - actionnable (ex. demande d'ami à accepter/refuser) → affichée tant
--        qu'aucune action n'a été faite, masquée dès qu'elle est RÉSOLUE.
--    Deux colonnes portent ça : `actionable` et `resolved_at`.
-- ---------------------------------------------------------------------------

alter table public.notifications
  add column if not exists actionable  boolean not null default false,
  add column if not exists resolved_at timestamptz;

-- --- Reprise des données existantes -----------------------------------------

-- Les demandes d'ami sont actionnables.
update public.notifications
  set actionable = true
  where type = 'friend_request' and actionable = false;

-- Résout les demandes dont l'amitié n'est plus en attente (acceptée, refusée,
-- annulée) : elles n'ont plus d'action possible.
update public.notifications n
  set resolved_at = coalesce(n.read_at, now())
  where n.type = 'friend_request'
    and n.resolved_at is null
    and not exists (
      select 1 from public.friendships f
      where f.status = 'pending'
        and f.requester_id = n.actor_id
        and f.addressee_id = n.user_id
    );

-- Dédoublonne les demandes encore ouvertes : ne garde que la plus récente par
-- (destinataire, expéditeur), résout les autres.
update public.notifications n
  set resolved_at = coalesce(n.read_at, now())
  where n.type = 'friend_request'
    and n.resolved_at is null
    and exists (
      select 1 from public.notifications m
      where m.type = 'friend_request'
        and m.resolved_at is null
        and m.user_id = n.user_id
        and m.actor_id = n.actor_id
        and (m.created_at > n.created_at
             or (m.created_at = n.created_at and m.id > n.id))
    );

-- Au plus une notification actionnable *ouverte* par (destinataire, expéditeur,
-- type). Index partiel : les notifications résolues n'entrent pas en conflit,
-- un renvoi après annulation repart donc proprement.
create unique index if not exists notifications_open_actionable_ux
  on public.notifications (user_id, actor_id, type)
  where actionable and resolved_at is null;

-- ===========================================================================
-- Fonctions mises à jour
-- ===========================================================================

-- Envoyer une demande d'ami (ou accepter une demande inverse existante).
create or replace function public.send_friend_request(p_target uuid)
returns text language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_target = v_uid then raise exception 'Impossible de s''ajouter soi-même'; end if;
  if not exists (select 1 from public.profiles where id = p_target) then
    raise exception 'Joueur introuvable';
  end if;

  -- Déjà amis ?
  if exists (
    select 1 from public.friendships where status = 'accepted'
      and ((requester_id = v_uid and addressee_id = p_target)
        or (requester_id = p_target and addressee_id = v_uid))
  ) then
    return 'friends';
  end if;

  -- Demande inverse en attente → on l'accepte directement.
  if exists (
    select 1 from public.friendships
    where status = 'pending' and requester_id = p_target and addressee_id = v_uid
  ) then
    update public.friendships set status = 'accepted', updated_at = now()
      where requester_id = p_target and addressee_id = v_uid;
    update public.notifications
      set read_at = coalesce(read_at, now()), resolved_at = now()
      where user_id = v_uid and type = 'friend_request'
        and actor_id = p_target and resolved_at is null;
    insert into public.notifications (user_id, type, actor_id, actionable)
      values (p_target, 'friend_accept', v_uid, false);
    return 'friends';
  end if;

  -- Nouvelle demande, idempotente côté amitié ET notification.
  insert into public.friendships (requester_id, addressee_id, status)
    values (v_uid, p_target, 'pending')
    on conflict (requester_id, addressee_id) do nothing;
  insert into public.notifications (user_id, type, actor_id, actionable)
    values (p_target, 'friend_request', v_uid, true)
    on conflict (user_id, actor_id, type) where actionable and resolved_at is null
    do nothing;
  return 'pending_out';
end;
$$;

-- Répondre à une demande reçue (accepter ou refuser) → résout la notification.
create or replace function public.respond_friend_request(p_requester uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;

  if not exists (
    select 1 from public.friendships
    where requester_id = p_requester and addressee_id = v_uid and status = 'pending'
  ) then
    return false;
  end if;

  -- Action effectuée : la demande est résolue dans les deux cas.
  update public.notifications
    set read_at = coalesce(read_at, now()), resolved_at = now()
    where user_id = v_uid and type = 'friend_request'
      and actor_id = p_requester and resolved_at is null;

  if p_accept then
    update public.friendships set status = 'accepted', updated_at = now()
      where requester_id = p_requester and addressee_id = v_uid;
    insert into public.notifications (user_id, type, actor_id, actionable)
      values (p_requester, 'friend_accept', v_uid, false);
  else
    delete from public.friendships
      where requester_id = p_requester and addressee_id = v_uid;
  end if;
  return true;
end;
$$;

-- Annuler une demande sortante → résout la notification chez la cible (lue ou
-- non) pour qu'elle disparaisse, et libère la place pour un éventuel renvoi.
create or replace function public.cancel_friend_request(p_target uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  delete from public.friendships
    where requester_id = v_uid and addressee_id = p_target and status = 'pending';
  update public.notifications
    set resolved_at = now()
    where user_id = p_target and type = 'friend_request'
      and actor_id = v_uid and resolved_at is null;
  return true;
end;
$$;

-- Notifications de l'appelant : actionnables tant que non résolues, informatives
-- tant que non lues.
create or replace function public.my_notifications()
returns table (
  id             uuid,
  type           text,
  actor_id       uuid,
  actor_username text,
  actor_avatar   text,
  created_at     timestamptz,
  read_at        timestamptz,
  pending        boolean
)
language sql security definer set search_path = public stable
as $$
  select
    n.id, n.type, n.actor_id, a.username, a.avatar_url, n.created_at, n.read_at,
    case when n.type = 'friend_request' then exists (
      select 1 from public.friendships
      where status = 'pending' and requester_id = n.actor_id and addressee_id = n.user_id
    ) else false end as pending
  from public.notifications n
  left join public.profiles a on a.id = n.actor_id
  where n.user_id = auth.uid()
    and case when n.actionable then n.resolved_at is null else n.read_at is null end
  order by n.created_at desc
  limit 50;
$$;

-- Pastille « non lu » : ne compte que les notifications encore affichées.
create or replace function public.unread_notification_count()
returns bigint language sql security definer set search_path = public stable
as $$
  select count(*)::bigint from public.notifications
  where user_id = auth.uid()
    and read_at is null
    and (not actionable or resolved_at is null);
$$;
