-- ---------------------------------------------------------------------------
-- 0016 — compteur de badges répétables (podium mensuel).
--
-- Un même badge mensuel (or / argent / bronze) peut être remporté plusieurs
-- fois. Plutôt que de dupliquer la ligne d'inventaire (impossible : clé
-- primaire composite), on garde une seule ligne et on incrémente un compteur,
-- affiché en « ×N » sur le profil.
-- ---------------------------------------------------------------------------

alter table public.user_items
  add column if not exists count integer not null default 1;

-- award_monthly_badge : accorde un badge à un joueur, ou incrémente son
-- compteur s'il le possède déjà. Réservé au service-role (settle mensuel).
create or replace function public.award_monthly_badge(p_user uuid, p_key text)
returns void language plpgsql security definer set search_path = public
as $$
begin
  insert into public.user_items (user_id, item_key, count)
  values (p_user, p_key, 1)
  on conflict (user_id, item_key)
  do update set count = public.user_items.count + 1;
end;
$$;
revoke execute on function public.award_monthly_badge(uuid, text) from public;
grant execute on function public.award_monthly_badge(uuid, text) to service_role;
