-- Mugen — Récompenses spéciales (badges/titres) : auto ou attribuées par l'admin.
-- À exécuter dans le SQL Editor de Supabase après 0011.
--
-- Ces items ne sont PAS vendables (active = false) : ils s'obtiennent soit
-- automatiquement (titre « First » aux 15 premiers joueurs), soit à la main par
-- un admin via grant_item_to(). Une fois reçus, ils s'équipent normalement.

-- Drapeau admin (pour gating futur + grant_item_to).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- L'admin du projet.
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'webmaster@beproject.fr');

-- Items spéciaux (visuels dans lib/domain/cosmetics.ts).
insert into public.shop_items (key, kind, name, description, price, sort, active) values
  ('title_first',      'title', 'Titre « First »',     'Réservé aux 15 premiers joueurs.',        0, 200, false),
  ('title_staff',      'title', 'Titre « Staff »',      'Membre de l''équipe Mugen.',              0, 201, false),
  ('badge_founder',    'badge', 'Fondateur',            'Parmi les tout premiers à rejoindre.',    0, 210, false),
  ('badge_beta',       'badge', 'Beta-testeur',         'A testé Mugen avant tout le monde.',      0, 211, false),
  ('badge_bughunter',  'badge', 'Bug hunter',           'A remonté un bug. Merci !',               0, 212, false),
  ('badge_vip',        'badge', 'VIP',                  'Soutien de la première heure.',           0, 213, false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- grant_item_to / revoke_item_from : attribution manuelle par l'admin.
-- Depuis le SQL editor (rôle propriétaire, auth.uid() null) : autorisé.
-- Depuis une session : réservé aux profils is_admin.
-- ---------------------------------------------------------------------------
create or replace function public.grant_item_to(p_username text, p_item text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_uid    uuid;
begin
  if v_caller is not null
     and not coalesce((select is_admin from public.profiles where id = v_caller), false) then
    raise exception 'Réservé aux admins';
  end if;

  select id into v_uid from public.profiles where lower(username) = lower(p_username);
  if v_uid is null then raise exception 'Joueur introuvable : %', p_username; end if;
  if not exists (select 1 from public.shop_items where key = p_item) then
    raise exception 'Objet inconnu : %', p_item;
  end if;

  insert into public.user_items (user_id, item_key) values (v_uid, p_item)
    on conflict do nothing;
  return true;
end;
$$;
grant execute on function public.grant_item_to(text, text) to authenticated, service_role;

create or replace function public.revoke_item_from(p_username text, p_item text)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_uid    uuid;
begin
  if v_caller is not null
     and not coalesce((select is_admin from public.profiles where id = v_caller), false) then
    raise exception 'Réservé aux admins';
  end if;

  select id into v_uid from public.profiles where lower(username) = lower(p_username);
  if v_uid is null then raise exception 'Joueur introuvable : %', p_username; end if;

  delete from public.user_items where user_id = v_uid and item_key = p_item;
  -- Déséquipe l'item retiré.
  update public.profiles set
    equipped_frame = nullif(equipped_frame, p_item),
    equipped_title = nullif(equipped_title, p_item),
    equipped_color = nullif(equipped_color, p_item),
    equipped_badge = nullif(equipped_badge, p_item)
  where id = v_uid;
  return true;
end;
$$;
grant execute on function public.revoke_item_from(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Titre « First » : les 15 premiers joueurs (auto à l'inscription + backfill).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1),
    'joueur'
  );
  base_username := left(regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g'), 20);
  if base_username = '' then
    base_username := 'joueur';
  end if;

  final_username := base_username;
  while exists (select 1 from public.profiles where lower(username) = lower(final_username)) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.profiles (id, username, avatar_url)
  values (new.id, final_username, new.raw_user_meta_data ->> 'avatar_url');

  -- Récompense « First » pour les 15 premiers comptes.
  if (select count(*) from public.profiles) <= 15 then
    insert into public.user_items (user_id, item_key) values (new.id, 'title_first')
      on conflict do nothing;
  end if;

  return new;
end;
$$;

-- Backfill : les 15 plus anciens profils reçoivent « First ».
insert into public.user_items (user_id, item_key)
select id, 'title_first' from public.profiles order by created_at asc limit 15
on conflict do nothing;
