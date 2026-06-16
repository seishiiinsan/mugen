-- Mugen — Vitrine de badge + base XP/niveaux.
-- À exécuter dans le SQL Editor de Supabase après 0010.
--
-- L'XP est CALCULÉE côté app (points cumulés × taux + XP des succès), donc rien
-- à stocker ni à créditer ici — juste le badge "vitrine" équipé et la somme des
-- points à vie pour dériver le niveau.

-- Badge mis en avant sur le profil (1 parmi ceux possédés).
alter table public.profiles
  add column if not exists equipped_badge text;

-- equip_item : ajoute le slot 'badge' (kind 'badge').
create or replace function public.equip_item(p_slot text, p_key text)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_kind text;
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_slot not in ('frame', 'title', 'color', 'badge') then
    raise exception 'Slot invalide';
  end if;

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
    equipped_color = case when p_slot = 'color' then p_key else equipped_color end,
    equipped_badge = case when p_slot = 'badge' then p_key else equipped_badge end
  where id = v_uid;
end;
$$;
grant execute on function public.equip_item(text, text) to authenticated;

-- Somme des points à vie du joueur courant (base de l'XP).
create or replace function public.my_lifetime_points()
returns bigint language sql security definer set search_path = public stable
as $$
  select coalesce(sum(points), 0)::bigint
  from public.predictions
  where user_id = auth.uid() and points is not null;
$$;
grant execute on function public.my_lifetime_points() to authenticated;

-- Badges des nouveaux succès (non vendables, octroyés au déblocage).
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('badge_played_10',  'badge', '10 pronostics',    'Dix pronostics réglés.',         0, 103, false),
  ('badge_exact_25',   'badge', '25 scores exacts', 'Vingt-cinq scores exacts.',      0, 104, false),
  ('badge_played_100', 'badge', '100 pronostics',   'Cent pronostics réglés.',        0, 105, false)
on conflict (key) do nothing;
