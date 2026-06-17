-- ---------------------------------------------------------------------------
-- 0021 — l'auteur d'un signalement peut le modifier ou le supprimer.
--
-- `reports` est RLS-locked (aucune policy) : tout passe par des RPC SECURITY
-- DEFINER. On en ajoute deux, réservés à l'auteur et limités aux signalements
-- encore « new » (pas encore pris en charge par un admin), pour ne pas changer
-- un ticket sous les pieds de l'équipe.
-- ---------------------------------------------------------------------------

-- update_report : l'auteur édite son signalement tant qu'il est « new ».
create or replace function public.update_report(
  p_id       uuid,
  p_category text,
  p_title    text,
  p_message  text
)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  if p_category not in ('bug', 'suggestion', 'other') then
    raise exception 'Catégorie invalide';
  end if;
  if char_length(trim(coalesce(p_title, ''))) < 3 then
    raise exception 'Titre trop court';
  end if;
  if char_length(trim(coalesce(p_message, ''))) < 5 then
    raise exception 'Message trop court';
  end if;

  update public.reports set
    category   = p_category,
    title      = trim(p_title),
    message    = trim(p_message),
    updated_at = now()
  where id = p_id and user_id = v_uid and status = 'new';

  return found;
end;
$$;

-- delete_report : l'auteur supprime son signalement tant qu'il est « new ».
create or replace function public.delete_report(p_id uuid)
returns boolean language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Non authentifié'; end if;
  delete from public.reports
  where id = p_id and user_id = v_uid and status = 'new';
  return found;
end;
$$;

grant execute on function public.update_report(uuid, text, text, text) to authenticated;
grant execute on function public.delete_report(uuid)                   to authenticated;
