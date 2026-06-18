-- ---------------------------------------------------------------------------
-- 0030 — corrige « column reference "pot_balance" is ambiguous » (42702).
--
-- group_pot_deposit et group_purchase_item déclarent une colonne de sortie
-- nommée pot_balance ; dans `update groups set pot_balance = pot_balance ± …
-- returning pot_balance`, le pot_balance lu entrait en conflit avec cette
-- variable de sortie (PL/pgSQL voit les colonnes de RETURNS TABLE comme des
-- variables). À l'exécution Postgres renvoyait 42702, l'exception remontait et
-- l'app affichait « Dépôt impossible. » / « Achat impossible. ». On qualifie la
-- colonne via un alias de table.
-- À exécuter dans le SQL Editor APRÈS 0029.
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

  select coins into v_balance from public.profiles where id = v_uid;
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
  select g.pot_balance into v_pot from public.groups g where g.id = p_group;

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
