-- ---------------------------------------------------------------------------
-- 0027 — Cagnottes de groupe + cosmétiques de groupe.
--
-- Chaque membre peut déposer ses pièces perso dans la cagnotte du groupe
-- (débit immédiat). Seul le PROPRIÉTAIRE peut dépenser la cagnotte en
-- cosmétiques de groupe (fonds, icônes, titres), gérés depuis les paramètres
-- du groupe. À la sortie d'un membre ou à la suppression du groupe, le solde
-- restant est remboursé au prorata des dépôts (équitable).
--
-- Comme l'existant : tables RLS-verrouillées (sauf catalogue public), tout
-- passe par des RPC `security definer`. Les RPC peuvent appeler `grant_coins`
-- (réservé à service_role) car elles tournent sous le propriétaire postgres.
-- À exécuter dans le SQL Editor APRÈS 0026.
-- ---------------------------------------------------------------------------

-- 1. Cagnotte + cosmétiques équipés portés par la table groups.
alter table public.groups
  add column if not exists pot_balance    int not null default 0,
  add column if not exists equipped_bg    text,
  add column if not exists equipped_icon  text,
  add column if not exists equipped_title text;

alter table public.groups
  drop constraint if exists groups_pot_balance_nonneg,
  add  constraint groups_pot_balance_nonneg check (pot_balance >= 0);

-- 2. Dépôts cumulés par membre (base du remboursement au prorata).
create table if not exists public.group_contributions (
  group_id uuid not null references public.groups (id)   on delete cascade,
  user_id  uuid not null references public.profiles (id) on delete cascade,
  amount   int  not null default 0 check (amount >= 0),
  primary key (group_id, user_id)
);
alter table public.group_contributions enable row level security;

-- 3. Flux de la cagnotte (audit + feed des paramètres). Disparaît avec le groupe.
create table if not exists public.group_pot_ledger (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid references public.profiles (id) on delete set null,
  amount     int  not null,
  reason     text not null check (reason in ('deposit', 'purchase', 'refund')),
  ref        text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists group_pot_ledger_group_idx
  on public.group_pot_ledger (group_id, created_at desc);
alter table public.group_pot_ledger enable row level security;

-- 4. Catalogue des cosmétiques de groupe (prix autoritaire ; visuel côté code).
create table if not exists public.group_shop_items (
  key         text primary key,
  kind        text not null check (kind in ('group_bg', 'group_icon', 'group_title')),
  name        text not null,
  description text,
  price       int  not null check (price >= 0),
  sort        int  not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.group_shop_items enable row level security;
drop policy if exists "Catalogue groupe visible par tous" on public.group_shop_items;
create policy "Catalogue groupe visible par tous"
  on public.group_shop_items for select using (true);

-- 5. Cosmétiques possédés par un groupe.
create table if not exists public.group_items (
  group_id    uuid not null references public.groups (id) on delete cascade,
  item_key    text not null references public.group_shop_items (key) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (group_id, item_key)
);
alter table public.group_items enable row level security;

-- ---------------------------------------------------------------------------
-- group_pot_deposit : un membre dépose des pièces perso dans la cagnotte.
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
  update public.groups set pot_balance = pot_balance + p_amount
    where id = p_group returning pot_balance into v_pot;
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
-- group_purchase_item : le propriétaire achète un cosmétique avec la cagnotte.
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

  update public.groups set pot_balance = pot_balance - v_price
    where id = p_group returning pot_balance into v_pot;
  insert into public.group_items (group_id, item_key) values (p_group, p_key)
    on conflict do nothing;
  insert into public.group_pot_ledger (group_id, user_id, amount, reason, ref)
    values (p_group, v_uid, -v_price, 'purchase', p_key);

  return query select true, null::text, v_pot;
end;
$$;
grant execute on function public.group_purchase_item(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- group_equip_item : équipe/retire un cosmétique de groupe (propriétaire only).
-- ---------------------------------------------------------------------------
create or replace function public.group_equip_item(p_group uuid, p_slot text, p_key text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_kind text;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if not exists (select 1 from public.groups g
                 where g.id = p_group and g.owner_id = v_uid) then
    raise exception 'Seul le propriétaire peut équiper les cosmétiques';
  end if;
  if p_slot not in ('bg', 'icon', 'title') then raise exception 'Slot invalide'; end if;

  if p_key is not null then
    select kind into v_kind from public.group_shop_items where key = p_key;
    if v_kind is distinct from ('group_' || p_slot) then
      raise exception 'Type incompatible';
    end if;
    if not exists (select 1 from public.group_items
                   where group_id = p_group and item_key = p_key) then
      raise exception 'Cosmétique non possédé par le groupe';
    end if;
  end if;

  update public.groups set
    equipped_bg    = case when p_slot = 'bg'    then p_key else equipped_bg end,
    equipped_icon  = case when p_slot = 'icon'  then p_key else equipped_icon end,
    equipped_title = case when p_slot = 'title' then p_key else equipped_title end
  where id = p_group;
end;
$$;
grant execute on function public.group_equip_item(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- my_owned_groups_pots : groupes dont l'appelant est propriétaire (+ cagnotte),
-- pour le sélecteur de la section boutique « Cosmétiques de groupes ».
-- ---------------------------------------------------------------------------
create or replace function public.my_owned_groups_pots()
returns table (id uuid, name text, pot_balance int)
language sql security definer set search_path = public stable
as $$
  select g.id, g.name, g.pot_balance
  from public.groups g
  where g.owner_id = auth.uid()
  order by g.created_at desc;
$$;
grant execute on function public.my_owned_groups_pots() to authenticated;

-- ---------------------------------------------------------------------------
-- group_pot : cagnotte d'un groupe + contribution de l'appelant (membre only).
-- ---------------------------------------------------------------------------
create or replace function public.group_pot(p_group uuid)
returns table (pot_balance int, my_contribution int)
language sql security definer set search_path = public stable
as $$
  select g.pot_balance,
         coalesce((select c.amount from public.group_contributions c
                   where c.group_id = p_group and c.user_id = auth.uid()), 0)
  from public.groups g
  where g.id = p_group
    and exists (select 1 from public.group_members m
                where m.group_id = p_group and m.user_id = auth.uid());
$$;
grant execute on function public.group_pot(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- group_shop_catalog : catalogue actif + flag « possédé » pour un groupe
-- (membre only — l'achat reste réservé au propriétaire côté group_purchase_item).
-- ---------------------------------------------------------------------------
create or replace function public.group_shop_catalog(p_group uuid)
returns table (key text, kind text, name text, description text,
               price int, sort int, owned boolean)
language sql security definer set search_path = public stable
as $$
  select i.key, i.kind, i.name, i.description, i.price, i.sort,
         exists (select 1 from public.group_items gi
                 where gi.group_id = p_group and gi.item_key = i.key) as owned
  from public.group_shop_items i
  where i.active = true
    and exists (select 1 from public.group_members m
                where m.group_id = p_group and m.user_id = auth.uid())
  order by i.sort;
$$;
grant execute on function public.group_shop_catalog(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- group_owned_items : cosmétiques possédés + flag équipé (propriétaire only),
-- pour la page paramètres du groupe.
-- ---------------------------------------------------------------------------
create or replace function public.group_owned_items(p_group uuid)
returns table (key text, kind text, name text, description text,
               price int, sort int, equipped boolean)
language sql security definer set search_path = public stable
as $$
  select i.key, i.kind, i.name, i.description, i.price, i.sort,
         (case i.kind
            when 'group_bg'    then g.equipped_bg
            when 'group_icon'  then g.equipped_icon
            when 'group_title' then g.equipped_title
          end) is not distinct from i.key as equipped
  from public.group_items gi
  join public.group_shop_items i on i.key = gi.item_key
  join public.groups g on g.id = gi.group_id
  where gi.group_id = p_group
    and g.owner_id = auth.uid()
  order by i.kind, i.sort;
$$;
grant execute on function public.group_owned_items(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- leave_group (recréée) : rembourse la part au prorata avant de partir.
-- ---------------------------------------------------------------------------
create or replace function public.leave_group(p_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_pot   int;
  v_total int;
  v_mine  int;
  v_share int;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if exists (select 1 from public.groups where id = p_group and owner_id = v_uid) then
    raise exception 'Le créateur ne peut pas quitter le groupe ; supprimez-le.';
  end if;

  select pot_balance into v_pot from public.groups where id = p_group;
  select coalesce(sum(amount), 0) into v_total
    from public.group_contributions where group_id = p_group;
  select coalesce(amount, 0) into v_mine
    from public.group_contributions where group_id = p_group and user_id = v_uid;

  if v_pot > 0 and v_total > 0 and v_mine > 0 then
    v_share := floor(v_pot::numeric * v_mine / v_total)::int;
    if v_share > 0 then
      perform public.grant_coins(
        v_uid, v_share, 'group_refund', p_group::text || ':leave:' || gen_random_uuid()::text
      );
      update public.groups set pot_balance = pot_balance - v_share where id = p_group;
      insert into public.group_pot_ledger (group_id, user_id, amount, reason, ref)
        values (p_group, v_uid, v_share, 'refund', 'leave');
    end if;
  end if;

  delete from public.group_contributions where group_id = p_group and user_id = v_uid;
  delete from public.group_members where group_id = p_group and user_id = v_uid;
end;
$$;
grant execute on function public.leave_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- delete_group (recréée) : rembourse le reliquat au prorata, puis supprime.
-- ---------------------------------------------------------------------------
create or replace function public.delete_group(p_group uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid   uuid := auth.uid();
  v_owner uuid;
  v_pot   int;
  v_total int;
  v_paid  int := 0;
  r       record;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  select owner_id, pot_balance into v_owner, v_pot
    from public.groups where id = p_group;
  if v_owner is null or v_owner <> v_uid then
    raise exception 'Seul le créateur peut supprimer le groupe';
  end if;

  if v_pot > 0 then
    select coalesce(sum(amount), 0) into v_total
      from public.group_contributions where group_id = p_group;
    if v_total > 0 then
      for r in select user_id, amount from public.group_contributions
               where group_id = p_group order by amount desc loop
        declare v_share int := floor(v_pot::numeric * r.amount / v_total)::int;
        begin
          if v_share > 0 then
            perform public.grant_coins(
              r.user_id, v_share, 'group_refund', p_group::text || ':delete:' || r.user_id::text
            );
            insert into public.group_pot_ledger (group_id, user_id, amount, reason, ref)
              values (p_group, r.user_id, v_share, 'refund', 'delete');
            v_paid := v_paid + v_share;
          end if;
        end;
      end loop;
      -- Reliquat d'arrondi crédité au propriétaire.
      if v_pot - v_paid > 0 then
        perform public.grant_coins(
          v_owner, v_pot - v_paid, 'group_refund', p_group::text || ':delete:remainder'
        );
      end if;
    end if;
  end if;

  delete from public.groups where id = p_group;
end;
$$;
grant execute on function public.delete_group(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Seed du catalogue de départ (visuels associés dans lib/domain/group-cosmetics.ts).
-- ---------------------------------------------------------------------------
insert into public.group_shop_items (key, kind, name, description, price, sort, active) values
  ('group_bg_slate',  'group_bg', 'Fond ardoise',     'Dégradé gris ardoise pour la carte du groupe.', 300, 10, true),
  ('group_bg_ocean',  'group_bg', 'Fond océan',       'Dégradé bleu profond.',                          500, 11, true),
  ('group_bg_sunset', 'group_bg', 'Fond crépuscule',  'Dégradé orangé chaleureux.',                     700, 12, true),
  ('group_bg_forest', 'group_bg', 'Fond forêt',       'Dégradé vert émeraude.',                         700, 13, true),
  ('group_icon_fr',   'group_icon', 'Drapeau France',   'Icône 🇫🇷 pour le groupe.',  200, 20, true),
  ('group_icon_es',   'group_icon', 'Drapeau Espagne',  'Icône 🇪🇸 pour le groupe.',  200, 21, true),
  ('group_icon_it',   'group_icon', 'Drapeau Italie',   'Icône 🇮🇹 pour le groupe.',  200, 22, true),
  ('group_icon_en',   'group_icon', 'Drapeau Angleterre','Icône 🏴 pour le groupe.',  200, 23, true),
  ('group_icon_pirate','group_icon','Pavillon pirate',  'Icône 🏴‍☠️ pour le groupe.', 350, 24, true),
  ('group_icon_fire', 'group_icon', 'Feu',              'Icône 🔥 pour le groupe.',  350, 25, true),
  ('group_title_squad',  'group_title', 'Titre « Squad »',   'Affiche « Squad » sur le groupe.',   400, 30, true),
  ('group_title_dynasty','group_title', 'Titre « Dynastie »','Affiche « Dynastie » sur le groupe.', 700, 31, true),
  ('group_title_legends','group_title', 'Titre « Légendes »','Affiche « Légendes » sur le groupe.',1000, 32, true)
on conflict (key) do nothing;
