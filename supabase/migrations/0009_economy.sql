-- Mugen — Économie in-game : monnaie (pièces), boutique cosmétique, récompenses.
-- À exécuter dans le SQL Editor de Supabase après 0008.
--
-- Modèle : la monnaie se GAGNE par le jeu (pronos réglés, classement mensuel,
-- succès, bonus quotidien) et se dépense en COSMÉTIQUES uniquement (cadres,
-- titres, couleurs) — aucun avantage compétitif (cahier des charges §4).
--
-- Le solde vit sur `profiles.coins`, alimenté UNIQUEMENT via `grant_coins`, qui
-- écrit aussi une ligne idempotente dans `coin_ledger` (clé (user, reason, ref)).

-- ---------------------------------------------------------------------------
-- Solde + cosmétiques équipés sur le profil
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists coins          int not null default 0,
  add column if not exists equipped_frame text,
  add column if not exists equipped_title text,
  add column if not exists equipped_color text;

-- ---------------------------------------------------------------------------
-- Grand livre (append-only, idempotent)
-- ---------------------------------------------------------------------------
create table if not exists public.coin_ledger (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  amount     int  not null,           -- + gain, - dépense
  reason     text not null,           -- 'prediction'|'daily'|'monthly'|'achievement'|'purchase'
  ref        text not null default '',-- clé d'idempotence dans (user, reason)
  created_at timestamptz not null default now()
);
create unique index if not exists coin_ledger_idem_idx
  on public.coin_ledger (user_id, reason, ref);
create index if not exists coin_ledger_user_idx
  on public.coin_ledger (user_id, created_at desc);

alter table public.coin_ledger enable row level security;
create policy "Chacun voit son grand livre"
  on public.coin_ledger for select using (auth.uid() = user_id);
-- Aucune policy d'écriture : seules les RPC security-definer / service-role écrivent.

-- ---------------------------------------------------------------------------
-- Catalogue boutique (prix autoritaire en base ; le visuel vit côté code)
-- ---------------------------------------------------------------------------
create table if not exists public.shop_items (
  key         text primary key,
  kind        text not null check (kind in ('frame', 'title', 'color', 'badge')),
  name        text not null,
  description text,
  price       int  not null check (price >= 0),
  sort        int  not null default 0,
  active      boolean not null default true,  -- false = non vendable (badges récompense)
  created_at  timestamptz not null default now()
);
alter table public.shop_items enable row level security;
create policy "Catalogue visible par tous"
  on public.shop_items for select using (true);

-- Inventaire
create table if not exists public.user_items (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  item_key    text not null references public.shop_items (key) on delete cascade,
  acquired_at timestamptz not null default now(),
  primary key (user_id, item_key)
);
alter table public.user_items enable row level security;
create policy "Chacun voit son inventaire"
  on public.user_items for select using (auth.uid() = user_id);

-- Succès débloqués
create table if not exists public.user_achievements (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  key         text not null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, key)
);
alter table public.user_achievements enable row level security;
create policy "Chacun voit ses succès"
  on public.user_achievements for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- grant_coins : crédit/débit idempotent (interne). Jamais exposé aux clients.
-- ---------------------------------------------------------------------------
create or replace function public.grant_coins(
  p_user uuid, p_amount int, p_reason text, p_ref text default ''
)
returns boolean language plpgsql security definer set search_path = public
as $$
begin
  insert into public.coin_ledger (user_id, amount, reason, ref)
    values (p_user, p_amount, p_reason, coalesce(p_ref, ''))
    on conflict (user_id, reason, ref) do nothing;
  if found then
    update public.profiles set coins = coins + p_amount where id = p_user;
    return true;
  end if;
  return false;
end;
$$;
revoke execute on function public.grant_coins(uuid, int, text, text) from public;
grant execute on function public.grant_coins(uuid, int, text, text) to service_role;

-- ---------------------------------------------------------------------------
-- claim_daily_bonus : bonus quotidien (idempotent par jour UTC).
-- ---------------------------------------------------------------------------
create or replace function public.claim_daily_bonus()
returns table (granted boolean, amount int, balance int)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_amt int  := 20;
  v_ok  boolean;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  v_ok := public.grant_coins(
    v_uid, v_amt, 'daily', to_char(timezone('utc', now()), 'YYYY-MM-DD')
  );
  return query
    select v_ok,
           case when v_ok then v_amt else 0 end,
           (select coins from public.profiles where id = v_uid);
end;
$$;
grant execute on function public.claim_daily_bonus() to authenticated;

-- ---------------------------------------------------------------------------
-- purchase_item : achète un cosmétique (débit + inventaire), atomique.
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
  select coins into v_balance from public.profiles where id = v_uid;

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
-- equip_item : équipe/déséquipe un cosmétique possédé (p_key null = retirer).
-- ---------------------------------------------------------------------------
create or replace function public.equip_item(p_slot text, p_key text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_kind text;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_slot not in ('frame', 'title', 'color') then raise exception 'Slot invalide'; end if;

  if p_key is not null then
    select kind into v_kind from public.shop_items where key = p_key;
    if v_kind is distinct from p_slot then raise exception 'Type incompatible'; end if;
    if not exists (select 1 from public.user_items where user_id = v_uid and item_key = p_key) then
      raise exception 'Article non possédé';
    end if;
  end if;

  update public.profiles set
    equipped_frame = case when p_slot = 'frame' then p_key else equipped_frame end,
    equipped_title = case when p_slot = 'title' then p_key else equipped_title end,
    equipped_color = case when p_slot = 'color' then p_key else equipped_color end
  where id = v_uid;
end;
$$;
grant execute on function public.equip_item(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- month_standings : agrégat figé d'un mois calendaire ('YYYY-MM'), pour le
-- payout des récompenses mensuelles à la clôture (appelé en service-role).
-- ---------------------------------------------------------------------------
create or replace function public.month_standings(p_month text)
returns table (user_id uuid, points bigint, exacts bigint)
language sql security definer set search_path = public stable
as $$
  with b as (select (p_month || '-01')::timestamp as s)
  select p.user_id,
         sum(coalesce(p.points, 0)),
         count(*) filter (where p.base_points = 10)
  from public.predictions p
  join public.fixtures f on f.id = p.fixture_id
  cross join b
  where p.points is not null
    and f.kickoff >= b.s
    and f.kickoff <  b.s + interval '1 month'
  group by p.user_id;
$$;
revoke execute on function public.month_standings(text) from public;
grant execute on function public.month_standings(text) to service_role;

-- ---------------------------------------------------------------------------
-- Seed catalogue (visuels associés côté code dans lib/domain/cosmetics.ts).
-- ---------------------------------------------------------------------------
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('frame_steel',  'frame', 'Cadre acier',      'Anneau gris acier autour de l''avatar.',     200,  10, true),
  ('frame_neon',   'frame', 'Cadre néon',        'Anneau magenta lumineux.',                    500,  11, true),
  ('frame_gold',   'frame', 'Cadre or',          'Anneau doré prestige.',                       900,  12, true),
  ('color_magenta','color', 'Pseudo magenta',    'Affiche ton pseudo en Viva Magenta.',         150,  20, true),
  ('color_emerald','color', 'Pseudo émeraude',   'Affiche ton pseudo en vert émeraude.',        150,  21, true),
  ('color_azure',  'color', 'Pseudo azur',       'Affiche ton pseudo en bleu azur.',            150,  22, true),
  ('color_amber',  'color', 'Pseudo ambre',      'Affiche ton pseudo en ambre.',                150,  23, true),
  ('title_rookie', 'title', 'Titre « Rookie »',  'Affiche le titre Rookie sous ton pseudo.',    100,  30, true),
  ('title_tacticien','title','Titre « Tacticien »','Affiche le titre Tacticien.',               400,  31, true),
  ('title_visionnaire','title','Titre « Visionnaire »','Affiche le titre Visionnaire.',        1000,  32, true),
  -- Badges récompense : non vendables, octroyés par succès / classement.
  ('badge_first_exact','badge','Premier score exact', 'Ton tout premier score exact.',           0, 100, false),
  ('badge_exact_10',   'badge','10 scores exacts',    'Dix scores exacts au total.',             0, 101, false),
  ('badge_played_50',  'badge','50 pronostics',       'Cinquante pronostics réglés.',            0, 102, false),
  ('badge_month_gold',  'badge','Champion du mois',   '1er du classement mensuel.',              0, 110, false),
  ('badge_month_silver','badge','Vice-champion',      '2e du classement mensuel.',               0, 111, false),
  ('badge_month_bronze','badge','Podium du mois',     '3e du classement mensuel.',               0, 112, false)
on conflict (key) do nothing;
