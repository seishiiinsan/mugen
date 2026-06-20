-- Mugen — Saison & prestige : pass saisonnier (paliers réclamables) + archive
-- des champions mensuels (Hall of Fame).
-- À exécuter dans le SQL Editor de Supabase après 0035.
--
-- Modèle (cf. cahier des charges §4 : aucun avantage compétitif) :
--   • Le pass se PROGRESSE en jouant — métrique = points du mois actif, déjà
--     calculés par monthly_leaderboard / my_monthly_rank (aucun nouveau suivi).
--   • Récompenses GRATUITES & cosmétiques : des pièces à chaque palier, plus un
--     badge répétable « badge_season » au palier max (×N, comme le podium
--     mensuel via award_monthly_badge).
--   • Réclamation explicite et idempotente via claim_season_tier, sur le modèle
--     de claim_daily_bonus (0009).

-- ---------------------------------------------------------------------------
-- Catalogue des paliers — source de vérité des seuils (comme shop_items.price).
-- Le visuel/emoji vit côté code (lib/domain/season.ts).
-- ---------------------------------------------------------------------------
create table if not exists public.season_rewards (
  tier       int  primary key,
  min_points int  not null check (min_points >= 0),
  coins      int  not null default 0 check (coins >= 0),
  badge_key  text references public.shop_items (key),
  name       text not null
);
alter table public.season_rewards enable row level security;
create policy "Paliers visibles par tous"
  on public.season_rewards for select using (true);

-- ---------------------------------------------------------------------------
-- Réclamations par joueur (ancre d'idempotence). Une ligne = (joueur, mois,
-- palier) réclamé. Écriture réservée à claim_season_tier — aucune policy write,
-- comme coin_ledger.
-- ---------------------------------------------------------------------------
create table if not exists public.season_claims (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  month      text not null,            -- 'YYYY-MM' (mois actif, avec grâce)
  tier       int  not null references public.season_rewards (tier),
  claimed_at timestamptz not null default now(),
  primary key (user_id, month, tier)
);
alter table public.season_claims enable row level security;
create policy "Chacun voit ses réclamations"
  on public.season_claims for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Hall of Fame : podium figé de chaque mois clôturé, écrit par le payout
-- (service-role) dans payoutMonthIfDue. PK (mois, joueur) pour tolérer les
-- ex æquo (deux 1ers possibles) sans collision.
-- ---------------------------------------------------------------------------
create table if not exists public.monthly_champions (
  month       text not null,           -- 'YYYY-MM' du mois clôturé
  user_id     uuid not null references public.profiles (id) on delete cascade,
  rank        int  not null,
  points      int  not null,
  exacts      int  not null default 0,
  archived_at timestamptz not null default now(),
  primary key (month, user_id)
);
create index if not exists monthly_champions_month_rank_idx
  on public.monthly_champions (month, rank);
alter table public.monthly_champions enable row level security;
create policy "Hall of Fame visible par tous"
  on public.monthly_champions for select using (true);

-- ---------------------------------------------------------------------------
-- claim_season_tier : réclame un palier du mois actif (idempotent).
-- Recalcule les points du mois CÔTÉ SERVEUR (jamais de confiance au client),
-- sur exactement la fenêtre de my_monthly_rank / monthly_leaderboard.
--
-- Note : fonction security-definer (propriétaire postgres) → elle peut appeler
-- grant_coins / award_monthly_badge bien que ceux-ci ne soient grantés qu'à
-- service_role, exactement comme claim_daily_bonus appelle grant_coins (0009).
-- ---------------------------------------------------------------------------
create or replace function public.claim_season_tier(p_tier int)
returns table (granted boolean, coins int, badge_key text, balance int)
language plpgsql security definer set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_month  text := to_char(public.active_month_start(), 'YYYY-MM');
  v_min    int;
  v_coins  int;
  v_badge  text;
  v_points bigint;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;

  select sr.min_points, sr.coins, sr.badge_key
    into v_min, v_coins, v_badge
    from public.season_rewards sr where sr.tier = p_tier;
  if not found then raise exception 'Palier inconnu'; end if;

  -- Points du mois actif pour l'appelant (même fenêtre que le classement).
  select coalesce(sum(coalesce(p.points, 0)), 0) into v_points
    from public.predictions p
    join public.fixtures f on f.id = p.fixture_id
    where p.user_id = v_uid
      and p.points is not null
      and f.kickoff >= public.active_month_start()
      and f.kickoff <  public.active_month_start() + interval '1 month';

  -- Palier non atteint, ou déjà réclamé ce mois → rien à créditer.
  if v_points < v_min then
    return query
      select false, 0, null::text, (select pr.coins from public.profiles pr where pr.id = v_uid);
    return;
  end if;

  insert into public.season_claims (user_id, month, tier)
    values (v_uid, v_month, p_tier)
    on conflict do nothing;
  if not found then
    return query
      select false, 0, null::text, (select pr.coins from public.profiles pr where pr.id = v_uid);
    return;
  end if;

  -- Nouveau palier : crédite les pièces (idempotent par (user,'season',ref)) et
  -- l'éventuel badge répétable.
  if v_coins > 0 then
    perform public.grant_coins(v_uid, v_coins, 'season', v_month || ':t' || p_tier);
  end if;
  if v_badge is not null then
    perform public.award_monthly_badge(v_uid, v_badge);
  end if;

  return query
    select true, v_coins, v_badge, (select pr.coins from public.profiles pr where pr.id = v_uid);
end;
$$;
grant execute on function public.claim_season_tier(int) to authenticated;

-- ---------------------------------------------------------------------------
-- hall_of_fame : champions passés (podium figé) + identité, pour l'app.
-- Tri + limite en SQL et jointure profiles via security-definer, exactement
-- comme monthly_leaderboard. Données publiques (pseudo, avatar, podium).
-- ---------------------------------------------------------------------------
create or replace function public.hall_of_fame(limit_count int default 60)
returns table (
  month      text,
  rank       int,
  user_id    uuid,
  username   text,
  avatar_url text,
  points     int,
  exacts     int
)
language sql security definer set search_path = public stable
as $$
  select c.month, c.rank, c.user_id, pr.username, pr.avatar_url, c.points, c.exacts
  from public.monthly_champions c
  join public.profiles pr on pr.id = c.user_id
  order by c.month desc, c.rank asc
  limit limit_count;
$$;
grant execute on function public.hall_of_fame(int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed : badge récompense (non vendable) puis catalogue des paliers.
-- L'ordre compte (season_rewards.badge_key référence shop_items.key).
-- Seuils/pièces tunables ici — la base est l'unique source de vérité.
-- ---------------------------------------------------------------------------
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('badge_season', 'badge', 'Saison', 'Pass saisonnier maximisé.', 0, 120, false)
on conflict (key) do nothing;

insert into public.season_rewards (tier, min_points, coins, badge_key, name) values
  (1,  30,  50,  null,           'Recrue'),
  (2,  80,  80,  null,           'Habitué'),
  (3, 150, 130,  null,           'Régulier'),
  (4, 250, 200,  null,           'Assidu'),
  (5, 400, 300,  'badge_season', 'Vétéran')
on conflict (tier) do nothing;
