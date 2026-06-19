-- ---------------------------------------------------------------------------
-- 0032 — Verrous de concurrence sur les RPC de débit (anti-solde négatif).
--
-- Problème : purchase_item, gift_item et group_pot_deposit lisent le solde
-- (`select coins into v_balance …`), testent `v_balance < prix`, puis débitent
-- via grant_coins (`update profiles set coins = coins - prix`). L'UPDATE est
-- atomique mais NE REJOUE PAS le test : deux dépenses simultanées d'articles
-- DIFFÉRENTS (double-clic, script) lisent le même solde périmé, passent toutes
-- deux le test, puis débitent chacune → solde négatif. Le même article est déjà
-- protégé (idempotence coin_ledger + PK user_items), mais pas le multi-article.
-- group_purchase_item a la même course sur groups.pot_balance.
--
-- Correctif (deux couches) :
--   1. Filet de sécurité DB : CHECK (coins >= 0) sur profiles, à l'image du
--      groups_pot_balance_nonneg (0027). Toute tentative de passer sous zéro est
--      rejetée par la base, quelle que soit la voie.
--   2. Sérialisation : `select … for update` sur la ligne débitée (profil pour
--      les pièces perso, groupe pour la cagnotte) AU DÉBUT de chaque RPC de
--      débit. La 2e transaction concurrente attend le commit de la 1re puis
--      relit le solde à jour → le test échoue proprement (« Solde insuffisant »)
--      au lieu de violer le CHECK avec une exception brute.
--
-- Note : group_pot_deposit ne CRÉDITE que la cagnotte (UPDATE atomique, sans
-- test) — seul le profil débité a besoin du verrou. Idem pour les refunds
-- (leave_group/delete_group) : montants bornés par la part, déjà couverts par
-- le CHECK pot_balance >= 0 — hors périmètre.
--
-- Pré-requis : si un profil est DÉJÀ négatif (course passée), l'ajout du CHECK
-- échouera tant que le solde n'est pas réconcilié à la main.
-- Idempotent (`create or replace`, `drop … if exists`) — relançable.
-- À exécuter dans le SQL Editor APRÈS 0031.
-- ---------------------------------------------------------------------------

-- 1. Filet de sécurité DB : aucun solde de pièces ne peut passer sous zéro.
alter table public.profiles
  drop constraint if exists profiles_coins_nonneg,
  add  constraint profiles_coins_nonneg check (coins >= 0);

-- ---------------------------------------------------------------------------
-- 2. purchase_item — verrou sur la ligne profil (débit des pièces perso).
-- ---------------------------------------------------------------------------
create or replace function public.purchase_item(p_key text)
returns table (ok boolean, error text, balance int)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_price   int;
  v_active  boolean;
  v_balance int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select price, active into v_price, v_active from public.shop_items where key = p_key;
  -- Verrou : sérialise les achats concurrents du même utilisateur.
  select coins into v_balance from public.profiles where id = v_uid for update;

  if v_price is null or not v_active then
    return query select false, 'Article indisponible', v_balance; return;
  end if;
  if exists (select 1 from public.user_items where user_id = v_uid and item_key = p_key) then
    return query select false, 'Déjà possédé', v_balance; return;
  end if;
  if v_balance < v_price then
    return query select false, 'Solde insuffisant', v_balance; return;
  end if;

  perform public.grant_coins(v_uid, -v_price, 'purchase', p_key);
  insert into public.user_items (user_id, item_key) values (v_uid, p_key)
    on conflict do nothing;
  return query select true, null::text, (select coins from public.profiles where id = v_uid);
end;
$$;
grant execute on function public.purchase_item(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. gift_item — verrou sur la ligne profil (débit des pièces perso).
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
  -- Verrou : sérialise les cadeaux concurrents du même offrant.
  select coins into v_balance from public.profiles where id = v_uid for update;

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

-- ---------------------------------------------------------------------------
-- 4. group_pot_deposit — verrou sur la ligne profil (débit des pièces perso ;
--    la cagnotte n'est que créditée, UPDATE atomique sans test → pas de course).
-- ---------------------------------------------------------------------------
create or replace function public.group_pot_deposit(p_group uuid, p_amount int)
returns table (ok boolean, error text, pot_balance int, my_balance int)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_balance int;
  v_pot     int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from public.group_members m
                 where m.group_id = p_group and m.user_id = v_uid) then
    return query select false, 'Tu n''es pas membre de ce groupe', 0, 0; return;
  end if;

  -- Verrou : sérialise les dépôts concurrents du même membre.
  select coins into v_balance from public.profiles where id = v_uid for update;
  select g.pot_balance into v_pot from public.groups g where g.id = p_group;

  if p_amount is null or p_amount <= 0 then
    return query select false, 'Montant invalide', v_pot, v_balance; return;
  end if;
  if v_balance < p_amount then
    return query select false, 'Solde insuffisant', v_pot, v_balance; return;
  end if;

  perform public.grant_coins(
    v_uid, -p_amount, 'group_deposit', p_group::text || ':' || gen_random_uuid()::text
  );
  update public.groups g set pot_balance = g.pot_balance + p_amount
    where g.id = p_group returning g.pot_balance into v_pot;
  insert into public.group_contributions (group_id, user_id, amount)
    values (p_group, v_uid, p_amount)
    on conflict (group_id, user_id)
      do update set amount = group_contributions.amount + excluded.amount;
  insert into public.group_pot_ledger (group_id, user_id, amount, reason)
    values (p_group, v_uid, p_amount, 'deposit');

  return query
    select true, null::text, v_pot, (select coins from public.profiles where id = v_uid);
end;
$$;
grant execute on function public.group_pot_deposit(uuid, int) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. group_purchase_item — verrou sur la ligne groupe (débit de la cagnotte).
-- ---------------------------------------------------------------------------
create or replace function public.group_purchase_item(p_group uuid, p_key text)
returns table (ok boolean, error text, pot_balance int)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_price  int;
  v_active boolean;
  v_pot    int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from public.groups g
                 where g.id = p_group and g.owner_id = v_uid) then
    return query select false, 'Seul le propriétaire peut dépenser la cagnotte',
      coalesce((select g.pot_balance from public.groups g where g.id = p_group), 0);
    return;
  end if;

  select price, active into v_price, v_active
    from public.group_shop_items where key = p_key;
  -- Verrou : sérialise les achats concurrents sur la même cagnotte.
  select g.pot_balance into v_pot from public.groups g where g.id = p_group for update;

  if v_price is null or not v_active then
    return query select false, 'Article indisponible', v_pot; return;
  end if;
  if exists (select 1 from public.group_items
             where group_id = p_group and item_key = p_key) then
    return query select false, 'Déjà possédé par le groupe', v_pot; return;
  end if;
  if v_pot < v_price then
    return query select false, 'Cagnotte insuffisante', v_pot; return;
  end if;

  update public.groups g set pot_balance = g.pot_balance - v_price
    where g.id = p_group returning g.pot_balance into v_pot;
  insert into public.group_items (group_id, item_key) values (p_group, p_key)
    on conflict do nothing;
  insert into public.group_pot_ledger (group_id, user_id, amount, reason, ref)
    values (p_group, v_uid, -v_price, 'purchase', p_key);

  return query select true, null::text, v_pot;
end;
$$;
grant execute on function public.group_purchase_item(uuid, text) to authenticated;
