-- ---------------------------------------------------------------------------
-- 0026 — corrige l'onglet Joueurs (liste vide) + signale si l'auteur d'un
-- signalement possède déjà le badge "Bug hunter".
--
-- Bug 1 : admin_list_players déclarait une colonne de sortie « is_admin », qui
-- entrait en conflit avec profiles.is_admin dans le garde-fou (PL/pgSQL voit
-- les colonnes de RETURNS TABLE comme des variables). À l'appel, Postgres
-- renvoyait « column reference "is_admin" is ambiguous » (42702), l'erreur
-- était avalée côté app et la liste ressortait vide. On qualifie la colonne.
--
-- Bug 2 : le bouton « Attribuer le badge Bug hunter » s'affichait même quand le
-- joueur le possédait déjà. On expose reporter_has_bughunter pour le masquer.
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_players()
returns table (
  id              uuid,
  username        text,
  avatar_url      text,
  coins           int,
  is_admin        boolean,
  created_at      timestamptz,
  lifetime_points bigint
)
language plpgsql security definer set search_path = public stable
as $$
begin
  if auth.uid() is not null
     and not coalesce((select pr.is_admin from public.profiles pr
                       where pr.id = auth.uid()), false) then
    raise exception 'Réservé aux admins';
  end if;
  return query
    select
      p.id, p.username, p.avatar_url, p.coins, p.is_admin, p.created_at,
      coalesce((select sum(pred.points) from public.predictions pred
                where pred.user_id = p.id and pred.points is not null), 0)::bigint
    from public.profiles p
    order by p.username;
end;
$$;
grant execute on function public.admin_list_players() to authenticated;

-- Le type de retour change (nouvelle colonne) → il faut recréer la fonction.
drop function if exists public.admin_list_reports();
create or replace function public.admin_list_reports()
returns table (
  id          uuid,
  user_id     uuid,
  username    text,
  category    text,
  title       text,
  message     text,
  status      text,
  page_url    text,
  admin_notes text,
  created_at  timestamptz,
  updated_at  timestamptz,
  reporter_has_bughunter boolean
)
language sql security definer set search_path = public stable
as $$
  select r.id, r.user_id, pr.username, r.category, r.title, r.message,
         r.status, r.page_url, r.admin_notes, r.created_at, r.updated_at,
         exists (
           select 1 from public.user_items ui
           where ui.user_id = r.user_id and ui.item_key = 'badge_bughunter'
         )
  from public.reports r
  left join public.profiles pr on pr.id = r.user_id
  where coalesce((select p2.is_admin from public.profiles p2
                  where p2.id = auth.uid()), false)
  order by r.created_at desc;
$$;
grant execute on function public.admin_list_reports() to authenticated;
